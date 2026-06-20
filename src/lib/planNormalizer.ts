import { FloorPlan, Floor, Room, Opening, RoomType } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic, LAYOUT-PRESERVING normaliser for doors & windows.
//
// AI output (and imported plans) frequently has opening problems:
//   • no main entrance door to the outside
//   • windows placed on interior (shared) walls
//   • doors/windows hugging a corner or running off the end of a wall
//   • overlapping openings on the same wall
//   • a fully-enclosed room with no door at all
//
// This pass fixes those WITHOUT moving or resizing any room, so the floor plan
// keeps its shape while the openings become sensible. It is idempotent.
// ─────────────────────────────────────────────────────────────────────────────

type Side = 'north' | 'south' | 'east' | 'west';
const SIDES: Side[] = ['north', 'south', 'east', 'west'];
const EPS = 0.06;
const CORNER_MARGIN = 0.2; // keep openings this far from each corner
const GAP = 0.15; // minimum gap between two openings on the same wall

const ENTRANCE_PRIORITY: RoomType[] = [
  'living_room',
  'reception',
  'hallway',
  'corridor',
  'dining_room',
  'kitchen',
];

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function round(n: number): number {
  return Math.round(n * 20) / 20; // nearest 5cm
}

function bounds(rooms: Room[]): Bounds {
  return {
    minX: Math.min(...rooms.map((r) => r.x)),
    maxX: Math.max(...rooms.map((r) => r.x + r.widthMeters)),
    minY: Math.min(...rooms.map((r) => r.y)),
    maxY: Math.max(...rooms.map((r) => r.y + r.depthMeters)),
  };
}

function isExternalSide(room: Room, side: Side, b: Bounds): boolean {
  switch (side) {
    case 'north':
      return Math.abs(room.y - b.minY) < EPS;
    case 'south':
      return Math.abs(room.y + room.depthMeters - b.maxY) < EPS;
    case 'west':
      return Math.abs(room.x - b.minX) < EPS;
    case 'east':
      return Math.abs(room.x + room.widthMeters - b.maxX) < EPS;
  }
}

function sideLength(room: Room, side: Side): number {
  return side === 'north' || side === 'south' ? room.widthMeters : room.depthMeters;
}

function ensureWall(room: Room, side: Side) {
  const wall = room.walls[side];
  if (wall && !wall.openings) wall.openings = [];
  return wall;
}

/** Clamp + de-overlap a wall's openings; drop interior windows and anything that can't fit. */
function cleanWallOpenings(openings: Opening[], len: number, isExternal: boolean): Opening[] {
  const usable = len - 2 * CORNER_MARGIN;
  if (usable <= 0.4) return []; // wall too short for any opening

  const sorted = [...openings]
    .filter((o) => !(o.type === 'window' && !isExternal)) // windows belong on exterior walls only
    .sort((a, b) => a.positionFromLeft - b.positionFromLeft);

  const cleaned: Opening[] = [];
  let cursor = CORNER_MARGIN;

  for (const o of sorted) {
    const w = Math.min(o.widthMeters, usable);
    let pos = Math.max(cursor, o.positionFromLeft);
    const maxPos = len - w - CORNER_MARGIN;
    if (pos > maxPos) pos = maxPos;
    if (pos < CORNER_MARGIN) pos = CORNER_MARGIN;
    if (pos > maxPos) continue; // genuinely can't fit alongside the others — drop it
    cleaned.push({ ...o, positionFromLeft: round(pos), widthMeters: round(w) });
    cursor = pos + w + GAP;
  }

  return cleaned;
}

/** Add a centered door to a wall, avoiding overlap with existing openings. */
function addDoor(room: Room, side: Side, width: number, isEntrance: boolean): boolean {
  const wall = ensureWall(room, side);
  if (!wall) return false;
  wall.hasWall = true;
  const len = sideLength(room, side);
  const w = Math.min(width, len - 2 * CORNER_MARGIN);
  if (w < 0.6) return false; // wall too short for a usable door

  let pos = (len - w) / 2;
  const existing = [...wall.openings].sort((a, b) => a.positionFromLeft - b.positionFromLeft);
  const overlaps = (p: number) =>
    existing.some((o) => !(p + w <= o.positionFromLeft || p >= o.positionFromLeft + o.widthMeters));

  if (overlaps(pos) && existing.length > 0) {
    const last = existing[existing.length - 1];
    pos = last.positionFromLeft + last.widthMeters + GAP;
    if (pos > len - w - CORNER_MARGIN) {
      // try before the first opening instead
      pos = existing[0].positionFromLeft - GAP - w;
    }
  }
  if (pos < CORNER_MARGIN || pos > len - w - CORNER_MARGIN) return false;

  wall.openings.push({
    type: 'door',
    positionFromLeft: round(pos),
    widthMeters: round(w),
    ...(isEntrance ? { subType: 'single_leaf', material: 'timber' } : {}),
  });
  return true;
}

