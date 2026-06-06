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
