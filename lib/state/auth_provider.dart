import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/profile.dart';
import '../services/auth_service.dart';
import '../services/pairing_service.dart';

/// Provides the singleton [AuthService] used by screens and other providers.
final authServiceProvider = Provider<AuthService>((ref) => AuthService());

/// Provides the singleton [PairingService] for the pairing onboarding step.
final pairingServiceProvider =
    Provider<PairingService>((ref) => PairingService());

/// Streams Supabase auth state changes so dependents rebuild on sign in/out.
final authStateProvider = StreamProvider<AuthState>((ref) {
  return ref.watch(authServiceProvider).onAuthStateChange;
});

/// Holds the signed-in user's [Profile] (or null when signed out) and exposes
/// the onboarding mutations the wizard steps call.
///
/// Rebuilds whenever auth state changes; on sign-in it ensures a profile row
/// exists so a brand-new user immediately has something to edit.
class ProfileController extends AsyncNotifier<Profile?> {
  @override
  Future<Profile?> build() async {
    // Re-run whenever auth state changes (sign in / out / token refresh).
    ref.watch(authStateProvider);

    final service = ref.read(authServiceProvider);
    if (service.currentUser == null) return null;
    return service.ensureProfile();
  }

  /// Persists the chosen plant look and updates local state.
  Future<void> choosePlant(String plantType) async {
    final user = ref.read(authServiceProvider).currentUser;
    if (user == null) return;
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(
      () => ref.read(authServiceProvider).updatePlantType(user.id, plantType),
    );
  }

  /// Marks onboarding complete so the router stops routing into the wizard.
  Future<void> finishOnboarding() async {
    final user = ref.read(authServiceProvider).currentUser;
    if (user == null) return;
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(
      () => ref.read(authServiceProvider).completeOnboarding(user.id),
    );
  }

  /// Saves the first mood/goal during onboarding (does not change the profile,
  /// but kept here so the wizard talks to a single controller).
  Future<void> setFirstMood({required String mood, String? goal}) async {
    final user = ref.read(authServiceProvider).currentUser;
    if (user == null) return;
    await ref
        .read(authServiceProvider)
        .setActiveMood(user.id, mood: mood, goal: goal);
  }
}

/// The profile controller provider.
final profileControllerProvider =
    AsyncNotifierProvider<ProfileController, Profile?>(ProfileController.new);
