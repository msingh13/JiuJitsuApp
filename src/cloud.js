import { createClient } from "@supabase/supabase-js";
import { schemas } from "../server/schema.js";

const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloudEnabled = Boolean(url && key);
export const cloud = cloudEnabled
  ? createClient(url, key, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "matcraft-auth-v1",
      },
    })
  : null;
let owner = null;
export const setCloudUser = (user) => {
  owner = user?.id || null;
};
export const cloudActive = () => Boolean(cloud && owner);
export const mediaTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
const bucket = "matcraft-media";
function check(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
function requireOwner() {
  if (!cloud || !owner) throw new Error("Sign in to open your cloud journal.");
  return owner;
}
function unchanged(uid) {
  if (uid !== owner)
    throw new Error("Your account changed. Please reopen this entry.");
}
export async function signIn() {
  if (!cloud) throw new Error("Google sign-in has not been configured yet.");
  check(
    await cloud.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: new URL(import.meta.env.BASE_URL, location.origin).href,
        queryParams: { prompt: "select_account" },
      },
    }),
  );
}
export async function signOut() {
  check(await cloud.auth.signOut({ scope: "local" }));
}
function decode(row) {
  return { ...row.data, id: row.id, _revision: row.revision };
}
async function allRecords(uid) {
  const out = Object.fromEntries(Object.keys(schemas).map((k) => [k, []]));
  for (let offset = 0; ; offset += 500) {
    const rows = check(
      await cloud
        .from("journal_records")
        .select("*")
        .eq("user_id", uid)
        .order("id")
        .range(offset, offset + 499),
    );
    for (const row of rows)
      if (Object.hasOwn(out, row.kind)) out[row.kind].push(decode(row));
    if (rows.length < 500) break;
  }
  unchanged(uid);
  return out;
}
export async function cloudMedia(id) {
  const uid = requireOwner();
  const row = check(
    await cloud
      .from("journal_media")
      .select("*")
      .eq("user_id", uid)
      .eq("id", id)
      .single(),
  );
  const blob = check(await cloud.storage.from(bucket).download(`${uid}/${id}`));
  unchanged(uid);
  return { ...row, blob };
}
export async function uploadCloudMedia(
  file,
  id = crypto.randomUUID(),
  name = file.name || "Recording",
) {
  const uid = requireOwner();
  if (!mediaTypes.includes(file.type))
    throw new Error("Choose a supported photo or video.");
  if (file.size > 50 * 1024 * 1024)
    throw new Error(
      "Cloud recordings must be 50 MB or smaller. Trim or compress this clip first.",
    );
  check(
    await cloud
      .from("journal_media")
      .upsert(
        { id, user_id: uid, name, type: file.type, size: file.size },
        { onConflict: "user_id,id", ignoreDuplicates: true },
      ),
  );
  unchanged(uid);
  const upload = await cloud.storage
    .from(bucket)
    .upload(`${uid}/${id}`, file, { contentType: file.type, upsert: false });
  // An import can safely be retried after the object was uploaded successfully.
  if (
    upload.error &&
    !["409", "Duplicate"].includes(String(upload.error.statusCode)) &&
    !/already exists/i.test(upload.error.message)
  )
    check(upload);
  unchanged(uid);
  return { id };
}
export async function cloudRequest(path, options = {}) {
  const uid = requireOwner();
  const method = options.method || "GET";
  if (path === "/records" && method === "GET") return allRecords(uid);
  if (path === "/export")
    return {
      version: 1,
      edition: "cloud",
      exportedAt: new Date().toISOString(),
      records: await allRecords(uid),
    };
  if (path === "/media" && method === "POST")
    return uploadCloudMedia(options.body.get("file"));
  if (path.startsWith("/media/") && method === "GET") {
    const row = check(
      await cloud
        .from("journal_media")
        .select("id,type,name")
        .eq("user_id", uid)
        .eq("id", path.split("/")[2])
        .single(),
    );
    unchanged(uid);
    return row;
  }
  const match = path.match(/^\/records\/([a-z]+)(?:\/([a-f0-9-]+))?$/);
  if (!match || !Object.hasOwn(schemas, match[1]))
    throw new Error("Unknown record type");
  const [, kind, id] = match;
  if (method === "DELETE" && id) {
    check(
      await cloud
        .from("journal_records")
        .delete()
        .eq("user_id", uid)
        .eq("kind", kind)
        .eq("id", id),
    );
    unchanged(uid);
    return { deleted: true };
  }
  if (!["POST", "PUT"].includes(method))
    throw new Error("Unsupported operation");
  const input = JSON.parse(options.body);
  const data = schemas[kind].parse(input);
  let row;
  if (method === "POST")
    row = check(
      await cloud
        .from("journal_records")
        .insert({ id: crypto.randomUUID(), user_id: uid, kind, data })
        .select()
        .single(),
    );
  else {
    if (!Number.isInteger(input._revision))
      throw new Error("Refresh your journal before editing this cloud entry.");
    const rows = check(
      await cloud
        .from("journal_records")
        .update({ data })
        .eq("user_id", uid)
        .eq("kind", kind)
        .eq("id", id)
        .eq("revision", input._revision)
        .select(),
    );
    if (!rows.length)
      throw new Error(
        "This entry changed on another device. Close the editor and refresh before editing again.",
      );
    row = rows[0];
  }
  unchanged(uid);
  return decode(row);
}
export async function importBrowserJournal(db, onProgress) {
  const uid = requireOwner();
  const snapshot = await new Promise((resolve, reject) => {
    const tx = db.transaction(["records", "media"], "readonly");
    const r = tx.objectStore("records").getAll(),
      m = tx.objectStore("media").getAll();
    tx.oncomplete = () => resolve({ records: r.result, media: m.result });
    tx.onerror = () => reject(new Error("Could not read the browser journal."));
  });
  const needed = new Set(snapshot.records.flatMap((r) => r.data.media || []));
  const media = snapshot.media.filter((m) => needed.has(m.id));
  if (media.length !== needed.size)
    throw new Error(
      "Some attachments are missing. Restore a complete local backup before importing.",
    );
  if (media.some((m) => m.blob.size > 50 * 1024 * 1024))
    throw new Error(
      "Some recordings exceed 50 MB. Trim them before importing this journal.",
    );
  for (let i = 0; i < media.length; i++) {
    unchanged(uid);
    onProgress?.(`Copying recording ${i + 1} of ${media.length}…`);
    await uploadCloudMedia(media[i].blob, media[i].id, media[i].name);
  }
  const existing = await allRecords(uid);
  const hasProfile = existing.profile.length > 0;
  for (let i = 0; i < snapshot.records.length; i++) {
    unchanged(uid);
    const row = snapshot.records[i];
    if (row.kind === "profile" && hasProfile) continue;
    const data = schemas[row.kind].parse(row.data);
    check(
      await cloud
        .from("journal_records")
        .upsert(
          { id: row.id, user_id: uid, kind: row.kind, data },
          { onConflict: "user_id,id", ignoreDuplicates: true },
        ),
    );
    onProgress?.(`Copying entry ${i + 1} of ${snapshot.records.length}…`);
  }
  unchanged(uid);
  return "Browser journal copied. Existing cloud entries were kept unchanged. Your original browser journal is still available.";
}
