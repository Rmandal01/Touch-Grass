# GrowFlow — Web workstream (website + Chrome extension)

This folder is the self-contained web slice of GrowFlow. It is intentionally isolated
from the rest of the repo (the Flutter app, Supabase migrations, and assets) so it can be
developed and deployed independently without merge conflicts. Nothing outside this folder
is modified by this workstream.

Two pieces live here, both written in TypeScript:

- website/ — a Next.js (App Router) + TypeScript + Tailwind app. This is the garden UI
  that runs in the browser and deploys to Vercel.
- extension/ — a Manifest V3 Chrome extension (TypeScript, compiled to JS by esbuild)
  that tracks browser activity and will upload it to the backend.

## What works today (no backend required)

The website runs end-to-end against seeded mock scenarios. You can pick a scenario
(locked-in / doomscroll / vacation), set a mood/goal, press "Evaluate now", and watch the
plant grow (+3) or wilt (-1) using the real scoring-to-stage logic. This lets us demo and
build the UI before the Supabase backend and Claude scoring loop exist.

## Integration points are written, then commented out

Every place that will eventually talk to the backend is scaffolded and clearly marked with
a `// TODO(backend)` comment, then left dormant so nothing breaks and nothing conflicts:

- website/lib/server/scoring.ts — scores activity with Claude server-side; falls back to the
  local mock when ANTHROPIC_API_KEY is unset.
- website/lib/server/plantSync.ts — writes the new growth to the shared Supabase `plants`
  row (so the Flutter app updates); no-ops until Supabase env + a userId exist.
- website/app/api/ingest/route.ts — the endpoint the extension reports activity to;
  token-resolution + storage are TODO(backend).
- extension/src/background.ts — the activity upload call to /api/ingest (commented; the
  extension still tracks activity locally and logs it).

When the backend lands, a teammate fills in the env vars and uncomments these blocks.

## Where the AI scoring runs

The Claude scoring runs server-side in the website's own Next.js API route,
website/app/api/analyze/route.ts (Node runtime, on Vercel) — not in a Supabase Edge Function
and not in the browser/extension. Flow: the browser (or the extension via /api/ingest) posts
the activity window to the website; the route calls Claude (key stays in Vercel env), then
writes the resulting growth to the shared Supabase `plants` row that the Flutter app also
reads. With no Anthropic key set, the route returns a realistic mock score so the demo works.

## Run the website

```
cd growflow-web/website
npm install
npm run dev          # http://localhost:3000
```

## Connect Supabase (the live garden)

The "Your live garden" card is driven by the extension and persisted in Supabase. To enable
it:

1. In your Supabase project, open SQL Editor and run growflow-web/supabase/schema.sql once.
   It creates plants / device_links / activity_events and seeds a demo user with pairing
   token `demo`.
2. Put these in growflow-web/website/.env.local (server-only ones are never NEXT_PUBLIC):
   - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (Project Settings -> API)
   - SUPABASE_SERVICE_ROLE_KEY (same page; keep secret)
3. Restart `npm run dev`.

Flow once connected: extension (paired with code `demo`) uploads on each tab switch ->
/api/ingest resolves the token, stores the activity, scores it with Claude, and writes the
new growth to the `plants` row -> the website polls /api/plant and animates the plant. No
button press — points go down for YouTube, up for docs, automatically.

## Deploy to Vercel

1. Push this repo to GitHub (already wired) and import it in Vercel.
2. Set Root Directory to growflow-web/website (the Next.js app lives in a subfolder).
3. Add the env vars in the Vercel dashboard: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL,
   NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. (Only NEXT_PUBLIC_* reach the
   browser; the others stay server-side.)
4. Deploy. After it's live, point the extension at the deployed URL: set INGEST_URL in
   extension/src/config.ts to https://YOUR-APP.vercel.app/api/ingest, add that host to
   manifest.json "host_permissions", `npm run build`, and reload the extension.

Note: the manual "Use my real browser activity" button uses an in-memory buffer that isn't
reliable on Vercel's serverless functions — the live garden (Supabase) is the path that
works in production.

## Build / load the extension

```
cd growflow-web/extension
npm install
npm run build        # compiles src/*.ts -> dist/*.js
# or: npm run watch  # rebuild on change
```

Then in Chrome: chrome://extensions -> enable Developer mode -> "Load unpacked" ->
select the growflow-web/extension folder. Open the popup, paste the pairing code (the
backend will issue real codes later), and the service worker begins tracking the active
tab. Activity is logged to the service-worker console until the upload TODO is enabled.

## Environment variables

See website/.env.example and extension/src/config.ts.

- Public, client-safe (browser): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.
- Server-only (the API routes / Vercel env, never NEXT_PUBLIC): ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL, SUPABASE_SERVICE_ROLE_KEY.
- Extension: INGEST_URL in extension/src/config.ts points at the website's /api/ingest.
