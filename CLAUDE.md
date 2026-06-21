# GrowFlow

GrowFlow is a productivity app that grows a virtual garden. Productive time grows your
plant; doomscrolling and brainrot time make it wilt and eventually die. Productivity is
judged by Claude, which analyzes the user's recent activity (real browser usage captured by
a Chrome extension), the time of day and day of week, and a user-stated mood/goal/task
(for example: vacation, locked-in, finishing work). A score from 0 to 100 is accompanied by
a growth delta that Claude decides: positive deltas grow the plant, negative deltas make it
wilt, with the magnitude reflecting how productive or unproductive the window was.

The repo folder is named Touch-Grass; the product name is GrowFlow.

## Demo scope

This codebase targets a hackathon demo: a polished single-user vertical slice that runs
end-to-end on one laptop. Group gardens and AI app-locking are designed at the schema and
flow level but are deferred (built only if time remains). See the implementation plan in
the repo for the full design.

Onboarding + Google OAuth are built and working; the garden/productivity surface is next.
If you are implementing the garden (main screen), read HANDOFF.md first — it documents the
`/garden` integration point and the guarantees the auth/onboarding flow provides.

Locked-in decisions:
- Single user first; group garden and AI app-locking deferred.
- Primary platform is Flutter for mobile (iOS or Android devices).
- Productivity data comes from a real Chrome extension plus manual mood/goal input, with
  seeded fallback scenarios for stage reliability. There is no mobile screentime on
  web/desktop.
- Scoring runs server-side in a Supabase Edge Function that calls the Claude API with
  tool-use.

## Architecture

Three surfaces, one Supabase backend.

1. Flutter Web/Desktop app — the garden UI. Onboarding, Google OAuth, plant-look
   selection, mood/goal input, the animated plant, score display, and spoken advice (TTS).
2. Chrome extension (Manifest V3) — a background service worker that tracks the active
   tab's domain and dwell time (with idle detection), batches events, and POSTs them to the
   ingest-activity Edge Function using a pairing token issued by the app.
3. Supabase — Auth (Google OAuth), Postgres (data model below), Edge Functions (ingest,
   analyze, tts), Realtime (for the deferred group garden), and Storage (optional, sprites).

End-to-end flow (single user):
1. The user opens the app, completes onboarding, signs in with Google, picks a plant look,
   and sets a mood/goal.
2. The app issues a short pairing code; the user pastes it into the Chrome extension popup.
   The extension tags its activity uploads with that token.
3. The extension records browser activity (domain, title, active seconds) and batches it to
   ingest-activity, which resolves the token to a user and writes activity_events.
4. On a timer, and via a manual "Evaluate now" button for the demo, the app invokes
   analyze-productivity.
5. analyze-productivity aggregates recent activity plus the active mood/goal plus time
   context, calls Claude with tool-use, and receives a 0-100 score plus classification,
   delta, rationale, and an advice/congrats/reminder message. It writes a scores row and
   updates the plant's growth.
6. The app re-renders the plant at its new stage, plays the matching grow, wilt, or death
   animation, and uses DeepGram TTS to speak the advice message.

## Tech stack

- Flutter (stable) and Dart, Android (mobile) and web targets.
- State management: Riverpod (riverpod / flutter_riverpod).
- Routing: go_router.
- Backend SDK: supabase_flutter (auth, Postgres, Edge Function invoke, Realtime).
- Plant animation: a stage-driven PlantRenderer abstraction. Provided assets can be a Rive
  state machine (preferred for grow/wilt transitions), a video per transition
  (video_player), or a frame sequence / sprite sheet. The renderer takes
  (plantType, stage, transition) and plays the right asset; the asset format is swappable
  without touching game logic.
- Audio playback: just_audio (or audioplayers) for DeepGram TTS output.
- Supabase Edge Functions: TypeScript on Deno.
- Claude API: called from analyze-productivity with tool-use.
- DeepGram TTS: REST (aura voice model) called from the tts Edge Function so the key stays
  server-side; returns audio to the client.

## Directory layout

- lib/
  - main.dart, app.dart (router and theme)
  - core/ (Supabase client init, config, theme, constants; app_router.dart wires go_router,
    onboarding_redirect.dart holds the pure auth/onboarding redirect rules)
  - models/ (Profile, MoodSession, Plant, Score, ActivityEvent)
  - services/ (auth_service, plant_service, analysis_service, tts_service, pairing_service)
  - state/ (Riverpod providers: authProvider, plantProvider, moodProvider, scoreProvider;
    auth_provider.dart exposes authService/pairingService and the ProfileController)
  - features/
    - onboarding/ (welcome, concept explainer, plant picker, first mood, pairing screen;
      widgets/ holds the shared OnboardingScaffold)
    - auth/ (Google OAuth handling — sign_in_screen)
    - garden/ (PlantRenderer abstraction and grow/wilt/death playback, garden screen)
    - productivity/ (mood/goal input, score card, "Evaluate now" trigger, advice panel)
    - group/ (deferred placeholder)
- assets/plants/<plant_type>/<stage|transition> (team-provided; renderer is format-agnostic)
- supabase/
  - migrations/ (database schema)
  - functions/ingest-activity/ (validate pairing token, insert activity_events)
  - functions/analyze-productivity/ (aggregate, Claude tool-use, growth update)
  - functions/tts/ (DeepGram speak; returns audio)
  - config.toml
