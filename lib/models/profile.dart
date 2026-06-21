import '../core/constants.dart';

/// A user's GrowFlow profile, mirroring the `profiles` table.
///
/// Pure data class with no Supabase dependency so it can be unit-tested and
/// reused freely. Maps to/from the JSON returned by PostgREST.
class Profile {
  final String id;
  final String? displayName;
  final String? avatarUrl;
  final String plantType;
  final bool onboardingComplete;
  final DateTime? createdAt;

  const Profile({
    required this.id,
    this.displayName,
    this.avatarUrl,
    this.plantType = kDefaultPlantType,
    this.onboardingComplete = false,
    this.createdAt,
  });

  /// Builds a [Profile] from a Supabase/PostgREST row map.
  factory Profile.fromMap(Map<String, dynamic> map) {
    return Profile(
      id: map['id'] as String,
      displayName: map['display_name'] as String?,
      avatarUrl: map['avatar_url'] as String?,
      plantType: (map['plant_type'] as String?) ?? kDefaultPlantType,
      onboardingComplete: (map['onboarding_complete'] as bool?) ?? false,
      createdAt: map['created_at'] == null
          ? null
          : DateTime.parse(map['created_at'] as String),
    );
  }

  /// Serializes the writable columns for an insert/update. The `id` is included
  /// so this can be used directly with an upsert keyed on the primary key.
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'display_name': displayName,
      'avatar_url': avatarUrl,
      'plant_type': plantType,
      'onboarding_complete': onboardingComplete,
    };
  }

  /// Returns a copy with the given fields replaced. Used to apply onboarding
  /// edits (plant choice, completion flag) without mutating the original.
  Profile copyWith({
    String? displayName,
    String? avatarUrl,
    String? plantType,
    bool? onboardingComplete,
  }) {
    return Profile(
      id: id,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      plantType: plantType ?? this.plantType,
      onboardingComplete: onboardingComplete ?? this.onboardingComplete,
      createdAt: createdAt,
    );
  }
}
