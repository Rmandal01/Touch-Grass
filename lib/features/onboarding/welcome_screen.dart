import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/app_router.dart';
import 'widgets/onboarding_scaffold.dart';

/// First onboarding screen: a warm welcome that sends the user to the concept
/// explainer.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      title: 'Welcome to GrowFlow 🌱',
      subtitle:
          'Grow a virtual garden by spending your time well. Focus makes it '
          'flourish; doomscrolling makes it wilt.',
      primaryLabel: 'Get started',
      onPrimary: () => context.go(Routes.concept),
      child: const Center(
        child: Text('🪴', style: TextStyle(fontSize: 96)),
      ),
    );
  }
}