- chrome-extension/
  - manifest.json (MV3; permissions: tabs, idle, storage; host permission for the Supabase
    functions URL)
  - background.js (service worker: active-tab domain and dwell tracking, idle detection,
    batched upload)
  - popup.html / popup.js (enter pairing code, show connection status)

## Data model (Supabase / Postgres)

Migrations live under supabase/migrations. Row Level Security is on; users see only their
own rows. The deferred garden tables relax this to garden members.

- profiles: id (uuid, ref auth.users), display_name, avatar_url, plant_type
  (default succulent), onboarding_complete, created_at.
- device_links: id, user_id, pairing_token, label, created_at, last_seen_at. Lets the
  extension authenticate uploads without a full OAuth flow.
- mood_sessions: id, user_id, mood, goal, is_active, started_at, ended_at. The active row is
  the current mood/goal/task Claude is told about.
- activity_events: id, user_id, source (chrome | manual | seed), domain, url, title,
  category (nullable; Claude can infer), started_at, duration_seconds, is_active, created_at.
- scores: id, user_id, score (0-100), classification
  (deep_work | productive | neutral | distracted | doomscrolling), delta, breaks_ok,
  rationale, advice, message_kind (congrats | advice | reminder), window_start, window_end,
  created_at.
- plants: id, user_id, plant_type, growth_points (0-100, start 20), stage, is_dead,
  updated_at.
- Deferred (schema sketched, not wired in phase 1): gardens (id, name, owner_id, join_code),
  garden_members (garden_id, user_id, plant_id).

## Scoring and growth rules

- Score is 0-100, produced by Claude.
- Claude decides the growth delta for each evaluation (positive to grow, negative to wilt);
  the magnitude is its call and should scale with how productive/unproductive the window was,
  not a fixed +3/-1 step.
- Do not penalize breaks. Only penalize long continuous unproductive stretches.
- Mood-aware leniency: vacation is lenient, locked-in is strict, finishing work is
  strict-but-fair.
- Claude inputs: aggregated and categorized recent activity (productive sites such as Google
  Docs, Canvas, email reading, GitHub, and work ChatGPT use; unproductive sites such as
  social and video doomscroll sites), total active vs idle time, time of day, day of week,
  and the active mood/goal.

analyze-productivity calls Claude with a single forced tool, report_productivity_score,
whose input is { score, classification, delta, breaks_ok, advice, message_kind }. The delta
is whatever Claude returns; the function does not snap it to a fixed band (it may apply a
generous sanity guard against runaway values, but the magnitude is Claude's decision). It
writes a scores row, then updates growth:

- new_growth = clamp(growth_points + delta, 0, 100).
- Stage buckets: 0 dead; 1-15 wilting; 16-30 sprout; 31-50 seedling; 51-70 young;
  71-90 mature; 91-100 flowering.
- is_dead becomes true at growth 0; planting/onboarding resets growth to 20.
- The function returns { score, classification, delta, stage, transition, advice,
  message_kind } so the client knows whether to play a grow, wilt, or death animation.

## Claude usage

- Default model: claude-opus-4-8. Fast and cheaper alternative for the frequent scoring
  loop: claude-sonnet-4-6. The model id is config-driven.
- Tool-use happens only in supabase/functions/analyze-productivity. Use tool_choice to force
  the report_productivity_score tool.
- Before changing the Claude call (model id, request shape, tool schema, params), consult
  the claude-api skill for the current API details. Do not answer Claude/Anthropic API
  questions from memory.

## How to run

- App: flutter run -d <android-device-or-emulator> (web, `-d chrome`, still works as a
  dev fallback). Configured platforms are android and web; the Windows desktop target was
  removed. Building/running Android needs the Android SDK + accepted licenses
  (`flutter doctor`).
- Client env is passed via dart-defines: --dart-define-from-file=dart_defines.json (a
  client-only file holding SUPABASE_URL and SUPABASE_ANON_KEY; never point this at .env,
  which contains server secrets).
- Google OAuth redirect targets differ by platform: web returns to the page origin; Android
  returns to the deep link `io.supabase.growflow://login-callback/` (see kMobileAuthRedirect
  and the AndroidManifest intent-filter). Add both to the Supabase dashboard's allowed
  redirect URLs.
- Backend: supabase start, then supabase functions serve for local Edge Functions.
- Extension: load chrome-extension/ unpacked via chrome://extensions (Developer mode), then
  paste the pairing code shown in the app.

Environment and secrets:
- Client (Flutter): SUPABASE_URL, SUPABASE_ANON_KEY.
- Edge Functions only (never ship to the client): ANTHROPIC_API_KEY, DEEPGRAM_API_KEY,
  SUPABASE_SERVICE_ROLE_KEY.

## Conventions and gotchas

- RLS is on. Use the service role key only inside Edge Functions, never in the client.
- Keep all third-party API keys (Anthropic, DeepGram) server-side in Edge Functions.
- The PlantRenderer is asset-format-agnostic. Do not couple game logic to a specific asset
  format (Rive vs video vs sprite sheet).
- Seeded fallback scenarios (locked-in, doomscroll, vacation) exist for demo reliability;
  keep them working so the stage demo cannot break if live capture misbehaves.
- Group garden and AI app-locking are deferred. Do not block the single-user slice on them.
