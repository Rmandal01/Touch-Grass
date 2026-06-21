import 'dart:async';

import 'package:flutter/material.dart';

import 'core/supabase_client.dart';
import 'services/productivity_scorer.dart';
import 'services/screen_time_service.dart';

/// Dashboard: averages the on-device screen-time productivity score with the
/// logged-in user's server-side `growth_points`, and displays the final score.
///
/// - Screen time is pulled every 10 minutes (and on demand).
/// - growth_points is pulled every 3 minutes from the `plants` row of the
///   currently signed-in user.
class ScreenTimePage extends StatefulWidget {
  const ScreenTimePage({super.key});

  /// How often on-device screen time is re-pulled.
  static const Duration screenTimeInterval = Duration(minutes: 10);

  /// How often the server-side growth_points is re-pulled.
  static const Duration growthInterval = Duration(minutes: 3);

  @override
  State<ScreenTimePage> createState() => _ScreenTimePageState();
}

class _ScreenTimePageState extends State<ScreenTimePage>
    with WidgetsBindingObserver {
  final _service = ScreenTimeService();
  final _scorer = ProductivityScorer();

  Timer? _screenTimer;
  Timer? _growthTimer;
  bool _loading = true;
  String? _error;
  UsageStatus _status = UsageStatus.ok;

  ProductivityResult? _result; // local screen-time score
  int? _growthPoints; // server-side growth_points for the logged-in user
  int? _finalScore; // average of the two
  DateTime? _lastUpdated;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refreshScreenTime();
    _refreshGrowthPoints();
    _screenTimer = Timer.periodic(
        ScreenTimePage.screenTimeInterval, (_) => _refreshScreenTime());
    _growthTimer = Timer.periodic(
        ScreenTimePage.growthInterval, (_) => _refreshGrowthPoints());
  }

  @override
  void dispose() {
    _screenTimer?.cancel();
    _growthTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        _status == UsageStatus.permissionRequired) {
      _refreshScreenTime();
    }
  }

  void _refreshNow() {
    _refreshScreenTime();
    _refreshGrowthPoints();
  }

  /// Pull on-device screen time and recompute. Owns the loading spinner.
  Future<void> _refreshScreenTime() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final snapshot = await _service.fetchUsage();
      final localResult = snapshot.status == UsageStatus.permissionRequired
          ? null
          : _scorer.score(snapshot.apps);
      if (!mounted) return;
      setState(() {
        _status = snapshot.status;
        _result = localResult;
        _finalScore = _averageScore(localResult?.score, _growthPoints);
        _lastUpdated = DateTime.now();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  /// Pull the logged-in user's growth_points from Supabase (every 3 minutes).
  /// Fire-and-forget: never blocks the UI or the loading spinner.
  Future<void> _refreshGrowthPoints() async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return; // not signed in
    try {
      final row = await supabase
          .from('plants')
          .select('growth_points')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle()
          .timeout(const Duration(seconds: 8));
      final growth = (row?['growth_points'] as num?)?.toInt();
      if (!mounted || growth == null) return;
      setState(() {
        _growthPoints = growth;
        _finalScore = _averageScore(_result?.score, growth);
      });
    } catch (e) {
      debugPrint('growth_points fetch failed: $e');
    }
  }

  /// Average the screen-time score and the growth_points (0-100 each).
  /// Uses whichever values are available.
  int? _averageScore(int? screenTime, int? growth) {
    final values = [screenTime, growth].whereType<int>().toList();
    if (values.isEmpty) return null;
    final sum = values.reduce((a, b) => a + b);
    return (sum / values.length).round().clamp(0, 100);
  }

  /// Maps a 0-100 score to one of 10 images: 0-10 -> 1, ... 90-100 -> 10.
  int _imageIndex(int score) => (score.clamp(0, 100) ~/ 10).clamp(0, 9) + 1;

  String _classify(int score) {
    if (score >= 85) return 'deep work';
    if (score >= 65) return 'productive';
    if (score >= 45) return 'neutral';
    if (score >= 25) return 'distracted';
    return 'doomscrolling';
  }

  Color _scoreColor(int score) {
    if (score >= 65) return const Color(0xFF2E7D32);
    if (score >= 45) return const Color(0xFFF9A825);
    return const Color(0xFFC62828);
  }

  String _fmt(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    if (h > 0) return '${h}h ${m}m';
    return '${m}m';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Productivity Score')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _loading ? null : _refreshNow,
        icon: const Icon(Icons.refresh),
        label: const Text('Refresh now'),
      ),
      body: Center(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_loading &&
        _finalScore == null &&
        _status != UsageStatus.permissionRequired) {
      return const CircularProgressIndicator();
    }
    if (_status == UsageStatus.permissionRequired && _finalScore == null) {
      return _permissionPrompt();
    }
    if (_error != null && _finalScore == null) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Text('Could not load score:\n$_error',
            textAlign: TextAlign.center),
      );
    }

    final score = _finalScore ?? 50;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_status == UsageStatus.unsupportedPlatform)
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: Text(
                'Demo screen-time data (run on Android for real usage)',
                style: TextStyle(color: Colors.black45, fontSize: 12),
              ),
            ),
          Image.asset(
            'assets/score/score_${_imageIndex(score)}.png',
            height: 180,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => const SizedBox(height: 180),
          ),
          const SizedBox(height: 8),
          const Text('FINAL PRODUCTIVITY SCORE',
              style: TextStyle(letterSpacing: 1.5, color: Colors.black54)),
          Text(
            '$score',
            style: TextStyle(
              fontSize: 96,
              fontWeight: FontWeight.bold,
              color: _scoreColor(score),
            ),
          ),
          const Text('out of 100', style: TextStyle(color: Colors.black54)),
          const SizedBox(height: 4),
          Text(
            _classify(score).toUpperCase(),
            style: const TextStyle(letterSpacing: 1.5, fontSize: 16),
          ),
          const SizedBox(height: 24),
          _sourceCard(),
          const SizedBox(height: 16),
          if (_result != null) ...[
            _legendRow('Productive', _result!.productiveTime,
                const Color(0xFF2E7D32)),
            _legendRow('Neutral', _result!.neutralTime, const Color(0xFF9E9E9E)),
            _legendRow('Distracting', _result!.distractingTime,
                const Color(0xFFC62828)),
          ],
          const SizedBox(height: 16),
          Text(
            _lastUpdated == null
                ? ''
                : 'Updated ${TimeOfDay.fromDateTime(_lastUpdated!).format(context)} '
                    '· screen time every 10 min · growth every 3 min',
            style: const TextStyle(color: Colors.black45, fontSize: 12),
            textAlign: TextAlign.center,
          ),
          if (_loading) ...const [
            SizedBox(height: 12),
            SizedBox(
                height: 16,
                width: 16,
                child: CircularProgressIndicator(strokeWidth: 2)),
          ],
        ],
      ),
    );
  }

  /// Shows the two averaged inputs.
  Widget _sourceCard() {
    final screen = _result?.score;
    final growth = _growthPoints;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _sourceRow('Screen time score', screen == null ? '—' : '$screen'),
            const Divider(height: 16),
            _sourceRow('Growth points (server)',
                growth == null ? 'no data yet' : '$growth'),
          ],
        ),
      ),
    );
  }

  Widget _sourceRow(String label, String value) {
    return Row(
      children: [
        Expanded(child: Text(label)),
        Text(value,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ],
    );
  }

  Widget _permissionPrompt() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.timelapse, size: 64, color: Color(0xFF2E7D32)),
          const SizedBox(height: 16),
          const Text('Screen time access needed',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text(
            'To compute your productivity score from real app usage, grant '
            '"Usage access" to GrowFlow, then come back.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.black54),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => _service.openUsageSettings(),
            icon: const Icon(Icons.settings),
            label: const Text('Open Usage Access settings'),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: _refreshScreenTime,
            child: const Text("I've granted it — check again"),
          ),
        ],
      ),
    );
  }

  Widget _legendRow(String label, Duration time, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(width: 12, height: 12, color: color),
          const SizedBox(width: 8),
          SizedBox(width: 120, child: Text(label)),
          Text(_fmt(time)),
        ],
      ),
    );
  }
}
