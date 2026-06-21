import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/constants.dart';
import '../core/supabase_client.dart';
import '../models/profile.dart';

/// Wraps Supabase Auth (Google OAuth) and profile persistence for GrowFlow.
///
/// Keeps all Supabase calls in one place so screens and providers depend on a
/// small, testable surface rather than the Supabase SDK directly.
class AuthService {
  final SupabaseClient _client;

  AuthService({SupabaseClient? client}) : _client = client ?? supabase;

  /// The currently signed-in user, or null if signed out.
  User? get currentUser => _client.auth.currentUser;

  /// Stream of auth state changes (sign in, sign out, token refresh). The router
  /// listens to this to redirect between onboarding, auth, and the garden.
  Stream<AuthState> get onAuthStateChange => _client.auth.onAuthStateChange;

  /// Starts the Google OAuth flow.
  ///
  /// The redirect target differs per platform: on web the browser returns to the
  /// page origin (null lets Supabase use it); on mobile it must return to a
  /// registered deep link ([kMobileAuthRedirect]) so the OS reopens the app and
  /// supabase_flutter completes the PKCE exchange. Either way [onAuthStateChange]
  /// then emits a signedIn event, which the router uses to resume onboarding.
  Future<void> signInWithGoogle({String? redirectTo}) async {
    await _client.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: redirectTo ?? (kIsWeb ? null : kMobileAuthRedirect),
    );
  }

  /// Signs the current user out and clears the local session.
  Future<void> signOut() => _client.auth.signOut();

  /// Fetches the profile row for [userId], or null if it does not exist yet.
  Future<Profile?> fetchProfile(String userId) async {
    final row = await _client
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();
    if (row == null) return null;
    return Profile.fromMap(row);
  }

  /// Ensures a profile row exists for the signed-in user, returning it.
  ///
  /// Called right after sign-in: if the user is brand new we seed a profile from
  /// their Google identity (name, avatar); otherwise we return the existing row
  /// so onboarding can resume where they left off.
  Future<Profile> ensureProfile() async {
    final user = currentUser;
    if (user == null) {
      throw StateError('ensureProfile called while signed out.');
    }

    final existing = await fetchProfile(user.id);
    if (existing != null) return existing;

    final meta = user.userMetadata ?? const {};
    final seeded = Profile(
      id: user.id,
      displayName:
          (meta['full_name'] ?? meta['name'] ?? user.email) as String?,
      avatarUrl: (meta['avatar_url'] ?? meta['picture']) as String?,
    );

    final inserted =
        await _client.from('profiles').insert(seeded.toMap()).select().single();
    return Profile.fromMap(inserted);
  }

  /// Persists the user's chosen plant look during onboarding.
  Future<Profile> updatePlantType(String userId, String plantType) async {
    final updated = await _client
        .from('profiles')
        .update({'plant_type': plantType})
        .eq('id', userId)
        .select()
        .single();
    return Profile.fromMap(updated);
  }

  /// Marks onboarding finished so the router stops routing into the wizard.
  Future<Profile> completeOnboarding(String userId) async {
    final updated = await _client
        .from('profiles')
        .update({'onboarding_complete': true})
        .eq('id', userId)
        .select()
        .single();
    return Profile.fromMap(updated);
  }

  /// Records the user's current mood/goal directly on their plant row.
  ///
  /// The mood/goal live on the `plants` table (`current_mood` / `current_goal`)
  /// so the scoring loop and garden read them straight off the plant. Updates the
  /// existing plant if present; otherwise seeds the onboarding plant (growth
  /// starts at 20, which is the `sprout` stage).
  ///
  /// Used by the first-mood onboarding step and later by the productivity panel.
  Future<void> setPlantMood(
    String userId, {
    required String mood,
    String? goal,
    required String plantType,
  }) async {
    final now = DateTime.now().toIso8601String();

    final updated = await _client
        .from('plants')
        .update({
          'current_mood': mood,
          'current_goal': goal ?? '',
          'updated_at': now,
        })
        .eq('user_id', userId)
        .select();

    if ((updated as List).isNotEmpty) return;

    // No plant yet — seed the initial onboarding plant.
    await _client.from('plants').insert({
      'user_id': userId,
      'plant_type': plantType,
      'growth_points': 20,
      'stage': 'sprout',
      'is_dead': false,
      'current_mood': mood,
      'current_goal': goal ?? '',
      'updated_at': now,
    });
  }
}
