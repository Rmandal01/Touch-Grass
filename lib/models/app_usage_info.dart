/// One app's screen-time entry for a window of time.
class AppUsageInfo {
  AppUsageInfo({
    required this.appName,
    required this.packageName,
    required this.usage,
  });

  /// Human-readable app name (falls back to package name when unknown).
  final String appName;

  /// Android package id, e.g. "com.instagram.android".
  final String packageName;

  /// Foreground time for this app in the measured window.
  final Duration usage;

  int get usageSeconds => usage.inSeconds;
}
