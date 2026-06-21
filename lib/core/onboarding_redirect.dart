// Pure, dependency-free routing rules for GrowFlow's onboarding/auth flow.
//
// Kept separate from the GoRouter wiring so the decision logic can be unit
// tested without Flutter, Supabase, or the widget tree.

/// Named route paths. Centralized so redirect logic and screens agree.
class Routes {
  static const welcome = '/welcome';
  static const concept = '/concept';
  static const signIn = '/sign-in';
  static const plantPicker = '/onboarding/plant';
  static const firstMood = '/onboarding/mood';
  static const pairing = '/onboarding/pairing';
  static const garden = '/garden';

  /// Routes shown before the user has signed in.
  static const preAuth = {welcome, concept, signIn};

  /// Routes that make up the post-sign-in onboarding wizard.
  static const onboardingSteps = {plantPicker, firstMood, pairing};
}

/// Decides where to send the user given the current [location], whether they
/// are [isSignedIn], and their [onboardingComplete] flag (null while the profile
/// is still loading). Returns a path to redirect to, or null to stay put.
///
/// Rules:
///  - Signed out: only the pre-auth screens are allowed; anything else → welcome.
///  - Signed in, profile still loading: stay put (a splash/loading is shown).
///  - Signed in, onboarding incomplete: force into the onboarding wizard.
///  - Signed in, onboarding complete: keep them out of auth/onboarding → garden.
String? resolveRedirect({
  required String location,
  required bool isSignedIn,
  required bool? onboardingComplete,
}) {
  if (!isSignedIn) {
    return Routes.preAuth.contains(location) ? null : Routes.welcome;
  }

  // Signed in but profile not loaded yet — wait without bouncing the user.
  if (onboardingComplete == null) return null;

  if (!onboardingComplete) {
    // Let them move freely among onboarding steps; pull them out of pre-auth/garden.
    if (Routes.onboardingSteps.contains(location)) return null;
    return Routes.plantPicker;
  }

  // Onboarding done: auth and onboarding screens are off-limits.
  if (Routes.preAuth.contains(location) ||
      Routes.onboardingSteps.contains(location)) {
    return Routes.garden;
  }
  return null;
}
