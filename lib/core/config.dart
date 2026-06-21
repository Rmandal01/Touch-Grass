/// App-wide configuration sourced from compile-time environment values.
///
/// Pass these at build/run time with --dart-define so secrets and per-environment
/// values never get hard-coded into the source tree, e.g.:
///   flutter run -d chrome \
///     --dart-define=SUPABASE_URL=https://xyz.supabase.co \
///     --dart-define=SUPABASE_ANON_KEY=ey...
///
/// Only the *public* client values live here. Service-role and third-party API
/// keys (Anthropic, DeepGram) stay server-side in Edge Functions.
class AppConfig {
  /// The Supabase project URL (public).
  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');

  /// The Supabase anon/public key. Safe to ship to the client; RLS protects data.
  static const String supabaseAnonKey =
      String.fromEnvironment('SUPABASE_ANON_KEY');

  /// Returns true when both required Supabase values were provided at build time.
  /// Used to fail fast with a clear message instead of a cryptic Supabase error.
  static bool get isConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
