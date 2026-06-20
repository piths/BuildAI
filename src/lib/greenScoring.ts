import { FloorPlan, Room } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Green building score — sustainability rating (SDG 11 / SDG 9 aligned).
// Five categories, 20 points each, total 100.
// ─────────────────────────────────────────────────────────────────────────────

export type GreenStatus = 'excellent' | 'good' | 'needs_improvement' | 'poor';

export interface GreenScoreCategory {
  id: string;
  name: string;
  nameSwahili: string;
  maxPoints: number;
  earnedPoints: number;
  status: GreenStatus;
  recommendations: string[];
}

export interface GreenScore {
  totalScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  categories: GreenScoreCategory[];
  sdgs: string[];
}

function statusFor(earned: number, max: number): GreenStatus {
  const r = earned / max;
  if (r >= 0.85) return 'excellent';
  if (r >= 0.6) return 'good';
  if (r >= 0.35) return 'needs_improvement';
  return 'poor';
}

function gradeFor(score: number): GreenScore['grade'] {
  if (score >= 90) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

function allRooms(plan: FloorPlan): Room[] {
  return plan.floors.flatMap((f) => f.rooms);
}

const HABITABLE = ['living_room', 'bedroom', 'dining_room', 'office', 'classroom', 'reception'];

function roomWindows(r: Room) {
  const sides: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
  return sides.flatMap((side) =>
    (r.walls[side]?.openings || []).filter((o) => o.type === 'window').map((o) => ({ side, o })),
  );
}

function hasCrossVentilation(r: Room): boolean {
  const sidesWithWindows = new Set(roomWindows(r).map((x) => x.side));
  return (
    (sidesWithWindows.has('north') && sidesWithWindows.has('south')) ||
    (sidesWithWindows.has('east') && sidesWithWindows.has('west'))
  );
}

export function calculateGreenScore(plan: FloorPlan): GreenScore {
  const rooms = allRooms(plan);
  const ext = plan.externalWorks;
  const categories: GreenScoreCategory[] = [];

  // 1. WATER MANAGEMENT
  {
    let pts = 0;
    const recs: string[] = [];
    const hasTank = ext?.hasWaterTank ?? false;
    const tankL = ext?.waterTankLiters ?? 0;
    if (hasTank) pts += 8;
    else recs.push('🌧️ Add a rainwater harvesting tank → +8 points');
    if (tankL >= 10000) pts += 4;
    else if (hasTank) recs.push('💧 Upsize the tank to 10,000L+ → +4 points');
    else recs.push('💧 Specify a 10,000L tank → +4 points');
    // Water-efficient fixtures — advisory credit
    pts += 4;
    recs.push('🚽 Confirm dual-flush WCs & low-flow taps (credited).');
    // Greywater potential
    const hasWetServices = rooms.some((r) => ['laundry', 'kitchen', 'bathroom'].includes(r.type));
    if (hasWetServices) pts += 4;
    else recs.push('♻️ Separate greywater (kitchen/laundry) for reuse → +4 points');
    categories.push({ id: 'water', name: 'Water Management', nameSwahili: 'Usimamizi wa Maji', maxPoints: 20, earnedPoints: Math.min(20, pts), status: statusFor(pts, 20), recommendations: recs });
  }

  // 2. ENERGY EFFICIENCY
  {
    let pts = 0;
    const recs: string[] = [];
    const crossVentRooms = rooms.filter(hasCrossVentilation).length;
    if (crossVentRooms >= Math.ceil(rooms.length * 0.4)) pts += 5;
    else recs.push('🌬️ Add windows on opposite walls for cross-ventilation → +5 points');

    const totalFloor = rooms.reduce((s, r) => s + r.widthMeters * r.depthMeters, 0);
    const totalWindow = rooms.reduce((s, r) => s + roomWindows(r).reduce((a, x) => a + x.o.widthMeters * (x.o.heightMeters ?? 1.2), 0), 0);
    const lightRatio = totalFloor > 0 ? totalWindow / totalFloor : 0;
    if (lightRatio > 0.15) pts += 5;
    else recs.push('☀️ Increase glazing to >15% of floor area for daylight → +5 points');

    const roofType = plan.roofing?.type;
    const pitch = plan.roofing?.pitchDegrees ?? 25;
    if (roofType === 'flat' || pitch <= 20) pts += 5;
    else recs.push('🔆 Provide a north-facing roof plane for solar panels → +5 points');

    // Ceiling insulation — only credited if explicitly suspended/insulated ceilings
    const insulated = rooms.some((r) => r.ceilingType === 'suspended' || r.ceilingType === 't_and_g_timber');
    if (insulated) pts += 5;
    else recs.push('🧣 Specify ceiling insulation (50mm polystyrene/glasswool) → +5 points');
    categories.push({ id: 'energy', name: 'Energy Efficiency', nameSwahili: 'Matumizi Bora ya Nishati', maxPoints: 20, earnedPoints: Math.min(20, pts), status: statusFor(pts, 20), recommendations: recs });
  }

  // 3. MATERIAL SUSTAINABILITY
  {
    let pts = 0;
    const recs: string[] = [];
    // Local natural stone walls (Kenyan default)
    pts += 5; // local stone/blocks are the default Kenyan material
    pts += 5; recs.push('🌳 Source timber from certified sustainable suppliers (credited).');
    // Minimal concrete — load-bearing uses less than RC frame
    if ((plan.structure?.system ?? 'load_bearing_walls') === 'load_bearing_walls') pts += 5;
    else recs.push('🏗️ Load-bearing walling uses less concrete than a full RC frame → +5 points');
    pts += 5; recs.push('♻️ Prioritise recyclable/reusable materials (credited).');
    categories.push({ id: 'materials', name: 'Material Sustainability', nameSwahili: 'Uendelevu wa Vifaa', maxPoints: 20, earnedPoints: Math.min(20, pts), status: statusFor(pts, 20), recommendations: recs });
  }

  // 4. SITE & LANDSCAPE
  {
    let pts = 0;
    const recs: string[] = [];
    if (ext?.hasLandscaping) pts += 5;
    else recs.push('🌿 Add landscaping / planting → +5 points');
    if (ext?.hasDriveway) { pts += 5; recs.push('🧱 Use permeable paving (cabro/grasscrete) on the driveway (credited).'); }
    else recs.push('🧱 Specify a permeable driveway for stormwater → +5 points');
    if (ext?.hasSepticTank) pts += 5;
    else recs.push('🦠 Use a bio-digester septic system → +5 points');
    if (plan.orientation) pts += 5;
    else recs.push('🧭 Optimise building orientation for the local climate → +5 points');
    categories.push({ id: 'site', name: 'Site & Landscape', nameSwahili: 'Eneo na Mazingira', maxPoints: 20, earnedPoints: Math.min(20, pts), status: statusFor(pts, 20), recommendations: recs });
  }

  // 5. INDOOR QUALITY
  {
    let pts = 0;
    const recs: string[] = [];
    const ventilatedAll = rooms.filter((r) => HABITABLE.includes(r.type)).every((r) => roomWindows(r).length > 0);
    if (ventilatedAll) pts += 5;
    else recs.push('🪟 Ensure every habitable room has an openable window → +5 points');

    const litAll = rooms.filter((r) => HABITABLE.includes(r.type)).every((r) => {
      const wa = roomWindows(r).reduce((a, x) => a + x.o.widthMeters * (x.o.heightMeters ?? 1.2), 0);
      return wa / (r.widthMeters * r.depthMeters) >= 0.1;
    });
    if (litAll) pts += 5;
    else recs.push('💡 Improve natural light in all habitable rooms → +5 points');

    const ceiling = Math.max(...plan.floors.map((f) => f.heightMeters || 3));
    if (ceiling >= 3.0) pts += 5;
    else recs.push('📐 Raise ceiling height to ≥3.0m for better air quality → +5 points');

    pts += 5; recs.push('🎨 Specify low-VOC, non-toxic paints & finishes (credited).');
    categories.push({ id: 'indoor', name: 'Indoor Quality', nameSwahili: 'Ubora wa Ndani', maxPoints: 20, earnedPoints: Math.min(20, pts), status: statusFor(pts, 20), recommendations: recs });
  }

  const totalScore = Math.round(categories.reduce((s, c) => s + c.earnedPoints, 0));
  const grade = gradeFor(totalScore);

  const sdgs = ['SDG 9 — Industry, Innovation & Infrastructure', 'SDG 11 — Sustainable Cities & Communities'];
  if (categories.find((c) => c.id === 'water')!.earnedPoints >= 12) sdgs.push('SDG 6 — Clean Water & Sanitation');
  if (categories.find((c) => c.id === 'energy')!.earnedPoints >= 12) sdgs.push('SDG 7 — Affordable & Clean Energy');

  return { totalScore, grade, categories, sdgs };
}
