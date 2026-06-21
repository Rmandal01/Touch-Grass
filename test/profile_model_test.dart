import 'package:flutter_test/flutter_test.dart';
import 'package:growflow/models/profile.dart';

void main() {
  group('Profile.fromMap', () {
    test('parses a full PostgREST row', () {
      final profile = Profile.fromMap({
        'id': 'user-123',
        'display_name': 'Ada Lovelace',
        'avatar_url': 'https://example.com/a.png',
        'plant_type': 'fern',
        'onboarding_complete': true,
        'created_at': '2026-06-20T12:00:00.000Z',
      });

      expect(profile.id, 'user-123');
      expect(profile.displayName, 'Ada Lovelace');
      expect(profile.plantType, 'fern');
      expect(profile.onboardingComplete, isTrue);
      expect(profile.createdAt, DateTime.utc(2026, 6, 20, 12));
    });

    test('applies defaults for missing optional columns', () {
      final profile = Profile.fromMap({'id': 'user-1'});

      expect(profile.displayName, isNull);
      expect(profile.plantType, 'succulent'); // schema default
      expect(profile.onboardingComplete, isFalse);
      expect(profile.createdAt, isNull);
    });
  });

  group('Profile.copyWith', () {
    test('replaces only the given fields and keeps id/createdAt', () {
      final original = Profile.fromMap({
        'id': 'user-1',
        'plant_type': 'succulent',
        'created_at': '2026-06-20T12:00:00.000Z',
      });

      final updated =
          original.copyWith(plantType: 'sunflower', onboardingComplete: true);

      expect(updated.id, 'user-1');
      expect(updated.plantType, 'sunflower');
      expect(updated.onboardingComplete, isTrue);
      expect(updated.createdAt, original.createdAt);
    });
  });

  group('Profile.toMap', () {
    test('serializes the writable columns including id for upsert', () {
      final map = const Profile(
        id: 'user-1',
        displayName: 'Grace',
        plantType: 'bonsai',
        onboardingComplete: false,
      ).toMap();

      expect(map, {
        'id': 'user-1',
        'display_name': 'Grace',
        'avatar_url': null,
        'plant_type': 'bonsai',
        'onboarding_complete': false,
      });
    });
  });
}
