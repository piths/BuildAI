export type RoomType =
  | 'living_room'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'toilet'
  | 'dining_room'
  | 'corridor'
  | 'hallway'
  | 'garage'
  | 'balcony'
  | 'office'
  | 'reception'
  | 'conference_room'
  | 'classroom'
  | 'staffroom'
  | 'store'
  | 'laundry'
  | 'staircase'
  | 'shop';

export type FurnitureType =
  | 'sofa'
  | 'armchair'
  | 'coffee_table'
  | 'tv_stand'
  | 'bookshelf'
  | 'side_table'
  | 'rug'
  | 'single_bed'
  | 'double_bed'
  | 'wardrobe'
  | 'dresser'
  | 'nightstand'
  | 'desk'
  | 'desk_chair'
  | 'kitchen_counter'
  | 'stove'
  | 'refrigerator'
  | 'sink'
  | 'dining_table'
  | 'dining_chair'
  | 'kitchen_island'
  | 'bathtub'
  | 'shower'
  | 'toilet_unit'
  | 'bathroom_sink'
  | 'mirror_cabinet'
  | 'office_desk'
  | 'office_chair'
  | 'filing_cabinet'
  | 'whiteboard'
  | 'printer'
  | 'sideboard'
  | 'chandelier'
  | 'potted_plant'
  | 'lamp'
  | 'coat_rack'
  | 'shoe_rack';

export type OpeningType = 'door' | 'window';

export type DoorSubType = 'single_leaf' | 'double_leaf' | 'sliding' | 'french';
export type WindowSubType = 'casement' | 'sliding' | 'fixed' | 'louvre';
export type OpeningMaterial = 'timber' | 'steel' | 'aluminum' | 'glass';

export interface Opening {
  type: OpeningType;
  positionFromLeft: number;
  widthMeters: number;
  heightMeters?: number;
  sillHeight?: number;
  /** Richer (optional) metadata used by the BOQ / cost engines. */
  subType?: DoorSubType | WindowSubType;
  material?: OpeningMaterial;
}

export type WallType = 'external' | 'internal' | 'partition';
export type WallMaterial = 'stone' | 'block' | 'brick';

export interface Wall {
  hasWall: boolean;
  openings: Opening[];
  /** Richer (optional) metadata. Engines fall back to sensible defaults. */
  wallType?: WallType;
  thickness?: number;
  material?: WallMaterial;
}

export interface Walls {
  north: Wall;
  south: Wall;
  east: Wall;
  west: Wall;
}

export interface FurnitureItem {
  type: FurnitureType;
  x: number;
  y: number;
  rotation: number;
  widthMeters: number;
  depthMeters: number;
}

export type FloorFinish =
  | 'ceramic_tile'
  | 'porcelain_tile'
  | 'hardwood'
  | 'laminate'
  | 'concrete'
  | 'carpet'
  | 'terrazzo'
  | 'vinyl';

export type WallFinish = 'paint' | 'wallpaper' | 'tiles' | 'exposed_brick' | 'plaster';
export type CeilingType = 'flat_plaster' | 'suspended' | 'exposed_slab' | 't_and_g_timber';

export interface RoomElectrical {
  lightPoints: number;
  socketOutlets: number;
  switchPoints: number;
}

export interface RoomPlumbing {
  hasColdWater: boolean;
  hasHotWater: boolean;
  hasDrainage: boolean;
  fixtures: string[];
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  x: number;
  y: number;
  widthMeters: number;
  depthMeters: number;
  walls: Walls;
  furniture: FurnitureItem[];
  /** Richer (optional) metadata used by analytical engines. */
  floorFinish?: FloorFinish;
  wallFinish?: WallFinish;
  ceilingType?: CeilingType;
  electrical?: RoomElectrical;
  plumbing?: RoomPlumbing;
}

export interface Floor {
  floorNumber: number;
  floorName: string;
  heightMeters: number;
  rooms: Room[];
}

export type Orientation = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export type BuildingType = 'residential' | 'commercial' | 'institutional' | 'mixed_use';
export type ClimateZoneId =
  | 'highland_central'
  | 'coastal'
  | 'western_lake'
  | 'arid_north'
  | 'rift_valley';

export interface Roofing {
  type: 'gable' | 'hip' | 'flat' | 'mono_pitch' | 'mansard';
  material:
    | 'corrugated_iron_sheets'
    | 'clay_tiles'
    | 'concrete_tiles'
    | 'polycarbonate'
    | 'makuti';
  ridgeHeightMeters?: number;
  pitchDegrees?: number;
  overhangMeters?: number;
}

export interface Foundation {
  type: 'strip' | 'pad' | 'raft' | 'pile';
  depthMeters?: number;
  material?: 'reinforced_concrete' | 'mass_concrete' | 'stone';
}

export interface Structure {
  system: 'load_bearing_walls' | 'frame_and_infill' | 'reinforced_concrete_frame';
  slabType?: 'solid_slab' | 'ribbed_slab' | 'none_timber_floor';
  beamNotes?: string;
  columnNotes?: string;
}

export interface ExternalWorks {
  hasBoundaryWall?: boolean;
  hasDriveway?: boolean;
  hasLandscaping?: boolean;
  hasSepticTank?: boolean;
  hasWaterTank?: boolean;
  waterTankLiters?: number;
}

export interface FloorPlan {
  buildingName: string;
  floors: Floor[];
  totalAreaSqMeters: number;
  /** Richer (optional) metadata used by analytical engines. */
  buildingType?: BuildingType;
  orientation?: Orientation;
  climateZone?: ClimateZoneId;
  roofing?: Roofing;
  foundation?: Foundation;
  structure?: Structure;
  externalWorks?: ExternalWorks;
}

export type AppMode = 'prompt' | 'floorplan' | 'walkthrough';
