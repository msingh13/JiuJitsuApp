import React, { useRef, useState } from "react";
import {
  createBackup,
  downloadBackup,
  restoreBackup,
  protectStorage,
} from "./backup.js";

export default function DataSafety({ protection, setProtection, reload }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef();
  async function backup() {
    setBusy(true);
    setMessage("");
    try {
      downloadBackup(await createBackup());
      setMessage(
        "Backup download started. Keep the .matcraft file somewhere safe; it includes your private records, photos and videos.",
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function restore(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const { added, skipped } = await restoreBackup(file);
      await reload();
      setMessage(
        `Restored ${added} entries. Kept ${skipped} existing entries unchanged.`,
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel data-safety">
      <h2>Saved for this browser</h2>
      <p>
        Every saved entry stays on this device when you close and reopen the
        browser. Website updates keep your journal intact. Other visitors on
        their own devices have separate journals.
      </p>
      <p className="badge">
        {protection === "protected"
          ? "Protected against automatic storage cleanup"
          : protection === "checking"
            ? "Checking browser protection…"
            : "Standard browser storage"}
      </p>
      <p className="muted">
        {protection === "protected"
          ? "Your browser has granted persistent storage."
          : "Your browser has not granted extra storage protection. It may remove data when space runs low."}{" "}
        Clearing site data, uninstalling the browser or ending a private session
        can still erase progress. People sharing this browser profile share this
        journal.
      </p>
      {protection !== "protected" && (
        <button
          className="button secondary"
          disabled={busy || protection === "checking"}
          onClick={async () => {
            setProtection("checking");
            setProtection(await protectStorage());
          }}
        >
          Request storage protection
        </button>
      )}
      <h3>Keep a recovery copy</h3>
      <p>
        Download a complete backup with your records, photos and videos. Restore
        it here after clearing browser data or on another device. Existing
        entries are kept unchanged; only missing entries are added.
      </p>
      <div className="backup-actions">
        <button className="button" disabled={busy} onClick={backup}>
          {busy ? "Working…" : "Download complete backup"}
        </button>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => input.current.click()}
        >
          Restore backup
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept=".matcraft"
        hidden
        aria-label="Choose Matcraft backup"
        onChange={restore}
      />
      <p className="muted small">
        Saving is automatic. Recovery copies are manual and stay wherever you
        download them. No account, cloud upload or cross-device sync is used.
      </p>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
