import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
test("local API validates records, serves media and persists across process restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "matcraft-api-"));
  const port = 32419;
  let child;
  async function start() {
    child = spawn(process.execPath, ["server/index.js"], {
      env: { ...process.env, DATA_DIR: dir, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Server did not start")),
        5000,
      );
      child.stdout.on("data", (d) => {
        if (d.toString().includes("Matcraft API")) {
          clearTimeout(timeout);
          resolve();
        }
      });
      child.on("error", reject);
      child.on("exit", (code) => {
        clearTimeout(timeout);
        reject(new Error("Server exited " + code));
      });
    });
  }
  async function stop() {
    if (child && child.exitCode === null) {
      const done = once(child, "exit");
      child.kill();
      await done;
    }
  }
  const call = (path, options) =>
    fetch(`http://127.0.0.1:${port}/api${path}`, options);
  const body = {
    title: "API verification",
    date: "2026-10-24",
    kind: "No-Gi",
    duration: 90,
    rolling: 30,
    rating: 4,
  };
  const options = (v) => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(v),
  });
  try {
    await start();
    assert.equal((await call("/health")).status, 200);
    assert.equal(
      (await call("/records/sessions", options({ ...body, rolling: 100 })))
        .status,
      400,
    );
    assert.equal(
      (
        await call("/records/sessions", {
          ...options(body),
          headers: {
            "Content-Type": "application/json",
            Origin: "https://untrusted.example",
          },
        })
      ).status,
      403,
    );
    assert.equal((await call("/records/__proto__", options({}))).status, 404);
    const saved = await (await call("/records/sessions", options(body))).json();
    assert.ok(saved.id);
    await stop();
    await start();
    const records = await (await call("/records")).json();
    assert.equal(records.sessions[0].title, body.title);
    const form = new FormData();
    form.append(
      "file",
      new Blob(
        [
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=",
            "base64",
          ),
        ],
        { type: "image/png" },
      ),
      "pixel.png",
    );
    const media = await (
      await call("/media", { method: "POST", body: form })
    ).json();
    assert.ok(media.id);
    const image = await fetch(`http://127.0.0.1:${port}/media/${media.id}`);
    assert.equal(image.status, 200);
    assert.match(image.headers.get("content-type"), /image\/png/);
    const fake = new FormData();
    fake.append(
      "file",
      new Blob(["<html>not an image</html>"], { type: "image/png" }),
      "fake.png",
    );
    assert.equal(
      (await call("/media", { method: "POST", body: fake })).status,
      400,
    );
    const exported = await (await call("/export")).json();
    assert.equal(exported.records.sessions.length, 1);
    await call("/records/sessions/" + saved.id, { method: "DELETE" });
    assert.equal((await (await call("/records")).json()).sessions.length, 0);
  } finally {
    await stop();
    await rm(dir, { recursive: true, force: true });
  }
});
