import { FloorPlan, Floor, Room } from './types';
import { BOQ_RATES, BoqRateKey, STEEL_WEIGHT, REGION_MULTIPLIERS, REGION_LABELS } from './constants';
import { CLIMATE_ZONES } from './climateZones';

// ─────────────────────────────────────────────────────────────────────────────
// Professional Kenyan QS-grade Bill of Quantities engine.
//
// Produces a 9-element elemental BOQ (substructure → preliminaries) where EVERY
// item carries its "workings" — how the quantity was derived. Quantities are
// computed from the floor-plan geometry; the optional richer schema (finishes,
// foundation, roofing, services) refines the result when present.
// ─────────────────────────────────────────────────────────────────────────────

export interface BOQItem {
  itemCode: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  workings: string;
}

export interface BOQSubSection {
  code: string;
  name: string;
  items: BOQItem[];
}

export interface BOQElement {
  elementNumber: number;
  elementName: string;
  subSections: BOQSubSection[];
  subtotal: number;
}

export interface GrandSummary {
  elementSubtotals: { element: string; amount: number; percentage: number }[];
  subtotalBeforeContingency: number;
  contingency: number;
  subtotalBeforeVAT: number;
  vat: number;
  grandTotal: number;
  costPerSqMeterExclVAT: number;
  costPerSqMeterInclVAT: number;
}

export interface BOQReport {
  buildingName: string;
  date: string;
  region: string;
  location: string;
  climateZone: string;
  totalFloorArea: number;
  roomCount: number;
  elements: BOQElement[];
  grandSummary: GrandSummary;
}

export interface BOQOptions {
  region?: string;
  contingencyRate?: number; // default 0.10
  vatRate?: number; // default 0.16
  includeVat?: boolean; // default true
}

type Side = 'north' | 'south' | 'east' | 'west';
const SIDES: Side[] = ['north', 'south', 'east', 'west'];
const EPS = 0.06;

const r2 = (n: number) => Math.round(n * 100) / 100;
const r0 = (n: number) => Math.round(n);

interface OpeningRecord {
  roomName: string;
  roomType: string;
  type: 'door' | 'window';
  subType?: string;
  widthMeters: number;
  heightMeters: number;
  sillHeight?: number;
  external: boolean;
}

interface FloorMetrics {
  externalPerimeter: number;
  internalWallLength: number;
  footprintLength: number;
  footprintWidth: number;
  grossFloorArea: number;
  floorHeight: number;
  externalWallArea: number;
  internalWallArea: number;
  externalOpeningArea: number;
  internalOpeningArea: number;
  openings: OpeningRecord[];
}

function sideLength(room: Room, side: Side): number {
  return side === 'north' || side === 'south' ? room.widthMeters : room.depthMeters;
}

function openingMidpoint(room: Room, side: Side, posFromLeft: number, w: number): { x: number; y: number } {
  switch (side) {
    case 'north':
      return { x: room.x + posFromLeft + w / 2, y: room.y };
    case 'south':
      return { x: room.x + posFromLeft + w / 2, y: room.y + room.depthMeters };
    case 'west':
      return { x: room.x, y: room.y + posFromLeft + w / 2 };
    case 'east':
      return { x: room.x + room.widthMeters, y: room.y + posFromLeft + w / 2 };
  }
}

function analyseFloor(floor: Floor): FloorMetrics {
  const rooms = floor.rooms;
  const floorHeight = floor.heightMeters || 3;
  if (rooms.length === 0) {
    return {
      externalPerimeter: 0, internalWallLength: 0, footprintLength: 0, footprintWidth: 0,
      grossFloorArea: 0, floorHeight, externalWallArea: 0, internalWallArea: 0,
      externalOpeningArea: 0, internalOpeningArea: 0, openings: [],
    };
  }

  const minX = Math.min(...rooms.map((r) => r.x));
  const maxX = Math.max(...rooms.map((r) => r.x + r.widthMeters));
  const minY = Math.min(...rooms.map((r) => r.y));
  const maxY = Math.max(...rooms.map((r) => r.y + r.depthMeters));
  const footprintLength = maxX - minX;
  const footprintWidth = maxY - minY;
  const externalPerimeter = 2 * (footprintLength + footprintWidth);

  let internalWallRaw = 0;
  let grossFloorArea = 0;
  let externalOpeningArea = 0;
  let internalOpeningArea = 0;
  const openings: OpeningRecord[] = [];
  const seen = new Set<string>();

  const isExternal = (room: Room, side: Side) => {
    if (side === 'north') return Math.abs(room.y - minY) < EPS;
    if (side === 'south') return Math.abs(room.y + room.depthMeters - maxY) < EPS;
    if (side === 'west') return Math.abs(room.x - minX) < EPS;
    return Math.abs(room.x + room.widthMeters - maxX) < EPS;
  };

  for (const room of rooms) {
    grossFloorArea += room.widthMeters * room.depthMeters;
    for (const side of SIDES) {
      const wall = room.walls?.[side];
      if (!wall || !wall.hasWall) continue;
      const ext = isExternal(room, side);
      if (!ext) internalWallRaw += sideLength(room, side);

      for (const op of wall.openings || []) {
        const mid = openingMidpoint(room, side, op.positionFromLeft, op.widthMeters);
        const key = `${op.type}|${Math.round(mid.x * 10)}|${Math.round(mid.y * 10)}`;
        const area = op.widthMeters * (op.heightMeters ?? (op.type === 'door' ? 2.1 : 1.2));
        if (seen.has(key)) continue; // shared-wall duplicate
        seen.add(key);
        if (ext) externalOpeningArea += area;
        else internalOpeningArea += area;
        openings.push({
          roomName: room.name,
          roomType: room.type,
          type: op.type,
          subType: op.subType,
          widthMeters: op.widthMeters,
          heightMeters: op.heightMeters ?? (op.type === 'door' ? 2.1 : 1.2),
          sillHeight: op.sillHeight,
          external: ext,
        });
      }
    }
  }

  const internalWallLength = internalWallRaw / 2; // shared walls counted twice
  return {
    externalPerimeter,
    internalWallLength,
    footprintLength,
    footprintWidth,
    grossFloorArea,
    floorHeight,
    externalWallArea: externalPerimeter * floorHeight,
    internalWallArea: internalWallLength * floorHeight,
    externalOpeningArea,
    internalOpeningArea,
    openings,
  };
}

function estimateDurationWeeks(totalArea: number, numFloors: number): number {
  const baseWeeks = Math.ceil(totalArea / 15);
  const floorMultiplier = 1 + (numFloors - 1) * 0.6;
  return Math.max(6, Math.ceil(baseWeeks * floorMultiplier));
}

interface Fixtures {
  wc: number;
  basin: number;
  kitchenSink: number;
  shower: number;
  bathtub: number;
}

