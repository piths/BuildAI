import { FloorPlan, Floor, Room } from './types';
import {
  KENYAN_RATES,
  VAT_RATE,
  CONTINGENCY_RATE,
  DEFAULT_FOUNDATION_DEPTH,
  DEFAULT_FOUNDATION_WIDTH,
} from './constants';

// ─────────────────────────────────────────────────────────────────────────────
// Bill of Quantities engine.
//
// All quantities are DERIVED FROM THE FLOOR-PLAN GEOMETRY (room rectangles, wall
// flags and openings) using standard Kenyan construction assumptions. The engine
// works on every plan — AI-generated, imported or sample — without requiring the
// optional materials/structure schema. When those richer fields ARE present they
// refine the result (e.g. roof pitch, finishes, foundation depth).
// ─────────────────────────────────────────────────────────────────────────────

export interface BOQItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface BOQTrade {
  id: string;
  name: string;
  nameSwahili: string;
  items: BOQItem[];
  subtotal: number;
}

export interface BillOfQuantities {
  trades: BOQTrade[];
  subtotal: number;
  contingency: number;
  vat: number;
  total: number;
  totalAreaSqMeters: number;
  costPerSqMeter: number;
}

interface FloorGeometry {
  floorAreaSqM: number;
  footprintWidth: number;
  footprintDepth: number;
  externalPerimeter: number;
  externalWallLength: number;
  internalWallLength: number;
  doorCount: number;
  windowCount: number;
  windowAreaSqM: number;
  openingWidths: number[]; // for lintels
  roomPerimeterTotal: number;
}

const EPS = 0.05;

function round(n: number, dp = 1): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

/** Analyse a floor's geometry: footprint, wall lengths (external vs internal), openings. */
export function analyseFloorGeometry(floor: Floor): FloorGeometry {
  const rooms = floor.rooms;
  if (rooms.length === 0) {
    return {
      floorAreaSqM: 0,
      footprintWidth: 0,
      footprintDepth: 0,
      externalPerimeter: 0,
      externalWallLength: 0,
      internalWallLength: 0,
      doorCount: 0,
      windowCount: 0,
      windowAreaSqM: 0,
      openingWidths: [],
      roomPerimeterTotal: 0,
    };
  }

  const minX = Math.min(...rooms.map((r) => r.x));
  const maxX = Math.max(...rooms.map((r) => r.x + r.widthMeters));
  const minY = Math.min(...rooms.map((r) => r.y));
  const maxY = Math.max(...rooms.map((r) => r.y + r.depthMeters));

  const footprintWidth = maxX - minX;
  const footprintDepth = maxY - minY;
  const externalPerimeter = 2 * (footprintWidth + footprintDepth);

  let floorAreaSqM = 0;
  let internalWallLengthRaw = 0;
  let doorCount = 0;
  let windowCount = 0;
  let windowAreaSqM = 0;
  let roomPerimeterTotal = 0;
  const openingWidths: number[] = [];

  const sides: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];

  for (const room of rooms) {
    floorAreaSqM += room.widthMeters * room.depthMeters;
    roomPerimeterTotal += 2 * (room.widthMeters + room.depthMeters);

    for (const side of sides) {
      const wall = room.walls?.[side];
      if (!wall || !wall.hasWall) continue;

      const horizontal = side === 'north' || side === 'south';
      const length = horizontal ? room.widthMeters : room.depthMeters;

      // Is this wall on the building boundary (external)?
      let onBoundary = false;
      if (side === 'north') onBoundary = Math.abs(room.y - minY) < EPS;
      else if (side === 'south') onBoundary = Math.abs(room.y + room.depthMeters - maxY) < EPS;
      else if (side === 'west') onBoundary = Math.abs(room.x - minX) < EPS;
      else onBoundary = Math.abs(room.x + room.widthMeters - maxX) < EPS;

      if (!onBoundary) internalWallLengthRaw += length;

      // Openings (counted on internal walls are halved to avoid double counting).
      const openings = wall.openings || [];
      for (const op of openings) {
        const weight = onBoundary ? 1 : 0.5;
        if (op.type === 'door') {
          doorCount += weight;
          openingWidths.push(op.widthMeters);
        } else {
          windowCount += weight;
          const h = op.heightMeters ?? 1.2;
          windowAreaSqM += op.widthMeters * h * weight;
          openingWidths.push(op.widthMeters);
        }
      }
    }
  }

  // Internal walls are shared between two rooms, so each physical wall was counted
  // roughly twice — halve it.
  const internalWallLength = internalWallLengthRaw / 2;

  return {
    floorAreaSqM,
    footprintWidth,
    footprintDepth,
    externalPerimeter,
    externalWallLength: externalPerimeter,
    internalWallLength,
    doorCount: Math.round(doorCount),
    windowCount: Math.round(windowCount),
    windowAreaSqM,
    openingWidths,
    roomPerimeterTotal,
  };
}

