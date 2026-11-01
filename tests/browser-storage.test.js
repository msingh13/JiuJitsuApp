import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { browserRequest } from "../src/storage.js";
const post = (data) => ({ method: "POST", body: JSON.stringify(data) });
test("Pages storage validates, persists, updates, exports and isolates record types", async () => {
  const saved = await browserRequest(
    "/records/sessions",
    post({
      title: "Pages test",
      date: "2026-10-24",
      kind: "No-Gi",
      duration: 60,
      rolling: 20,
      rating: 4,
    }),
  );
  assert.equal(
    (await browserRequest("/records")).sessions[0].title,
    "Pages test",
  );
  await assert.rejects(
    browserRequest("/records/meals/" + saved.id, { method: "DELETE" }),
    /not found/,
  );
  await assert.rejects(
    browserRequest("/records/sessions", post({ title: "Invalid" })),
  );
  const updated = await browserRequest("/records/sessions/" + saved.id, {
    method: "PUT",
    body: JSON.stringify({ ...saved, title: "Updated" }),
  });
  assert.equal(updated.title, "Updated");
  assert.equal(
    (await browserRequest("/export")).records.sessions[0].id,
    saved.id,
  );
  await browserRequest("/records/sessions/" + saved.id, { method: "DELETE" });
  assert.equal((await browserRequest("/records")).sessions.length, 0);
});
test("Pages storage saves media metadata and rejects unsupported uploads", async () => {
  const form = new FormData();
  form.append(
    "file",
    new Blob(["test media"], { type: "image/png" }),
    "test.png",
  );
  const saved = await browserRequest("/media", { method: "POST", body: form });
  const found = await browserRequest("/media/" + saved.id);
  assert.equal(found.type, "image/png");
  assert.equal(found.name, "test.png");
  const invalid = new FormData();
  invalid.append(
    "file",
    new Blob(["script"], { type: "text/html" }),
    "test.html",
  );
  await assert.rejects(
    browserRequest("/media", { method: "POST", body: invalid }),
    /supported/,
  );
});
