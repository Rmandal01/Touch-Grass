import 'package:flutter/material.dart';

import 'screen_time_page.dart';

void main() {
  runApp(const GrowFlowApp());
}

class GrowFlowApp extends StatelessWidget {
  const GrowFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GrowFlow',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF2E7D32),
        useMaterial3: true,
      ),
      home: const ScreenTimePage(),
    );
  }
}
