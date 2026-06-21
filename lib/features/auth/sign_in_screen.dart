import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../state/auth_provider.dart';
import '../onboarding/widgets/onboarding_scaffold.dart';

/// Google OAuth entry point. Kicks off Supabase's Google sign-in; once the auth
/// state changes to signed-in, the router redirect carries the user into the
/// onboarding wizard (plant picker).
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  bool _loading = false;

  /// Starts the Google OAuth flow, surfacing any failure as a snackbar.
  Future<void> _signIn() async {
    setState(() => _loading = true);
    try {
      await ref.read(authServiceProvider).signInWithGoogle();
      // On web this redirects away; on desktop the auth-state stream drives
      // navigation once the browser round-trip completes.
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sign-in failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      title: 'Sign in',
      subtitle: 'GrowFlow uses your Google account to save your garden.',
      primaryLabel: 'Continue with Google',
      primaryLoading: _loading,
      onPrimary: _signIn,
      child: const Center(
        child: Text('🔐', style: TextStyle(fontSize: 72)),
      ),
    );
  }
}
