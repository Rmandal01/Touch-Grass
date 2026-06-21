import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/app_router.dart';
import '../../core/constants.dart';
import '../../state/auth_provider.dart';
import 'widgets/onboarding_scaffold.dart';

/// First post-sign-in onboarding step: choose the plant "look". Persists the
/// choice to the profile, then advances to the first-mood step.
class PlantPickerScreen extends ConsumerStatefulWidget {
  const PlantPickerScreen({super.key});

  @override
  ConsumerState<PlantPickerScreen> createState() => _PlantPickerScreenState();
}

class _PlantPickerScreenState extends ConsumerState<PlantPickerScreen> {
  String _selected = kDefaultPlantType;
  bool _saving = false;

  /// Saves the selected plant type and moves on to the mood step.
  Future<void> _continue() async {
    setState(() => _saving = true);
    await ref.read(profileControllerProvider.notifier).choosePlant(_selected);
    if (mounted) {
      setState(() => _saving = false);
      context.go(Routes.firstMood);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Pre-select whatever the profile already has (e.g. resuming onboarding).
    final profilePlant = ref.watch(profileControllerProvider).maybeWhen(
          data: (p) => p?.plantType,
          orElse: () => null,
        );
    if (profilePlant != null && _selected == kDefaultPlantType) {
      _selected = profilePlant;
    }

    return OnboardingScaffold(
      title: 'Pick your plant',
      subtitle: 'You can grow others later. This one starts your garden.',
      primaryLabel: 'Continue',
      primaryLoading: _saving,
      onPrimary: _continue,
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.3,
        children: [
          for (final plant in kPlantTypes)
            _PlantTile(
              plant: plant,
              selected: _selected == plant.id,
              onTap: () => setState(() => _selected = plant.id),
            ),
        ],
      ),
    );
  }
}

/// A selectable plant card in the picker grid.
class _PlantTile extends StatelessWidget {
  final PlantType plant;
  final bool selected;
  final VoidCallback onTap;

  const _PlantTile({
    required this.plant,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        decoration: BoxDecoration(
          color: selected ? scheme.primaryContainer : scheme.surface,
          border: Border.all(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: selected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(14),
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(plant.emoji, style: const TextStyle(fontSize: 40)),
            const SizedBox(height: 6),
            Text(
              plant.label,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}
