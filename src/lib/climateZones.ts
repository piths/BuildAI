import { ClimateZoneId } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Kenya climate-zone data and climate-responsive design recommendations.
// ─────────────────────────────────────────────────────────────────────────────

export interface ClimateRecommendations {
  wallThickness: number; // mm
  roofPitch: number; // degrees
  ventilation: string;
  insulation: string;
  roofMaterial: string;
  windowSize: string;
  orientation: string;
  specialNotes: string;
}

export interface ClimateZone {
  id: ClimateZoneId;
  name: string;
  nameSwahili: string;
  counties: string[];
  avgTemp: { min: number; max: number };
  rainfall: string;
  humidity: string;
  recommendations: ClimateRecommendations;
}

export const CLIMATE_ZONES: Record<ClimateZoneId, ClimateZone> = {
  highland_central: {
    id: 'highland_central',
    name: 'Central Highlands',
    nameSwahili: 'Nyanda za Juu za Kati',
    counties: ['Nairobi', 'Kiambu', "Murang'a", 'Nyeri', 'Kirinyaga', 'Nyandarua', 'Laikipia'],
    avgTemp: { min: 10, max: 26 },
    rainfall: 'moderate_high',
    humidity: 'moderate',
    recommendations: {
      wallThickness: 200,
      roofPitch: 25,
      ventilation: 'moderate',
      insulation: 'recommended',
      roofMaterial: 'corrugated_iron_sheets',
      windowSize: 'medium',
      orientation: 'North-facing living areas for warmth',
      specialNotes:
        'Consider a fireplace in the living room. Rainwater harvesting very viable. Cold nights — insulate the ceiling.',
    },
  },
  coastal: {
    id: 'coastal',
    name: 'Coastal Lowlands',
    nameSwahili: 'Nyanda za Pwani',
    counties: ['Mombasa', 'Kilifi', 'Kwale', 'Tana River', 'Lamu'],
    avgTemp: { min: 22, max: 33 },
    rainfall: 'moderate',
    humidity: 'high',
    recommendations: {
      wallThickness: 150,
      roofPitch: 30,
      ventilation: 'critical',
      insulation: 'not_needed',
      roofMaterial: 'makuti_or_iron_sheets',
      windowSize: 'large',
      orientation: 'Maximise cross-ventilation, minimise west-facing walls',
      specialNotes:
        'Prioritise ventilation over insulation. Use louvre windows and high ceilings (3.2m+). Salt air corrodes — use aluminium not steel windows. Elevate the foundation against flooding.',
    },
  },
  western_lake: {
    id: 'western_lake',
    name: 'Western & Lake Region',
    nameSwahili: 'Magharibi na Ziwa',
    counties: ['Kisumu', 'Kakamega', 'Bungoma', 'Busia', 'Vihiga', 'Siaya', 'Homa Bay'],
    avgTemp: { min: 16, max: 30 },
    rainfall: 'high',
    humidity: 'high',
    recommendations: {
      wallThickness: 200,
      roofPitch: 30,
      ventilation: 'important',
      insulation: 'light',
      roofMaterial: 'corrugated_iron_sheets',
      windowSize: 'medium_large',
      orientation: 'Maximise shade on the west side',
      specialNotes:
        'Heavy rainfall — ensure wide roof overhang (900mm+) and good guttering. Treat timber against termites. Wider verandas help with shade.',
    },
  },
  arid_north: {
    id: 'arid_north',
    name: 'Arid & Semi-Arid (North/East)',
    nameSwahili: 'Jangwa na Nusu-Jangwa',
    counties: ['Turkana', 'Marsabit', 'Isiolo', 'Garissa', 'Wajir', 'Mandera', 'Samburu'],
    avgTemp: { min: 20, max: 38 },
    rainfall: 'low',
    humidity: 'low',
    recommendations: {
      wallThickness: 300,
      roofPitch: 10,
      ventilation: 'night_ventilation',
      insulation: 'critical',
      roofMaterial: 'corrugated_iron_sheets_with_insulation',
      windowSize: 'small',
      orientation: 'Minimise east/west openings; use thick walls for thermal mass',
      specialNotes:
        'Thick walls (300mm) for thermal mass. Small east/west windows. Low-pitch insulated roof. Consider a courtyard for cooling. Maximise water storage. Use light-coloured exterior paint to reflect heat.',
    },
  },
  rift_valley: {
    id: 'rift_valley',
    name: 'Rift Valley Highlands',
    nameSwahili: 'Nyanda za Juu za Bonde la Ufa',
    counties: ['Nakuru', 'Uasin Gishu', 'Nandi', 'Kericho', 'Bomet', 'Baringo', 'Elgeyo-Marakwet'],
    avgTemp: { min: 8, max: 25 },
    rainfall: 'moderate',
    humidity: 'moderate_low',
    recommendations: {
      wallThickness: 200,
      roofPitch: 25,
      ventilation: 'moderate',
      insulation: 'important',
      roofMaterial: 'corrugated_iron_sheets',
      windowSize: 'medium',
      orientation: 'North-facing for solar gain',
      specialNotes:
        'Can get very cold — insulate the ceiling with 50mm polystyrene or glasswool. Solar water heating is excellent here thanks to strong high-altitude radiation.',
    },
  },
};

export const CLIMATE_ZONE_LIST: ClimateZone[] = Object.values(CLIMATE_ZONES);

/** Best-effort county → climate zone lookup. */
export function zoneForCounty(county: string): ClimateZoneId | null {
  const c = county.trim().toLowerCase();
  for (const zone of CLIMATE_ZONE_LIST) {
    if (zone.counties.some((x) => x.toLowerCase() === c)) return zone.id;
  }
  return null;
}