function item(description: string, quantity: number, unit: string, rate: number): BOQItem {
  const q = round(quantity, 2);
  return { description, quantity: q, unit, rate, amount: Math.round(q * rate) };
}

function trade(id: string, name: string, nameSwahili: string, items: BOQItem[]): BOQTrade {
  const filtered = items.filter((i) => i.quantity > 0);
  return {
    id,
    name,
    nameSwahili,
    items: filtered,
    subtotal: filtered.reduce((s, i) => s + i.amount, 0),
  };
}

export function calculateBOQ(plan: FloorPlan): BillOfQuantities {
  const R = KENYAN_RATES;
  const geoms = plan.floors.map(analyseFloorGeometry);
  const ground = geoms[0];
  const topFloorIndex = plan.floors.length - 1;
  const topGeom = geoms[topFloorIndex];

  const foundationDepth = plan.foundation?.depthMeters ?? DEFAULT_FOUNDATION_DEPTH;
  const foundationWidth = DEFAULT_FOUNDATION_WIDTH;
  const avgFloorHeight =
    plan.floors.reduce((s, f) => s + (f.heightMeters || 3), 0) / plan.floors.length;

  // ── A. SUBSTRUCTURE ──────────────────────────────────────────────────────
  const trenchLength = ground.externalPerimeter + ground.internalWallLength;
  const excavationVol = trenchLength * foundationWidth * foundationDepth;
  const blindingVol = trenchLength * foundationWidth * 0.05;
  const stripFootingVol = trenchLength * foundationWidth * 0.2;
  const foundationStoneArea = trenchLength * 0.6; // 0.6m up to DPC
  const hardcoreVol = ground.floorAreaSqM * 0.2;
  const slabVol = ground.floorAreaSqM * 0.15;

  const substructure = trade('substructure', 'Substructure', 'Msingi', [
    item('Excavate foundation trenches', excavationVol, 'm³', R.excavation_per_m3),
    item('Blinding concrete (1:3:6) 50mm', blindingVol, 'm³', R.blinding_concrete_per_m3),
    item('Strip footing concrete (Class 20)', stripFootingVol, 'm³', R.concrete_class20_per_m3),
    item('Foundation walling — natural stone to DPC', foundationStoneArea * 7, 'pcs', R.natural_stone_200mm_per_piece),
    item('Damp proof course (DPC)', trenchLength * 0.2, 'm²', R.dpc_per_m2),
    item('Hardcore filling, 200mm consolidated', hardcoreVol, 'm³', R.hardcore_per_m3),
    item('Damp proof membrane (1000g)', ground.floorAreaSqM, 'm²', R.dpm_gauge_1000_per_m2),
    item('Ground floor slab concrete (Class 20) 150mm', slabVol, 'm³', R.concrete_class20_per_m3),
    item('BRC mesh A142 to slab', ground.floorAreaSqM, 'm²', R.brc_mesh_a142_per_m2),
  ]);

  // ── B. SUPERSTRUCTURE (WALLING) ──────────────────────────────────────────
  let extWallArea = 0;
  let intWallArea = 0;
  plan.floors.forEach((f, i) => {
    const h = f.heightMeters || 3;
    extWallArea += geoms[i].externalWallLength * h;
    intWallArea += geoms[i].internalWallLength * h;
  });
  const totalWallArea = extWallArea + intWallArea;
  const mortarVol = totalWallArea * 0.02;
  const mortarCementBags = mortarVol / 0.035;
  const mortarSandTonnes = totalWallArea * 0.04 * 1.6;

  const walling = trade('walling', 'Walling (Superstructure)', 'Ujenzi wa Kuta', [
    item('External walling — 200mm natural stone', extWallArea * 7, 'pcs', R.natural_stone_200mm_per_piece),
    item('Internal walling — 150mm concrete blocks', intWallArea * 10, 'pcs', R.concrete_block_150mm_per_piece),
    item('Cement for mortar', mortarCementBags, 'bags', R.cement_per_bag_50kg),
    item('Building sand for mortar', mortarSandTonnes, 'tonnes', R.building_sand_per_tonne),
  ]);

  // ── C. OPENINGS (doors, windows, lintels) ────────────────────────────────
  const totalDoors = geoms.reduce((s, g) => s + g.doorCount, 0) || estimateDoors(plan);
  const totalWindows = geoms.reduce((s, g) => s + g.windowCount, 0) || estimateWindows(plan);
  const totalWindowArea =
    geoms.reduce((s, g) => s + g.windowAreaSqM, 0) || totalWindows * 1.44;
  const allOpeningWidths = geoms.flatMap((g) => g.openingWidths);
  const lintelLength =
    allOpeningWidths.length > 0
      ? allOpeningWidths.reduce((s, w) => s + w + 0.3, 0)
      : (totalDoors + totalWindows) * 1.5;
  const lintelConcreteVol = lintelLength * 0.2 * 0.15;

  const openings = trade('openings', 'Doors & Windows', 'Milango na Madirisha', [
    item('Timber flush doors c/w frame & ironmongery', totalDoors, 'no', R.timber_flush_door_900mm),
    item('Aluminium casement windows c/w glazing', totalWindowArea, 'm²', R.aluminum_casement_window_per_m2),
    item('Reinforced concrete lintels (Class 20)', lintelConcreteVol, 'm³', R.concrete_class20_per_m3),
  ]);

  // ── D. ROOFING ────────────────────────────────────────────────────────────
  const pitch = plan.roofing?.pitchDegrees ?? 25;
  const overhang = plan.roofing?.overhangMeters ?? 0.6;
  const isFlat = plan.roofing?.type === 'flat';
  const roofW = topGeom.footprintWidth + overhang * 2;
  const roofL = topGeom.footprintDepth + overhang * 2;
  let roofArea: number;
  if (isFlat) {
    roofArea = roofW * roofL;
  } else {
    const rafterLength = roofW / 2 / Math.cos((pitch * Math.PI) / 180);
    roofArea = roofL * rafterLength * 2;
  }
  const ironSheetEffective = 1.98; // 3.0m × 0.66m effective
  const ironSheets = roofArea / ironSheetEffective;
  const rafterTimber = roofArea * 2.2; // 50×75 m run
  const purlinTimber = roofArea * 1.5; // 50×50 m run
  const ridgeBoard = roofL;
  const fascia = (roofW + roofL) * 2;
  const roofingNailsKg = (ironSheets * 8) / 200;

  const roofing = isFlat
    ? trade('roofing', 'Roofing (Flat Slab)', 'Paa la Slabu', [
        item('Flat roof slab concrete (Class 25) 150mm', roofArea * 0.15, 'm³', R.concrete_class25_per_m3),
        item('BRC / reinforcement to slab', roofArea, 'm²', R.brc_mesh_a142_per_m2),
      ])
    : trade('roofing', 'Roofing', 'Kuezeka Paa', [
        item('Gauge 30 corrugated iron sheets', ironSheets, 'pcs', R.iron_sheet_gauge30_3m_per_piece),
        item('Rafters & members 50×75mm timber', rafterTimber, 'm', R.timber_50x75_per_metre),
        item('Purlins 50×50mm timber', purlinTimber, 'm', R.timber_50x50_per_metre),
        item('Ridge board 150×50mm timber', ridgeBoard, 'm', R.timber_150x50_per_metre),
        item('Fascia & barge boards', fascia, 'm', R.timber_100x50_per_metre),
        item('Ridge capping', ridgeBoard, 'm', R.ridging_per_metre),
        item('Roofing nails', roofingNailsKg, 'kg', R.roofing_nails_per_kg),
      ]);

  // ── E. FINISHES ───────────────────────────────────────────────────────────
  // Plaster: inside face of external walls + both faces of internal walls.
  const plasterArea = extWallArea + intWallArea * 2;
  const plasterCementBags = plasterArea / 4;
  const plasterSandTonnes = plasterArea * 0.02 * 1.6;
  const totalFloorArea = geoms.reduce((s, g) => s + g.floorAreaSqM, 0);
  const totalRoomPerimeter = geoms.reduce((s, g) => s + g.roomPerimeterTotal, 0);
  const paintLitres = (plasterArea * 2) / 9;

  // Floor finishes grouped by finish type.
  const finishAreas = floorFinishAreas(plan);

  const finishItems: BOQItem[] = [
    item('Cement & sand plaster to walls, 15mm', plasterArea, 'm²', 350),
    item('Plaster cement', plasterCementBags, 'bags', R.plaster_cement_per_bag),
    item('Plaster sand', plasterSandTonnes, 'tonnes', R.plaster_sand_per_tonne),
    item('Ceramic floor tiles (+10% waste)', finishAreas.ceramic * 1.1, 'm²', R.ceramic_tiles_per_m2),
    item('Porcelain floor tiles (+10% waste)', finishAreas.porcelain * 1.1, 'm²', R.porcelain_tiles_per_m2),
    item('Terrazzo flooring', finishAreas.terrazzo, 'm²', R.terrazzo_per_m2),
    item('Cement screed / concrete floor', finishAreas.screed, 'm²', 600),
    item('Tile adhesive', (finishAreas.ceramic + finishAreas.porcelain) / 5, 'bags', R.tile_adhesive_per_bag_20kg),
    item('Gypsum / ceiling board', totalFloorArea, 'm²', R.ceiling_board_per_m2),
    item('Skirting', totalRoomPerimeter * 0.85, 'm', R.skirting_per_metre),
    item('Emulsion & gloss paint (2 coats)', paintLitres, 'litres', R.paint_per_litre),
  ];

  const finishes = trade('finishes', 'Finishes', 'Kumalizia', finishItems);

  // ── F. PLUMBING ───────────────────────────────────────────────────────────
  const fixtures = countFixtures(plan);
  const wetRoomPipe = (fixtures.toilets + fixtures.showers + fixtures.bathtubs + fixtures.kitchenSinks + fixtures.basins) * 4;
  const ext = plan.externalWorks;
  const includeWaterTank = ext?.hasWaterTank ?? plan.buildingType !== 'commercial';
  const includeSeptic = ext?.hasSepticTank ?? true;

  const plumbing = trade('plumbing', 'Plumbing & Drainage', 'Mabomba na Maji', [
    item('WC suite complete', fixtures.toilets, 'no', R.toilet_complete_set),
    item('Wash hand basin complete', fixtures.basins, 'no', R.bathroom_sink_complete),
    item('Kitchen sink (stainless steel)', fixtures.kitchenSinks, 'no', R.kitchen_sink_stainless),
    item('Shower set complete', fixtures.showers, 'no', R.shower_set_complete),
    item('Bathtub', fixtures.bathtubs, 'no', R.bathtub_standard),
    item('Soil & waste PVC pipe 110mm', wetRoomPipe, 'm', R.pvc_pipe_110mm_per_metre),
    item('Cold water supply pipe PPR 20mm', wetRoomPipe * 1.5, 'm', R.ppr_pipe_20mm_per_metre),
    item('Water storage tank 10,000L', includeWaterTank ? Math.max(1, Math.round(ground.floorAreaSqM / 150)) : 0, 'no', R.water_tank_10000l),
    item('Septic tank / bio-digester', includeSeptic ? 1 : 0, 'no', R.septic_tank_biodigester),
  ]);

  // ── G. ELECTRICAL ─────────────────────────────────────────────────────────
  const elec = countElectrical(plan);
  const cableLength = totalRoomPerimeter * 1.2;
  const electrical = trade('electrical', 'Electrical', 'Umeme', [
    item('Lighting points complete', elec.lightPoints, 'no', R.light_point_complete),
    item('Socket outlets complete', elec.socketOutlets, 'no', R.socket_outlet_complete),
    item('Switch points', elec.switchPoints, 'no', R.switch_single_gang),
    item('Twin & earth cable 2.5mm²', cableLength * 0.4, 'm', R.cable_2_5mm_twin_per_metre),
    item('Twin & earth cable 1.5mm²', cableLength * 0.6, 'm', R.cable_1_5mm_twin_per_metre),
    item('Distribution board (8-way)', 1, 'no', R.distribution_board_8way),
    item('Main switch 60A', 1, 'no', R.main_switch_60a),
    item('Earth rod & accessories', 1, 'no', R.earth_rod),
  ]);

  // ── H. EXTERNAL WORKS ──────────────────────────────────────────────────────
  const extItems: BOQItem[] = [];
  if (ext?.hasBoundaryWall) {
    const boundaryLen = ground.externalPerimeter * 1.8;
    extItems.push(item('Boundary wall — stone, 2.0m high', boundaryLen * 2.0 * 7, 'pcs', R.natural_stone_200mm_per_piece));
  }
  if (ext?.hasDriveway) {
    extItems.push(item('Paved driveway / parking (cabro)', ground.footprintWidth * 5, 'm²', 1500));
  }
  if (ext?.hasLandscaping) {
    extItems.push(item('Landscaping & soft works', 1, 'item', 60000));
  }
  const externalWorks = trade('external', 'External Works', 'Kazi za Nje', extItems);

  // ── TOTALS ──────────────────────────────────────────────────────────────────
  const trades = [substructure, walling, openings, roofing, finishes, plumbing, electrical, externalWorks].filter(
    (t) => t.items.length > 0,
  );
  const subtotal = trades.reduce((s, t) => s + t.subtotal, 0);
  const contingency = Math.round(subtotal * CONTINGENCY_RATE);
  const vat = Math.round((subtotal + contingency) * VAT_RATE);
  const total = subtotal + contingency + vat;
  const totalArea = plan.totalAreaSqMeters || totalFloorArea;

  return {
    trades,
    subtotal,
    contingency,
    vat,
    total,
    totalAreaSqMeters: totalArea,
    costPerSqMeter: totalArea > 0 ? Math.round(total / totalArea) : 0,
  };
}

