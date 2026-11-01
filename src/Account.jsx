import React, { useEffect, useState } from "react";
import {
  cloud,
  cloudEnabled,
  setCloudUser,
  signIn,
  signOut,
  importBrowserJournal,
} from "./cloud.js";
import { database } from "./storage.js";

export function AccountGate({ children }) {
  const [session, setSession] = useState(undefined);
  const [guest, setGuest] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!cloudEnabled) return;
    const {
      data: { subscription },
    } = cloud.auth.onAuthStateChange((_event, next) => {
      setCloudUser(next?.user);
      setSession(next);
      setPending(false);
    });
    cloud.auth.getSession().then(({ data, error }) => {
      if (error) {
        setError("Could not restore sign-in. Please try signing in again.");
        setSession(null);
      } else {
        setCloudUser(data.session?.user);
        setSession(data.session);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  if (!cloudEnabled) return children(null);
  if (session === undefined)
    return (
      <main className="sign-in-screen">
        <h1>Opening your journal…</h1>
        <p>Checking your sign-in.</p>
      </main>
    );
  if (session || guest)
    return (
      <React.Fragment key={session?.user.id || "guest"}>
        {children(session?.user || null, () => setGuest(false))}
      </React.Fragment>
    );
  return (
    <main className="sign-in-screen">
      <section className="sign-in-card">
        <span className="eyebrow">MATCRAFT · YOUR TRAINING JOURNAL</span>
        <h1>
          Your practice.
          <br />
          Wherever you train.
        </h1>
        <p>
          Sign in to keep your sessions, technique notes and class recordings
          together across devices.
        </p>
        <button
          className="button google-sign-in"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError("");
            try {
              await signIn();
            } catch (e) {
              setError(e.message);
              setPending(false);
            }
          }}
        >
          {pending ? "Opening Google…" : "Continue with Google"}
        </button>
        <button className="text-button" onClick={() => setGuest(true)}>
          Continue with this browser’s journal
        </button>
        <p className="muted small">
          Existing browser entries stay on this device until you choose to copy
          them into your account. Cloud saving needs an internet connection.
        </p>
        {error && <p role="alert">{error}</p>}
      </section>
    </main>
  );
}

export function AccountPanel({ user, reload, showSignIn }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  if (!cloudEnabled) return null;
  if (!user)
    return (
      <section className="panel">
        <h2>Take your journal with you</h2>
        <p>
          You’re using the shared journal for this browser. Sign in with Google
          for a private cloud journal.
        </p>
        <button className="button" onClick={showSignIn}>
          Sign in with Google
        </button>
      </section>
    );
  return (
    <section className="panel">
      <h2>Your cloud journal</h2>
      <p>
        Signed in as <strong>{user.email}</strong>
      </p>
      <p>
        Saved entries and attached recordings are private to this account. Open
        Matcraft and sign in with the same Google account on another device to
        access them.
      </p>
      <div className="backup-actions">
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            try {
              const refreshed = await reload();
              setMessage(
                refreshed
                  ? "Journal refreshed from your account."
                  : "Could not refresh. Check your connection and try again.",
              );
            } catch (e) {
              setMessage(e.message);
            }
          }}
        >
          Refresh journal
        </button>
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await signOut();
            } catch (e) {
              setMessage(e.message);
              setBusy(false);
            }
          }}
        >
          Sign out
        </button>
      </div>
      <h3>Bring your previous entries</h3>
      <p>
        Copy this browser’s journal and attachments to{" "}
        <strong>{user.email}</strong>. Only do this if those entries belong to
        you. Existing cloud entries are kept unchanged; originals remain on this
        device.
      </p>
      <button
        className="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("Reading this browser’s journal…");
          try {
            const result = await importBrowserJournal(
              await database(),
              setMessage,
            );
            await reload();
            setMessage(result);
          } catch (e) {
            setMessage(
              `${e.message} You can retry; entries already copied will not be duplicated.`,
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Working…" : "Copy my browser journal to this account"}
      </button>
      <p className="muted small">
        Cloud recordings: up to 50 MB per file. Detaching a recording keeps the
        original stored in your account. Downloads give you an additional copy.
      </p>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
