import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../state/auth_provider.dart';

/// Post-onboarding home. Phase-1 placeholder: confirms the user landed here and
/// offers sign-out. The full PlantRenderer and score UI are built in the garden
/// and productivity features.
class GardenScreen extends ConsumerWidget {
  const GardenScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileControllerProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Your garden'),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authServiceProvider).signOut(),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('🪴', style: TextStyle(fontSize: 96)),
            const SizedBox(height: 16),
            Text(
              'Welcome${profile?.displayName != null ? ', ${profile!.displayName}' : ''}!',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            const Text('Your garden grows here.'),
          ],
        ),
      ),
    );
  }
}
