import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';

/// Initializes the global Supabase client used across the app. Must be awaited
/// once during startup (in main) before any provider touches Supabase.
///
/// Throws a [StateError] if the public Supabase config was not supplied via
/// --dart-define, so misconfiguration fails loudly at boot rather than later.
Future<void> initSupabase() async {
  if (!AppConfig.isConfigured) {
    throw StateError(
      'Supabase is not configured. Pass --dart-define=SUPABASE_URL=... and '
      '--dart-define=SUPABASE_ANON_KEY=... when running the app.',
    );
  }

  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    // `publishableKey` is the current name for the public client key; it accepts
    // legacy anon keys too. (anonKey is deprecated in supabase_flutter 2.15+.)
    publishableKey: AppConfig.supabaseAnonKey,
  );
}

/// Convenience accessor for the initialized Supabase client.
SupabaseClient get supabase => Supabase.instance.client;
