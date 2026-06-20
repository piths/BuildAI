import { FloorPlan, Room, RoomType, ClimateZoneId } from './types';
import { CLIMATE_ZONES } from './climateZones';

// ─────────────────────────────────────────────────────────────────────────────
// Building-code compliance checker (Kenya).
// Runs automated checks against the Building Code of Kenya plus advisory and
// climate-specific recommendations.
// ─────────────────────────────────────────────────────────────────────────────

export type ComplianceStatus = 'pass' | 'fail' | 'warning';

export interface ComplianceCheck {
  id: string;
  category: string;
  description: string;
  status: ComplianceStatus;
  details: string;
  regulation: string;
}

export interface ComplianceReport {
  checks: ComplianceCheck[];
  passed: number;
  failed: number;
  warnings: number;
  total: number;
  score: number; // 0-100
}

const HABITABLE: RoomType[] = [
  'living_room',
  'bedroom',
  'dining_room',
  'office',
  'classroom',
  'reception',
  'conference_room',
  'staffroom',
];

function allRooms(plan: FloorPlan): Room[] {
  return plan.floors.flatMap((f) => f.rooms);
}

function roomArea(r: Room): number {
  return r.widthMeters * r.depthMeters;
}

function roomDoors(r: Room) {
  const walls = [r.walls.north, r.walls.south, r.walls.east, r.walls.west];
  return walls.flatMap((w) => (w?.openings || []).filter((o) => o.type === 'door'));
}

function roomWindows(r: Room) {
  const walls = [r.walls.north, r.walls.south, r.walls.east, r.walls.west];
  return walls.flatMap((w) => (w?.openings || []).filter((o) => o.type === 'window'));
}

