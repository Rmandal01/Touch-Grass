import 'package:flutter/material.dart';

/// Shared layout for the onboarding wizard steps: a centered, max-width column
/// with a title, optional subtitle, body content, and a primary action button.
///
/// Keeps every step visually consistent without repeating boilerplate.
class OnboardingScaffold extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget child;
  final String primaryLabel;
  final VoidCallback? onPrimary;
  final bool primaryLoading;
  final Widget? footer;

  const OnboardingScaffold({
    super.key,
    required this.title,
    this.subtitle,
    required this.child,
    required this.primaryLabel,
    required this.onPrimary,
    this.primaryLoading = false,
    this.footer,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(title, style: theme.textTheme.headlineMedium),
                  if (subtitle != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      subtitle!,
                      style: theme.textTheme.bodyLarge
                          ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ],
                  const SizedBox(height: 28),
                  Flexible(child: child),
                  const SizedBox(height: 28),
                  FilledButton(
                    onPressed: primaryLoading ? null : onPrimary,
                    child: primaryLoading
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(primaryLabel),
                  ),
                  if (footer != null) ...[
                    const SizedBox(height: 12),
                    footer!,
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