// ── Estimation helpers (used when geometry lacks explicit openings/services) ──

function estimateDoors(plan: FloorPlan): number {
  // One door per room minimum, plus a main entrance.
  const rooms = plan.floors.reduce((s, f) => s + f.rooms.length, 0);
  return rooms + 1;
}

function estimateWindows(plan: FloorPlan): number {
  // Habitable rooms generally need a window.
  const habitable = plan.floors.reduce(
    (s, f) =>
      s +
      f.rooms.filter((r) =>
        ['living_room', 'bedroom', 'kitchen', 'office', 'dining_room', 'classroom', 'reception', 'conference_room'].includes(
          r.type,
        ),
      ).length,
    0,
  );
  return habitable;
}

function floorFinishAreas(plan: FloorPlan): {
  ceramic: number;
  porcelain: number;
  terrazzo: number;
  screed: number;
} {
  const res = { ceramic: 0, porcelain: 0, terrazzo: 0, screed: 0 };
  for (const f of plan.floors) {
    for (const r of f.rooms) {
      const area = r.widthMeters * r.depthMeters;
      const finish = r.floorFinish ?? defaultFinishForRoom(r);
      if (finish === 'porcelain_tile') res.porcelain += area;
      else if (finish === 'terrazzo') res.terrazzo += area;
      else if (finish === 'concrete') res.screed += area;
      else res.ceramic += area; // ceramic_tile / hardwood / laminate / vinyl / carpet → tiled estimate
    }
  }
  return res;
}

