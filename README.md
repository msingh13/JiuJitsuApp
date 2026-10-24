# Matcraft

A personal jiu-jitsu training companion for the long game. Responsive React interface backed by a local SQLite database and an Express API.

## Run

Requires Node.js 22.13 or newer (Node 22 LTS recommended).

```sh
npm ci
npm run dev
```

Open the Vite URL printed in the terminal, normally http://127.0.0.1:5173. The API runs on port 3001. For a production build served locally:

```sh
npm run build
npm start
```

Then open http://127.0.0.1:3001.

## GitHub Pages edition

Live address: https://msingh13.github.io/JiuJitsuApp/

```sh
npm run build:pages
```

This produces `dist-pages/` with `/JiuJitsuApp/` asset paths. Publish those static files under the `JiuJitsuApp/` directory of the portfolio Pages repository. The browser edition uses IndexedDB for records and photo/video blobs, with the same validation rules as the local API. It never calls the Express server. Each browser/device has its own journal. Clearing site data removes it; JSON export preserves record data but not media files. Keep original media files separately. There is currently no restore/import or cloud sync.

The initial live bundle is published from `msingh13/msingh13.github.io` so it shares the portfolio's existing deployment setup. The application source remains in this repository. Rebuild and republish `dist-pages/` after source changes.

## Current release: personal edition

- Mat journal: Gi/No-Gi sessions, class and rolling minutes, focus, notes, ratings, calendar and week/month/year totals.
- Technique library: 21 categorized starter techniques, search/filter, personal notes, mistakes, key details, difficulty, understanding, favorites, video links, media attachments.
- Strategy: saved branching game plans and three educational decision scenarios.
- Round timer: rounds, rest, pause/resume, audio alerts, red/blue scoreboard, advantages and penalties. Timer remains active when navigating between app sections; browser suspension can delay alerts.
- Workouts: strength, cardio, kettlebell, mobility, yoga and Pilates templates; exercises, sets, reps, kilograms, RPE, rest, favorites, volume history and estimated 1RM for sets of 1–12 reps.
- Nutrition: manual meals, calories, macros, fiber, saturated fat, sodium, daily targets, hydration and undo-last-water.
- Body metrics: manual weight, body fat, muscle mass, visceral rating, chronological charts.
- Competition: opponents, divisions, results, scoring, video links and notes.
- Partners/places: private notes, saved academy locations and schedules, external Google Maps search.
- Studio: journal captions, photo/video attachments, native text sharing or clipboard fallback.
- Quick assistant: deterministic commands that open editable drafts; optional browser speech dictation. This is not an LLM integration.
- Profile and JSON record export.

Data is stored in `.data/matcraft.sqlite`; media lives in `.data/uploads`. Both are git-ignored. Back up the entire `.data` directory while the server is stopped. JSON export includes records and media IDs, not media binary files. `DATA_DIR` can point to a different local data directory.

### Scope and access

This release binds to loopback and rejects remote Host headers and cross-origin web requests. It has **no multi-user authentication** and must not be exposed publicly or behind a public reverse proxy. The GitHub Pages edition works directly in phone and desktop browsers with separate data per browser. Cross-device synchronization and native mobile builds are future work. A local process with access to this computer can read the database. Do not deploy this edition as a public service.

The starter catalog uses explicitly labeled YouTube searches, not an exhaustive or curated video index. No live academy curriculum is fetched. Belt promotions are instructor decisions; no promotion prediction is made. Nutrition targets are user-entered; there are no automatic calorie-burn or weight-cut prescriptions. Workout generators are editable templates rather than personalized AI coaching. Optional browser dictation may send audio to the browser vendor’s speech service. Google Fonts are fetched for typography, with local fallbacks.

See [the implementation status](docs/STATUS.md) for the complete roadmap and integration dependencies.

## Checks

```sh
npm test
npm run build
```

GitHub Actions runs both on pushes and pull requests. Database tests use an in-memory store, leaving personal data untouched.

## Layout

- `src/main.jsx`: UI and forms
- `src/storage.js`: browser IndexedDB and local API storage adapters
- `src/domain.js`: date filtering, workout metrics, templates, starter catalog
- `src/style.css`: responsive visual system
- `server/schema.js`: record validation
- `server/store.js`: SQLite persistence
- `server/index.js`: local API, media handling and production assets
- `tests/`: business-rule and persistence checks

No external API keys are required for this edition. Never place provider secrets in browser code.
