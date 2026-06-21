# GrowFlow (Touch-Grass)

GrowFlow is a productivity app that grows a virtual garden: productive time grows your
plant, while doomscrolling and brainrot make it wilt. Productivity is scored from real
activity plus a user-stated mood/goal, and the plant's growth lives in Supabase so every
surface shares the same state.

This repo currently holds two frontends that share one Supabase backend. Each has its own
detailed README under [`docs/`](docs/):

- **Web app + Chrome extension** — the browser-based productivity-garden slice (active-tab
  tracking, ingest, scoring). See [`docs/web-app.md`](docs/web-app.md).
- **Flutter Android app** — the on-device screen-time productivity score (real per-app usage
  via `UsageStatsManager`, 0–100 scoring, the garden/dashboard UI). See
  [`docs/android-app.md`](docs/android-app.md).

For overall architecture, data model, and conventions, see [CLAUDE.md](CLAUDE.md).
