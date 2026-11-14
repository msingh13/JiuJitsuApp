import React, { useState } from "react";
import { readScaleCSV, prepareScaleImport } from "./renpho.js";
import { request } from "./storage.js";

export default function RenphoImport({ existing, onComplete, user }) {
  const [csv, setCsv] = useState(null),
    [mapping, setMapping] = useState({}),
    [units, setUnits] = useState(""),
    [format, setFormat] = useState(""),
    [preview, setPreview] = useState(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [imported, setImported] = useState([]);
  async function choose(file) {
    setPreview(null);
    setMessage("");
    setCsv(null);
    setImported([]);
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error("Choose a CSV smaller than 2 MB.");
      const parsed = readScaleCSV(await file.text());
      const normalized = parsed.headers.map((h) =>
        h.toLowerCase().replace(/[^a-z]/g, ""),
      );
      setMapping({
        date: normalized.findIndex((h) =>
          /^(date|time|measurementdate)/.test(h),
        ),
        weight: normalized.findIndex((h) => /^weight/.test(h)),
        fat: normalized.findIndex((h) => /^bodyfat/.test(h)),
        muscle: normalized.findIndex(
          (h, i) =>
            /^musclemass/.test(h) &&
            !h.includes("percent") &&
            !parsed.headers[i].includes("%"),
        ),
        visceral: normalized.findIndex((h) => /^visceralfat/.test(h)),
      });
      setCsv(parsed);
      setUnits("");
      setFormat("");
    } catch (e) {
      setMessage(e.message);
    }
  }
  async function importReadings() {
    setBusy(true);
    setMessage("");
    const finished = [...imported];
    try {
      const current = await request("/records");
      const checked = prepareScaleImport(
        csv,
        mapping,
        units,
        format,
        current.body,
      );
      if (checked.errors.length)
        throw new Error("Fix the preview errors before importing.");
      for (const record of checked.records) {
        await request("/records/body", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        finished.push(record);
        setImported([...finished]);
      }
      setMessage(
        `Imported ${checked.records.length} readings. Skipped ${checked.duplicates} duplicates.`,
      );
      setPreview(null);
      setCsv(null);
    } catch (e) {
      setMessage(
        `${e.message} ${finished.length} readings saved so far. Retry safely; saved readings will be skipped.`,
      );
    } finally {
      setBusy(false);
      await onComplete();
    }
  }
  return (
    <section className="panel renpho-import">
      <h2>Bring in your RENPHO readings</h2>
      <p>
        In RENPHO Health, open your scale’s History, choose Export data and save
        the CSV. Import it here to update your weight history. This is a file
        import, not automatic Bluetooth or account sync.
      </p>
      <a
        href="https://renpho.com/pages/faq-for-renpho-health-app"
        target="_blank"
        rel="noreferrer"
      >
        RENPHO export instructions
      </a>
      <label>
        Choose scale export
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {csv && (
        <>
          <p>
            {csv.rows.length} readings found. Check the columns and units before
            previewing. Muscle mass must be a weight, not a percentage.
          </p>
          <div className="form-grid">
            {[
              ["date", "Date / time"],
              ["weight", "Weight"],
              ["fat", "Body fat %"],
              ["muscle", "Muscle mass"],
              ["visceral", "Visceral fat rating"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <select
                  disabled={busy}
                  value={mapping[key] ?? -1}
                  onChange={(e) => {
                    setMapping({ ...mapping, [key]: Number(e.target.value) });
                    setPreview(null);
                  }}
                >
                  <option value={-1}>
                    {["date", "weight"].includes(key)
                      ? "Choose column"
                      : "Not included"}
                  </option>
                  {csv.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Weight and muscle units
              <select
                disabled={busy}
                value={units}
                onChange={(e) => {
                  setUnits(e.target.value);
                  setPreview(null);
                }}
              >
                <option value="">Choose export unit</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="lb">Pounds (lb)</option>
              </select>
            </label>
            <label>
              Date format
              <select
                disabled={busy}
                value={format}
                onChange={(e) => {
                  setFormat(e.target.value);
                  setPreview(null);
                }}
              >
                <option value="">Choose export format</option>
                <option value="YMD">Year / month / day</option>
                <option value="MDY">Month / day / year</option>
                <option value="DMY">Day / month / year</option>
              </select>
            </label>
          </div>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              try {
                setMessage("");
                setPreview(
                  prepareScaleImport(csv, mapping, units, format, [
                    ...existing,
                    ...imported,
                  ]),
                );
              } catch (e) {
                setMessage(e.message);
              }
            }}
          >
            Preview readings
          </button>
          {preview && (
            <div>
              <p>
                {preview.records.length} new · {preview.duplicates} duplicates ·{" "}
                {preview.errors.length} errors
              </p>
              {preview.errors.slice(0, 5).map((e) => (
                <p key={e} role="alert">
                  {e}
                </p>
              ))}
              <div className="import-preview">
                {preview.records.slice(0, 5).map((r, i) => (
                  <p key={i}>
                    {r.date} · {r.weight} kg · Body fat {r.fat ?? "—"}% · Muscle{" "}
                    {r.muscle ?? "—"} kg
                  </p>
                ))}
              </div>
              <p>
                {user
                  ? `Import these readings into ${user.email}’s private cloud journal.`
                  : "Import these readings into this browser’s journal. Anyone using this browser profile may see them."}{" "}
                Only import your own readings.
              </p>
              <button
                className="button"
                disabled={
                  busy || !!preview.errors.length || !preview.records.length
                }
                onClick={importReadings}
              >
                {busy ? "Importing…" : "Import reviewed readings"}
              </button>
            </div>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