function defaultFinishForRoom(room: Room): Room['floorFinish'] {
  if (['garage', 'store', 'staircase', 'corridor', 'balcony', 'laundry'].includes(room.type)) return 'concrete';
  if (['bathroom', 'toilet', 'kitchen'].includes(room.type)) return 'ceramic_tile';
  if (['living_room', 'dining_room', 'reception'].includes(room.type)) return 'porcelain_tile';
  return 'ceramic_tile';
}

function countFixtures(plan: FloorPlan): {
  toilets: number;
  basins: number;
  kitchenSinks: number;
  showers: number;
  bathtubs: number;
} {
  let toilets = 0,
    basins = 0,
    kitchenSinks = 0,
    showers = 0,
    bathtubs = 0;
  let hasExplicitFixtures = false;

  for (const f of plan.floors) {
    for (const r of f.rooms) {
      for (const item of r.furniture) {
        if (item.type === 'toilet_unit') {
          toilets++;
          hasExplicitFixtures = true;
        } else if (item.type === 'bathroom_sink') {
          basins++;
          hasExplicitFixtures = true;
        } else if (item.type === 'sink') {
          kitchenSinks++;
          hasExplicitFixtures = true;
        } else if (item.type === 'shower') {
          showers++;
          hasExplicitFixtures = true;
        } else if (item.type === 'bathtub') {
          bathtubs++;
          hasExplicitFixtures = true;
        }
      }
    }
  }

  if (!hasExplicitFixtures) {
    // Fall back to room-type counting.
    for (const f of plan.floors) {
      for (const r of f.rooms) {
        if (r.type === 'toilet') {
          toilets++;
          basins++;
        } else if (r.type === 'bathroom') {
          toilets++;
          basins++;
          showers++;
        } else if (r.type === 'kitchen') {
          kitchenSinks++;
        }
      }
    }
  }

  return { toilets, basins, kitchenSinks, showers, bathtubs };
}

