import 'package:app_usage/app_usage.dart' as au;
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../models/app_usage_info.dart';

/// Outcome of trying to read screen time.
enum UsageStatus {
  /// Real per-app usage was read successfully.
  ok,

  /// Android, but the "Usage access" permission has not been granted.
  permissionRequired,

  /// Not Android (web/desktop/iOS) — no OS screen-time API; demo data shown.
  unsupportedPlatform,
}

class ScreenTimeSnapshot {
  ScreenTimeSnapshot({required this.status, required this.apps});

  final UsageStatus status;
  final List<AppUsageInfo> apps;
}

/// Reads real per-app screen time on Android via UsageStatsManager
/// (through the `app_usage` plugin), and exposes the special "Usage access"
/// permission state. On non-Android platforms it returns seeded demo data so
/// the UI is still viewable during development.
class ScreenTimeService {
  static const MethodChannel _channel = MethodChannel('growflow/usage');

  /// True only where real screen time exists.
  bool get supportsRealUsage =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  /// Whether the user has granted "Usage access" (Android only).
  Future<bool> hasPermission() async {
    if (!supportsRealUsage) return false;
    try {
      final granted = await _channel.invokeMethod<bool>('hasPermission');
      return granted ?? false;
    } on PlatformException catch (e) {
      debugPrint('ScreenTimeService.hasPermission failed: $e');
      return false;
    }
  }

  /// Opens the system "Usage access" settings screen (Android only).
  Future<void> openUsageSettings() async {
    if (!supportsRealUsage) return;
    try {
      await _channel.invokeMethod<void>('openSettings');
    } on PlatformException catch (e) {
      debugPrint('ScreenTimeService.openUsageSettings failed: $e');
    }
  }

  /// Reads usage for the last [window] (default 1 hour).
  Future<ScreenTimeSnapshot> fetchUsage({
    Duration window = const Duration(hours: 1),
  }) async {
    if (!supportsRealUsage) {
      return ScreenTimeSnapshot(
        status: UsageStatus.unsupportedPlatform,
        apps: _demoUsage(),
      );
    }

    if (!await hasPermission()) {
      return ScreenTimeSnapshot(
        status: UsageStatus.permissionRequired,
        apps: const [],
      );
    }

    final end = DateTime.now();
    final start = end.subtract(window);
    final infos = await au.AppUsage().getAppUsage(start, end);
    final apps = infos
        .where((e) => e.usage.inSeconds > 0)
        .map(
          (e) => AppUsageInfo(
            appName: e.appName,
            packageName: e.packageName,
            usage: e.usage,
          ),
        )
        .toList();
    return ScreenTimeSnapshot(status: UsageStatus.ok, apps: apps);
  }

  /// Demo window for non-Android dev runs: some productive, some doomscroll.
  List<AppUsageInfo> _demoUsage() {
    final jitter = DateTime.now().minute % 10;
    return [
      AppUsageInfo(
        appName: 'VS Code',
        packageName: 'com.microsoft.code',
        usage: Duration(minutes: 18 + jitter),
      ),
      AppUsageInfo(
        appName: 'Google Docs',
        packageName: 'com.google.android.apps.docs',
        usage: const Duration(minutes: 12),
      ),
      AppUsageInfo(
        appName: 'Gmail',
        packageName: 'com.google.android.gm',
        usage: const Duration(minutes: 6),
      ),
      AppUsageInfo(
        appName: 'Chrome',
        packageName: 'com.android.chrome',
        usage: const Duration(minutes: 8),
      ),
      AppUsageInfo(
        appName: 'Instagram',
        packageName: 'com.instagram.android',
        usage: Duration(minutes: 14 - jitter),
      ),
      AppUsageInfo(
        appName: 'TikTok',
        packageName: 'com.zhiliaoapp.musically',
        usage: const Duration(minutes: 9),
      ),
    ];
  }
}
