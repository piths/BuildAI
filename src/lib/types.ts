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

export interface Opening {
  type: OpeningType;
  positionFromLeft: number;
  widthMeters: number;
  heightMeters?: number;
  sillHeight?: number;
}

export interface Wall {
  hasWall: boolean;
  openings: Opening[];
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
}

export interface Floor {
  floorNumber: number;
  floorName: string;
  heightMeters: number;
  rooms: Room[];
}

export interface FloorPlan {
  buildingName: string;
  floors: Floor[];
  totalAreaSqMeters: number;
}

export type AppMode = 'prompt' | 'floorplan' | 'walkthrough';
