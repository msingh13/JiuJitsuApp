import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { browserRequest, database } from "../src/storage.js";
import { createBackup, restoreBackup, protectStorage } from "../src/backup.js";

const post = (data) => ({ method: "POST", body: JSON.stringify(data) });
async function emptyTestDatabase() {
  const db = await database();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(["records", "media"], "readwrite");
    tx.objectStore("records").clear();
    tx.objectStore("media").clear();
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

test("complete backup recovers records and exact media bytes, without replacing newer entries", async () => {
  const upload = new FormData();
  upload.append(
    "file",
    new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
      type: "image/png",
    }),
    "photo.png",
  );
  const media = await browserRequest("/media", {
    method: "POST",
    body: upload,
  });
  const record = await browserRequest(
    "/records/vlogs",
    post({
      title: "Recovery test",
      date: "2026-10-24",
      caption: "Original",
      media: [media.id],
    }),
  );
  const backup = await createBackup();
  await emptyTestDatabase();
  assert.equal((await browserRequest("/records")).vlogs.length, 0);
  assert.deepEqual(await restoreBackup(backup), { added: 1, skipped: 0 });
  assert.equal((await browserRequest("/records")).vlogs[0].id, record.id);
  const db = await database();
  const recovered = await new Promise((resolve, reject) => {
    const req = db.transaction("media").objectStore("media").get(media.id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
  assert.equal(recovered.type, "image/png");
  assert.deepEqual(
    new Uint8Array(await recovered.blob.arrayBuffer()),
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  await browserRequest(`/records/vlogs/${record.id}`, {
    method: "PUT",
    body: JSON.stringify({ ...record, caption: "Newer work" }),
  });
  assert.deepEqual(await restoreBackup(backup), { added: 0, skipped: 1 });
  assert.equal(
    (await browserRequest("/records")).vlogs[0].caption,
    "Newer work",
  );
  const before = await browserRequest("/export");
  await assert.rejects(
    restoreBackup(backup.slice(0, backup.size - 1)),
    /incomplete/,
  );
  await assert.rejects(restoreBackup(new Blob(['{"version":1}'])), /backup/);
  assert.deepEqual((await browserRequest("/export")).records, before.records);
});

function archive(manifest) {
  const data = new TextEncoder().encode(JSON.stringify(manifest));
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, data.length);
  return new Blob(["MATCRAFT_BACKUP_V1\n", length, data]);
}
test("restore rejects invalid record types and missing attachments before writing anything", async () => {
  const before = (await browserRequest("/export")).records;
  const row = {
    id: crypto.randomUUID(),
    kind: "__proto__",
    data: {},
    created: new Date().toISOString(),
  };
  await assert.rejects(
    restoreBackup(archive({ version: 1, records: [row], media: [] })),
    /unknown/,
  );
  row.kind = "vlogs";
  row.data = {
    title: "Bad reference",
    date: "2026-10-24",
    caption: "",
    media: [crypto.randomUUID()],
  };
  await assert.rejects(
    restoreBackup(archive({ version: 1, records: [row], media: [] })),
    /missing attached/,
  );
  assert.deepEqual((await browserRequest("/export")).records, before);
});

test("browser storage protection reports granted, denied and unsupported states honestly", async () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  try {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        storage: { persisted: async () => false, persist: async () => true },
      },
    });
    assert.equal(await protectStorage(), "protected");
    navigator.storage.persist = async () => false;
    assert.equal(await protectStorage(), "standard");
    navigator.storage.persist = async () => {
      throw new Error("Denied");
    };
    assert.equal(await protectStorage(), "unavailable");
    delete navigator.storage;
    assert.equal(await protectStorage(), "unavailable");
  } finally {
    if (old) Object.defineProperty(globalThis, "navigator", old);
    else delete globalThis.navigator;
  }
});

test("class videos and move labels survive storage and complete backup restore; old sessions still validate", async () => {
  const old = {
    title: "Class",
    date: "2026-10-29",
    kind: "Gi",
    duration: 60,
    rolling: 15,
    rating: 4,
  };
  const legacy = await browserRequest("/records/sessions", post(old));
  assert.deepEqual(legacy.media, []);
  assert.equal(legacy.moves, "");
  const form = new FormData();
  form.append(
    "file",
    new Blob(["class recording bytes"], { type: "video/mp4" }),
    "class.mp4",
  );
  const clip = await browserRequest("/media", { method: "POST", body: form });
  const session = await browserRequest(`/records/sessions/${legacy.id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...old,
      moves: "Knee-cut pass\nArmbar",
      media: [clip.id],
      mediaLabels: { [clip.id]: "Knee-cut pass — grip detail" },
    }),
  });
  const backup = await createBackup();
  await emptyTestDatabase();
  await restoreBackup(backup);
  const recovered = (await browserRequest("/records")).sessions.find(
    (s) => s.id === session.id,
  );
  assert.deepEqual(recovered.media, [clip.id]);
  assert.equal(recovered.mediaLabels[clip.id], "Knee-cut pass — grip detail");
  assert.equal(recovered.moves, "Knee-cut pass\nArmbar");
  assert.equal((await browserRequest(`/media/${clip.id}`)).type, "video/mp4");
  await assert.rejects(
    browserRequest(
      "/records/sessions",
      post({ ...old, media: Array(31).fill(clip.id) }),
    ),
  );
});

test("workout videos and meal photos keep labels and files through complete backup", async () => {
  await emptyTestDatabase();
  for (const [kind, type, extra] of [
    ["workouts", "video/webm", { type: "Strength", duration: 30 }],
    [
      "meals",
      "image/jpeg",
      {
        meal: "Lunch",
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        fiber: 5,
        saturated: 2,
        sodium: 400,
      },
    ],
  ]) {
    const upload = new FormData();
    upload.append("file", new Blob(["test media"], { type }), "test-media");
    const { id } = await browserRequest("/media", {
      method: "POST",
      body: upload,
    });
    await browserRequest(
      `/records/${kind}`,
      post({
        title: "Personal entry",
        date: "2026-11-01",
        ...extra,
        media: [id],
        mediaLabels: { [id]: "My recording or plate" },
      }),
    );
  }
  const backup = await createBackup();
  await emptyTestDatabase();
  await restoreBackup(backup);
  const records = await browserRequest("/records");
  for (const kind of ["workouts", "meals"]) {
    const row = records[kind][0];
    assert.equal(row.mediaLabels[row.media[0]], "My recording or plate");
    const media = await browserRequest(`/media/${row.media[0]}`);
    assert.ok(media.type.startsWith(kind === "meals" ? "image/" : "video/"));
  }
});
