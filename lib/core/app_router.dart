import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/sign_in_screen.dart';
import '../features/onboarding/concept_screen.dart';
import '../features/onboarding/first_mood_screen.dart';
import '../features/onboarding/pairing_screen.dart';
import '../features/onboarding/plant_picker_screen.dart';
import '../features/onboarding/welcome_screen.dart';
import '../screen_time_page.dart';
import '../state/auth_provider.dart';
import 'onboarding_redirect.dart';

export 'onboarding_redirect.dart' show Routes, resolveRedirect;

/// Builds the app [GoRouter]. Recomputes redirects whenever auth state or the
/// loaded profile changes (via a refresh notifier bumped by ref.listen).
final routerProvider = Provider<GoRouter>((ref) {
  // A simple Listenable that GoRouter refreshes on; bumped on auth/profile change.
  final refresh = ValueNotifier<int>(0);
  ref.onDispose(refresh.dispose);
  ref.listen(authStateProvider, (_, __) => refresh.value++);
  ref.listen(profileControllerProvider, (_, __) => refresh.value++);

  return GoRouter(
    initialLocation: Routes.welcome,
    refreshListenable: refresh,
    debugLogDiagnostics: kDebugMode,
    redirect: (context, state) {
      final isSignedIn = ref.read(authServiceProvider).currentUser != null;
      final profile = ref.read(profileControllerProvider);
      final onboardingComplete = profile.maybeWhen(
        data: (p) => p?.onboardingComplete,
        orElse: () => null,
      );
      return resolveRedirect(
        location: state.matchedLocation,
        isSignedIn: isSignedIn,
        onboardingComplete: onboardingComplete,
      );
    },
    routes: [
      GoRoute(
        path: Routes.welcome,
        builder: (_, __) => const WelcomeScreen(),
      ),
      GoRoute(
        path: Routes.concept,
        builder: (_, __) => const ConceptScreen(),
      ),
      GoRoute(
        path: Routes.signIn,
        builder: (_, __) => const SignInScreen(),
      ),
      GoRoute(
        path: Routes.plantPicker,
        builder: (_, __) => const PlantPickerScreen(),
      ),
      GoRoute(
        path: Routes.firstMood,
        builder: (_, __) => const FirstMoodScreen(),
      ),
      GoRoute(
        path: Routes.pairing,
        builder: (_, __) => const PairingScreen(),
      ),
      GoRoute(
        path: Routes.garden,
        builder: (_, __) => const ScreenTimePage(),
      ),
    ],
  );
});