function detectFixtures(plan: FloorPlan): Fixtures {
  const f: Fixtures = { wc: 0, basin: 0, kitchenSink: 0, shower: 0, bathtub: 0 };
  let explicit = false;
  for (const floor of plan.floors) {
    for (const room of floor.rooms) {
      const list = room.plumbing?.fixtures || [];
      for (const fx of list) {
        explicit = true;
        const s = fx.toLowerCase();
        if (s.includes('wc') || s.includes('toilet')) f.wc++;
        else if (s.includes('basin') || s.includes('hand')) f.basin++;
        else if (s.includes('kitchen') || s.includes('sink')) f.kitchenSink++;
        else if (s.includes('shower')) f.shower++;
        else if (s.includes('bath')) f.bathtub++;
      }
      for (const item of room.furniture) {
        if (item.type === 'toilet_unit') { f.wc++; explicit = true; }
        else if (item.type === 'bathroom_sink') { f.basin++; explicit = true; }
        else if (item.type === 'sink') { f.kitchenSink++; explicit = true; }
        else if (item.type === 'shower') { f.shower++; explicit = true; }
        else if (item.type === 'bathtub') { f.bathtub++; explicit = true; }
      }
    }
  }
  if (!explicit) {
    for (const floor of plan.floors) {
      for (const room of floor.rooms) {
        if (room.type === 'bathroom') { f.wc++; f.basin++; f.shower++; }
        else if (room.type === 'toilet') { f.wc++; f.basin++; }
        else if (room.type === 'kitchen') { f.kitchenSink++; }
      }
    }
  }
  return f;
}