function roomHasAccess(room: Room): boolean {
  return SIDES.some((s) => {
    const w = room.walls[s];
    if (!w) return true; // missing wall === open side
    if (!w.hasWall) return true; // open to neighbour
    return (w.openings || []).some((o) => o.type === 'door');
  });
}

function normalizeFloor(floor: Floor, isGround: boolean): void {
  const rooms = floor.rooms;
  if (rooms.length === 0) return;
  const b = bounds(rooms);

  // 1. Clean every wall's openings (clamp, de-overlap, drop interior windows).
  for (const room of rooms) {
    for (const side of SIDES) {
      const wall = room.walls[side];
      if (!wall || !wall.hasWall) {
        if (wall) wall.openings = wall.openings || [];
        continue;
      }
      wall.openings = cleanWallOpenings(wall.openings || [], sideLength(room, side), isExternalSide(room, side, b));
    }
  }

  // 2. Guarantee every room is reachable (fallback for fully-enclosed rooms).
  for (const room of rooms) {
    if (roomHasAccess(room)) continue;
    const internalSides = SIDES.filter((s) => room.walls[s]?.hasWall && !isExternalSide(room, s, b));
    const target = internalSides.sort((a, b2) => sideLength(room, b2) - sideLength(room, a))[0];
    const fallback = SIDES.filter((s) => room.walls[s]?.hasWall).sort(
      (a, b2) => sideLength(room, b2) - sideLength(room, a),
    )[0];
    const doorWidth = room.type === 'bathroom' || room.type === 'toilet' ? 0.7 : 0.8;
    addDoor(room, target || fallback, doorWidth, false);
  }

  // 3. Guarantee a main entrance door to the outside (ground floor only).
  if (isGround) {
    const hasEntrance = rooms.some((r) =>
      SIDES.some((s) => isExternalSide(r, s, b) && (r.walls[s]?.openings || []).some((o) => o.type === 'door')),
    );
    if (!hasEntrance) {
      const chosen = pickEntrance(rooms, b);
      if (chosen) addDoor(chosen.room, chosen.side, 0.9, true);
    }
  }
}

/** Pick the best room + external wall for the main entrance. */
function pickEntrance(rooms: Room[], b: Bounds): { room: Room; side: Side } | null {
  const externalSidesOf = (room: Room): Side[] =>
    SIDES.filter((s) => isExternalSide(room, s, b) && room.walls[s]?.hasWall !== false);

  // Prefer a public room by type.
  for (const type of ENTRANCE_PRIORITY) {
    for (const room of rooms) {
      if (room.type !== type) continue;
      const ext = externalSidesOf(room);
      if (ext.length) {
        const side = ext.sort((a, c) => sideLength(room, c) - sideLength(room, a))[0];
        return { room, side };
      }
    }
  }

  // Otherwise, the room with the single longest external wall.
  let best: { room: Room; side: Side; len: number } | null = null;
  for (const room of rooms) {
    for (const side of externalSidesOf(room)) {
      const len = sideLength(room, side);
      if (!best || len > best.len) best = { room, side, len };
    }
  }
  return best ? { room: best.room, side: best.side } : null;
}

/** Return a normalised COPY of the plan (input is not mutated). */
export function normalizeFloorPlan(plan: FloorPlan): FloorPlan {
  const copy: FloorPlan = JSON.parse(JSON.stringify(plan));
  copy.floors.forEach((floor, i) => normalizeFloor(floor, i === 0));
  return copy;
}

/** True if normalising would change anything (cheap defect check). */
export function planNeedsNormalizing(plan: FloorPlan): boolean {
  return JSON.stringify(plan) !== JSON.stringify(normalizeFloorPlan(plan));
}
