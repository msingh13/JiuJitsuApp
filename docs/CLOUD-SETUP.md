# Google sign-in and private journals

Status: integration prepared; not live until the project, Google provider and repository variables below are configured. The app keeps its existing browser-only mode when both public configuration values are absent. Do not configure a production deployment before applying the access rules and enabling Google.

## Provision once

1. Sign into Supabase and create a project named Matcraft. Choose the Free plan to start. The owner sets and retains the database password; do not commit it or paste it into chat. Free projects have a 1 GB file-storage allowance, limited bandwidth, and may pause after inactivity; review current pricing before real client rollout. This app caps cloud uploads at 50 MB per file.
2. In the SQL editor, run `supabase/migrations/202610290001_private_journals.sql` once against the new project. It creates per-user records, a private media bucket and access policies. It never exposes a public media bucket. Do not apply against existing unrelated tables with the same names.
3. In Google Cloud, create/configure an OAuth web client for Matcraft, with basic openid/email/profile scopes only. Authorized JavaScript origin: `https://msingh13.github.io`. Authorized redirect URI: the exact callback shown in Supabase Authentication → Providers → Google, normally `https://PROJECT_REF.supabase.co/auth/v1/callback`.
4. Enter the Google client ID and secret directly into Supabase’s Google provider settings. Never put the client secret, service-role key or database password into browser code or GitHub repository variables. Set the consent screen audience for intended users (testing mode restricts users to its tester list).
5. In Supabase Authentication → URL Configuration, set site URL and allowed redirect to `https://msingh13.github.io/JiuJitsuApp/`. Add localhost only for development.
6. Add GitHub repository Actions variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` using the project URL and public publishable key from Supabase. These values are intended to be visible in the browser. Access control comes from the deployed policies, never from hiding the public key.
7. Re-run the Publish Matcraft workflow or push to the release branch. Verify Google sign-in on the real domain using two different accounts, access to private videos, sign-out, refresh and a second browser/device before calling the cloud service ready.

## Behavior

- The app uses a full-page OAuth redirect with PKCE, returning to the GitHub Pages base path; no pop-up dependency.
- Signed-in users read and write their own cloud rows. Saves finish only when the server confirms success. No offline write queue is presented as synced data. Network failures keep the editor open.
- Records reload when the window regains focus. A revision check refuses a stale edit after another device changes the record.
- Auth changes remount the journal and reset in-memory view state. Private media is downloaded using the authenticated client and displayed as revocable local blob URLs.
- The guest browser journal remains separate. Settings offers an explicit copy into the current account, including referenced attachments. The originals stay in IndexedDB. Retrying an interrupted copy preserves existing cloud entries and avoids duplicate IDs. Oversized or missing local attachments block the import before uploading.
- Record JSON export works for cloud entries. Download originals from each entry for media copies. Complete `.matcraft` backup/restore remains available in browser-only mode; restoring there and then copying to an account is supported.
- Detaching a file does not delete its cloud object. Storage cleanup, per-user quotas and account deletion UI are future work. The Free project limits are shared across users.

## Verification

`npm test` includes real PostgreSQL policy tests in PGlite: account A cannot read/update/delete account B’s entries or media, ownership cannot be forged, unauthenticated access is denied, and updates advance revisions. Storage service behavior and real Google OAuth still require the configured deployment checks above.
