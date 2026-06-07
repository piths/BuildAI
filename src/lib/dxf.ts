import { Floor, FloorPlan, Room, Wall } from './types';

/**
 * DXF export/import for BuildAI floor plans.
 *
 * Coordinate mapping: the floor plan uses x (east) / y (south) in meters.
 * DXF (and CAD) uses Y-up (north), so we flip Y: dxfY = -y.
 * Units are meters ($INSUNITS = 6).
 */

class DxfBuilder {
  private lines: string[] = [];

  private tag(code: number, value: string | number) {
    this.lines.push(String(code));
    this.lines.push(String(value));
  }

  header() {
    this.tag(0, 'SECTION');
    this.tag(2, 'HEADER');
    this.tag(9, '$ACADVER');
    this.tag(1, 'AC1015'); // AutoCAD 2000
    this.tag(9, '$INSUNITS');
    this.tag(70, 6); // meters
    this.tag(0, 'ENDSEC');
    // Minimal TABLES section with layers
    this.tag(0, 'SECTION');
    this.tag(2, 'TABLES');
    this.tag(0, 'TABLE');
    this.tag(2, 'LAYER');
    this.tag(70, 5);
    this.layerDef('WALLS', 7);
    this.layerDef('DOORS', 4);
    this.layerDef('WINDOWS', 5);
    this.layerDef('FURNITURE', 3);
    this.layerDef('TEXT', 2);
    this.tag(0, 'ENDTAB');
    this.tag(0, 'ENDSEC');
    // Begin entities
    this.tag(0, 'SECTION');
    this.tag(2, 'ENTITIES');
  }

  private layerDef(name: string, color: number) {
    this.tag(0, 'LAYER');
    this.tag(2, name);
    this.tag(70, 0);
    this.tag(62, color);
    this.tag(6, 'CONTINUOUS');
  }

  line(layer: string, x1: number, y1: number, x2: number, y2: number) {
    this.tag(0, 'LINE');
    this.tag(8, layer);
    this.tag(10, x1);
    this.tag(20, -y1);
    this.tag(30, 0);
    this.tag(11, x2);
    this.tag(21, -y2);
    this.tag(31, 0);
  }

  arc(layer: string, cx: number, cy: number, radius: number, startDeg: number, endDeg: number) {
    this.tag(0, 'ARC');
    this.tag(8, layer);
    this.tag(10, cx);
    this.tag(20, -cy);
    this.tag(30, 0);
    this.tag(40, radius);
    // Y is flipped, so we mirror the angles about the X axis: angle -> -angle
    this.tag(50, -endDeg);
    this.tag(51, -startDeg);
  }

  rect(layer: string, x: number, y: number, w: number, h: number) {
    // closed LWPOLYLINE
    this.tag(0, 'LWPOLYLINE');
    this.tag(8, layer);
    this.tag(90, 4);
    this.tag(70, 1); // closed
    const pts = [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ];
    for (const [px, py] of pts) {
      this.tag(10, px);
      this.tag(20, -py);
    }
  }

  text(layer: string, x: number, y: number, height: number, value: string) {
    this.tag(0, 'TEXT');
    this.tag(8, layer);
    this.tag(10, x);
    this.tag(20, -y);
    this.tag(30, 0);
    this.tag(40, height);
    this.tag(1, value);
    this.tag(72, 1); // horizontal center
    this.tag(11, x);
    this.tag(21, -y);
    this.tag(31, 0);
  }

  finish(): string {
    this.tag(0, 'ENDSEC');
    this.tag(0, 'EOF');
    return this.lines.join('\n');
  }
}

function emitWall(
  dxf: DxfBuilder,
  wall: Wall,
  x1: number,
  y1: number,
  length: number,
  dir: 'h' | 'v'
) {
  if (!wall.hasWall) return;

  const at = (offset: number): [number, number] =>
    dir === 'h' ? [x1 + offset, y1] : [x1, y1 + offset];

  const openings = [...wall.openings].sort((a, b) => a.positionFromLeft - b.positionFromLeft);
  let cursor = 0;

  for (const op of openings) {
    const start = op.positionFromLeft;
    const end = start + op.widthMeters;
    if (cursor < start) {
      const [ax, ay] = at(cursor);
      const [bx, by] = at(start);
      dxf.line('WALLS', ax, ay, bx, by);
    }
    // Opening symbol
    const [sx, sy] = at(start);
    if (op.type === 'door') {
      // Door leaf + swing arc
      const [ex, ey] = at(end);
      if (dir === 'h') {
        dxf.line('DOORS', sx, sy, sx, sy + op.widthMeters);
        dxf.arc('DOORS', sx, sy, op.widthMeters, 0, 90);
      } else {
        dxf.line('DOORS', sx, sy, sx + op.widthMeters, sy);
        dxf.arc('DOORS', sx, sy, op.widthMeters, 90, 180);
      }
      void ex; void ey;
    } else {
      // Window: a line across the opening on the WINDOWS layer
      const [ex, ey] = at(end);
      dxf.line('WINDOWS', sx, sy, ex, ey);
    }
    cursor = end;
  }

  if (cursor < length) {
    const [ax, ay] = at(cursor);
    const [bx, by] = at(length);
    dxf.line('WALLS', ax, ay, bx, by);
  }
}

