import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/app_router.dart';
import '../../core/constants.dart';
import '../../state/auth_provider.dart';
import 'widgets/onboarding_scaffold.dart';

/// Onboarding step where the user states their current mood/goal/task. This
/// becomes the active mood_session Claude is told about when scoring.
class FirstMoodScreen extends ConsumerStatefulWidget {
  const FirstMoodScreen({super.key});

  @override
  ConsumerState<FirstMoodScreen> createState() => _FirstMoodScreenState();
}

class _FirstMoodScreenState extends ConsumerState<FirstMoodScreen> {
  String? _selectedPreset;
  final _goalController = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _goalController.dispose();
    super.dispose();
  }

  /// The effective mood string: a tapped preset, or typed goal text as a
  /// fallback so the Continue button is never a dead end.
  String? get _effectiveMood {
    if (_selectedPreset != null) return _selectedPreset;
    final typed = _goalController.text.trim();
    return typed.isEmpty ? null : typed;
  }

  /// Saves the active mood/goal, then advances to the pairing step.
  Future<void> _continue() async {
    final mood = _effectiveMood;
    if (mood == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pick a mood or describe your goal.')),
      );
      return;
    }
    setState(() => _saving = true);
    await ref.read(profileControllerProvider.notifier).setFirstMood(
          mood: mood,
          goal: _goalController.text.trim().isEmpty
              ? null
              : _goalController.text.trim(),
        );
    if (mounted) {
      setState(() => _saving = false);
      context.go(Routes.pairing);
    }
  }

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      title: "What's the vibe?",
      subtitle: 'This helps Claude judge your time fairly. Vacation is lenient; '
          'locked-in is strict.',
      primaryLabel: 'Continue',
      primaryLoading: _saving,
      onPrimary: _continue,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final preset in kMoodPresets)
                ChoiceChip(
                  label: Text(preset),
                  selected: _selectedPreset == preset,
                  onSelected: (_) =>
                      setState(() => _selectedPreset = preset),
                ),
            ],
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _goalController,
            decoration: const InputDecoration(
              labelText: 'Goal or task (optional)',
              hintText: 'e.g. finish the slide deck',
            ),
            onChanged: (_) => setState(() {}),
          ),
        ],
      ),
    );
  }
}
