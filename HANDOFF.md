# Handoff: Onboarding & Login → Garden

This document is for the agent/developer implementing the **garden** (main screen) and
**productivity** features. The onboarding + Google OAuth slice is **done and working**; this
explains exactly where it ends, what guarantees you can rely on, and how to plug the garden
in without touching auth/routing.

---

## TL;DR — your integration point

The router already sends a signed-in, onboarded user to the `/garden` route. Today that route
renders a **placeholder** ([lib/features/garden/garden_screen.dart](lib/features/garden/garden_screen.dart)).

**To integrate the real garden: replace the body of `GardenScreen` (or swap the widget at the
`Routes.garden` route in [lib/core/app_router.dart](lib/core/app_router.dart)).** You do **not**
need to change anything in auth, onboarding, or the redirect logic.

When `GardenScreen` builds, these are guaranteed:
- `supabase.auth.currentUser` is non-null (the redirect blocks `/garden` otherwise).
- The user's `Profile` is loaded — read it via `ref.watch(profileControllerProvider).valueOrNull`
  (gives you `plant_type`, `display_name`, etc.).
- An **active `mood_sessions` row exists** (the user set their first mood during onboarding).
- A `device_links` pairing token may exist (created on the pairing step; can be skipped).

---

## The flow you're slotting into

```
                 (not signed in)
/welcome → /concept → /sign-in ──Google OAuth──┐
                                               │ (signed in)
   ┌───────────────────────────────────────────┘
   ▼
onboarding_complete == false:
   /onboarding/plant → /onboarding/mood → /onboarding/pairing ──(Finish)──┐
                                                                          │ sets onboarding_complete = true
   ┌───────────────────────────────────────────────────────────────────-┘
   ▼
/garden   ◄── onboarding_complete == true users land here directly on next login
```

Routing is driven by a pure function, `resolveRedirect`, in
[lib/core/onboarding_redirect.dart](lib/core/onboarding_redirect.dart) (unit-tested in
[test/onboarding_redirect_test.dart](test/onboarding_redirect_test.dart)). The `GoRouter` that
uses it is in [lib/core/app_router.dart](lib/core/app_router.dart) and re-resolves redirects on
every auth/profile change.

---

## Key files & providers (what to reuse)

| File | What it gives you |
|---|---|
| [lib/state/auth_provider.dart](lib/state/auth_provider.dart) | `authServiceProvider`, `pairingServiceProvider`, `authStateProvider`, and `profileControllerProvider` (an `AsyncNotifier<Profile?>`). |
| [lib/services/auth_service.dart](lib/services/auth_service.dart) | `AuthService`: `currentUser`, `onAuthStateChange`, `signInWithGoogle`, `signOut`, `fetchProfile`, `ensureProfile`, `updatePlantType`, `completeOnboarding`, `setActiveMood`. |
| [lib/services/pairing_service.dart](lib/services/pairing_service.dart) | `PairingService`: `createPairingCode`, `isPaired`. |
| [lib/models/profile.dart](lib/models/profile.dart) | `Profile` data class (`fromMap`/`toMap`/`copyWith`). |
| [lib/models/mood_session.dart](lib/models/mood_session.dart) | `MoodSession` data class. |
| [lib/core/constants.dart](lib/core/constants.dart) | `kPlantTypes`, `kDefaultPlantType`, `kMoodPresets`, `kMobileAuthRedirect`. |
| [lib/core/supabase_client.dart](lib/core/supabase_client.dart) | `supabase` client accessor + `initSupabase()`. |

`GardenScreen` is currently a `ConsumerWidget` reading `profileControllerProvider` — a fine base
to build on.

---

## What is NOT built yet (your scope)

Per [CLAUDE.md](CLAUDE.md), the garden/productivity surface still needs:

1. **`plants` table + migration.** Migration `0001_onboarding.sql` only created `profiles`,
   `device_links`, and `mood_sessions`. Add `supabase/migrations/0002_plants.sql` with the
   `plants` schema (and `scores`, `activity_events` when you wire scoring). Columns per CLAUDE.md:
   `growth_points (0-100, start 20)`, `stage`, `is_dead`, etc. Keep RLS on (users see only their
   own rows) — follow the policy pattern in `0001_onboarding.sql`.
2. **`Plant` model + `plantProvider`** (Riverpod) — create/fetch the user's plant row on garden
   entry, seeded with `profile.plantType`.
3. **`PlantRenderer`** — asset-format-agnostic (Rive / video / sprite sheet). Do not couple game
   logic to a specific asset format.
4. **Score card + "Evaluate now"** — invoke the `analyze-productivity` Edge Function (not built
   yet either) and animate grow/wilt/death from the returned `stage`/`transition`.
5. **Advice panel + TTS** — call the `tts` Edge Function (DeepGram).
6. **mood/goal input on the main screen** — reuse `AuthService.setActiveMood(...)` (or add a
   `moodProvider`) so the user can change mood after onboarding.

---

## Rules — don't break these

- **Don't change `resolveRedirect` / `Routes.preAuth` / `Routes.onboardingSteps`** without
  updating [test/onboarding_redirect_test.dart](test/onboarding_redirect_test.dart). If you add
  new authed routes (e.g. `/settings`), they're automatically treated as "protected" (only
  reachable when signed in + onboarded) — which is usually what you want.
- **Keep `flutter_deeplinking_enabled=false`** in
  [android/app/src/main/AndroidManifest.xml](android/app/src/main/AndroidManifest.xml). It is
  required so the OAuth deep-link callback reaches `supabase_flutter` instead of go_router
  (otherwise login shows "Page Not Found"). The `<intent-filter>` for
  `io.supabase.growflow://login-callback` must also stay.
- **RLS is on.** Never use the service-role key in the client. Keep all third-party API keys
  (Anthropic, DeepGram) server-side in Edge Functions.
- **Client config is via dart-defines, not `.env`.** `dart_defines.json` holds only the public
  `SUPABASE_URL` + `SUPABASE_ANON_KEY`. Never point the client at `.env` (it has server secrets).

---

## Running the app

Flutter is at `C:\Users\willi\flutter\bin` (not on PATH by default). Android SDK is installed and
licensed; the `growflow_pixel` emulator exists.

```powershell
# Android (primary target)
emulator -avd growflow_pixel
flutter run -d emulator-5554 --dart-define-from-file=dart_defines.json

# Web (dev fallback; use a fixed port to match the OAuth redirect allowlist)
flutter run -d chrome --web-port=3000 --dart-define-from-file=dart_defines.json
```

Verify before/after changes: `flutter analyze` and `flutter test` (11 tests currently pass).

---

## Backend / OAuth state (already configured, FYI)

- Supabase project ref: `nwtcttowojuzxdhrjurs`.
- Google provider is **enabled and working**: Google OAuth client (Web type) has redirect URI
  `https://nwtcttowojuzxdhrjurs.supabase.co/auth/v1/callback`; Supabase has the client ID/secret.
- Allowed Redirect URLs include `http://localhost:3000` (web) and
  `io.supabase.growflow://login-callback/` (Android deep link).
- `.env` / `.env.example` document all env vars. `ANTHROPIC_API_KEY` is present for when you wire
  `analyze-productivity`; `DEEPGRAM_API_KEY` and the Google client id/secret env fields are still
  blank. **Note:** the service-role and Anthropic keys in `.env` were shared in plaintext during
  setup and should be rotated.