function countElectrical(plan: FloorPlan): { light: number; socket: number; switch: number; breakdown: string } {
  let light = 0, socket = 0, sw = 0, explicit = false;
  const parts: string[] = [];
  for (const floor of plan.floors) {
    for (const room of floor.rooms) {
      if (room.electrical) {
        explicit = true;
        light += room.electrical.lightPoints;
        socket += room.electrical.socketOutlets;
        sw += room.electrical.switchPoints;
      }
    }
  }
  if (!explicit) {
    for (const floor of plan.floors) {
      for (const room of floor.rooms) {
        const area = room.widthMeters * room.depthMeters;
        const l = Math.max(1, Math.ceil(area / 12));
        let s = 2;
        if (room.type === 'kitchen') s = 6;
        else if (room.type === 'living_room' || room.type === 'office') s = 5;
        else if (room.type === 'bedroom') s = 4;
        else if (['bathroom', 'toilet', 'corridor', 'store', 'staircase'].includes(room.type)) s = 1;
        light += l; socket += s; sw += 1;
        parts.push(`${room.name}: ${l}L/${s}S`);
      }
    }
  }
  return { light, socket, switch: sw, breakdown: parts.join(', ') };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry
// ─────────────────────────────────────────────────────────────────────────────

export function generateBOQ(plan: FloorPlan, options: BOQOptions = {}): BOQReport {
  const region = options.region || regionFromClimate(plan.climateZone) || 'central';
  const m = REGION_MULTIPLIERS[region] ?? 1;
  const contingencyRate = options.contingencyRate ?? 0.1;
  const includeVat = options.includeVat ?? true;
  const vatRate = includeVat ? options.vatRate ?? 0.16 : 0;

  const R = (key: BoqRateKey) => Math.round(BOQ_RATES[key] * m);

  const floors = plan.floors;
  const numFloors = floors.length;
  const ground = analyseFloor(floors[0]);
  const perFloor = floors.map(analyseFloor);

  const externalPerimeter = ground.externalPerimeter;
  const internalWallLength = ground.internalWallLength;
  const totalWallLength = externalPerimeter + internalWallLength;
  const buildingLength = ground.footprintLength;
  const buildingWidth = ground.footprintWidth;
  const grossFloorArea = plan.totalAreaSqMeters || perFloor.reduce((s, f) => s + f.grossFloorArea, 0);
  const floorHeight = ground.floorHeight;
  const foundationDepth = plan.foundation?.depthMeters ?? 1.0;
  const foundationWidth = 0.6;
  const foundationWallHeight = 0.6;

  // Aggregate walling across floors.
  const extWallArea = perFloor.reduce((s, f) => s + f.externalWallArea, 0);
  const intWallArea = perFloor.reduce((s, f) => s + f.internalWallArea, 0);
  const extOpeningArea = perFloor.reduce((s, f) => s + f.externalOpeningArea, 0) || extWallArea * 0.15;
  const intOpeningArea = perFloor.reduce((s, f) => s + f.internalOpeningArea, 0) || intWallArea * 0.1;
  const netExtWallArea = Math.max(0, extWallArea - extOpeningArea);
  const netIntWallArea = Math.max(0, intWallArea - intOpeningArea);
  const totalWallLengthAllFloors = perFloor.reduce((s, f) => s + f.externalPerimeter + f.internalWallLength, 0);
  const allOpenings = perFloor.flatMap((f) => f.openings);

  const b = new Builder(R);

  // ── ELEMENT 1: SUBSTRUCTURE ──────────────────────────────────────────────
  {
    const e = b.element(1, 'SUBSTRUCTURE');

    const ss11 = e.sub('1.1', 'SITE PREPARATION');
    const clearArea = (buildingLength + 5) * (buildingWidth + 5);
    ss11.item('1.1.1', 'Clear site of vegetation and topsoil, 150mm deep, incl. 2.5m working space', r2(clearArea), 'm²', R('clear_site_per_m2'), `(${r2(buildingLength)}+5)×(${r2(buildingWidth)}+5) = ${r2(clearArea)}m²`);
    ss11.item('1.1.2', 'Setting out building, profiles and pegs', 1, 'Item', R('setting_out_item'), 'Lump sum');
    ss11.item('1.1.3', 'Temporary site storage and security (provisional)', 1, 'Item', R('site_storage_item'), 'Provisional sum');

    const ss12 = e.sub('1.2', 'EXCAVATION');
    const extTrench = externalPerimeter * foundationWidth * foundationDepth;
    const intTrench = internalWallLength * foundationWidth * foundationDepth;
    ss12.item('1.2.1', 'Excavate foundation trench to external walls', r2(extTrench), 'm³', R('excavation_per_m3'), `${r2(externalPerimeter)}m × ${foundationWidth}m × ${foundationDepth}m = ${r2(extTrench)}m³`);
    ss12.item('1.2.2', 'Excavate foundation trench to internal walls', r2(intTrench), 'm³', R('excavation_per_m3'), `${r2(internalWallLength)}m × ${foundationWidth}m × ${foundationDepth}m = ${r2(intTrench)}m³`);
    const cartAway = (extTrench + intTrench) * 1.3;
    ss12.item('1.2.3', 'Cart away surplus excavated material (30% bulking)', r2(cartAway), 'm³', R('cart_away_per_m3'), `(${r2(extTrench + intTrench)})×1.3 = ${r2(cartAway)}m³`);
    const trenchBottom = totalWallLength * foundationWidth;
    ss12.item('1.2.4', 'Level and compact bottom of trench', r2(trenchBottom), 'm²', R('level_compact_per_m2'), `${r2(totalWallLength)}m × ${foundationWidth}m = ${r2(trenchBottom)}m²`);

    const ss13 = e.sub('1.3', 'CONCRETE WORK — FOUNDATION');
    const blinding = totalWallLength * foundationWidth * 0.05;
    ss13.item('1.3.1', '50mm blinding concrete (1:3:6) to bottom of trench', r2(blinding), 'm³', R('blinding_per_m3'), `${r2(totalWallLength)}m × ${foundationWidth}m × 0.05m = ${r2(blinding)}m³`);
    const footing = totalWallLength * foundationWidth * 0.2;
    ss13.item('1.3.2', 'Reinforced concrete strip footing (Class 20, 1:2:4), 200mm', r2(footing), 'm³', R('concrete_class20_per_m3'), `${r2(totalWallLength)}m × ${foundationWidth}m × 0.2m = ${r2(footing)}m³`);
    const longBars = 4 * totalWallLength * STEEL_WEIGHT.Y12;
    const links = (totalWallLength / 0.3) * 0.8 * STEEL_WEIGHT.R8;
    const footingSteel = longBars + links;
    ss13.item('1.3.3', 'Y12 reinforcement to strip footing (4 No. bars + R8 links @300mm c/c)', r2(footingSteel), 'kg', R('rebar_y12_per_kg'), `4×${r2(totalWallLength)}m×0.888 + (${r2(totalWallLength)}/0.3)×0.8×0.395 = ${r2(footingSteel)}kg`);
    ss13.item('1.3.4', 'Binding wire for reinforcement (3%)', r2(footingSteel * 0.03), 'kg', R('binding_wire_per_kg'), `${r2(footingSteel)}kg × 3% = ${r2(footingSteel * 0.03)}kg`);
    const footingForm = totalWallLength * 0.2 * 2;
    ss13.item('1.3.5', 'Sawn formwork to sides of strip footing', r2(footingForm), 'm²', R('formwork_per_m2'), `${r2(totalWallLength)}m × 0.2m × 2 = ${r2(footingForm)}m²`);

    const ss14 = e.sub('1.4', 'FOUNDATION WALLING (footing to DPC)');
    const extFwArea = externalPerimeter * foundationWallHeight;
    ss14.item('1.4.1', '200mm natural stone foundation walling to external walls', r0(extFwArea * 7), 'pcs', R('stone_200_per_pc'), `${r2(externalPerimeter)}m × ${foundationWallHeight}m = ${r2(extFwArea)}m² × 7 = ${r0(extFwArea * 7)}pcs`);
    const intFwArea = internalWallLength * foundationWallHeight;
    ss14.item('1.4.2', '200mm concrete block foundation walling to internal walls', r0(intFwArea * 10), 'pcs', R('block_200_per_pc'), `${r2(internalWallLength)}m × ${foundationWallHeight}m = ${r2(intFwArea)}m² × 10 = ${r0(intFwArea * 10)}pcs`);
    const fwArea = extFwArea + intFwArea;
    ss14.item('1.4.3', 'Cement for foundation wall mortar (1:3)', r2(fwArea / 3.5), 'bags', R('cement_per_bag'), `${r2(fwArea)}m² ÷ 3.5 = ${r2(fwArea / 3.5)} bags`);
    ss14.item('1.4.4', 'Building sand for foundation wall mortar', r2(fwArea * 0.06), 'tonnes', R('building_sand_per_tonne'), `${r2(fwArea)}m² × 0.06 = ${r2(fwArea * 0.06)}t`);
    const dpc = totalWallLength * 0.2;
    ss14.item('1.4.5', 'Damp proof course, bituminous felt 1000g', r2(dpc), 'm²', R('dpc_per_m2'), `${r2(totalWallLength)}m × 0.2m = ${r2(dpc)}m²`);

    const ss15 = e.sub('1.5', 'GROUND FLOOR SLAB');
    ss15.item('1.5.1', 'Approved hardcore filling, 200mm, compacted in layers', r2(grossFloorArea * 0.2), 'm³', R('hardcore_per_m3'), `${r2(grossFloorArea)}m² × 0.2m = ${r2(grossFloorArea * 0.2)}m³`);
    ss15.item('1.5.2', '25mm murram blinding to top of hardcore', r2(grossFloorArea * 0.025), 'm³', R('murram_per_m3'), `${r2(grossFloorArea)}m² × 0.025m = ${r2(grossFloorArea * 0.025)}m³`);
    ss15.item('1.5.3', 'Damp proof membrane, 1000g polythene, 150mm laps', r2(grossFloorArea * 1.1), 'm²', R('dpm_per_m2'), `${r2(grossFloorArea)}m² × 1.1 = ${r2(grossFloorArea * 1.1)}m²`);
    ss15.item('1.5.4', '150mm RC ground floor slab (Class 20, 1:2:4)', r2(grossFloorArea * 0.15), 'm³', R('concrete_class20_per_m3'), `${r2(grossFloorArea)}m² × 0.15m = ${r2(grossFloorArea * 0.15)}m³`);
    ss15.item('1.5.5', 'BRC mesh A142 reinforcement to slab', r2(grossFloorArea * 1.1), 'm²', R('brc_a142_per_m2'), `${r2(grossFloorArea)}m² × 1.1 = ${r2(grossFloorArea * 1.1)}m²`);
    ss15.item('1.5.6', 'Anti-termite treatment to ground beneath slab', r2(grossFloorArea), 'm²', R('anti_termite_per_m2'), `${r2(grossFloorArea)}m²`);
    ss15.item('1.5.7', 'Curing (polythene/compound), 7 days min', r2(grossFloorArea), 'm²', R('curing_per_m2'), `${r2(grossFloorArea)}m²`);
  }

  // ── ELEMENT 2: SUPERSTRUCTURE — WALLING ──────────────────────────────────
  {
    const e = b.element(2, 'SUPERSTRUCTURE — WALLING');
    const floorsLabel = numFloors > 1 ? ` across ${numFloors} floors` : '';

    const ss21 = e.sub('2.1', 'EXTERNAL WALLING');
    ss21.item('2.1.1', '200mm natural stone walling to external walls (less openings)', r0(netExtWallArea * 7), 'pcs', R('stone_200_per_pc'), `${r2(externalPerimeter)}m×${r2(floorHeight)}m=${r2(extWallArea)}m²${floorsLabel} less openings = ${r2(netExtWallArea)}m² × 7 = ${r0(netExtWallArea * 7)}pcs`);
    ss21.item('2.1.2', 'Cement for external wall mortar (1:3)', r2(netExtWallArea / 3.5), 'bags', R('cement_per_bag'), `${r2(netExtWallArea)}m² ÷ 3.5 = ${r2(netExtWallArea / 3.5)} bags`);
    ss21.item('2.1.3', 'Building sand for external wall mortar', r2(netExtWallArea * 0.06), 'tonnes', R('building_sand_per_tonne'), `${r2(netExtWallArea)}m² × 0.06 = ${r2(netExtWallArea * 0.06)}t`);
    ss21.item('2.1.4', 'Scaffolding to external walls (hire)', numFloors, 'Item', R('scaffolding_item'), `${numFloors} lift(s)`);

    const ss22 = e.sub('2.2', 'INTERNAL WALLING');
    ss22.item('2.2.1', '150mm concrete block walling to internal walls (less openings)', r0(netIntWallArea * 10), 'pcs', R('block_150_per_pc'), `${r2(internalWallLength)}m×${r2(floorHeight)}m=${r2(intWallArea)}m²${floorsLabel} less openings = ${r2(netIntWallArea)}m² × 10 = ${r0(netIntWallArea * 10)}pcs`);
    ss22.item('2.2.2', 'Cement for internal wall mortar (1:4)', r2(netIntWallArea / 4), 'bags', R('cement_per_bag'), `${r2(netIntWallArea)}m² ÷ 4 = ${r2(netIntWallArea / 4)} bags`);
    ss22.item('2.2.3', 'Building sand for internal wall mortar', r2(netIntWallArea * 0.05), 'tonnes', R('river_sand_per_tonne'), `${r2(netIntWallArea)}m² × 0.05 = ${r2(netIntWallArea * 0.05)}t`);

    const ss23 = e.sub('2.3', 'RING BEAM & LINTELS');
    const rbVol = totalWallLengthAllFloors * 0.2 * 0.2;
    ss23.item('2.3.1', 'RC ring beam at wall-plate level (200×200mm, Class 25)', r2(rbVol), 'm³', R('concrete_class25_per_m3'), `${r2(totalWallLengthAllFloors)}m × 0.2 × 0.2 = ${r2(rbVol)}m³`);
    const rbLong = 4 * totalWallLengthAllFloors * STEEL_WEIGHT.Y12;
    ss23.item('2.3.2', 'Y12 reinforcement to ring beam (4 No. bars)', r2(rbLong), 'kg', R('rebar_y12_per_kg'), `4 × ${r2(totalWallLengthAllFloors)}m × 0.888 = ${r2(rbLong)}kg`);
    const rbLinks = (totalWallLengthAllFloors / 0.2) * 0.8 * STEEL_WEIGHT.R8;
    ss23.item('2.3.3', 'R8 stirrups to ring beam @200mm c/c', r2(rbLinks), 'kg', R('rebar_r8_per_kg'), `(${r2(totalWallLengthAllFloors)}/0.2) × 0.8m × 0.395 = ${r2(rbLinks)}kg`);
    ss23.item('2.3.4', 'Binding wire (3%)', r2((rbLong + rbLinks) * 0.03), 'kg', R('binding_wire_per_kg'), `${r2(rbLong + rbLinks)}kg × 3%`);
    const rbForm = totalWallLengthAllFloors * 0.6;
    ss23.item('2.3.5', 'Formwork to ring beam (2 sides + soffit)', r2(rbForm), 'm²', R('formwork_per_m2'), `${r2(totalWallLengthAllFloors)}m × (0.2+0.2+0.2) = ${r2(rbForm)}m²`);
    const numOpenings = allOpenings.length || Math.round(totalWallLength / 3);
    const lintelLen = allOpenings.length ? allOpenings.reduce((s, o) => s + o.widthMeters + 0.3, 0) : numOpenings * 1.5;
    const lintelVol = lintelLen * 0.15 * 0.15;
    ss23.item('2.3.6', 'RC lintels over openings (150×150mm, Class 20)', r2(lintelVol), 'm³', R('concrete_class20_per_m3'), `${numOpenings} openings, Σ(w+0.3)=${r2(lintelLen)}m × 0.15 × 0.15 = ${r2(lintelVol)}m³`);
    const lintelSteel = lintelLen * 2 * STEEL_WEIGHT.Y12;
    ss23.item('2.3.7', 'Y12 bars to lintels (2 No. bottom bars)', r2(lintelSteel), 'kg', R('rebar_y12_per_kg'), `${r2(lintelLen)}m × 2 × 0.888 = ${r2(lintelSteel)}kg`);

    if (numFloors > 1) {
      const ss24 = e.sub('2.4', 'SUSPENDED FLOOR SLABS');
      const slabArea = perFloor.slice(1).reduce((s, f) => s + f.grossFloorArea, 0);
      ss24.item('2.4.1', '175mm RC suspended floor slab (Class 25)', r2(slabArea * 0.175), 'm³', R('concrete_class25_per_m3'), `${r2(slabArea)}m² × 0.175m = ${r2(slabArea * 0.175)}m³`);
      ss24.item('2.4.2', 'BRC / reinforcement to suspended slab', r2(slabArea * 1.1), 'm²', R('brc_a142_per_m2'), `${r2(slabArea)}m² × 1.1`);
      ss24.item('2.4.3', 'Formwork & props to suspended slab', r2(slabArea), 'm²', R('formwork_per_m2'), `${r2(slabArea)}m² soffit`);
    }
  }

  // ── ELEMENT 3: ROOFING ────────────────────────────────────────────────────
  {
    const e = b.element(3, 'ROOFING');
    const pitchDeg = plan.roofing?.pitchDegrees ?? 25;
    const overhang = plan.roofing?.overhangMeters ?? 0.6;
    const pitch = (pitchDeg * Math.PI) / 180;
    const halfSpan = buildingWidth / 2;
    const rafterLen = halfSpan / Math.cos(pitch);
    const effRafter = rafterLen + overhang;
    const ridgeHeight = halfSpan * Math.tan(pitch);
    const mainRoofArea = 2 * buildingLength * effRafter;
    const gableArea = 2 * (buildingWidth * ridgeHeight / 2);
    const numRafterPairs = Math.ceil(buildingLength / 0.6) + 1;
    const numPurlinRows = Math.ceil(effRafter / 0.6);
    const isLarge = grossFloorArea > 120;

    const ss31 = e.sub('3.1', 'ROOF STRUCTURE (TIMBER)');
    ss31.item('3.1.1', '100×50mm wall plate', r2(externalPerimeter), 'm', R('wallplate_100x50_per_m'), `perimeter = ${r2(externalPerimeter)}m`);
    const rafterTotal = numRafterPairs * 2 * effRafter;
    ss31.item('3.1.2', '100×50mm rafters @600mm c/c', r2(rafterTotal), 'm', R('rafter_100x50_per_m'), `${numRafterPairs} pairs × 2 × ${r2(effRafter)}m = ${r2(rafterTotal)}m`);
    const purlinTotal = numPurlinRows * 2 * buildingLength;
    ss31.item('3.1.3', '50×75mm purlins @600mm c/c', r2(purlinTotal), 'm', R('purlin_50x75_per_m'), `${numPurlinRows} rows × 2 slopes × ${r2(buildingLength)}m = ${r2(purlinTotal)}m`);
    ss31.item('3.1.4', '150×50mm ridge board', r2(buildingLength), 'm', R('ridgeboard_150x50_per_m'), `ridge = ${r2(buildingLength)}m`);
    const joistTotal = numRafterPairs * buildingWidth;
    ss31.item('3.1.5', '100×50mm ceiling joists @600mm c/c', r2(joistTotal), 'm', R('ceiling_joist_100x50_per_m'), `${numRafterPairs} × ${r2(buildingWidth)}m = ${r2(joistTotal)}m`);
    ss31.item('3.1.6', '50×50mm struts, bracing and hangers', isLarge ? 80 : 40, 'm', R('strut_50x50_per_m'), isLarge ? 'large building allowance 80m' : 'small building allowance 40m');
    ss31.item('3.1.7', 'Timber treatment (anti-borer/termite)', 1, 'Item', isLarge ? R('timber_treatment_large_item') : R('timber_treatment_small_item'), isLarge ? 'large' : 'small');
    ss31.item('3.1.8', 'Galvanized nails and bolts for timber connections', 10, 'kg', R('timber_nails_per_kg'), 'allowance 10kg');

    const ss32 = e.sub('3.2', 'ROOF COVERING');
    const sheetCover = 3.0 * 0.66; // 1.98 m² effective
    const mainSheets = Math.ceil(mainRoofArea / sheetCover);
    ss32.item('3.2.1', 'Pre-painted gauge 28 corrugated iron sheets — main slopes', mainSheets, 'pcs', R('iron_sheet_g28_per_pc'), `${r2(mainRoofArea)}m² ÷ 1.98 = ${mainSheets}pcs`);
    const gableSheets = Math.ceil((gableArea / sheetCover) * 1.15);
    if (gableSheets > 0) ss32.item('3.2.2', 'Corrugated iron sheets to gable ends (+15% cutting)', gableSheets, 'pcs', R('iron_sheet_g28_per_pc'), `${r2(gableArea)}m² ÷ 1.98 ×1.15 = ${gableSheets}pcs`);
    ss32.item('3.2.3', 'Pre-painted ridge capping', r2(buildingLength), 'm', R('ridge_capping_per_m'), `ridge = ${r2(buildingLength)}m`);
    const totalSheets = mainSheets + gableSheets;
    ss32.item('3.2.4', 'Roofing screws c/w rubber washers (self-drilling)', totalSheets * 10, 'pcs', R('roofing_screws_per_pc'), `${totalSheets} sheets × 10 = ${totalSheets * 10}pcs`);
    const gutterLen = 2 * buildingLength;
    ss32.item('3.2.5', '200mm PVC half-round gutters c/w brackets', r2(gutterLen), 'm', R('gutter_per_m'), `2 × ${r2(buildingLength)}m (eaves)`);
    ss32.item('3.2.6', '75mm PVC downpipes c/w shoes', r2(4 * floorHeight * numFloors), 'm', R('downpipe_per_m'), `4 corners × ${r2(floorHeight * numFloors)}m`);
    ss32.item('3.2.7', 'Fascia board 225×25mm treated timber', r2(externalPerimeter), 'm', R('fascia_per_m'), `eaves perimeter = ${r2(externalPerimeter)}m`);
    ss32.item('3.2.8', 'Barge boards 200×25mm treated timber', r2(4 * effRafter), 'm', R('barge_per_m'), `2 gables × 2 slopes × ${r2(effRafter)}m`);
  }

  // ── ELEMENT 4: DOORS & WINDOWS ────────────────────────────────────────────
  {
    const e = b.element(4, 'DOORS & WINDOWS');
    const doors = allOpenings.filter((o) => o.type === 'door');
    const windows = allOpenings.filter((o) => o.type === 'window');

    const ss41 = e.sub('4.1', 'DOORS');
    // Main entrance = first external door.
    let mainAssigned = false;
    doors.forEach((d, i) => {
      let rate: number, spec: string;
      const wmm = Math.round(d.widthMeters * 1000);
      const isBath = d.roomType === 'bathroom' || d.roomType === 'toilet';
      if (!mainAssigned && d.external && ['living_room', 'hallway', 'corridor', 'reception'].includes(d.roomType)) {
        rate = R('door_steel_900'); spec = `Steel security door ${wmm}×2100mm c/w frame, lock`; mainAssigned = true;
      } else if (isBath) {
        rate = R('door_timber_flush_700'); spec = `Timber flush door ${wmm}×2100mm c/w privacy lock`;
      } else if (d.roomType === 'bedroom') {
        rate = R('door_timber_panel_800'); spec = `Timber panel door ${wmm}×2100mm c/w frame, lock`;
      } else {
        rate = R('door_timber_flush_800'); spec = `Timber flush door ${wmm}×2100mm c/w frame, lock`;
      }
      ss41.item(`4.1.${i + 1}`, `${spec} — ${d.roomName}`, 1, 'No', rate, `Serves ${d.roomName}${d.external ? ' (external)' : ' (internal)'}`);
    });
    // If no external public door was found, mark the first door as steel entrance.
    if (!mainAssigned && doors.length > 0) {
      const first = ss41.items[0];
      if (first) { first.description = `Steel security door (main entrance) — ${doors[0].roomName}`; first.rate = R('door_steel_900'); first.amount = first.rate; }
    }
    ss41.item(`4.1.${doors.length + 1}`, 'Door ironmongery — stops, hooks, additional locks', 1, 'Item', R('door_ironmongery_item'), 'Provisional');

    const ss42 = e.sub('4.2', 'WINDOWS');
    windows.forEach((w, i) => {
      const wmm = Math.round(w.widthMeters * 1000);
      const hmm = Math.round(w.heightMeters * 1000);
      let rate: number, spec: string;
      const isBath = w.roomType === 'bathroom' || w.roomType === 'toilet';
      if (isBath) {
        rate = R('window_louvre_600x600'); spec = `Aluminium louvre window ${wmm}×${hmm}mm, obscure glass, high sill`;
      } else if (w.widthMeters >= 1.15 && w.heightMeters >= 1.15) {
        rate = R('window_sliding_1200x1200'); spec = `Aluminium sliding window ${wmm}×${hmm}mm c/w glass, grills`;
      } else if (w.widthMeters >= 0.95 && w.heightMeters >= 1.15) {
        rate = R('window_sliding_1000x1200'); spec = `Aluminium sliding window ${wmm}×${hmm}mm c/w glass, grills`;
      } else {
        rate = R('window_sliding_1000x1000'); spec = `Aluminium sliding window ${wmm}×${hmm}mm c/w glass, grills`;
      }
      ss42.item(`4.2.${i + 1}`, `${spec} — ${w.roomName}`, 1, 'No', rate, `${w.roomName} — light & ventilation`);
    });
    const sillLen = windows.reduce((s, w) => s + w.widthMeters, 0);
    if (sillLen > 0) ss42.item(`4.2.${windows.length + 1}`, 'Precast concrete window sills, 50mm, 200mm projection', r2(sillLen), 'm', R('window_sill_per_m'), `Σ window widths = ${r2(sillLen)}m`);
  }

  // ── ELEMENT 5: FINISHES ────────────────────────────────────────────────────
  {
    const e = b.element(5, 'FINISHES');
    const rooms = plan.floors.flatMap((f) => f.rooms);
    const kitchenPerim = rooms.filter((r) => r.type === 'kitchen').reduce((s, r) => s + 2 * (r.widthMeters + r.depthMeters), 0);
    const bathPerim = rooms.filter((r) => r.type === 'bathroom' || r.type === 'toilet').reduce((s, r) => s + 2 * (r.widthMeters + r.depthMeters), 0);
    const kitchenTileArea = kitchenPerim * 1.2;
    const bathTileArea = bathPerim * floorHeight;
    const wallTileArea = kitchenTileArea + bathTileArea;

    const ss51 = e.sub('5.1', 'WALL FINISHES');
    ss51.item('5.1.1', '15mm cement-sand plaster (1:4) to internal face of external walls', r2(netExtWallArea), 'm²', R('plaster_external_face_per_m2'), `net external wall = ${r2(netExtWallArea)}m²`);
    ss51.item('5.1.2', '12mm cement-sand plaster (1:4) to both faces of internal walls', r2(netIntWallArea * 2), 'm²', R('plaster_internal_per_m2'), `${r2(netIntWallArea)}m² × 2 faces = ${r2(netIntWallArea * 2)}m²`);
    const plasterArea = netExtWallArea + netIntWallArea * 2;
    ss51.item('5.1.3', 'Cement for plaster work', r2(plasterArea / 4), 'bags', R('cement_per_bag'), `${r2(plasterArea)}m² ÷ 4 = ${r2(plasterArea / 4)} bags`);
    ss51.item('5.1.4', 'Plastering sand (river, clean, graded)', r2(plasterArea * 0.03), 'tonnes', R('river_sand_per_tonne'), `${r2(plasterArea)}m² × 0.03 = ${r2(plasterArea * 0.03)}t`);
    if (kitchenTileArea > 0) ss51.item('5.1.5', 'Ceramic wall tiles to kitchen splashback (to 1.2m)', r2(kitchenTileArea), 'm²', R('wall_tiles_per_m2'), `kitchen perim ${r2(kitchenPerim)}m × 1.2m = ${r2(kitchenTileArea)}m²`);
    if (bathTileArea > 0) ss51.item('5.1.6', 'Ceramic wall tiles to bathroom (full height)', r2(bathTileArea), 'm²', R('wall_tiles_per_m2'), `bath perim ${r2(bathPerim)}m × ${r2(floorHeight)}m = ${r2(bathTileArea)}m²`);
    if (wallTileArea > 0) {
      ss51.item('5.1.7', 'Tile adhesive for wall tiles', r2(wallTileArea / 5), 'bags', R('tile_adhesive_per_bag'), `${r2(wallTileArea)}m² ÷ 5 = ${r2(wallTileArea / 5)} bags`);
      ss51.item('5.1.8', 'Waterproof tile grout (walls)', r2(wallTileArea * 0.1), 'kg', R('grout_wall_per_kg'), `${r2(wallTileArea)}m² × 0.1 = ${r2(wallTileArea * 0.1)}kg`);
    }

    const ss52 = e.sub('5.2', 'FLOOR FINISHES');
    ss52.item('5.2.1', '25mm cement-sand screed (1:3) as tile bed', r2(grossFloorArea), 'm²', R('screed_per_m2'), `all floors = ${r2(grossFloorArea)}m²`);
    const bathFloor = rooms.filter((r) => r.type === 'bathroom' || r.type === 'toilet').reduce((s, r) => s + r.widthMeters * r.depthMeters, 0);
    const ceramicFloor = (grossFloorArea - bathFloor);
    ss52.item('5.2.2', 'Ceramic floor tiles to rooms (+10% waste)', r2(ceramicFloor * 1.1), 'm²', R('floor_tiles_per_m2'), `${r2(ceramicFloor)}m² × 1.1 = ${r2(ceramicFloor * 1.1)}m²`);
    if (bathFloor > 0) ss52.item('5.2.3', 'Non-slip ceramic floor tiles to bathroom (+10%)', r2(bathFloor * 1.1), 'm²', R('nonslip_tiles_per_m2'), `${r2(bathFloor)}m² × 1.1 = ${r2(bathFloor * 1.1)}m²`);
    const floorTileArea = ceramicFloor * 1.1 + bathFloor * 1.1;
    ss52.item('5.2.4', 'Tile adhesive for floor tiles', r2(floorTileArea / 5), 'bags', R('tile_adhesive_per_bag'), `${r2(floorTileArea)}m² ÷ 5`);
    ss52.item('5.2.5', 'Floor tile grout', r2(floorTileArea * 0.08), 'kg', R('grout_floor_per_kg'), `${r2(floorTileArea)}m² × 0.08`);
    const skirtingLen = rooms.filter((r) => r.type !== 'bathroom' && r.type !== 'toilet').reduce((s, r) => s + 2 * (r.widthMeters + r.depthMeters), 0) * 0.9;
    ss52.item('5.2.6', '100mm ceramic tile skirting (less doorways)', r2(skirtingLen), 'm', R('skirting_per_m'), `Σ room perimeters × 0.9 = ${r2(skirtingLen)}m`);

    const ss53 = e.sub('5.3', 'CEILING FINISHES');
    ss53.item('5.3.1', '6mm fibre-cement ceiling board on timber brandering', r2(grossFloorArea), 'm²', R('ceiling_board_per_m2'), `floor area = ${r2(grossFloorArea)}m²`);
    ss53.item('5.3.2', '50×25mm treated timber brandering @400mm c/c', r2(grossFloorArea / 0.4), 'm', R('brandering_per_m'), `${r2(grossFloorArea)}m² ÷ 0.4 = ${r2(grossFloorArea / 0.4)}m`);
    ss53.item('5.3.3', 'Galvanized ceiling board nails', r2((grossFloorArea / 70) * 3), 'kg', R('ceiling_nails_per_kg'), `${r2(grossFloorArea)}m² → ${r2((grossFloorArea / 70) * 3)}kg`);
    ss53.item('5.3.4', 'PVC cornice at wall-ceiling junction', r2(totalWallLength), 'm', R('cornice_per_m'), `internal perimeters = ${r2(totalWallLength)}m`);

    const ss54 = e.sub('5.4', 'PAINTING & DECORATING');
    const paintInternal = Math.max(0, plasterArea - wallTileArea);
    ss54.item('5.4.1', 'Prepare, prime & 2 coats vinyl silk emulsion — internal walls', r2(paintInternal), 'm²', R('paint_internal_per_m2'), `plaster ${r2(plasterArea)}m² less tiles ${r2(wallTileArea)}m² = ${r2(paintInternal)}m²`);
    ss54.item('5.4.2', 'Prepare, prime & 2 coats weatherguard — external walls', r2(netExtWallArea), 'm²', R('paint_external_per_m2'), `net external = ${r2(netExtWallArea)}m²`);
    ss54.item('5.4.3', 'Prepare & 2 coats emulsion to ceiling', r2(grossFloorArea), 'm²', R('paint_ceiling_per_m2'), `${r2(grossFloorArea)}m²`);
    const timberDoors = allOpenings.filter((o) => o.type === 'door' && !(o.external && ['living_room', 'hallway', 'corridor', 'reception'].includes(o.roomType))).length;
    if (timberDoors > 0) ss54.item('5.4.4', 'Prepare & varnish/paint timber doors (both sides)', timberDoors, 'No', R('paint_door_each'), `${timberDoors} timber doors`);
    ss54.item('5.4.5', 'Paint to fascia, barge boards and exposed timber', 1, 'Item', R('paint_timber_item'), 'Provisional');
  }

  // ── ELEMENT 6: PLUMBING & DRAINAGE ────────────────────────────────────────
  {
    const e = b.element(6, 'PLUMBING & DRAINAGE');
    const fx = detectFixtures(plan);
    const wetAreas = Math.max(1, (fx.wc > 0 ? 1 : 0) + (fx.kitchenSink > 0 ? 1 : 0) + (fx.shower > 0 ? 1 : 0));
    const branchLen = (fx.wc + fx.basin + fx.kitchenSink + fx.shower + fx.bathtub) * 3;

    const ss61 = e.sub('6.1', 'WATER SUPPLY (COLD)');
    ss61.item('6.1.1', '20mm PPR pipe — external run, tank to building', 15, 'm', R('ppr_20_per_m'), 'standard plot allowance 15m');
    ss61.item('6.1.2', '20mm PPR pipe — internal main distribution', r2(Math.max(8, branchLen * 0.6)), 'm', R('ppr_20_per_m'), 'main distribution allowance');
    ss61.item('6.1.3', '15mm PPR branch pipes to fixtures', r2(branchLen), 'm', R('ppr_15_per_m'), `${fx.wc + fx.basin + fx.kitchenSink + fx.shower + fx.bathtub} fixtures × 3m`);
    ss61.item('6.1.4', 'Gate valve 20mm (main stop cock)', 1, 'No', R('gate_valve_20'), '1 No');
    ss61.item('6.1.5', 'Gate valves 15mm (isolation per wet area)', wetAreas, 'No', R('gate_valve_15'), `${wetAreas} wet area(s)`);
    ss61.item('6.1.6', 'PPR fittings — elbows, tees, reducers, clips', 1, 'Item', R('ppr_fittings_item'), 'Provisional');
    ss61.item('6.1.7', 'Trench excavation for external water pipe', 15, 'm', R('pipe_trench_per_m'), 'external run 15m');

    const ss62 = e.sub('6.2', 'SANITARY FITTINGS');
    let n = 1;
    if (fx.wc) ss62.item(`6.2.${n++}`, 'WC suite (close-coupled) complete', fx.wc, 'No', R('wc_suite'), `${fx.wc} No`);
    if (fx.basin) ss62.item(`6.2.${n++}`, 'Wash hand basin c/w pedestal, taps, waste', fx.basin, 'No', R('wash_basin'), `${fx.basin} No`);
    if (fx.kitchenSink) ss62.item(`6.2.${n++}`, 'Kitchen sink (s/steel, single bowl + drainer) c/w mixer', fx.kitchenSink, 'No', R('kitchen_sink'), `${fx.kitchenSink} No`);
    if (fx.shower) {
      ss62.item(`6.2.${n++}`, 'Shower set (mixer, head, hose, rail)', fx.shower, 'No', R('shower_set'), `${fx.shower} No`);
      ss62.item(`6.2.${n++}`, 'Shower floor drain 100mm', fx.shower, 'No', R('shower_drain'), `${fx.shower} No`);
    }
    if (fx.bathtub) ss62.item(`6.2.${n++}`, 'Bathtub c/w fittings', fx.bathtub, 'No', R('bathtub'), `${fx.bathtub} No`);
    if (fx.basin) ss62.item(`6.2.${n++}`, 'Mirror 600×450mm c/w shelf', fx.basin, 'No', R('mirror'), `${fx.basin} No`);
    const wetRoomCount = (fx.wc > 0 ? 1 : 0) + (fx.shower > 0 ? 1 : 0);
    if (wetRoomCount) ss62.item(`6.2.${n++}`, 'Bathroom accessories set (rail, dish, holder)', wetRoomCount, 'set', R('bath_accessories'), `${wetRoomCount} set(s)`);

    const ss63 = e.sub('6.3', 'DRAINAGE & WASTE');
    ss63.item('6.3.1', '110mm PVC soil pipe (WC to septic)', 12, 'm', R('pvc_110_per_m'), 'allowance 12m');
    ss63.item('6.3.2', '50mm PVC waste pipe (basin, sink, shower)', r2(Math.max(6, (fx.basin + fx.kitchenSink + fx.shower) * 3)), 'm', R('pvc_50_per_m'), 'fixture waste runs');
    ss63.item('6.3.3', '110mm PVC inspection chambers 450×450mm c/w cover', 2, 'No', R('inspection_chamber_each'), 'at junction + before septic');
    const traps = fx.basin + fx.kitchenSink + fx.shower;
    if (traps) ss63.item('6.3.4', 'P-traps / bottle traps to waste fixtures', traps, 'No', R('ptrap_each'), `${traps} fixtures (excl. WC)`);
    ss63.item('6.3.5', 'PVC drainage fittings — bends, junctions', 1, 'Item', R('drainage_fittings_item'), 'Provisional');
    ss63.item('6.3.6', 'Excavate drainage trenches, lay pipes, backfill', 20, 'm', R('drainage_trench_per_m'), 'allowance 20m');

    const ss64 = e.sub('6.4', 'WATER STORAGE & SEPTIC');
    const tankL = plan.externalWorks?.waterTankLiters ?? 10000;
    ss64.item('6.4.1', `Plastic water storage tank (~${tankL}L) c/w fittings`, 1, 'No', R('water_tank_10000'), `${tankL}L`);
    ss64.item('6.4.2', 'Steel tank stand c/w concrete pad', 1, 'No', R('tank_stand'), '1 No');
    if (plan.externalWorks?.hasSepticTank ?? true) {
      ss64.item('6.4.3', 'Bio-digester septic tank system', 1, 'No', R('biodigester'), '1 No');
      ss64.item('6.4.4', 'Soak pit / drain field', 1, 'No', R('soak_pit'), '1 No');
    }
  }

  // ── ELEMENT 7: ELECTRICAL ──────────────────────────────────────────────────
  {
    const e = b.element(7, 'ELECTRICAL INSTALLATION');
    const el = countElectrical(plan);
    const roomPerimTotal = plan.floors.flatMap((f) => f.rooms).reduce((s, r) => s + 2 * (r.widthMeters + r.depthMeters), 0);
    const powerCable = roomPerimTotal * 1.5;
    const ss = e.sub('7.1', 'ELECTRICAL');
    ss.item('7.1', 'KPLC power connection application fee', 1, 'Item', R('kplc_application_item'), 'Statutory');
    ss.item('7.2', 'Consumer unit / DB (8-way c/w MCBs & RCCB)', 1, 'No', R('consumer_unit'), '1 No');
    ss.item('7.3', 'Main switch 60A DP', 1, 'No', R('main_switch_60a'), '1 No');
    ss.item('7.4', 'Earth rod 1.5m c/w clamp & 16mm² earth cable', 1, 'No', R('earth_rod'), '1 No');
    ss.item('7.5', 'Lighting points complete (conduit, cable, holder)', el.light, 'pts', R('light_point'), el.breakdown || `${el.light} points`);
    ss.item('7.6', '13A switched socket outlets complete', el.socket, 'pts', R('socket_point'), `${el.socket} points`);
    ss.item('7.7', 'Light switches (1-gang, 1-/2-way)', el.switch, 'No', R('switch_each'), `${el.switch} switches`);
    ss.item('7.8', '2.5mm² twin & earth PVC cable (power)', r2(powerCable), 'm', R('cable_2_5_per_m'), `Σ room perim ${r2(roomPerimTotal)}m × 1.5`);
    ss.item('7.9', '1.5mm² twin & earth PVC cable (lighting)', r2(powerCable * 0.5), 'm', R('cable_1_5_per_m'), `50% of power cable`);
    ss.item('7.10', '20mm PVC conduit c/w saddles & boxes', r2(powerCable * 1.5), 'm', R('conduit_per_m'), 'surface/concealed runs');
    ss.item('7.11', 'Outdoor security lights c/w PIR sensor', 2, 'No', R('security_light_each'), 'front & back');
    ss.item('7.12', 'TV aerial point and coaxial cable', 1, 'Item', R('tv_point_item'), 'living room');
    ss.item('7.13', 'Electrical testing & certification (EPRA)', 1, 'Item', R('epra_cert_item'), 'Mandatory compliance');
  }

  // ── ELEMENT 8: EXTERNAL WORKS ──────────────────────────────────────────────
  {
    const e = b.element(8, 'EXTERNAL WORKS');
    const ss = e.sub('8.1', 'EXTERNAL WORKS');
    ss.item('8.1', 'Veranda / entrance porch (slab, columns, roof)', 5, 'm²', R('veranda_per_m2'), 'allowance 5m²');
    ss.item('8.2', 'External steps (mass concrete c/w tile finish)', 1, 'Item', R('external_steps_item'), 'Provisional');
    const apron = externalPerimeter * 0.6;
    ss.item('8.3', 'Concrete apron 75mm, 600mm wide around building', r2(apron), 'm²', R('apron_per_m2'), `${r2(externalPerimeter)}m × 0.6m = ${r2(apron)}m²`);
    ss.item('8.4', 'Clothesline posts and galvanized wire', 1, 'set', R('clothesline_set'), '1 set');
    ss.item('8.5', 'External water tap c/w bib cock & slab', 1, 'No', R('external_tap'), '1 No');
    if (plan.externalWorks?.hasLandscaping ?? true) ss.item('8.6', 'Landscaping, topsoil, grass planting', 1, 'Item', R('landscaping_item'), 'Provisional');
    if (plan.externalWorks?.hasDriveway) ss.item('8.7', 'Gravel/murram driveway 100mm thick', 20, 'm²', R('driveway_per_m2'), 'parking/access allowance 20m²');
  }

  // ── ELEMENT 9: PRELIMINARIES & PROVISIONAL SUMS ────────────────────────────
  {
    const e = b.element(9, 'PRELIMINARIES & PROVISIONAL SUMS');
    const weeks = estimateDurationWeeks(grossFloorArea, numFloors);
    const months = Math.max(1, Math.ceil(weeks / 4.33));
    const ss = e.sub('9.1', 'PRELIMINARIES');
    ss.item('9.1', 'Water for construction works', months, 'months', R('water_construction_per_month'), `~${weeks} weeks ≈ ${months} months`);
    ss.item('9.2', 'Temporary electricity (KPLC or generator)', 1, 'Item', R('temp_electricity_item'), 'Provisional');
    ss.item('9.3', 'Construction supervision / foreman', months, 'months', R('foreman_per_month'), `${months} months @ site`);
    ss.item('9.4', 'County government building plan approval fees', 1, 'Item', R('county_approval_item'), 'Statutory (varies by county)');
    ss.item('9.5', 'NCA project registration', 1, 'Item', R('nca_registration_item'), 'Statutory');
    ss.item('9.6', "Structural engineer's certificate", 1, 'Item', R('structural_cert_item'), 'Statutory');
    ss.item('9.7', "Architect's drawings and approval", 1, 'Item', R('architect_item'), 'Professional');
    ss.item('9.8', "Contractor's All Risk (CAR) insurance", 1, 'Item', R('car_insurance_item'), 'Provisional');
    ss.item('9.9', 'Site clean-up and demobilisation', 1, 'Item', R('cleanup_item'), 'Provisional');
    ss.item('9.10', 'Miscellaneous unforeseen items', 1, 'Item', R('misc_item'), 'Provisional');
  }

  const elements = b.build();

  // Grand summary
  const subtotalBeforeContingency = elements.reduce((s, e) => s + e.subtotal, 0);
  const elementSubtotals = elements.map((e) => ({
    element: `Element ${e.elementNumber}: ${e.elementName}`,
    amount: e.subtotal,
    percentage: subtotalBeforeContingency > 0 ? (e.subtotal / subtotalBeforeContingency) * 100 : 0,
  }));
  const contingency = Math.round(subtotalBeforeContingency * contingencyRate);
  const subtotalBeforeVAT = subtotalBeforeContingency + contingency;
  const vat = Math.round(subtotalBeforeVAT * vatRate);
  const grandTotal = subtotalBeforeVAT + vat;
  const area = grossFloorArea || 1;

  const climateName = plan.climateZone ? CLIMATE_ZONES[plan.climateZone].name : '—';

  return {
    buildingName: plan.buildingName || 'Untitled Building',
    date: new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }),
    region,
    location: REGION_LABELS[region] || region,
    climateZone: climateName,
    totalFloorArea: r2(grossFloorArea),
    roomCount: plan.floors.reduce((s, f) => s + f.rooms.length, 0),
    elements,
    grandSummary: {
      elementSubtotals,
      subtotalBeforeContingency,
      contingency,
      subtotalBeforeVAT,
      vat,
      grandTotal,
      costPerSqMeterExclVAT: Math.round(subtotalBeforeVAT / area),
      costPerSqMeterInclVAT: Math.round(grandTotal / area),
    },
  };
}

