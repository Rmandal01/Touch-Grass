import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../state/auth_provider.dart';
import 'widgets/onboarding_scaffold.dart';

/// Final onboarding step: issue a pairing code for the Chrome extension. The
/// user pastes this into the extension popup so it can upload activity. Finishing
/// here marks onboarding complete and the router sends the user to the garden.
class PairingScreen extends ConsumerStatefulWidget {
  const PairingScreen({super.key});

  @override
  ConsumerState<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends ConsumerState<PairingScreen> {
  String? _code;
  String? _error;
  bool _finishing = false;

  @override
  void initState() {
    super.initState();
    _issueCode();
  }

  /// Requests a fresh pairing code for the signed-in user.
  Future<void> _issueCode() async {
    final user = ref.read(authServiceProvider).currentUser;
    if (user == null) return;
    try {
      final code =
          await ref.read(pairingServiceProvider).createPairingCode(user.id);
      if (mounted) setState(() => _code = code);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }

  /// Marks onboarding complete; the router redirect then routes to the garden.
  Future<void> _finish() async {
    setState(() => _finishing = true);
    await ref.read(profileControllerProvider.notifier).finishOnboarding();
    // No manual navigation: the router redirect carries us to the garden once
    // onboarding_complete flips true.
  }

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      title: 'Connect your browser',
      subtitle: 'Open the GrowFlow Chrome extension and paste this code to start '
          'tracking your activity. You can also do this later.',
      primaryLabel: 'Finish setup',
      primaryLoading: _finishing,
      onPrimary: _finish,
      footer: TextButton(
        onPressed: _finishing ? null : _finish,
        child: const Text('Skip for now'),
      ),
      child: Center(child: _buildCode(context)),
    );
  }

  /// Renders the pairing code, an error, or a spinner while it is generated.
  Widget _buildCode(BuildContext context) {
    if (_error != null) {
      return Text(
        "Couldn't create a pairing code: $_error",
        textAlign: TextAlign.center,
        style: TextStyle(color: Theme.of(context).colorScheme.error),
      );
    }
    if (_code == null) {
      return const CircularProgressIndicator();
    }

    final scheme = Theme.of(context).colorScheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            color: scheme.primaryContainer,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            _code!,
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              letterSpacing: 4,
            ),
          ),
        ),
        const SizedBox(height: 12),
        TextButton.icon(
          onPressed: () {
            Clipboard.setData(ClipboardData(text: _code!));
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Code copied')),
            );
          },
          icon: const Icon(Icons.copy, size: 18),
          label: const Text('Copy code'),
        ),
      ],
    );
  }
}
