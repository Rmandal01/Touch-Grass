import 'package:flutter_test/flutter_test.dart';
import 'package:growflow/core/onboarding_redirect.dart';

void main() {
  group('resolveRedirect — signed out', () {
    test('allows the pre-auth screens', () {
      for (final route in Routes.preAuth) {
        expect(
          resolveRedirect(
            location: route,
            isSignedIn: false,
            onboardingComplete: null,
          ),
          isNull,
          reason: '$route should be reachable while signed out',
        );
      }
    });

    test('redirects protected routes to welcome', () {
      expect(
        resolveRedirect(
          location: Routes.garden,
          isSignedIn: false,
          onboardingComplete: null,
        ),
        Routes.welcome,
      );
      expect(
        resolveRedirect(
          location: Routes.plantPicker,
          isSignedIn: false,
          onboardingComplete: null,
        ),
        Routes.welcome,
      );
    });
  });

  group('resolveRedirect — signed in, profile loading', () {
    test('stays put while onboarding flag is unknown', () {
      expect(
        resolveRedirect(
          location: Routes.garden,
          isSignedIn: true,
          onboardingComplete: null,
        ),
        isNull,
      );
    });
  });

  group('resolveRedirect — signed in, onboarding incomplete', () {
    test('lets the user move among onboarding steps', () {
      for (final step in Routes.onboardingSteps) {
        expect(
          resolveRedirect(
            location: step,
            isSignedIn: true,
            onboardingComplete: false,
          ),
          isNull,
          reason: '$step should be reachable mid-onboarding',
        );
      }
    });

    test('pulls the user out of pre-auth and garden into the wizard', () {
      expect(
        resolveRedirect(
          location: Routes.signIn,
          isSignedIn: true,
          onboardingComplete: false,
        ),
        Routes.plantPicker,
      );
      expect(
        resolveRedirect(
          location: Routes.garden,
          isSignedIn: true,
          onboardingComplete: false,
        ),
        Routes.plantPicker,
      );
    });
  });

  group('resolveRedirect — signed in, onboarding complete', () {
    test('sends auth/onboarding screens to the garden', () {
      for (final route in {...Routes.preAuth, ...Routes.onboardingSteps}) {
        expect(
          resolveRedirect(
            location: route,
            isSignedIn: true,
            onboardingComplete: true,
          ),
          Routes.garden,
          reason: '$route should redirect to the garden once onboarded',
        );
      }
    });

    test('leaves the garden alone', () {
      expect(
        resolveRedirect(
          location: Routes.garden,
          isSignedIn: true,
          onboardingComplete: true,
        ),
        isNull,
      );
    });
  });
}