function regionFromClimate(zone?: string): string | null {
  switch (zone) {
    case 'highland_central': return 'central';
    case 'coastal': return 'coast';
    case 'western_lake': return 'western';
    case 'arid_north': return 'north_eastern';
    case 'rift_valley': return 'rift_valley';
    default: return null;
  }
}

// ── Builder helper ────────────────────────────────────────────────────────────
class Builder {
  private elements: BOQElement[] = [];
  constructor(private R: (key: BoqRateKey) => number) {}

  element(num: number, name: string) {
    const el: BOQElement = { elementNumber: num, elementName: name, subSections: [], subtotal: 0 };
    this.elements.push(el);
    return {
      sub: (code: string, sname: string) => {
        const ss: BOQSubSection = { code, name: sname, items: [] };
        el.subSections.push(ss);
        return {
          items: ss.items,
          item: (itemCode: string, description: string, quantity: number, unit: string, rate: number, workings: string) => {
            if (quantity <= 0) return;
            const amount = Math.round(quantity * rate);
            ss.items.push({ itemCode, description, quantity, unit, rate, amount, workings });
          },
        };
      },
    };
  }

  build(): BOQElement[] {
    for (const el of this.elements) {
      el.subSections = el.subSections.filter((s) => s.items.length > 0);
      el.subtotal = el.subSections.reduce((s, ss) => s + ss.items.reduce((a, i) => a + i.amount, 0), 0);
    }
    return this.elements.filter((e) => e.subSections.length > 0);
  }
}

