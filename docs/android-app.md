# GrowFlow

## Screen-time productivity score (Android)

A single Flutter screen that pulls **real per-app screen time** every ~10
minutes, runs a 0-100 productivity score over it (weighted by app type and
duration), and displays that score.

This is an **Android** app. Android's `UsageStatsManager` is the only mobile
screen-time API that exposes per-app durations to your own code. (Apple's
Screen Time API deliberately does not: usage data can only be rendered inside a
sandboxed `DeviceActivityReport` extension and can never be read by the host app
to compute a custom score.)

### Files

- `lib/models/app_usage_info.dart` — one app's screen-time entry.
- `lib/services/screen_time_service.dart` — reads real Android usage via
  `app_usage` (UsageStatsManager); checks/opens the "Usage access" permission
  through a platform channel. Returns seeded demo data only on non-Android
  platforms so the UI is still viewable during development.
- `lib/services/productivity_scorer.dart` — the scoring algorithm.
- `lib/screen_time_page.dart` — the page, the 10-minute refresh timer, and the
  permission-grant flow.
- `android/app/src/main/kotlin/com/example/growflow/MainActivity.kt` — native
  `growflow/usage` MethodChannel: `hasPermission` + `openSettings`.
- `android/app/src/main/AndroidManifest.xml` — declares `PACKAGE_USAGE_STATS`.

### Scoring algorithm

1. Each app is categorized productive / neutral / distracting by package + name
   keywords.
2. Foreground time per category is summed (duration is the weight).
3. `score = 50 + 50 * (productiveTime - distractingTime) / totalTime`, clamped
   0-100. 100 = all productive, 0 = all distracting, 50 = balanced/idle.

Bands: 85+ deep work, 65+ productive, 45+ neutral, 25+ distracted, below 25
doomscrolling.

## Run on Android

```bash
flutter pub get
flutter run            # pick an Android emulator or a plugged-in device
```

On first launch the page shows a "Usage access needed" prompt. Tap **Open Usage
Access settings**, enable GrowFlow, and return — the score then renders from
real usage and re-pulls every 10 minutes (or tap **Refresh now**).

### One-time Android setup (if needed)

Requires the Android SDK + an emulator (or a physical device with USB
debugging). On Apple Silicon, headless setup:

```bash
brew install --cask android-commandlinetools
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses
sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "emulator" \
  "platforms;android-35" "build-tools;35.0.0" \
  "system-images;android-35;google_apis;arm64-v8a"
avdmanager create avd -n growflow -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_7
flutter config --android-sdk "$ANDROID_HOME"
```
