import express from "express";
import multer from "multer";
import { mkdirSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { schemas } from "./schema.js";
import { createStore } from "./store.js";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const data = process.env.DATA_DIR || resolve(root, ".data");
mkdirSync(resolve(data, "uploads"), { recursive: true });
const store = createStore(resolve(data, "matcraft.sqlite"));
const app = express();
app.disable("x-powered-by");
// Local single-user edition: do not expose this server on a public interface.
app.use((req, res, next) => {
  const host = req.hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host))
    return res.status(403).json({ error: "Local access only" });
  const origin = req.get("origin");
  if (origin) {
    try {
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname)
      )
        return res
          .status(403)
          .json({ error: "Cross-origin requests are blocked" });
    } catch {
      return res.sendStatus(403);
    }
  }
  res.set("X-Content-Type-Options", "nosniff");
  next();
});
app.use(express.json({ limit: "2mb" }));
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", edition: "local" }),
);
app.get("/api/export", (_req, res) =>
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    records: Object.fromEntries(
      Object.keys(schemas).map((k) => [k, store.list(k)]),
    ),
  }),
);
app.get("/api/records", (_req, res) =>
  res.json(
    Object.fromEntries(Object.keys(schemas).map((k) => [k, store.list(k)])),
  ),
);
app.post("/api/records/:kind", save);
app.put("/api/records/:kind/:id", save);
function save(req, res) {
  const schema = Object.hasOwn(schemas, req.params.kind)
    ? schemas[req.params.kind]
    : null;
  if (!schema) return res.status(404).json({ error: "Unknown record type" });
  const result = schema.safeParse(req.body);
  if (!result.success)
    return res
      .status(400)
      .json({
        error: result.error.issues
          .map((x) => `${x.path.join(".")}: ${x.message}`)
          .join("; "),
      });
  const record = store.put(req.params.kind, result.data, req.params.id);
  if (!record) return res.status(404).json({ error: "Record not found" });
  res.json(record);
}
app.delete("/api/records/:kind/:id", (req, res) => {
  if (!Object.hasOwn(schemas, req.params.kind)) return res.sendStatus(404);
  res.json({ deleted: store.remove(req.params.kind, req.params.id) });
});
const upload = multer({
  storage: multer.diskStorage({
    destination: resolve(data, "uploads"),
    filename: (_req, _file, cb) => cb(null, randomUUID()),
  }),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    cb(
      null,
      [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/webm",
        "video/quicktime",
      ].includes(file.mimetype),
    ),
});
app.post("/api/media", upload.single("file"), (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({
        error: "Choose a JPG, PNG, WebP, MP4, WebM or MOV file (up to 100 MB).",
      });
  const b = readFileSync(req.file.path);
  const type = req.file.mimetype;
  const valid =
    type === "image/jpeg"
      ? b[0] === 255 && b[1] === 216
      : type === "image/png"
        ? b
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : type === "image/webp"
          ? b.toString("ascii", 0, 4) === "RIFF" &&
            b.toString("ascii", 8, 12) === "WEBP"
          : type === "video/webm"
            ? b.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))
            : b.toString("ascii", 4, 8) === "ftyp";
  if (!valid) {
    unlinkSync(req.file.path);
    return res
      .status(400)
      .json({
        error: "File content does not match the selected media format.",
      });
  }
  res.json({ id: store.mediaAdd(req.file) });
});
app.get("/api/media/:id", (req, res) => {
  const m = store.mediaGet(req.params.id);
  if (!m) return res.sendStatus(404);
  res.json({ id: m.id, type: m.mime, name: m.original });
});
app.get("/media/:id", (req, res) => {
  const m = store.mediaGet(req.params.id);
  if (!m) return res.sendStatus(404);
  res.type(m.mime);
  res.set("Content-Security-Policy", "default-src 'none'; sandbox");
  res.sendFile(resolve(data, "uploads", m.filename));
});
if (existsSync(resolve(root, "dist/index.html"))) {
  app.use(express.static(resolve(root, "dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(resolve(root, "dist/index.html")),
  );
}
app.use((err, _req, res, _next) =>
  res
    .status(400)
    .json({
      error:
        err.code === "LIMIT_FILE_SIZE"
          ? "File is too large. Limit: 100 MB."
          : err.message || "Request failed",
    }),
);
app.listen(Number(process.env.PORT) || 3001, "127.0.0.1", () =>
  console.log("Matcraft API: http://127.0.0.1:3001"),
);
