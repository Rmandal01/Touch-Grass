import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/app_router.dart';
import 'widgets/onboarding_scaffold.dart';

/// Explains how GrowFlow works, then routes the user to Google sign-in.
class ConceptScreen extends StatelessWidget {
  const ConceptScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      title: 'How it works',
      subtitle: 'A few quick ideas before you plant your first seed.',
      primaryLabel: 'Sign in with Google',
      onPrimary: () => context.go(Routes.signIn),
      child: const Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ConceptRow(
            emoji: '🧠',
            text: 'Claude reviews your recent browsing, the time of day, and '
                'your stated mood or goal.',
          ),
          _ConceptRow(
            emoji: '📈',
            text: 'Productive time grows your plant. Long unproductive '
                'stretches make it wilt.',
          ),
          _ConceptRow(
            emoji: '☕',
            text: 'Breaks are fine — only sustained doomscrolling is penalized.',
          ),
        ],
      ),
    );
  }
}

/// A single labeled concept bullet (emoji + explanatory text).
class _ConceptRow extends StatelessWidget {
  final String emoji;
  final String text;

  const _ConceptRow({required this.emoji, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 28)),
          const SizedBox(width: 14),
          Expanded(
            child: Text(text, style: Theme.of(context).textTheme.bodyLarge),
          ),
        ],
      ),
    );
  }
}