export function checkCompliance(plan: FloorPlan, climateZone?: ClimateZoneId): ComplianceReport {
  const checks: ComplianceCheck[] = [];
  const rooms = allRooms(plan);

  // 1. Minimum room sizes
  const undersizedHabitable = rooms.filter((r) => HABITABLE.includes(r.type) && roomArea(r) < 7.5);
  const undersizedKitchen = rooms.filter((r) => r.type === 'kitchen' && roomArea(r) < 5.5);
  const undersizedBath = rooms.filter((r) => (r.type === 'bathroom' || r.type === 'toilet') && roomArea(r) < 2.5);
  const sizeIssues = undersizedHabitable.length + undersizedKitchen.length + undersizedBath.length;
  checks.push({
    id: 'min_room_size',
    category: 'Room Sizes',
    description: 'Minimum habitable room, kitchen and bathroom areas',
    status: sizeIssues > 0 ? 'fail' : 'pass',
    details:
      sizeIssues > 0
        ? `${sizeIssues} room(s) below minimum: ${[...undersizedHabitable, ...undersizedKitchen, ...undersizedBath]
            .map((r) => `${r.name} (${roomArea(r).toFixed(1)}m²)`)
            .join(', ')}`
        : 'All rooms meet minimum area requirements (habitable ≥7.5m², kitchen ≥5.5m², bathroom ≥2.5m²).',
    regulation: 'Building Code of Kenya, Part VI',
  });

  // 2. Minimum corridor width
  const corridors = rooms.filter((r) => r.type === 'corridor' || r.type === 'hallway');
  const narrowCorridors = corridors.filter((r) => Math.min(r.widthMeters, r.depthMeters) < 1.2);
  checks.push({
    id: 'corridor_width',
    category: 'Circulation',
    description: 'Minimum corridor width of 1.2m',
    status: corridors.length === 0 ? 'pass' : narrowCorridors.length > 0 ? 'fail' : 'pass',
    details:
      narrowCorridors.length > 0
        ? `${narrowCorridors.length} corridor(s) narrower than 1.2m: ${narrowCorridors
            .map((r) => `${r.name} (${Math.min(r.widthMeters, r.depthMeters).toFixed(2)}m)`)
            .join(', ')}`
        : corridors.length === 0
        ? 'No dedicated corridors in plan (open circulation).'
        : 'All corridors are at least 1.2m wide.',
    regulation: 'Building Code of Kenya',
  });

  // 3. Door widths
  const doorIssues: string[] = [];
  for (const r of rooms) {
    const doors = roomDoors(r);
    if (doors.length === 0) continue;
    const minDoor = Math.min(...doors.map((d) => d.widthMeters));
    const required = r.type === 'bathroom' || r.type === 'toilet' ? 0.7 : 0.8;
    if (minDoor < required) doorIssues.push(`${r.name} (${(minDoor * 1000).toFixed(0)}mm)`);
  }
  checks.push({
    id: 'door_widths',
    category: 'Openings',
    description: 'Minimum door widths (rooms ≥800mm, bathrooms ≥700mm)',
    status: doorIssues.length > 0 ? 'fail' : 'pass',
    details:
      doorIssues.length > 0
        ? `Doors below minimum width: ${doorIssues.join(', ')}`
        : 'All door widths meet minimum requirements.',
    regulation: 'Building Code of Kenya — Means of access',
  });

  // 4. Window-to-floor area ratio
  const poorlyLit: string[] = [];
  for (const r of rooms.filter((x) => HABITABLE.includes(x.type))) {
    const winArea = roomWindows(r).reduce((s, w) => s + w.widthMeters * (w.heightMeters ?? 1.2), 0);
    const ratio = winArea / roomArea(r);
    if (ratio < 0.1) poorlyLit.push(`${r.name} (${(ratio * 100).toFixed(0)}%)`);
  }
  checks.push({
    id: 'natural_lighting',
    category: 'Natural Lighting',
    description: 'Window area ≥10% of floor area for habitable rooms',
    status: poorlyLit.length > 0 ? 'warning' : 'pass',
    details:
      poorlyLit.length > 0
        ? `Below 10% glazing ratio: ${poorlyLit.join(', ')}. Consider larger windows.`
        : 'All habitable rooms have adequate natural lighting.',
    regulation: 'Natural lighting requirements',
  });

  // 5. Ventilation — habitable rooms need an openable window
  const unventilated = rooms
    .filter((r) => HABITABLE.includes(r.type) || r.type === 'kitchen' || r.type === 'bathroom')
    .filter((r) => roomWindows(r).length === 0);
  checks.push({
    id: 'ventilation',
    category: 'Ventilation',
    description: 'Every habitable room, kitchen and bathroom has a window',
    status: unventilated.length > 0 ? 'fail' : 'pass',
    details:
      unventilated.length > 0
        ? `No window found in: ${unventilated.map((r) => r.name).join(', ')}`
        : 'All rooms requiring ventilation have windows.',
    regulation: 'Building Code of Kenya — Ventilation',
  });

  // 6. Ceiling height
  const lowFloors = plan.floors.filter((f) => (f.heightMeters || 3) < 2.75);
  checks.push({
    id: 'ceiling_height',
    category: 'Ceiling Height',
    description: 'Minimum 2.75m floor-to-ceiling height for habitable rooms',
    status: lowFloors.length > 0 ? 'fail' : 'pass',
    details:
      lowFloors.length > 0
        ? `Floors below 2.75m: ${lowFloors.map((f) => `${f.floorName} (${f.heightMeters}m)`).join(', ')}`
        : 'All floors meet the minimum ceiling height.',
    regulation: 'Building Code of Kenya',
  });

  // 7. Accessibility
  const hasAccessibleEntrance = rooms.some((r) => roomDoors(r).some((d) => d.widthMeters >= 0.9));
  checks.push({
    id: 'accessibility',
    category: 'Accessibility',
    description: 'At least one accessible entrance (door ≥900mm)',
    status: hasAccessibleEntrance ? 'pass' : 'warning',
    details: hasAccessibleEntrance
      ? 'An accessible-width entrance (≥900mm) is present.'
      : 'No door is 900mm or wider — add a wider accessible entrance.',
    regulation: 'Accessibility guidelines',
  });

  // 8. Fire safety — multi-storey egress
  const staircases = rooms.filter((r) => r.type === 'staircase').length;
  if (plan.floors.length > 1) {
    checks.push({
      id: 'fire_egress',
      category: 'Fire Safety',
      description: 'Multi-storey buildings need adequate vertical egress',
      status: staircases >= 1 ? (staircases >= 2 ? 'pass' : 'warning') : 'fail',
      details:
        staircases === 0
          ? 'Multi-storey building has no staircase in the plan.'
          : staircases === 1
          ? 'Only one staircase — a second escape stair is recommended for larger buildings.'
          : `${staircases} staircases provide good egress.`,
      regulation: 'Fire safety — means of escape',
    });
  }

  // 9. Structural spans
  const wideRooms = rooms.filter((r) => Math.max(r.widthMeters, r.depthMeters) > 4.5);
  const veryWide = rooms.filter((r) => Math.max(r.widthMeters, r.depthMeters) > 6);
  checks.push({
    id: 'structural_span',
    category: 'Structural',
    description: 'Wide spans may require beam support',
    status: veryWide.length > 0 ? 'fail' : wideRooms.length > 0 ? 'warning' : 'pass',
    details:
      veryWide.length > 0
        ? `Spans over 6m require beams: ${veryWide.map((r) => `${r.name} (${Math.max(r.widthMeters, r.depthMeters).toFixed(1)}m)`).join(', ')}`
        : wideRooms.length > 0
        ? `Spans over 4.5m may need beam support: ${wideRooms.map((r) => r.name).join(', ')}`
        : 'All room spans are within typical slab/beam limits.',
    regulation: 'Structural design guidance',
  });

  // 10+. Climate-specific advisory checks
  if (climateZone) {
    checks.push(...climateChecks(plan, climateZone));
  }

  const passed = checks.filter((c) => c.status === 'pass').length;
  const failed = checks.filter((c) => c.status === 'fail').length;
  const warnings = checks.filter((c) => c.status === 'warning').length;
  const total = checks.length;
  const score = total > 0 ? Math.round(((passed + warnings * 0.5) / total) * 100) : 100;

  return { checks, passed, failed, warnings, total, score };
}