export function countElectrical(plan: FloorPlan): {
  lightPoints: number;
  socketOutlets: number;
  switchPoints: number;
} {
  let lightPoints = 0,
    socketOutlets = 0,
    switchPoints = 0;
  let hasExplicit = false;

  for (const f of plan.floors) {
    for (const r of f.rooms) {
      if (r.electrical) {
        hasExplicit = true;
        lightPoints += r.electrical.lightPoints;
        socketOutlets += r.electrical.socketOutlets;
        switchPoints += r.electrical.switchPoints;
      }
    }
  }

  if (!hasExplicit) {
    for (const f of plan.floors) {
      for (const r of f.rooms) {
        const area = r.widthMeters * r.depthMeters;
        const lights = Math.max(1, Math.ceil(area / 12));
        let sockets = 2;
        if (r.type === 'kitchen') sockets = 6;
        else if (r.type === 'living_room' || r.type === 'office') sockets = 5;
        else if (r.type === 'bedroom') sockets = 4;
        else if (['bathroom', 'toilet', 'corridor', 'store', 'staircase'].includes(r.type)) sockets = 1;
        lightPoints += lights;
        socketOutlets += sockets;
        switchPoints += 1;
      }
    }
  }

  return { lightPoints, socketOutlets, switchPoints };
}
