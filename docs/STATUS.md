# Scope and implementation status

Source brief: https://gemini.google.com/share/d8c3c234de20

The final conversation describes 10 feature areas plus a voice orchestrator. This repository implements an initial local personal edition. It is not the completed cloud/mobile product, and no third-party integrations are simulated as live.

| Module | Working in v0.1 | Remaining |
|---|---|---|
| Technique library | Searchable categorized seed catalog, notes/ratings, personal media, external video URLs | Provider-backed video indexing, larger curated catalog, rich text |
| Mat journal | Sessions, calendar, attendance/time totals, manually entered academy schedule | Academy-authorized curriculum feed, school-approved eligibility criteria |
| Timer | Custom work/rest rounds, pause/resume, sound, scoring | Native background operation, saved timer presets, automatic session linkage |
| Competition | Match logs, outcomes, points, notes, footage links, win rate | Submission breakdowns, pass conversion event tracking, video annotations |
| Partners / open mats | Private partner profiles, saved venues and external map search | Live map/provider integration, verified open-mat directory |
| Game plans | Saved branching sequences, educational choice quiz | Draggable canvas, editable root, annual/monthly/week periodization, larger coach-reviewed scenario set |
| Workouts / mobility | Editable templates, sets/reps/load/RPE/rest, favorites, volume history | Progression comparisons, personalized program generation, timed 5–60 minute mobility flows |
| Nutrition / hydration | Manual food/macronutrient logs, expanded nutrient view, water, editable targets | Barcode provider/camera scanning, food image parsing, custom micronutrient list, reviewed BMR/energy-expenditure estimation |
| Body composition | Manual measurements, weight history | Native HealthKit/Health Connect bridge, RENPHO compatibility verification, goal overlays |
| Training studio | Journal/caption/media storage, text sharing | Clip trimming, stat overlays, file sharing and platform-authorized publishing |
| Assistant | Limited command matching + optional browser dictation, draft review | Server-side LLM tool calling, speech transcription, per-action authorization, complete module coverage |

## Next architectural milestone

1. Add editable exercise progression charts and repeat-template-to-session workflow.
2. Introduce user accounts, server sessions, authorization tests and per-user database ownership before exposing a hosted service.
3. Move durable records to PostgreSQL and uploaded files to private object storage with access controls, upload limits and deletion lifecycle.
4. Add a provider-backed assistant through a server-only key. Validate tool inputs and require user review before destructive edits or social publishing.
5. Add provider adapters for food lookup, maps and video search, including provenance, quotas and failure states.
6. Build the native mobile shell for camera/barcode, reliable timers and HealthKit/Health Connect access.
7. Obtain academy-approved schedules/curriculum data. Do not infer individual class content from an unverified weekly cycle.
8. Expand the QA suite to integration, accessibility, multi-user isolation and mobile background behavior.

## Known limits

- Single local user, no authentication, no cross-device synchronization, no public deployment.
- Record removal is permanent after the second click; exported backups can be inspected but there is no in-app restore workflow yet.
- Media detach removes record references, not the file; unused uploaded files remain on disk until a future cleanup workflow.
- Browser timers use wall-clock deadlines while active; sleeping computers, suspended tabs and navigation away from the app can interrupt a sequence. The timer is not a competition officiating system.
- Rule-based templates are not individualized exercise prescriptions. The quiz is educational, not a predictor of real match success.
- Body measurements can be estimates from consumer scales; zero values in manually entered fields are displayed literally, not as a medical interpretation.
- Monthly and yearly charts show available entries, not inferred historical data.
