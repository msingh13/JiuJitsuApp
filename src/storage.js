import { schemas } from "../server/schema.js";
export const browserEdition = import.meta.env?.VITE_STORAGE_MODE === "browser";
let connection;
export function database() {
  if (!connection)
    connection = new Promise((resolve, reject) => {
      const req = indexedDB.open("matcraft-personal-v1", 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("records", { keyPath: "id" });
        req.result.createObjectStore("media", { keyPath: "id" });
      };
      req.onsuccess = () => {
        req.result.onversionchange = () => {
          req.result.close();
          connection = undefined;
        };
        resolve(req.result);
      };
      req.onblocked = () =>
        reject(
          new Error(
            "Close other Matcraft tabs, then reload to finish opening your journal.",
          ),
        );
      req.onerror = () =>
        reject(
          new Error(
            "Browser storage is unavailable. Check private-browsing or site-storage settings.",
          ),
        );
    }).catch((error) => {
      connection = undefined;
      throw error;
    });
  return connection;
}
async function operate(store, mode, callback) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    let result;
    const req = callback(tx.objectStore(store));
    req.onsuccess = () => {
      result = req.result;
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = tx.onerror = () =>
      reject(
        new Error(
          tx.error?.name === "QuotaExceededError"
            ? "Device storage is full. Export your records and free some space."
            : tx.error?.message || "Could not save to browser storage.",
        ),
      );
  });
}
async function records() {
  const rows = await operate("records", "readonly", (s) => s.getAll());
  rows.sort((a, b) => b.created.localeCompare(a.created));
  const out = Object.fromEntries(Object.keys(schemas).map((k) => [k, []]));
  for (const r of rows)
    if (out[r.kind]) out[r.kind].push({ ...r.data, id: r.id });
  return out;
}
export async function request(path, options = {}) {
  if (!browserEdition) {
    const r = await fetch("/api" + path, options);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Request failed");
    return data;
  }
  return browserRequest(path, options);
}
export async function browserRequest(path, options = {}) {
  const method = options.method || "GET";
  if (path === "/records" && method === "GET") return records();
  if (path === "/export")
    return {
      version: 1,
      edition: "browser",
      exportedAt: new Date().toISOString(),
      records: await records(),
    };
  if (path === "/media" && method === "POST") {
    const file = options.body.get("file");
    if (
      !(file instanceof Blob) ||
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/webm",
        "video/quicktime",
      ].includes(file.type)
    )
      throw new Error("Choose a supported photo or video file.");
    if (file.size > 100 * 1024 * 1024)
      throw new Error("File is too large. Limit: 100 MB.");
    const id = crypto.randomUUID();
    await operate("media", "readwrite", (s) =>
      s.add({ id, type: file.type, name: file.name, blob: file }),
    );
    return { id };
  }
  if (path.startsWith("/media/") && method === "GET") {
    const row = await operate("media", "readonly", (s) =>
      s.get(path.split("/")[2]),
    );
    if (!row) throw new Error("Media not found on this browser.");
    return { id: row.id, type: row.type, name: row.name };
  }
  const match = path.match(/^\/records\/([a-z]+)(?:\/([a-f0-9-]+))?$/);
  if (!match || !Object.hasOwn(schemas, match[1]))
    throw new Error("Unknown record type");
  const [, kind, id] = match;
  const existing = id
    ? await operate("records", "readonly", (s) => s.get(id))
    : null;
  if (id && (!existing || existing.kind !== kind))
    throw new Error("Record not found");
  if (method === "DELETE") {
    await operate("records", "readwrite", (s) => s.delete(id));
    return { deleted: true };
  }
  if (!["POST", "PUT"].includes(method))
    throw new Error("Unsupported operation");
  const parsed = schemas[kind].safeParse(JSON.parse(options.body));
  if (!parsed.success)
    throw new Error(
      parsed.error.issues
        .map((x) => `${x.path.join(".")}: ${x.message}`)
        .join("; "),
    );
  const row = {
    id: id || crypto.randomUUID(),
    kind,
    data: parsed.data,
    created: existing?.created || new Date().toISOString(),
  };
  await operate("records", "readwrite", (s) => s.put(row));
  return { ...row.data, id: row.id };
}
export async function mediaUrl(id) {
  if (!browserEdition) return "/media/" + id;
  const row = await operate("media", "readonly", (s) => s.get(id));
  if (!row) throw new Error("Media not found");
  return URL.createObjectURL(row.blob);
}
export async function exportRecords() {
  const data = await request("/export");
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "matcraft-records.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
