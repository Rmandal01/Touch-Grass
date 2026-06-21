import '../models/app_usage_info.dart';

/// How an app contributes to the productivity score.
enum AppCategory {
  productive, // work, docs, dev, email, education
  neutral, // utilities, system, browsers (depends on use), communication
  distracting, // social, short-form video, games
}

class CategorizedUsage {
  CategorizedUsage({
    required this.info,
    required this.category,
  });

  final AppUsageInfo info;
  final AppCategory category;
}

/// Result of scoring a window of screen time.
class ProductivityResult {
  ProductivityResult({
    required this.score,
    required this.classification,
    required this.totalTime,
    required this.productiveTime,
    required this.neutralTime,
    required this.distractingTime,
    required this.breakdown,
  });

  /// 0-100 productivity score.
  final int score;

  /// Plain-language label for the score band.
  final String classification;

  final Duration totalTime;
  final Duration productiveTime;
  final Duration neutralTime;
  final Duration distractingTime;

  /// Per-app categorization, sorted by usage descending.
  final List<CategorizedUsage> breakdown;
}

/// Turns per-app screen time into a 0-100 productivity score.
///
/// Algorithm:
///   1. Categorize each app as productive / neutral / distracting.
///   2. Sum foreground time per category (duration is the weight).
///   3. score = 50 + 50 * (productive - distracting) / total
///      - 100 when all time is productive
///      -   0 when all time is distracting
///      -  50 when balanced or entirely neutral
///   Neutral time anchors the score toward the middle, so heavy distraction
///   is only fully punished when it dominates the active window.
class ProductivityScorer {
  /// Substrings matched against the lowercased "<packageName> <appName>".
  ///
  /// IMPORTANT: the app_usage plugin only exposes the package id (its appName
  /// is just the last dotted token), so these must match real Android package
  /// identifiers, not just brand names. Both brand words (for the demo data)
  /// and package fragments (for real device data) are included.
  static const Map<AppCategory, List<String>> _keywords = {
    AppCategory.productive: [
      // Google productivity (Gmail = com.google.android.gm, etc.)
      'android.gm',
      'apps.docs',
      'editors',
      'android.keep',
      'android.calendar',
      'apps.classroom',
      'apps.meetings',
      'apps.tachyon', // Google Meet
      // Microsoft Office (com.microsoft.office.*, com.microsoft.outlook)
      'microsoft.office',
      'microsoft.outlook',
      'microsoft.todos',
      'onenote',
      // Dev / writing tools
      'github',
      'gitlab',
      'jetbrains',
      'notion',
      'obsidian',
      'com.slack',
      'overleaf',
      'termux', // terminal on Android
      // Learning
      'canvas',
      'instructure', // Canvas LMS package
      'coursera',
      'duolingo',
      'khanacademy',
      'udemy',
      'anki', // com.ichi2.anki
      'wolfram',
      'kindle',
      'amazon.kindle',
      'google.android.apps.books',
      'figma',
      'linear',
      'atlassian', // Jira/Confluence
      // Brand-name fallbacks (used by demo data + some readable labels)
      'gmail',
      'outlook',
      'docs',
      'word',
      'excel',
      'powerpoint',
      'code',
      'studio',
      'xcode',
      'terminal',
    ],
    AppCategory.distracting: [
      // Social / short-form video (matched by real package ids)
      'instagram',
      'zhiliaoapp', // TikTok = com.zhiliaoapp.musically
      'musically',
      'snapchat',
      'facebook', // also catches katana/orca below
      'katana', // Facebook
      'orca', // Facebook Messenger
      'twitter',
      'com.twitter',
      'reddit',
      'youtube',
      'netflix',
      'twitch',
      'hulu',
      'disney',
      'pinterest',
      'tinder',
      'bumble',
      '9gag',
      'tumblr',
      'bereal',
      'threads',
      // Messaging
      'discord',
      'whatsapp',
      'messenger',
      'telegram',
      // Games (real publisher package ids)
      'game',
      'king.', // Candy Crush etc.
      'supercell', // Clash
      'roblox',
      'pubg',
      'tencent',
      'mihoyo', // Genshin
      'hoyoverse',
      'epicgames',
      'mojang', // Minecraft
    ],
  };

  AppCategory categorize(AppUsageInfo info) {
    final haystack = '${info.packageName} ${info.appName}'.toLowerCase();

    for (final word in _keywords[AppCategory.productive]!) {
      if (haystack.contains(word)) return AppCategory.productive;
    }
    for (final word in _keywords[AppCategory.distracting]!) {
      if (haystack.contains(word)) return AppCategory.distracting;
    }
    return AppCategory.neutral;
  }

  ProductivityResult score(List<AppUsageInfo> apps) {
    final breakdown = <CategorizedUsage>[];
    Duration productive = Duration.zero;
    Duration neutral = Duration.zero;
    Duration distracting = Duration.zero;

    for (final app in apps) {
      final category = categorize(app);
      breakdown.add(CategorizedUsage(info: app, category: category));
      switch (category) {
        case AppCategory.productive:
          productive += app.usage;
        case AppCategory.neutral:
          neutral += app.usage;
        case AppCategory.distracting:
          distracting += app.usage;
      }
    }

    breakdown.sort((a, b) => b.info.usageSeconds.compareTo(a.info.usageSeconds));

    final total = productive + neutral + distracting;
    final int score;
    if (total.inSeconds == 0) {
      score = 50; // no activity -> neutral default
    } else {
      final ratio =
          (productive.inSeconds - distracting.inSeconds) / total.inSeconds;
      score = (50 + 50 * ratio).round().clamp(0, 100);
    }

    return ProductivityResult(
      score: score,
      classification: _classify(score),
      totalTime: total,
      productiveTime: productive,
      neutralTime: neutral,
      distractingTime: distracting,
      breakdown: breakdown,
    );
  }

  String _classify(int score) {
    if (score >= 85) return 'deep work';
    if (score >= 65) return 'productive';
    if (score >= 45) return 'neutral';
    if (score >= 25) return 'distracted';
    return 'doomscrolling';
  }
}
