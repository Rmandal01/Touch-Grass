import 'dart:async';

import 'package:flutter/material.dart';

import 'services/auth_service.dart';
import 'services/productivity_scorer.dart';
import 'services/screen_time_service.dart';

/// Pulls real Android screen time on a 10-minute loop and shows the
/// productivity score (0-100) computed from per-app usage.
class ScreenTimePage extends StatefulWidget {
  const ScreenTimePage({super.key});

  /// How often screen time is re-pulled and rescored.
  static const Duration refreshInterval = Duration(minutes: 10);

  @override
  State<ScreenTimePage> createState() => _ScreenTimePageState();
}

class _ScreenTimePageState extends State<ScreenTimePage>
    with WidgetsBindingObserver {
  final _service = ScreenTimeService();
  final _scorer = ProductivityScorer();

  Timer? _timer;
  bool _loading = true;
  String? _error;
  UsageStatus _status = UsageStatus.ok;
  ProductivityResult? _result;
  DateTime? _lastUpdated;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
    _timer = Timer.periodic(ScreenTimePage.refreshInterval, (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Re-check after the user returns from the Usage Access settings screen.
    if (state == AppLifecycleState.resumed &&
        _status == UsageStatus.permissionRequired) {
      _refresh();
    }
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final snapshot = await _service.fetchUsage();
      final result = snapshot.status == UsageStatus.permissionRequired
          ? null
          : _scorer.score(snapshot.apps);
      if (!mounted) return;
      setState(() {
        _status = snapshot.status;
        _result = result;
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
      appBar: AppBar(
        title: const Text('Productivity Score'),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
            // Signing out flips Supabase auth state; the router listens to that
            // and redirects back to the welcome screen automatically.
            onPressed: () => AuthService().signOut(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _loading ? null : _refresh,
        icon: const Icon(Icons.refresh),
        label: const Text('Refresh now'),
      ),
      body: Center(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_loading && _result == null && _status != UsageStatus.permissionRequired) {
      return const CircularProgressIndicator();
    }
    if (_status == UsageStatus.permissionRequired) {
      return _permissionPrompt();
    }
    if (_error != null && _result == null) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Text('Could not read screen time:\n$_error',
            textAlign: TextAlign.center),
      );
    }

    final result = _result!;
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_status == UsageStatus.unsupportedPlatform)
            const Padding(
              padding: EdgeInsets.only(bottom: 16),
              child: Text(
                'Demo data (run on Android for real screen time)',
                style: TextStyle(color: Colors.black45, fontSize: 12),
              ),
            ),
          Text(
            '${result.score}',
            style: TextStyle(
              fontSize: 96,
              fontWeight: FontWeight.bold,
              color: _scoreColor(result.score),
            ),
          ),
          const Text('out of 100', style: TextStyle(color: Colors.black54)),
          const SizedBox(height: 8),
          Text(
            result.classification.toUpperCase(),
            style: const TextStyle(letterSpacing: 1.5, fontSize: 16),
          ),
          const SizedBox(height: 24),
          _legendRow('Productive', result.productiveTime,
              const Color(0xFF2E7D32)),
          _legendRow('Neutral', result.neutralTime, const Color(0xFF9E9E9E)),
          _legendRow('Distracting', result.distractingTime,
              const Color(0xFFC62828)),
          const SizedBox(height: 16),
          Text(
            _lastUpdated == null
                ? ''
                : 'Updated ${TimeOfDay.fromDateTime(_lastUpdated!).format(context)} '
                    '· auto-refresh every 10 min',
            style: const TextStyle(color: Colors.black45, fontSize: 12),
          ),
          if (_loading) ...const [
            SizedBox(height: 12),
            SizedBox(
              height: 16,
              width: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ],
        ],
      ),
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
          const Text(
            'Screen time access needed',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
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
            onPressed: _refresh,
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
          SizedBox(width: 100, child: Text(label)),
          Text(_fmt(time)),
        ],
      ),
    );
  }
}
