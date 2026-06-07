import { FloorPlan } from './types';
import { renderFloorPlan } from './floorPlanRenderer';

const STORAGE_KEY = 'buildai_saved_designs';

export interface SavedDesign {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  totalArea: number;
  roomCount: number;
  floorCount: number;
  thumbnail: string; // data URL
  floorPlan: FloorPlan;
}

export interface SavedDesignMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  totalArea: number;
  roomCount: number;
  floorCount: number;
  thumbnail: string;
}

/**
 * Render a small thumbnail of the floor plan's ground floor to a data URL.
 */
export function generateThumbnail(floorPlan: FloorPlan, width = 320, height = 200): string {
  if (typeof document === 'undefined') return '';
  const floor = floorPlan.floors[0];
  if (!floor || floor.rooms.length === 0) return '';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Compute bounds of the floor
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const room of floor.rooms) {
    minX = Math.min(minX, room.x);
    minY = Math.min(minY, room.y);
    maxX = Math.max(maxX, room.x + room.widthMeters);
    maxY = Math.max(maxY, room.y + room.depthMeters);
  }

  const planW = maxX - minX;
  const planH = maxY - minY;
  const padding = 20;
  const scale = Math.min(
    (width - padding * 2) / planW,
    (height - padding * 2) / planH
  );

  const offsetX = (width - planW * scale) / 2 - minX * scale;
  const offsetY = (height - planH * scale) / 2 - minY * scale;

  renderFloorPlan(ctx, floor, width, height, {
    scale,
    offsetX,
    offsetY,
    hoveredRoom: null,
    selectedRoom: null,
    selectedFurniture: null,
  });

  return canvas.toDataURL('image/jpeg', 0.6);
}

function loadAll(): SavedDesign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedDesign[];
  } catch {
    return [];
  }
}

function persist(designs: SavedDesign[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
  } catch (e) {
    // localStorage might be full — drop the oldest and retry once
    if (designs.length > 1) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(designs.slice(0, -1)));
      } catch {
        console.warn('Could not save design — storage full', e);
      }
    }
  }
}

/**
 * Save or update a design. If an id is provided and exists, it updates that record.
 * Returns the saved design id.
 */
export function saveDesign(floorPlan: FloorPlan, existingId?: string): string {
  const designs = loadAll();
  const now = Date.now();
  const roomCount = floorPlan.floors.reduce((sum, f) => sum + f.rooms.length, 0);
  const thumbnail = generateThumbnail(floorPlan);

  if (existingId) {
    const idx = designs.findIndex((d) => d.id === existingId);
    if (idx !== -1) {
      designs[idx] = {
        ...designs[idx],
        name: floorPlan.buildingName,
        updatedAt: now,
        totalArea: floorPlan.totalAreaSqMeters,
        roomCount,
        floorCount: floorPlan.floors.length,
        thumbnail,
        floorPlan,
      };
      persist(designs);
      return existingId;
    }
  }

  const id = `design_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const design: SavedDesign = {
    id,
    name: floorPlan.buildingName,
    createdAt: now,
    updatedAt: now,
    totalArea: floorPlan.totalAreaSqMeters,
    roomCount,
    floorCount: floorPlan.floors.length,
    thumbnail,
    floorPlan,
  };
  // Newest first, cap at 30 designs
  const updated = [design, ...designs].slice(0, 30);
  persist(updated);
  return id;
}

export function getDesigns(): SavedDesignMeta[] {
  return loadAll().map(({ floorPlan, ...meta }) => meta);
}

export function getDesign(id: string): SavedDesign | null {
  return loadAll().find((d) => d.id === id) || null;
}

export function deleteDesign(id: string): void {
  const designs = loadAll().filter((d) => d.id !== id);
  persist(designs);
}

export function renameDesign(id: string, name: string): void {
  const designs = loadAll();
  const idx = designs.findIndex((d) => d.id === id);
  if (idx !== -1) {
    designs[idx].name = name;
    designs[idx].floorPlan.buildingName = name;
    designs[idx].updatedAt = Date.now();
    persist(designs);
  }
}