function climateChecks(plan: FloorPlan, zoneId: ClimateZoneId): ComplianceCheck[] {
  const zone = CLIMATE_ZONES[zoneId];
  const out: ComplianceCheck[] = [];
  const rooms = allRooms(plan);
  const maxCeiling = Math.max(...plan.floors.map((f) => f.heightMeters || 3));

  if (zoneId === 'coastal') {
    out.push({
      id: 'climate_coastal_ceiling',
      category: `Climate — ${zone.name}`,
      description: 'High ceilings aid hot-air dissipation at the coast',
      status: maxCeiling >= 3.2 ? 'pass' : 'warning',
      details:
        maxCeiling >= 3.2
          ? 'Ceiling height supports coastal heat management.'
          : `Ceiling is ${maxCeiling}m — recommend 3.2m+ and louvre windows for the humid coast.`,
      regulation: 'Climate-responsive design (coastal)',
    });
  } else if (zoneId === 'arid_north') {
    const bigWestWindows = rooms.some((r) =>
      (r.walls?.west?.openings || []).some((o) => o.type === 'window' && o.widthMeters > 1.2),
    );
    out.push({
      id: 'climate_arid_windows',
      category: `Climate — ${zone.name}`,
      description: 'Minimise east/west glazing in hot arid zones',
      status: bigWestWindows ? 'warning' : 'pass',
      details: bigWestWindows
        ? 'Large west-facing windows detected — reduce them and use thick walls (300mm) for thermal mass.'
        : 'Glazing strategy is suitable for the hot arid climate.',
      regulation: 'Climate-responsive design (arid)',
    });
  } else if (zoneId === 'highland_central' || zoneId === 'rift_valley') {
    out.push({
      id: 'climate_highland_insulation',
      category: `Climate — ${zone.name}`,
      description: 'Ceiling insulation recommended for cold highland nights',
      status: 'warning',
      details:
        'Highland nights are cold — insulate the ceiling (50mm polystyrene/glasswool). Strong solar radiation makes solar water heating very viable.',
      regulation: 'Climate-responsive design (highland)',
    });
  } else if (zoneId === 'western_lake') {
    const overhang = plan.roofing?.overhangMeters ?? 0.6;
    out.push({
      id: 'climate_western_overhang',
      category: `Climate — ${zone.name}`,
      description: 'Wide roof overhangs for high rainfall',
      status: overhang >= 0.9 ? 'pass' : 'warning',
      details:
        overhang >= 0.9
          ? 'Roof overhang is adequate for heavy rainfall.'
          : `Roof overhang is ${(overhang * 1000).toFixed(0)}mm — recommend 900mm+ with good guttering for the high-rainfall lake region.`,
      regulation: 'Climate-responsive design (western/lake)',
    });
  }

  return out;
}
