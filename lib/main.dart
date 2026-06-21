import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/supabase_client.dart';

/// App entry point. Initializes Supabase before building the widget tree so the
/// auth session is restored and the router can redirect correctly on first frame.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initSupabase();
  runApp(const ProviderScope(child: GrowFlowApp()));
}
