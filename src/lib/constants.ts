import { RoomType } from './types';

export const ROOM_COLORS: Record<RoomType, { fill: string; stroke: string; label: string }> = {
  living_room: { fill: 'rgba(16, 185, 129, 0.15)', stroke: '#10b981', label: 'Living Room' },
  bedroom: { fill: 'rgba(96, 165, 250, 0.15)', stroke: '#60a5fa', label: 'Bedroom' },
  kitchen: { fill: 'rgba(251, 191, 36, 0.15)', stroke: '#fbbf24', label: 'Kitchen' },
  bathroom: { fill: 'rgba(34, 211, 238, 0.15)', stroke: '#22d3ee', label: 'Bathroom' },
  toilet: { fill: 'rgba(34, 211, 238, 0.12)', stroke: '#22d3ee', label: 'Toilet' },
  dining_room: { fill: 'rgba(251, 146, 60, 0.15)', stroke: '#fb923c', label: 'Dining Room' },
  corridor: { fill: 'rgba(148, 163, 184, 0.12)', stroke: '#94a3b8', label: 'Corridor' },
  hallway: { fill: 'rgba(148, 163, 184, 0.12)', stroke: '#94a3b8', label: 'Hallway' },
  garage: { fill: 'rgba(107, 114, 128, 0.15)', stroke: '#6b7280', label: 'Garage' },
  balcony: { fill: 'rgba(167, 139, 250, 0.12)', stroke: '#a78bfa', label: 'Balcony' },
  office: { fill: 'rgba(251, 146, 60, 0.15)', stroke: '#fb923c', label: 'Office' },
  reception: { fill: 'rgba(244, 114, 182, 0.15)', stroke: '#f472b6', label: 'Reception' },
  conference_room: { fill: 'rgba(251, 146, 60, 0.12)', stroke: '#fb923c', label: 'Conference Room' },
  classroom: { fill: 'rgba(96, 165, 250, 0.12)', stroke: '#60a5fa', label: 'Classroom' },
  staffroom: { fill: 'rgba(167, 139, 250, 0.15)', stroke: '#a78bfa', label: 'Staffroom' },
  store: { fill: 'rgba(107, 114, 128, 0.12)', stroke: '#6b7280', label: 'Store' },
  laundry: { fill: 'rgba(34, 211, 238, 0.1)', stroke: '#22d3ee', label: 'Laundry' },
  staircase: { fill: 'rgba(245, 158, 11, 0.15)', stroke: '#f59e0b', label: 'Staircase' },
  shop: { fill: 'rgba(244, 114, 182, 0.12)', stroke: '#f472b6', label: 'Shop' },
};

export const ROOM_3D_COLORS: Record<RoomType, number> = {
  living_room: 0xf5e6d3,
  bedroom: 0xe8d5b7,
  kitchen: 0xd4d4d4,
  bathroom: 0xe0e0e0,
  toilet: 0xe0e0e0,
  dining_room: 0xf0e0c8,
  corridor: 0xd9cfc0,
  hallway: 0xd9cfc0,
  garage: 0xb0b0b0,
  balcony: 0xc8b89a,
  office: 0xf0e8d8,
  reception: 0xf5ede0,
  conference_room: 0xe8dcc8,
  classroom: 0xf0ead8,
  staffroom: 0xede4d4,
  store: 0xc0c0c0,
  laundry: 0xd8d8d8,
  staircase: 0xc0b098,
  shop: 0xf5efe5,
};

export const SCALE_FACTOR = 40; // 1 meter = 40 pixels in 2D view
export const WALL_THICKNESS = 0.15; // meters
export const DOOR_HEIGHT = 2.1; // meters
export const DEFAULT_WINDOW_HEIGHT = 1.2;
export const DEFAULT_SILL_HEIGHT = 0.9;
export const EYE_HEIGHT = 1.6; // meters
export const MOVE_SPEED = 3.0; // meters per second
export const MOUSE_SENSITIVITY = 0.002;
export const COST_PER_SQM = 35000; // KES