export function exportFloorToDxf(floor: Floor): string {
  const dxf = new DxfBuilder();
  dxf.header();

  for (const room of floor.rooms) {
    const { x, y, widthMeters: w, depthMeters: d } = room;
    // Walls
    emitWall(dxf, room.walls.north, x, y, w, 'h');
    emitWall(dxf, room.walls.south, x, y + d, w, 'h');
    emitWall(dxf, room.walls.west, x, y, d, 'v');
    emitWall(dxf, room.walls.east, x + w, y, d, 'v');

    // Furniture rectangles
    for (const f of room.furniture) {
      dxf.rect('FURNITURE', x + f.x, y + f.y, f.widthMeters, f.depthMeters);
    }

    // Room label + area
    const area = (w * d).toFixed(1);
    dxf.text('TEXT', x + w / 2, y + d / 2 - 0.25, 0.3, room.name);
    dxf.text('TEXT', x + w / 2, y + d / 2 + 0.25, 0.2, `${area} m2`);
  }

  return dxf.finish();
}

export function downloadDxf(floorPlan: FloorPlan, floorIndex = 0) {
  const floor = floorPlan.floors[floorIndex];
  const content = exportFloorToDxf(floor);
  const blob = new Blob([content], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = floorPlan.buildingName.replace(/\s+/g, '_');
  a.href = url;
  a.download = `${safeName}_${floor.floorName.replace(/\s+/g, '_')}.dxf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ----------------------- IMPORT -----------------------

interface DxfEntity {
  type: string;
  layer?: string;
  vertices: { x: number; y: number }[];
  text?: string;
  textPos?: { x: number; y: number };
}

/**
 * Parse a DXF file's ENTITIES into a simplified entity list.
 * Targets LWPOLYLINE (closed loops → rooms), LINE, and TEXT.
 */
function parseDxfEntities(content: string): DxfEntity[] {
  const lines = content.split(/\r\n|\r|\n/);
  const pairs: { code: number; value: string }[] = [];
  for (let i = 0; i < lines.length - 1; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    const value = lines[i + 1];
    if (!Number.isNaN(code)) pairs.push({ code, value });
  }

  const entities: DxfEntity[] = [];
  let inEntities = false;
  let current: DxfEntity | null = null;
  let pendingX: number | null = null;

  const flush = () => {
    if (current) entities.push(current);
    current = null;
    pendingX = null;
  };

  for (let i = 0; i < pairs.length; i++) {
    const { code } = pairs[i];
    const value = pairs[i].value;
    const tval = value.trim();

    if (code === 0) {
      if (tval === 'SECTION') continue;
      // Track entities section via the following code 2
      if (tval === 'ENDSEC') {
        flush();
        inEntities = false;
        continue;
      }
      flush();
      if (['LWPOLYLINE', 'LINE', 'POLYLINE', 'TEXT', 'MTEXT'].includes(tval)) {
        current = { type: tval, vertices: [] };
      }
      continue;
    }

    if (code === 2 && tval === 'ENTITIES') {
      inEntities = true;
      continue;
    }

    if (!current) continue;

    switch (code) {
      case 8:
        current.layer = value.trim();
        break;
      case 10:
        pendingX = parseFloat(value);
        if (current.type === 'TEXT' || current.type === 'MTEXT') {
          current.textPos = { x: pendingX, y: current.textPos?.y ?? 0 };
        }
        break;
      case 20: {
        const yv = parseFloat(value);
        if (current.type === 'TEXT' || current.type === 'MTEXT') {
          current.textPos = { x: current.textPos?.x ?? pendingX ?? 0, y: -yv };
        } else if (pendingX !== null) {
          current.vertices.push({ x: pendingX, y: -yv });
          pendingX = null;
        }
        break;
      }
      case 1:
        if (current.type === 'TEXT' || current.type === 'MTEXT') {
          current.text = value;
        }
        break;
    }
    void inEntities;
  }
  flush();
  return entities;
}

/**
 * Build a FloorPlan from a DXF file. Closed rectangular polylines become rooms.
 * Returns null if no usable geometry is found.
 */
export function importDxf(content: string): FloorPlan | null {
  const entities = parseDxfEntities(content);

  // Gather candidate room rectangles from closed polylines (>= 4 verts)
  const polys = entities.filter(
    (e) => e.type === 'LWPOLYLINE' || e.type === 'POLYLINE'
  );
  const texts = entities.filter((e) => (e.type === 'TEXT' || e.type === 'MTEXT') && e.text);

  const rects: { x: number; y: number; w: number; d: number }[] = [];
  for (const p of polys) {
    if (p.vertices.length < 4) continue;
    const xs = p.vertices.map((v) => v.x);
    const ys = p.vertices.map((v) => v.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const w = maxX - minX;
    const d = maxY - minY;
    if (w < 1 || d < 1) continue; // ignore tiny shapes (furniture, symbols)
    rects.push({ x: minX, y: minY, w, d });
  }

  if (rects.length === 0) return null;

  // Normalize so the top-left of the whole drawing is at (0,0)
  const offsetX = Math.min(...rects.map((r) => r.x));
  const offsetY = Math.min(...rects.map((r) => r.y));

  // Sort biggest-first and treat the largest as building outline only if it
  // contains the others; otherwise treat all as rooms.
  rects.sort((a, b) => b.w * b.d - a.w * a.d);

  const findLabel = (r: { x: number; y: number; w: number; d: number }): string => {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.d / 2;
    let best: string | null = null;
    let bestDist = Infinity;
    for (const t of texts) {
      if (!t.textPos || !t.text) continue;
      // Skip area labels like "20.0 m2"
      if (/m2|m²|^\d/.test(t.text.trim())) continue;
      const dx = t.textPos.x - cx;
      const dy = t.textPos.y - cy;
      const dist = dx * dx + dy * dy;
      const inside =
        t.textPos.x >= r.x && t.textPos.x <= r.x + r.w &&
        t.textPos.y >= r.y && t.textPos.y <= r.y + r.d;
      if (inside && dist < bestDist) {
        bestDist = dist;
        best = t.text.trim();
      }
    }
    return best || 'Room';
  };

  const guessType = (name: string): Room['type'] => {
    const n = name.toLowerCase();
    if (n.includes('bed')) return 'bedroom';
    if (n.includes('kitchen')) return 'kitchen';
    if (n.includes('bath')) return 'bathroom';
    if (n.includes('toilet') || n.includes('wc')) return 'toilet';
    if (n.includes('living')) return 'living_room';
    if (n.includes('dining')) return 'dining_room';
    if (n.includes('office')) return 'office';
    if (n.includes('hall') || n.includes('corridor')) return 'hallway';
    if (n.includes('garage')) return 'garage';
    if (n.includes('shop')) return 'shop';
    if (n.includes('class')) return 'classroom';
    return 'living_room';
  };

  // Detect a building outline (a rect that contains most others)
  let roomRects = rects;
  if (rects.length > 1) {
    const biggest = rects[0];
    const contained = rects.slice(1).filter(
      (r) =>
        r.x >= biggest.x - 0.5 &&
        r.y >= biggest.y - 0.5 &&
        r.x + r.w <= biggest.x + biggest.w + 0.5 &&
        r.y + r.d <= biggest.y + biggest.d + 0.5
    );
    if (contained.length >= rects.length - 1 && contained.length > 0) {
      roomRects = rects.slice(1);
    }
  }

  const rooms: Room[] = roomRects.map((r, i) => {
    const name = findLabel(r);
    const x = r.x - offsetX;
    const y = r.y - offsetY;
    return {
      id: `room_${i + 1}`,
      name,
      type: guessType(name),
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      widthMeters: Math.round(r.w * 100) / 100,
      depthMeters: Math.round(r.d * 100) / 100,
      walls: {
        north: { hasWall: true, openings: [] },
        south: { hasWall: true, openings: [] },
        east: { hasWall: true, openings: [] },
        west: { hasWall: true, openings: [] },
      },
      furniture: [],
    };
  });

  const totalArea = rooms.reduce((s, r) => s + r.widthMeters * r.depthMeters, 0);

  return {
    buildingName: 'Imported Plan',
    floors: [
      {
        floorNumber: 1,
        floorName: 'Ground Floor',
        heightMeters: 3,
        rooms,
      },
    ],
    totalAreaSqMeters: Math.round(totalArea * 10) / 10,
  };
}
