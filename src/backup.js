import { z } from "zod";
import { schemas } from "../server/schema.js";
import { database } from "./storage.js";

// Keep the existing database name and version: deploying new assets never resets data.
const magic = "MATCRAFT_BACKUP_V1\n";
const encoder = new TextEncoder();
const types = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
const manifestSchema = z.object({
  version: z.literal(1),
  records: z
    .array(
      z.object({
        id: z.uuid(),
        kind: z.string(),
        data: z.unknown(),
        created: z.iso.datetime(),
      }),
    )
    .max(100000),
  media: z
    .array(
      z.object({
        id: z.uuid(),
        type: z.enum(types),
        name: z.string().max(1000),
        size: z
          .number()
          .int()
          .min(0)
          .max(100 * 1024 * 1024),
      }),
    )
    .max(10000),
});

export async function protectStorage() {
  try {
    const storage = globalThis.navigator?.storage;
    if (!storage?.persist) return "unavailable";
    return (await storage.persisted()) || (await storage.persist())
      ? "protected"
      : "standard";
  } catch {
    return "unavailable";
  }
}

async function snapshot() {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["records", "media"], "readonly");
    const records = tx.objectStore("records").getAll();
    const media = tx.objectStore("media").getAll();
    tx.oncomplete = () =>
      resolve({ records: records.result, media: media.result });
    tx.onabort = tx.onerror = () =>
      reject(new Error("Could not read your journal for backup."));
  });
}

export async function createBackup() {
  const { records, media } = await snapshot();
  const manifest = encoder.encode(
    JSON.stringify({
      version: 1,
      records,
      media: media.map(({ id, type, name, blob }) => ({
        id,
        type,
        name,
        size: blob.size,
      })),
    }),
  );
  if (manifest.length > 10 * 1024 * 1024)
    throw new Error("Journal is too large for a single backup.");
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, manifest.length);
  // Blob composition avoids converting videos into huge base64 strings.
  return new Blob([magic, length, manifest, ...media.map((m) => m.blob)], {
    type: "application/octet-stream",
  });
}

export function downloadBackup(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `matcraft-${new Date().toISOString().slice(0, 10)}.matcraft`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function restoreBackup(file) {
  const header = encoder.encode(magic).length;
  if (
    !(file instanceof Blob) ||
    file.size < header + 4 ||
    (await file.slice(0, header).text()) !== magic
  )
    throw new Error(
      "Choose a Matcraft backup (.matcraft), not a records-only JSON export.",
    );
  const length = new DataView(
    await file.slice(header, header + 4).arrayBuffer(),
  ).getUint32(0);
  if (length > 10 * 1024 * 1024 || length + header + 4 > file.size)
    throw new Error("Backup is incomplete or invalid.");
  let manifest;
  try {
    manifest = manifestSchema.parse(
      JSON.parse(await file.slice(header + 4, header + 4 + length).text()),
    );
  } catch {
    throw new Error(
      "Backup contains invalid journal data. Nothing was imported.",
    );
  }
  const ids = new Set();
  for (const row of manifest.records) {
    if (!Object.hasOwn(schemas, row.kind) || ids.has(row.id))
      throw new Error("Backup contains unknown or duplicate records.");
    ids.add(row.id);
    row.data = schemas[row.kind].parse(row.data);
  }
  let offset = header + 4 + length;
  const mediaIds = new Set();
  const media = manifest.media.map(({ size, ...m }) => {
    if (mediaIds.has(m.id)) throw new Error("Backup contains duplicate media.");
    mediaIds.add(m.id);
    const blob = file.slice(offset, offset + size, m.type);
    offset += size;
    return { ...m, blob };
  });
  if (offset !== file.size)
    throw new Error("Backup is incomplete or invalid. Nothing was imported.");
  for (const row of manifest.records) {
    if (row.data.media?.some((id) => !mediaIds.has(id)))
      throw new Error("Backup is missing attached photos or videos.");
  }
  const db = await database();
  // Both stores commit together. Failed imports never leave a partial journal.
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["records", "media"], "readwrite");
    const recordsStore = tx.objectStore("records");
    const mediaStore = tx.objectStore("media");
    let added = 0,
      skipped = 0;
    const existing = recordsStore.getAll();
    existing.onsuccess = () => {
      const oldIds = new Set(existing.result.map((r) => r.id));
      let hasProfile = existing.result.some((r) => r.kind === "profile");
      for (const row of manifest.records) {
        if (oldIds.has(row.id) || (row.kind === "profile" && hasProfile)) {
          skipped++;
          continue;
        }
        recordsStore.add(row);
        added++;
        if (row.kind === "profile") hasProfile = true;
      }
    };
    for (const row of media) {
      const get = mediaStore.getKey(row.id);
      get.onsuccess = () => {
        if (get.result === undefined) mediaStore.add(row);
      };
    }
    tx.oncomplete = () => resolve({ added, skipped });
    tx.onabort = tx.onerror = () =>
      reject(
        new Error(
          tx.error?.name === "QuotaExceededError"
            ? "Not enough device storage to restore this backup. Nothing was imported."
            : "Could not restore backup. Nothing was imported.",
        ),
      );
  });
}
