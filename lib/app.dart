import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/app_router.dart';
import 'core/theme.dart';

/// Root widget. Wires the GoRouter (with its auth/onboarding redirects) into a
/// MaterialApp.router and applies the GrowFlow theme.
class GrowFlowApp extends ConsumerWidget {
  const GrowFlowApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'GrowFlow',
      debugShowCheckedModeBanner: false,
      theme: buildGrowFlowTheme(),
      routerConfig: router,
    );
  }
}