export const PRESET_PROMPTS = [
  '2-bedroom apartment with open kitchen',
  '3-bedroom family house with garage',
  'Office space with 4 offices, reception, and conference room',
  'Studio apartment with kitchenette',
  'School classroom block — 4 classrooms and staffroom',
  '3-storey commercial building with shops on ground floor',
];

// ─────────────────────────────────────────────────────────────────────────────
// Kenyan material & labour rates (2024–2025 approximate, in KES).
// Used by the BOQ + cost-estimation engines. These are indicative market rates
// for a small-to-medium contractor and can be edited by the user in the UI.
// ─────────────────────────────────────────────────────────────────────────────
export const KENYAN_RATES = {
  // Substructure
  excavation_per_m3: 600,
  hardcore_per_m3: 1800,
  murram_per_m3: 1200,
  concrete_class20_per_m3: 18000,
  concrete_class25_per_m3: 20000,
  blinding_concrete_per_m3: 14000,
  dpm_gauge_1000_per_m2: 250,
  dpc_per_m2: 300,

  // Walling
  natural_stone_200mm_per_piece: 65,
  concrete_block_200mm_per_piece: 80,
  concrete_block_150mm_per_piece: 60,
  cement_per_bag_50kg: 750,
  building_sand_per_tonne: 2500,
  river_sand_per_tonne: 3000,

  // Steel
  rebar_y12_per_kg: 120,
  rebar_y16_per_kg: 120,
  binding_wire_per_kg: 180,
  brc_mesh_a142_per_m2: 450,

  // Roofing
  iron_sheet_gauge30_3m_per_piece: 900,
  iron_sheet_gauge28_3m_per_piece: 1200,
  timber_50x75_per_metre: 120,
  timber_50x50_per_metre: 80,
  timber_100x50_per_metre: 180,
  timber_150x50_per_metre: 250,
  roofing_nails_per_kg: 200,
  ridging_per_metre: 600,

  // Finishes
  ceramic_tiles_per_m2: 1200,
  porcelain_tiles_per_m2: 2000,
  terrazzo_per_m2: 1800,
  tile_adhesive_per_bag_20kg: 900,
  paint_per_litre: 500,
  plaster_cement_per_bag: 750,
  plaster_sand_per_tonne: 2500,
  ceiling_board_per_m2: 600,
  skirting_per_metre: 200,

  // Doors & windows
  timber_flush_door_900mm: 8000,
  timber_panel_door_900mm: 15000,
  steel_door_900mm: 12000,
  aluminum_sliding_window_per_m2: 8000,
  aluminum_casement_window_per_m2: 9000,
  steel_casement_window_per_m2: 6000,

  // Plumbing
  toilet_complete_set: 15000,
  bathroom_sink_complete: 8000,
  kitchen_sink_stainless: 12000,
  shower_set_complete: 6000,
  bathtub_standard: 25000,
  water_tank_10000l: 45000,
  septic_tank_biodigester: 80000,
  pvc_pipe_110mm_per_metre: 800,
  pvc_pipe_50mm_per_metre: 350,
  ppr_pipe_20mm_per_metre: 150,

  // Electrical
  socket_outlet_complete: 500,
  light_point_complete: 400,
  switch_single_gang: 300,
  distribution_board_8way: 5000,
  cable_2_5mm_twin_per_metre: 120,
  cable_1_5mm_twin_per_metre: 80,
  earth_rod: 2000,
  main_switch_60a: 3000,
};

export type RateKey = keyof typeof KENYAN_RATES;

// Cost benchmark bands (KES per m²) for the cost dashboard comparison bar.
export const COST_BENCHMARKS = {
  low: 25000, // basic finish
  medium: 35000, // standard finish
  high: 50000, // premium finish
};

// 16% VAT and 10% contingency are the standard Kenyan QS additions.
export const VAT_RATE = 0.16;
export const CONTINGENCY_RATE = 0.1;

// Default standard construction assumptions when richer schema is absent.
export const DEFAULT_EXTERNAL_WALL_THICKNESS = 0.2;
export const DEFAULT_INTERNAL_WALL_THICKNESS = 0.15;
export const DEFAULT_FOUNDATION_DEPTH = 1.0;
export const DEFAULT_FOUNDATION_WIDTH = 0.6;
