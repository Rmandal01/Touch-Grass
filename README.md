# GrowFlow

GrowFlow is a productivity garden. You tell it what you're working on, and a Chrome
extension watches your browsing: time on distraction sites (YouTube, social, video) wilts
your plant and pops a "back to your task" alert, while time on productive sites (Docs,
GitHub, email, Canvas) grows it. Your plant's points live in Supabase, so every surface sees
the same plant.

This repo has two frontends sharing one Supabase backend:

- Web app + Chrome extension — in [`growflow-web/`](growflow-web/). Fully documented below.
- Flutter phone app — planned; see [CLAUDE.md](CLAUDE.md).

Everything below is for running the web app + extension.

## How it works

```text
You (browser)
  └─ start a task on the website  ──────────────►  server stores the active task
  └─ Chrome extension tracks each tab's active time
        └─ on a distraction site: instant "−1" popup (client-side)
        └─ batches tab time, uploads to  POST /api/ingest
              └─ server scores the window by site category:
                   distraction-dominant → −1   productive-dominant → +3   neutral → 0
              └─ writes the new points to the Supabase `plants` row
  └─ website polls /api/plant and animates the plant
```

Points only move while a task is active. The up/down decision is deterministic by site
category (predictable); Claude (optional) only writes the advice text.

## Prerequisites

- Node.js 18+ (developed on 24) and npm
- A free Supabase project — <https://supabase.com>
- Google Chrome (to load the extension)
- Optional: an Anthropic API key (<https://console.anthropic.com>) for nicer advice text —
  without it the app still works, scoring is the same.

## Setup

### 1. Install dependencies

```bash
cd growflow-web/website  && npm install
cd ../extension          && npm install
```

### 2. Create the database

1. Create a Supabase project.
2. In the Supabase dashboard → SQL Editor → paste the contents of
   [`growflow-web/supabase/schema.sql`](growflow-web/supabase/schema.sql) → Run. This creates
   the `plants`, `device_links`, and `activity_events` tables and seeds a demo user whose
   pairing code is `demo`.
3. Project Settings → API → copy three values: the Project URL, the `anon` public key, and
   the `service_role` secret key.

### 3. Configure environment variables

Create `growflow-web/website/.env.local` (it is gitignored — never commit it):

```text
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
ANTHROPIC_API_KEY=<optional - sk-ant-...>
```

`NEXT_PUBLIC_*` are safe for the browser; `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY`
are server-only and must never be prefixed `NEXT_PUBLIC`.

### 4. Run the website

```bash
cd growflow-web/website
npm run dev        # http://localhost:3000
```

### 5. Build and load the extension

```bash
cd growflow-web/extension
npm run build      # compiles src/*.ts -> dist/*.js (Chrome loads dist/)
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
select the `growflow-web/extension` folder (the one with `manifest.json`). Pin the
extension so you can see its badge.

> The extension is preset to talk to `http://localhost:3000`. To point it at a deployed
> site, edit `INGEST_URL` in [`growflow-web/extension/src/config.ts`](growflow-web/extension/src/config.ts),
> add that host to `host_permissions` in
> [`growflow-web/extension/manifest.json`](growflow-web/extension/manifest.json), then
> `npm run build` and reload the extension.

## Using it

1. Open <http://localhost:3000>, type what you're working on (e.g. "finish the lab report"),
   and click **Start focusing**.
2. Click the extension icon, enter the pairing code `demo`, and **Save & connect**
   (the popup should then show **Paired: yes**).
3. Browse normally. Switch to a distraction site (YouTube, TikTok, …) → an instant popup
   appears. Spend active time on productive sites → the plant grows. Neutral sites do
   nothing. The website updates the plant live.
4. Click **Finish task** to see how many points the session earned.

Note: the extension records a site's time when you switch **away** from it, so to see points
move you have to leave the tab. Whichever site you spent the most active time on in a window
decides that window's points.

## Deploy to Vercel

1. Import the GitHub repo into Vercel (or use `vercel` CLI from `growflow-web/website`).
2. **Settings → Build and Deployment → Root Directory → `growflow-web/website`** — this is
   required because the Next.js app lives in a subfolder. Without it the build fails with
   "Couldn't find any pages or app directory".
3. **Settings → Environment Variables** → add the four variables above (Production).
4. **Settings → Deployment Protection → Vercel Authentication → Disabled** — otherwise the
   site is behind a login wall (HTTP 401) and the extension can't reach it.
5. Deploy. Then point the extension at `https://<your-app>.vercel.app/api/ingest` (see the
   note in step 5 of Setup) so it drives the hosted plant instead of localhost.

## Scoring rules

- Distraction sites (YouTube, TikTok, Instagram, Reddit, Netflix, social/video) make up most
  of a window → **−1**.
- Productive sites (Google Docs/Sheets/Slides, Gmail, GitHub, Canvas, etc.) dominate → **+3**.
- Anything else (neutral) → **0**, no change.
- Scoring only happens while a task is active.
- The distraction site list (for the instant popup) is in
  `growflow-web/extension/src/background.ts`; the category list (for scoring) is in
  `growflow-web/website/lib/categorize.ts` — edit either to taste.

## Troubleshooting

- **No popup on a distraction site:** (1) reload the extension after every `npm run build`;
  (2) a Chrome popup is a Windows notification — turn OFF Do Not Disturb / Focus Assist, and
  make sure notifications are allowed for Chrome in Windows Settings → System → Notifications.
- **Plant doesn't move:** the task must be active on the **same** server the extension posts
  to. If the extension's `INGEST_URL` is localhost, start the task on localhost (not the
  Vercel URL), and vice-versa. Also remember to switch away from a site to upload its time.
- **"No plant found":** you didn't run `growflow-web/supabase/schema.sql`.
- **Extension popup says "Upload: off":** enter the pairing code `demo`, and make sure
  `INGEST_URL` is set (rebuild + reload after changing it).
- **Vercel build fails / 401:** see the Deploy section — Root Directory and Deployment
  Protection are the two settings people miss.

## Project layout

```text
growflow-web/
  website/                      Next.js + TypeScript app (deploys to Vercel)
    app/page.tsx                the hub (renders LiveGarden)
    components/LiveGarden.tsx   task launcher + live plant (polls /api/plant)
    app/api/
      task/route.ts             start / finish a task
      ingest/route.ts           extension uploads activity here; scores + writes the plant
      plant/route.ts            current plant + active task (the website polls this)
      mood/, analyze/, live/    supporting routes
    lib/
      categorize.ts             domain -> productive | unproductive | neutral
      plant.ts                  growth/stage/transition math
      server/
        scoring.ts              deterministic category scoring (+ optional Claude advice)
        supabaseAdmin.ts        service-role Supabase client + token resolution
        taskState.ts            in-memory active-task store
        plantSync.ts, liveState.ts
    .env.example                copy to .env.local
  extension/                    Manifest V3 Chrome extension (TypeScript -> esbuild -> dist/)
    manifest.json
    src/background.ts           tracks tabs, instant distraction popup, batched upload
    src/popup.ts, popup.html    pairing code + status
    src/config.ts               INGEST_URL + storage keys
    icon128.png
  supabase/schema.sql           database schema + demo seed
```

## Resetting the demo plant

The demo plant persists in Supabase. To reset it, run this in the Supabase SQL Editor:

```sql
update plants set growth_points = 50, stage = 'young', is_dead = false,
  last_score = null, last_classification = null, last_advice = null
where user_id = 'demo-user';
```
