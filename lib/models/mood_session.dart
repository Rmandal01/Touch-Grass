/// A user's active mood/goal/task, mirroring the `mood_sessions` table.
///
/// The row with [isActive] == true is the current mood/goal Claude is told about
/// when scoring productivity. Pure data class (no Supabase dependency).
class MoodSession {
  final String? id;
  final String userId;
  final String mood;
  final String? goal;
  final bool isActive;
  final DateTime? startedAt;
  final DateTime? endedAt;

  const MoodSession({
    this.id,
    required this.userId,
    required this.mood,
    this.goal,
    this.isActive = true,
    this.startedAt,
    this.endedAt,
  });

  /// Builds a [MoodSession] from a Supabase/PostgREST row map.
  factory MoodSession.fromMap(Map<String, dynamic> map) {
    return MoodSession(
      id: map['id'] as String?,
      userId: map['user_id'] as String,
      mood: map['mood'] as String,
      goal: map['goal'] as String?,
      isActive: (map['is_active'] as bool?) ?? true,
      startedAt: map['started_at'] == null
          ? null
          : DateTime.parse(map['started_at'] as String),
      endedAt: map['ended_at'] == null
          ? null
          : DateTime.parse(map['ended_at'] as String),
    );
  }

  /// Serializes the writable columns for an insert. Server defaults fill in id,
  /// started_at, etc.
  Map<String, dynamic> toInsert() {
    return {
      'user_id': userId,
      'mood': mood,
      'goal': goal,
      'is_active': isActive,
    };
  }
}
