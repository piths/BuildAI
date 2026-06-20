import { Floor, Orientation } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Sunlight & orientation analysis.
// Kenya sits on the equator, so East/West sun exposure matters far more than
// North/South. East windows get cool morning sun; West windows get hot afternoon
// sun. This module maps each room's external windows to a geographic direction
// (accounting for the building's orientation) and produces practical tips.
// ─────────────────────────────────────────────────────────────────────────────

export type Side = 'north' | 'south' | 'east' | 'west';
export type SunPeriod = 'morning' | 'afternoon' | 'neutral';

export interface SunWindow {
  roomId: string;
  roomName: string;
  side: Side;
  geoDir: Orientation;
  period: SunPeriod;
}

export interface RoomSunTip {
  roomId: string;
  roomName: string;
  status: 'good' | 'warning' | 'neutral';
  message: string;
}

export interface SunAnalysis {
  orientation: Orientation;
  windows: SunWindow[];
  tips: RoomSunTip[];
}

const ORIENTATIONS: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const SIDE_BASE_INDEX: Record<Side, number> = { north: 0, east: 2, south: 4, west: 6 };

/** Map a plan-local wall side to a geographic direction given building orientation. */
export function sideToGeo(side: Side, orientation: Orientation): Orientation {
  const oi = ORIENTATIONS.indexOf(orientation);
  const idx = (SIDE_BASE_INDEX[side] + oi) % 8;
  return ORIENTATIONS[idx];
}

function periodFor(geo: Orientation): SunPeriod {
  if (geo.includes('E')) return 'morning';
  if (geo.includes('W')) return 'afternoon';
  return 'neutral';
}

export function analyseSun(floor: Floor, orientation: Orientation = 'N'): SunAnalysis {
  const windows: SunWindow[] = [];
  const tips: RoomSunTip[] = [];
  const sides: Side[] = ['north', 'south', 'east', 'west'];

  for (const room of floor.rooms) {
    const roomWindowDirs: { side: Side; geo: Orientation; period: SunPeriod }[] = [];
    for (const side of sides) {
      const wall = room.walls?.[side];
      if (!wall?.hasWall) continue;
      const hasWindow = (wall.openings || []).some((o) => o.type === 'window');
      if (!hasWindow) continue;
      const geo = sideToGeo(side, orientation);
      const period = periodFor(geo);
      windows.push({ roomId: room.id, roomName: room.name, side, geoDir: geo, period });
      roomWindowDirs.push({ side, geo, period });
    }

    // Per-room recommendation.
    const tip = roomTip(room.type, room.name, room.id, roomWindowDirs);
    if (tip) tips.push(tip);
  }

  return { orientation, windows, tips };
}

function roomTip(
  type: string,
  name: string,
  id: string,
  dirs: { side: Side; geo: Orientation; period: SunPeriod }[],
): RoomSunTip | null {
  const hasMorning = dirs.some((d) => d.period === 'morning');
  const hasAfternoon = dirs.some((d) => d.period === 'afternoon');

  if (type === 'living_room' || type === 'reception') {
    if (hasMorning) return { roomId: id, roomName: name, status: 'good', message: `${name} gets morning sun — great natural light.` };
    if (hasAfternoon) return { roomId: id, roomName: name, status: 'warning', message: `${name} faces west — may get hot in the afternoon.` };
  }
  if (type === 'kitchen') {
    if (hasMorning) return { roomId: id, roomName: name, status: 'good', message: `${name} faces east — ideal morning light for cooking.` };
    return { roomId: id, roomName: name, status: 'neutral', message: `${name} would benefit from an east-facing window.` };
  }
  if (type === 'bedroom') {
    if (hasMorning) return { roomId: id, roomName: name, status: 'good', message: `${name} gets gentle morning sun — cool in the evening.` };
    if (hasAfternoon) return { roomId: id, roomName: name, status: 'warning', message: `${name} faces west — may be hot at bedtime; consider shading.` };
  }
  if ((type === 'bathroom' || type === 'toilet') && hasMorning) {
    return { roomId: id, roomName: name, status: 'good', message: `${name} gets morning sun — helps keep it dry.` };
  }
  return null;
}