/** CSV export of the elemental BOQ. */
export function boqToCsv(report: BOQReport): string {
  const rows: string[][] = [['Element', 'Code', 'Description', 'Qty', 'Unit', 'Rate (KES)', 'Amount (KES)', 'Workings']];
  for (const el of report.elements) {
    for (const ss of el.subSections) {
      for (const it of ss.items) {
        rows.push([`${el.elementNumber}. ${el.elementName}`, it.itemCode, it.description, String(it.quantity), it.unit, String(it.rate), String(it.amount), it.workings]);
      }
    }
    rows.push(['', '', `ELEMENT ${el.elementNumber} SUBTOTAL`, '', '', '', String(el.subtotal), '']);
  }
  const g = report.grandSummary;
  rows.push(['', '', 'SUBTOTAL', '', '', '', String(g.subtotalBeforeContingency), '']);
  rows.push(['', '', 'CONTINGENCY (10%)', '', '', '', String(g.contingency), '']);
  rows.push(['', '', 'VAT (16%)', '', '', '', String(g.vat), '']);
  rows.push(['', '', 'GRAND TOTAL', '', '', '', String(g.grandTotal), '']);
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function downloadBoqCsvReport(report: BOQReport): void {
  const csv = boqToCsv(report);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.buildingName.replace(/\s+/g, '_')}_BOQ.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
