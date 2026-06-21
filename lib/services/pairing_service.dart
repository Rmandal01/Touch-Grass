import 'dart:math';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/supabase_client.dart';

/// Issues and manages device-link pairing tokens, mirroring `device_links`.
///
/// During onboarding the app creates a short pairing code; the user pastes it
/// into the Chrome extension popup so the extension can authenticate its
/// activity uploads without a full OAuth flow.
class PairingService {
  final SupabaseClient _client;

  PairingService({SupabaseClient? client}) : _client = client ?? supabase;

  /// Characters used for human-friendly codes — no ambiguous 0/O/1/I/L.
  static const String _alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  /// Generates a short, readable pairing code (e.g. "K7P-Q4M").
  static String _generateCode([Random? rng]) {
    final r = rng ?? Random.secure();
    String chunk(int n) =>
        List.generate(n, (_) => _alphabet[r.nextInt(_alphabet.length)]).join();
    return '${chunk(3)}-${chunk(3)}';
  }

  /// Creates a fresh pairing token for [userId] and returns the code to show.
  ///
  /// The code doubles as the `pairing_token` the extension sends with each
  /// upload; ingest-activity resolves it back to this user.
  Future<String> createPairingCode(String userId, {String? label}) async {
    final code = _generateCode();
    await _client.from('device_links').insert({
      'user_id': userId,
      'pairing_token': code,
      'label': label ?? 'Chrome extension',
    });
    return code;
  }

  /// Returns true once the extension has checked in with this token, i.e. the
  /// device_links row has a non-null last_seen_at. Lets the pairing screen show
  /// a "connected" state.
  Future<bool> isPaired(String pairingToken) async {
    final row = await _client
        .from('device_links')
        .select('last_seen_at')
        .eq('pairing_token', pairingToken)
        .maybeSingle();
    return row != null && row['last_seen_at'] != null;
  }
}
