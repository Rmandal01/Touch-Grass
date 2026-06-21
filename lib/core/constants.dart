// Static, app-wide constants for GrowFlow.

/// A selectable plant "look" the user can pick during onboarding. The string
/// [id] is what gets persisted to profiles.plant_type and plants.plant_type.
class PlantType {
  final String id;
  final String label;
  final String emoji;
  final String blurb;

  const PlantType({
    required this.id,
    required this.label,
    required this.emoji,
    required this.blurb,
  });
}

/// The plant looks offered in the onboarding plant picker. The first entry
/// (succulent) matches the profiles.plant_type default in the schema.
const List<PlantType> kPlantTypes = [
  PlantType(
    id: 'succulent',
    label: 'Succulent',
    emoji: '🌵',
    blurb: 'Hardy and forgiving — great for a first garden.',
  ),
  PlantType(
    id: 'fern',
    label: 'Fern',
    emoji: '🌿',
    blurb: 'Lush and leafy when you stay in flow.',
  ),
  PlantType(
    id: 'sunflower',
    label: 'Sunflower',
    emoji: '🌻',
    blurb: 'Bright and bold — blooms when you focus.',
  ),
  PlantType(
    id: 'bonsai',
    label: 'Bonsai',
    emoji: '🪴',
    blurb: 'Slow, deliberate growth for the deeply focused.',
  ),
];

/// The default plant look (must match the schema default of `succulent`).
const String kDefaultPlantType = 'succulent';

/// Deep-link URL Supabase redirects back to after Google OAuth on mobile.
///
/// Must match the intent-filter scheme/host in
/// android/app/src/main/AndroidManifest.xml and be listed in the Supabase
/// dashboard's allowed redirect URLs. On web this is unused (the browser origin
/// is the redirect target instead).
const String kMobileAuthRedirect = 'io.supabase.growflow://login-callback/';

/// Suggested mood/goal presets for the first-mood step. Free text is also allowed.
const List<String> kMoodPresets = [
  'Locked-in',
  'Finishing work',
  'Studying',
  'Vacation',
  'Casual browsing',
];
