import { Floor, Room, FurnitureItem, Wall, Opening } from './types';
import { ROOM_COLORS, SCALE_FACTOR, WALL_THICKNESS } from './constants';

interface RenderOptions {
  scale: number;
  offsetX: number;
  offsetY: number;
  hoveredRoom: string | null;
  selectedRoom: string | null;
  selectedFurniture?: { roomIndex: number; furnitureIndex: number } | null;
  selectedOpening?: SelectedOpening | null;
}

export function renderFloorPlan(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  canvasWidth: number,
  canvasHeight: number,
  options: RenderOptions
) {
  const { scale, offsetX, offsetY, hoveredRoom, selectedRoom, selectedFurniture, selectedOpening } = options;
  const s = scale;

  // Clear canvas
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Draw grid
  drawGrid(ctx, canvasWidth, canvasHeight, s, offsetX, offsetY);

  // Draw rooms
  for (const room of floor.rooms) {
    drawRoom(ctx, room, s, hoveredRoom, selectedRoom);
  }

  // Draw walls on top
  for (const room of floor.rooms) {
    drawWalls(ctx, room, s);
  }

  // Draw furniture
  for (const room of floor.rooms) {
    drawFurniture(ctx, room, s);
  }

  // Draw dimensions
  for (const room of floor.rooms) {
    drawDimensions(ctx, room, s);
  }

  // Draw selection handles for selected furniture
  if (selectedFurniture) {
    const room = floor.rooms[selectedFurniture.roomIndex];
    const item = room?.furniture[selectedFurniture.furnitureIndex];
    if (room && item) {
      drawFurnitureSelection(ctx, room, item, s);
    }
  }

  // Draw selection for selected opening (door/window)
  if (selectedOpening) {
    drawOpeningSelection(ctx, floor, selectedOpening, s);
  }

  ctx.restore();
}

const HANDLE_SIZE = 8;

function drawFurnitureSelection(
  ctx: CanvasRenderingContext2D,
  room: Room,
  item: FurnitureItem,
  scale: number
) {
  const fx = (room.x + item.x) * scale;
  const fy = (room.y + item.y) * scale;
  const fw = item.widthMeters * scale;
  const fh = item.depthMeters * scale;

  // Selection outline
  ctx.save();
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(fx, fy, fw, fh);
  ctx.setLineDash([]);

  // Corner resize handles
  const corners = [
    [fx, fy],
    [fx + fw, fy],
    [fx, fy + fh],
    [fx + fw, fy + fh],
  ];
  ctx.fillStyle = '#00d4ff';
  ctx.strokeStyle = '#0f0f1a';
  ctx.lineWidth = 1;
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx - HANDLE_SIZE / 2, cy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(cx - HANDLE_SIZE / 2, cy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
  }

  // Rotate handle (above top edge)
  const rotX = fx + fw / 2;
  const rotY = fy - 22;
  ctx.beginPath();
  ctx.moveTo(fx + fw / 2, fy);
  ctx.lineTo(rotX, rotY + HANDLE_SIZE / 2);
  ctx.strokeStyle = '#00d4ff';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rotX, rotY, HANDLE_SIZE / 2 + 1, 0, Math.PI * 2);
  ctx.fillStyle = '#7c3aed';
  ctx.fill();
  ctx.strokeStyle = '#0f0f1a';
  ctx.stroke();

  ctx.restore();
}

export type HandleType = 'nw' | 'ne' | 'sw' | 'se' | 'rotate' | null;

export function getFurnitureHandleAtPosition(
  room: Room,
  item: FurnitureItem,
  worldX: number,
  worldY: number,
  scale: number
): HandleType {
  const fx = (room.x + item.x) * scale;
  const fy = (room.y + item.y) * scale;
  const fw = item.widthMeters * scale;
  const fh = item.depthMeters * scale;
  const tol = HANDLE_SIZE;

  const near = (px: number, py: number) =>
    Math.abs(worldX - px) <= tol && Math.abs(worldY - py) <= tol;

  if (near(fx + fw / 2, fy - 22)) return 'rotate';
  if (near(fx, fy)) return 'nw';
  if (near(fx + fw, fy)) return 'ne';
  if (near(fx, fy + fh)) return 'sw';
  if (near(fx + fw, fy + fh)) return 'se';
  return null;
}

export function getFurnitureAtPosition(
  floor: Floor,
  worldX: number,
  worldY: number,
  scale: number
): { roomIndex: number; furnitureIndex: number } | null {
  // Iterate in reverse so top-most furniture is picked first
  for (let ri = floor.rooms.length - 1; ri >= 0; ri--) {
    const room = floor.rooms[ri];
    for (let fi = room.furniture.length - 1; fi >= 0; fi--) {
      const item = room.furniture[fi];
      const fx = (room.x + item.x) * scale;
      const fy = (room.y + item.y) * scale;
      const fw = item.widthMeters * scale;
      const fh = item.depthMeters * scale;
      if (worldX >= fx && worldX <= fx + fw && worldY >= fy && worldY <= fy + fh) {
        return { roomIndex: ri, furnitureIndex: fi };
      }
    }
  }
  return null;
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number
) {
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.06)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([4, 4]);

  const gridSize = scale; // 1 meter
  const startX = -offsetX - gridSize;
  const startY = -offsetY - gridSize;
  const endX = canvasWidth - offsetX + gridSize;
  const endY = canvasHeight - offsetY + gridSize;

  for (let x = Math.floor(startX / gridSize) * gridSize; x <= endX; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }

  for (let y = Math.floor(startY / gridSize) * gridSize; y <= endY; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  scale: number,
  hoveredRoom: string | null,
  selectedRoom: string | null
) {
  const x = room.x * scale;
  const y = room.y * scale;
  const w = room.widthMeters * scale;
  const h = room.depthMeters * scale;
  const colors = ROOM_COLORS[room.type] || ROOM_COLORS.corridor;

  // Room fill
  ctx.fillStyle = colors.fill;
  if (hoveredRoom === room.id) {
    ctx.fillStyle = colors.fill.replace('0.15', '0.3').replace('0.12', '0.25').replace('0.1', '0.2');
  }
  if (selectedRoom === room.id) {
    ctx.fillStyle = colors.fill.replace('0.15', '0.35').replace('0.12', '0.3').replace('0.1', '0.25');
  }
  ctx.fillRect(x, y, w, h);

  // Room label
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `bold ${Math.max(10, scale * 0.3)}px "IBM Plex Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(room.name, x + w / 2, y + h / 2 - scale * 0.25);

  // Area label
  const area = (room.widthMeters * room.depthMeters).toFixed(1);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `${Math.max(9, scale * 0.22)}px "IBM Plex Mono", monospace`;
  ctx.fillText(`${area} m²`, x + w / 2, y + h / 2 + scale * 0.15);
}

function drawWalls(ctx: CanvasRenderingContext2D, room: Room, scale: number) {
  const x = room.x * scale;
  const y = room.y * scale;
  const w = room.widthMeters * scale;
  const h = room.depthMeters * scale;
  const wallPx = WALL_THICKNESS * scale;

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = Math.max(2, wallPx * 0.6);
  ctx.lineCap = 'round';

  // North wall (top)
  if (room.walls.north.hasWall) {
    drawWallWithOpenings(ctx, x, y, x + w, y, room.walls.north, scale, 'horizontal');
  }
  // South wall (bottom)
  if (room.walls.south.hasWall) {
    drawWallWithOpenings(ctx, x, y + h, x + w, y + h, room.walls.south, scale, 'horizontal');
  }
  // West wall (left)
  if (room.walls.west.hasWall) {
    drawWallWithOpenings(ctx, x, y, x, y + h, room.walls.west, scale, 'vertical');
  }
  // East wall (right)
  if (room.walls.east.hasWall) {
    drawWallWithOpenings(ctx, x + w, y, x + w, y + h, room.walls.east, scale, 'vertical');
  }
}

function drawWallWithOpenings(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  wall: Wall,
  scale: number,
  direction: 'horizontal' | 'vertical'
) {
  const openings = wall.openings || [];
  if (openings.length === 0) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    return;
  }

  // Sort openings by position
  const sorted = [...openings].sort((a, b) => a.positionFromLeft - b.positionFromLeft);
  let currentPos = 0;
  const totalLength = direction === 'horizontal' ? Math.abs(x2 - x1) : Math.abs(y2 - y1);

  for (const opening of sorted) {
    const openingStart = opening.positionFromLeft * scale;
    const openingEnd = openingStart + opening.widthMeters * scale;

    // Draw wall segment before opening
    if (currentPos < openingStart) {
      if (direction === 'horizontal') {
        ctx.beginPath();
        ctx.moveTo(x1 + currentPos, y1);
        ctx.lineTo(x1 + openingStart, y1);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(x1, y1 + currentPos);
        ctx.lineTo(x1, y1 + openingStart);
        ctx.stroke();
      }
    }

    // Draw opening symbol
    if (opening.type === 'door') {
      drawDoorSymbol(ctx, x1, y1, openingStart, opening.widthMeters * scale, direction, scale);
    } else {
      drawWindowSymbol(ctx, x1, y1, openingStart, opening.widthMeters * scale, direction, scale);
    }

    currentPos = openingEnd;
  }

  // Draw remaining wall after last opening
  if (currentPos < totalLength) {
    if (direction === 'horizontal') {
      ctx.beginPath();
      ctx.moveTo(x1 + currentPos, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x1, y1 + currentPos);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
}

function drawDoorSymbol(
  ctx: CanvasRenderingContext2D,
  wallX: number,
  wallY: number,
  posStart: number,
  width: number,
  direction: 'horizontal' | 'vertical',
  scale: number
) {
  ctx.save();
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 1.2;

  if (direction === 'horizontal') {
    // Door on a horizontal wall (north or south)
    // Hinge at left side of opening, door swings inward (downward from north wall, upward from south wall)
    const hx = wallX + posStart;
    const hy = wallY;

    // Draw a small quarter-circle arc representing the door swing
    ctx.beginPath();
    ctx.arc(hx, hy, width, 0, Math.PI / 2, false);
    ctx.stroke();

    // Door leaf (line from hinge to end of arc)
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + width, hy);
    ctx.stroke();
  } else {
    // Door on a vertical wall (east or west)
    // Hinge at top of opening, door swings inward
    const hx = wallX;
    const hy = wallY + posStart;

    ctx.beginPath();
    ctx.arc(hx, hy, width, Math.PI / 2, Math.PI, false);
    ctx.stroke();

    // Door leaf
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx, hy + width);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWindowSymbol(
  ctx: CanvasRenderingContext2D,
  wallX: number,
  wallY: number,
  posStart: number,
  width: number,
  direction: 'horizontal' | 'vertical',
  scale: number
) {
  ctx.save();
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;

  if (direction === 'horizontal') {
    const dx = wallX + posStart;
    const dy = wallY;
    // Double line for window
    ctx.beginPath();
    ctx.moveTo(dx, dy - 3);
    ctx.lineTo(dx + width, dy - 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dx, dy + 3);
    ctx.lineTo(dx + width, dy + 3);
    ctx.stroke();
    // Cross hatching
    ctx.lineWidth = 0.8;
    const segments = 3;
    for (let i = 1; i < segments; i++) {
      const sx = dx + (width / segments) * i;
      ctx.beginPath();
      ctx.moveTo(sx, dy - 3);
      ctx.lineTo(sx, dy + 3);
      ctx.stroke();
    }
  } else {
    const dx = wallX;
    const dy = wallY + posStart;
    ctx.beginPath();
    ctx.moveTo(dx - 3, dy);
    ctx.lineTo(dx - 3, dy + width);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dx + 3, dy);
    ctx.lineTo(dx + 3, dy + width);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    const segments = 3;
    for (let i = 1; i < segments; i++) {
      const sy = dy + (width / segments) * i;
      ctx.beginPath();
      ctx.moveTo(dx - 3, sy);
      ctx.lineTo(dx + 3, sy);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFurniture(ctx: CanvasRenderingContext2D, room: Room, scale: number) {
  const roomX = room.x * scale;
  const roomY = room.y * scale;
  const colors = ROOM_COLORS[room.type] || ROOM_COLORS.corridor;

  for (const item of room.furniture) {
    const fx = roomX + item.x * scale;
    const fy = roomY + item.y * scale;
    const fw = item.widthMeters * scale;
    const fh = item.depthMeters * scale;

    ctx.save();
    ctx.translate(fx + fw / 2, fy + fh / 2);
    ctx.rotate((item.rotation * Math.PI) / 180);
    ctx.translate(-fw / 2, -fh / 2);

    drawFurnitureShape(ctx, item.type, fw, fh, colors.stroke);

    ctx.restore();
  }
}

function drawFurnitureShape(
  ctx: CanvasRenderingContext2D,
  type: string,
  w: number,
  h: number,
  color: string
) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color + '25';
  ctx.lineWidth = 1;
  const lw = Math.max(0.8, w * 0.02);
  ctx.lineWidth = lw;

  switch (type) {
    case 'sofa': {
      // Realistic top-down sofa: back + seat cushions + arms
      const armW = w * 0.08;
      const backD = h * 0.22;
      // Back
      ctx.fillStyle = color + '40';
      roundedRect(ctx, 0, 0, w, backD, 2);
      ctx.fill();
      ctx.stroke();
      // Seat cushions
      ctx.fillStyle = color + '20';
      const cushionCount = w > h * 1.5 ? 3 : 2;
      const cushionW = (w - armW * 2) / cushionCount;
      for (let i = 0; i < cushionCount; i++) {
        roundedRect(ctx, armW + i * cushionW + 1, backD + 1, cushionW - 2, h - backD - 2, 3);
        ctx.fill();
        ctx.stroke();
      }
      // Arms
      ctx.fillStyle = color + '35';
      roundedRect(ctx, 0, 0, armW, h, 2);
      ctx.fill();
      ctx.stroke();
      roundedRect(ctx, w - armW, 0, armW, h, 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'armchair': {
      const armW = w * 0.15;
      const backD = h * 0.22;
      ctx.fillStyle = color + '40';
      roundedRect(ctx, armW, 0, w - armW * 2, backD, 2);
      ctx.fill();
      ctx.stroke();
      // Seat
      ctx.fillStyle = color + '20';
      roundedRect(ctx, armW + 1, backD + 1, w - armW * 2 - 2, h - backD - 2, 4);
      ctx.fill();
      ctx.stroke();
      // Arms
      ctx.fillStyle = color + '35';
      roundedRect(ctx, 0, 0, armW, h, 3);
      ctx.fill();
      ctx.stroke();
      roundedRect(ctx, w - armW, 0, armW, h, 3);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'single_bed':
    case 'double_bed': {
      // Bed frame
      ctx.fillStyle = color + '15';
      roundedRect(ctx, 0, 0, w, h, 3);
      ctx.fill();
      ctx.stroke();
      // Mattress
      ctx.fillStyle = color + '08';
      roundedRect(ctx, w * 0.05, h * 0.05, w * 0.9, h * 0.9, 2);
      ctx.fill();
      ctx.stroke();
      // Pillows
      ctx.fillStyle = color + '30';
      if (type === 'double_bed') {
        roundedRect(ctx, w * 0.08, h * 0.06, w * 0.38, h * 0.15, 4);
        ctx.fill();
        ctx.stroke();
        roundedRect(ctx, w * 0.54, h * 0.06, w * 0.38, h * 0.15, 4);
        ctx.fill();
        ctx.stroke();
      } else {
        roundedRect(ctx, w * 0.15, h * 0.06, w * 0.7, h * 0.15, 4);
        ctx.fill();
        ctx.stroke();
      }
      // Blanket fold line
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.35);
      ctx.lineTo(w * 0.9, h * 0.35);
      ctx.stroke();
      break;
    }

    case 'dining_table': {
      // Rectangular table with legs visible
      ctx.fillStyle = color + '20';
      roundedRect(ctx, 0, 0, w, h, 3);
      ctx.fill();
      ctx.stroke();
      // Leg circles at corners
      const legR = Math.min(w, h) * 0.06;
      ctx.fillStyle = color + '50';
      [[w * 0.12, h * 0.12], [w * 0.88, h * 0.12], [w * 0.12, h * 0.88], [w * 0.88, h * 0.88]].forEach(([lx, ly]) => {
        ctx.beginPath();
        ctx.arc(lx, ly, legR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      break;
    }

    case 'coffee_table':
    case 'side_table': {
      ctx.fillStyle = color + '18';
      roundedRect(ctx, 0, 0, w, h, 4);
      ctx.fill();
      ctx.stroke();
      // Inner edge detail
      roundedRect(ctx, w * 0.1, h * 0.1, w * 0.8, h * 0.8, 3);
      ctx.stroke();
      break;
    }

    case 'dining_chair': {
      // Chair with seat and back visible from top
      ctx.fillStyle = color + '20';
      // Seat (slightly rounded square)
      roundedRect(ctx, w * 0.1, h * 0.25, w * 0.8, h * 0.7, 3);
      ctx.fill();
      ctx.stroke();
      // Back (thicker bar at top)
      ctx.fillStyle = color + '45';
      roundedRect(ctx, w * 0.05, 0, w * 0.9, h * 0.2, 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'desk_chair':
    case 'office_chair': {
      // Swivel chair — circular seat with 5-star base
      ctx.fillStyle = color + '15';
      // Star base
      const cx = w / 2, cy = h / 2, baseR = Math.min(w, h) * 0.45;
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * baseR, cy + Math.sin(angle) * baseR);
        ctx.stroke();
        // Caster dot
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * baseR, cy + Math.sin(angle) * baseR, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Seat
      ctx.fillStyle = color + '25';
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Backrest indicator
      ctx.fillStyle = color + '40';
      ctx.beginPath();
      ctx.arc(cx, cy - Math.min(w, h) * 0.2, Math.min(w, h) * 0.18, Math.PI, 0, false);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'toilet_unit': {
      // Realistic toilet: tank + bowl
      ctx.fillStyle = color + '20';
      // Tank (rectangle at back)
      roundedRect(ctx, w * 0.2, 0, w * 0.6, h * 0.28, 3);
      ctx.fill();
      ctx.stroke();
      // Bowl (oval)
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.62, w * 0.38, h * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Seat outline
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.62, w * 0.28, h * 0.26, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'bathtub': {
      // Bathtub: rounded outer, inner basin
      ctx.fillStyle = color + '15';
      roundedRect(ctx, 0, 0, w, h, Math.min(w, h) * 0.2);
      ctx.fill();
      ctx.stroke();
      // Inner
      ctx.fillStyle = color + '08';
      roundedRect(ctx, w * 0.08, h * 0.08, w * 0.84, h * 0.84, Math.min(w, h) * 0.15);
      ctx.fill();
      ctx.stroke();
      // Drain
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.85, Math.min(w, h) * 0.04, 0, Math.PI * 2);
      ctx.stroke();
      // Faucet
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.1, Math.min(w, h) * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'shower': {
      // Shower tray with drain and head
      ctx.fillStyle = color + '12';
      roundedRect(ctx, 0, 0, w, h, 4);
      ctx.fill();
      ctx.stroke();
      // Diagonal lines (water texture)
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = color + '40';
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(w * (i / 5), 0);
        ctx.lineTo(0, h * (i / 5));
        ctx.stroke();
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      // Drain circle center
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.08, 0, Math.PI * 2);
      ctx.stroke();
      // Shower head dot (corner)
      ctx.fillStyle = color + '60';
      ctx.beginPath();
      ctx.arc(w * 0.15, h * 0.15, Math.min(w, h) * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'refrigerator': {
      ctx.fillStyle = color + '25';
      roundedRect(ctx, 0, 0, w, h, 2);
      ctx.fill();
      ctx.stroke();
      // Split line (freezer/fridge)
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.3);
      ctx.lineTo(w * 0.9, h * 0.3);
      ctx.stroke();
      // Handle
      ctx.lineWidth = lw * 1.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.8, h * 0.1);
      ctx.lineTo(w * 0.8, h * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.8, h * 0.4);
      ctx.lineTo(w * 0.8, h * 0.85);
      ctx.stroke();
      ctx.lineWidth = lw;
      break;
    }

    case 'stove': {
      ctx.fillStyle = color + '20';
      roundedRect(ctx, 0, 0, w, h, 2);
      ctx.fill();
      ctx.stroke();
      // 4 burner rings (double circles)
      const positions = [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]];
      const bR = Math.min(w, h) * 0.14;
      positions.forEach(([bx, by]) => {
        ctx.beginPath();
        ctx.arc(w * bx, h * by, bR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w * bx, h * by, bR * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      });
      break;
    }

    case 'wardrobe': {
      ctx.fillStyle = color + '20';
      roundedRect(ctx, 0, 0, w, h, 2);
      ctx.fill();
      ctx.stroke();
      // Double door with handles
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      // Handles
      ctx.beginPath();
      ctx.arc(w * 0.42, h / 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w * 0.58, h / 2, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'tv_stand': {
      // TV stand with TV on top (top-down shows the thin screen)
      ctx.fillStyle = color + '20';
      roundedRect(ctx, 0, h * 0.4, w, h * 0.6, 2);
      ctx.fill();
      ctx.stroke();
      // TV (thin rectangle)
      ctx.fillStyle = color + '50';
      ctx.fillRect(w * 0.05, 0, w * 0.9, h * 0.12);
      ctx.strokeRect(w * 0.05, 0, w * 0.9, h * 0.12);
      break;
    }

    case 'bookshelf': {
      ctx.fillStyle = color + '20';
      roundedRect(ctx, 0, 0, w, h, 1);
      ctx.fill();
      ctx.stroke();
      // Book spines (vertical lines)
      ctx.lineWidth = 0.6;
      const bookCount = Math.max(4, Math.floor(w / 4));
      for (let i = 1; i < bookCount; i++) {
        ctx.beginPath();
        ctx.moveTo((w / bookCount) * i, h * 0.05);
        ctx.lineTo((w / bookCount) * i, h * 0.95);
        ctx.stroke();
      }
      ctx.lineWidth = lw;
      break;
    }

    case 'kitchen_counter':
    case 'kitchen_island': {
      ctx.fillStyle = color + '18';
      roundedRect(ctx, 0, 0, w, h, 2);
      ctx.fill();
      ctx.stroke();
      // Counter edge detail
      ctx.beginPath();
      ctx.moveTo(w * 0.05, h * 0.15);
      ctx.lineTo(w * 0.95, h * 0.15);
      ctx.stroke();
      break;
    }

    case 'sink':
    case 'bathroom_sink': {
      // Sink: counter with basin
      ctx.fillStyle = color + '18';
      roundedRect(ctx, 0, 0, w, h, 2);
      ctx.fill();
      ctx.stroke();
      // Basin (oval)
      ctx.fillStyle = color + '10';
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.55, w * 0.3, h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Faucet
      ctx.fillStyle = color + '50';
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.2, Math.min(w, h) * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'potted_plant': {
      // Pot circle with foliage
      ctx.fillStyle = '#10b98120';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.stroke();
      // Inner leaves pattern
      ctx.fillStyle = '#10b98140';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.22, 0, Math.PI * 2);
      ctx.fill();
      // Pot rim
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.15, 0, Math.PI * 2);
      ctx.strokeStyle = '#92400e80';
      ctx.stroke();
      ctx.strokeStyle = color;
      break;
    }

    case 'desk':
    case 'office_desk': {
      // L-shaped or rectangular desk with detail
      ctx.fillStyle = color + '18';
      roundedRect(ctx, 0, 0, w, h, 2);
      ctx.fill();
      ctx.stroke();
      // Keyboard area
      ctx.strokeStyle = color + '40';
      roundedRect(ctx, w * 0.2, h * 0.5, w * 0.5, h * 0.2, 2);
      ctx.stroke();
      // Monitor
      ctx.strokeStyle = color;
      ctx.fillStyle = color + '30';
      ctx.fillRect(w * 0.25, h * 0.08, w * 0.5, h * 0.08);
      ctx.strokeRect(w * 0.25, h * 0.08, w * 0.5, h * 0.08);
      break;
    }

    case 'dresser':
    case 'nightstand': {
      ctx.fillStyle = color + '20';
      roundedRect(ctx, 0, 0, w, h, 2);
      ctx.fill();
      ctx.stroke();
      // Drawer lines
      const drawers = type === 'nightstand' ? 2 : 3;
      for (let i = 1; i < drawers; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.05, (h / drawers) * i);
        ctx.lineTo(w * 0.95, (h / drawers) * i);
        ctx.stroke();
      }
      // Handles
      for (let i = 0; i < drawers; i++) {
        ctx.beginPath();
        ctx.arc(w / 2, (h / drawers) * i + (h / drawers) / 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'mirror_cabinet': {
      ctx.fillStyle = color + '15';
      roundedRect(ctx, 0, 0, w, h, 2);
      ctx.fill();
      ctx.stroke();
      // Mirror reflection lines
      ctx.strokeStyle = color + '30';
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.2);
      ctx.lineTo(w * 0.4, h * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.35, h * 0.15);
      ctx.lineTo(w * 0.55, h * 0.75);
      ctx.stroke();
      ctx.strokeStyle = color;
      break;
    }

    case 'filing_cabinet': {
      ctx.fillStyle = color + '22';
      roundedRect(ctx, 0, 0, w, h, 1);
      ctx.fill();
      ctx.stroke();
      // Drawer fronts
      for (let i = 0; i < 3; i++) {
        const dy = h * 0.05 + (h * 0.3) * i;
        roundedRect(ctx, w * 0.08, dy, w * 0.84, h * 0.26, 1);
        ctx.stroke();
        // Handle
        ctx.beginPath();
        ctx.moveTo(w * 0.35, dy + h * 0.13);
        ctx.lineTo(w * 0.65, dy + h * 0.13);
        ctx.stroke();
      }
      break;
    }

    case 'whiteboard': {
      ctx.fillStyle = '#ffffff20';
      roundedRect(ctx, 0, 0, w, h, 1);
      ctx.fill();
      ctx.stroke();
      // Frame
      roundedRect(ctx, w * 0.03, h * 0.03, w * 0.94, h * 0.94, 1);
      ctx.stroke();
      break;
    }

    case 'printer': {
      ctx.fillStyle = color + '22';
      roundedRect(ctx, 0, h * 0.2, w, h * 0.8, 2);
      ctx.fill();
      ctx.stroke();
      // Paper tray
      ctx.fillStyle = '#ffffff15';
      ctx.fillRect(w * 0.15, 0, w * 0.7, h * 0.25);
      ctx.strokeRect(w * 0.15, 0, w * 0.7, h * 0.25);
      break;
    }

    case 'lamp': {
      // Concentric circles (light glow effect)
      ctx.fillStyle = color + '08';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color + '20';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color + '50';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'coat_rack': {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      // Hooks radiating out
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        const r = Math.min(w, h) * 0.35;
        ctx.beginPath();
        ctx.arc(w / 2 + Math.cos(angle) * r, h / 2 + Math.sin(angle) * r, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Center pole
      ctx.fillStyle = color + '40';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'shoe_rack': {
      ctx.fillStyle = color + '18';
      roundedRect(ctx, 0, 0, w, h, 2);
      ctx.fill();
      ctx.stroke();
      // Shelf slats
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (h / 3) * i);
        ctx.lineTo(w, (h / 3) * i);
        ctx.stroke();
      }
      break;
    }

    case 'rug': {
      ctx.fillStyle = color + '12';
      roundedRect(ctx, 0, 0, w, h, 2);
      ctx.fill();
      // Border pattern
      ctx.strokeStyle = color + '30';
      roundedRect(ctx, w * 0.06, h * 0.06, w * 0.88, h * 0.88, 2);
      ctx.stroke();
      roundedRect(ctx, w * 0.12, h * 0.12, w * 0.76, h * 0.76, 2);
      ctx.stroke();
      ctx.strokeStyle = color;
      break;
    }

    case 'chandelier': {
      // Top-down: circular fixture
      ctx.fillStyle = color + '15';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Light points
      ctx.fillStyle = '#fbbf2460';
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        const r = Math.min(w, h) * 0.28;
        ctx.beginPath();
        ctx.arc(w / 2 + Math.cos(angle) * r, h / 2 + Math.sin(angle) * r, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'sideboard': {
      ctx.fillStyle = color + '20';
      roundedRect(ctx, 0, 0, w, h, 2);
      ctx.fill();
      ctx.stroke();
      // Door lines
      ctx.beginPath();
      ctx.moveTo(w * 0.33, h * 0.05);
      ctx.lineTo(w * 0.33, h * 0.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.66, h * 0.05);
      ctx.lineTo(w * 0.66, h * 0.95);
      ctx.stroke();
      break;
    }

    default:
      ctx.fillStyle = color + '15';
      roundedRect(ctx, 0, 0, w, h, 2);
      ctx.fill();
      ctx.stroke();
      break;
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawDimensions(ctx: CanvasRenderingContext2D, room: Room, scale: number) {
  const x = room.x * scale;
  const y = room.y * scale;
  const w = room.widthMeters * scale;
  const h = room.depthMeters * scale;

  ctx.fillStyle = '#94a3b8';
  ctx.font = `${Math.max(8, scale * 0.18)}px "IBM Plex Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Width dimension (top)
  ctx.fillText(`${room.widthMeters.toFixed(1)}m`, x + w / 2, y - scale * 0.35);

  // Depth dimension (left side, rotated text)
  ctx.save();
  ctx.translate(x - scale * 0.35, y + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${room.depthMeters.toFixed(1)}m`, 0, 0);
  ctx.restore();
}

export function getRoomAtPosition(
  floor: Floor,
  worldX: number,
  worldY: number,
  scale: number
): Room | null {
  for (const room of floor.rooms) {
    const rx = room.x * scale;
    const ry = room.y * scale;
    const rw = room.widthMeters * scale;
    const rh = room.depthMeters * scale;

    if (worldX >= rx && worldX <= rx + rw && worldY >= ry && worldY <= ry + rh) {
      return room;
    }
  }
  return null;
}

// --- Opening (door/window) hit-testing ---

export interface SelectedOpening {
  roomIndex: number;
  wallSide: 'north' | 'south' | 'east' | 'west';
  openingIndex: number;
}

export function getOpeningAtPosition(
  floor: Floor,
  worldX: number,
  worldY: number,
  scale: number
): SelectedOpening | null {
  const tolerance = 10; // pixels

  for (let ri = 0; ri < floor.rooms.length; ri++) {
    const room = floor.rooms[ri];
    const rx = room.x * scale;
    const ry = room.y * scale;
    const rw = room.widthMeters * scale;
    const rh = room.depthMeters * scale;

    const walls: Array<{ side: 'north' | 'south' | 'east' | 'west'; wall: Wall; baseX: number; baseY: number; direction: 'horizontal' | 'vertical' }> = [
      { side: 'north', wall: room.walls.north, baseX: rx, baseY: ry, direction: 'horizontal' },
      { side: 'south', wall: room.walls.south, baseX: rx, baseY: ry + rh, direction: 'horizontal' },
      { side: 'west', wall: room.walls.west, baseX: rx, baseY: ry, direction: 'vertical' },
      { side: 'east', wall: room.walls.east, baseX: rx + rw, baseY: ry, direction: 'vertical' },
    ];

    for (const { side, wall, baseX, baseY, direction } of walls) {
      if (!wall.hasWall) continue;
      const openings = wall.openings || [];
      for (let oi = 0; oi < openings.length; oi++) {
        const opening = openings[oi];
        const pos = opening.positionFromLeft * scale;
        const w = opening.widthMeters * scale;

        if (direction === 'horizontal') {
          const ox = baseX + pos;
          const oy = baseY;
          if (worldX >= ox - 2 && worldX <= ox + w + 2 && Math.abs(worldY - oy) <= tolerance) {
            return { roomIndex: ri, wallSide: side, openingIndex: oi };
          }
        } else {
          const ox = baseX;
          const oy = baseY + pos;
          if (worldY >= oy - 2 && worldY <= oy + w + 2 && Math.abs(worldX - ox) <= tolerance) {
            return { roomIndex: ri, wallSide: side, openingIndex: oi };
          }
        }
      }
    }
  }
  return null;
}

export function drawOpeningSelection(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  sel: SelectedOpening,
  scale: number
) {
  const room = floor.rooms[sel.roomIndex];
  if (!room) return;
  const rx = room.x * scale;
  const ry = room.y * scale;
  const rw = room.widthMeters * scale;
  const rh = room.depthMeters * scale;

  const wall = room.walls[sel.wallSide];
  const openings = wall?.openings || [];
  const opening = openings[sel.openingIndex];
  if (!opening) return;
  const pos = opening.positionFromLeft * scale;
  const w = opening.widthMeters * scale;

  let ox: number, oy: number, ow: number, oh: number;

  if (sel.wallSide === 'north') {
    ox = rx + pos; oy = ry - 8; ow = w; oh = 16;
  } else if (sel.wallSide === 'south') {
    ox = rx + pos; oy = ry + rh - 8; ow = w; oh = 16;
  } else if (sel.wallSide === 'west') {
    ox = rx - 8; oy = ry + pos; ow = 16; oh = w;
  } else {
    ox = rx + rw - 8; oy = ry + pos; ow = 16; oh = w;
  }

  ctx.save();
  ctx.strokeStyle = opening.type === 'door' ? '#00d4ff' : '#60a5fa';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(ox, oy, ow, oh);
  ctx.setLineDash([]);

  // Drag handles at each end
  const handleSize = 6;
  ctx.fillStyle = opening.type === 'door' ? '#00d4ff' : '#60a5fa';
  if (sel.wallSide === 'north' || sel.wallSide === 'south') {
    // Left handle
    ctx.fillRect(ox - handleSize / 2, oy + oh / 2 - handleSize / 2, handleSize, handleSize);
    // Right handle
    ctx.fillRect(ox + ow - handleSize / 2, oy + oh / 2 - handleSize / 2, handleSize, handleSize);
  } else {
    // Top handle
    ctx.fillRect(ox + ow / 2 - handleSize / 2, oy - handleSize / 2, handleSize, handleSize);
    // Bottom handle
    ctx.fillRect(ox + ow / 2 - handleSize / 2, oy + oh - handleSize / 2, handleSize, handleSize);
  }
  ctx.restore();
}

export type OpeningHandleType = 'start' | 'end' | 'body' | null;

export function getOpeningHandleAtPosition(
  floor: Floor,
  sel: SelectedOpening,
  worldX: number,
  worldY: number,
  scale: number
): OpeningHandleType {
  const room = floor.rooms[sel.roomIndex];
  if (!room) return null;
  const rx = room.x * scale;
  const ry = room.y * scale;
  const rw = room.widthMeters * scale;
  const rh = room.depthMeters * scale;

  const wall = room.walls[sel.wallSide];
  const openings = wall?.openings || [];
  const opening = openings[sel.openingIndex];
  if (!opening) return null;
  const pos = opening.positionFromLeft * scale;
  const w = opening.widthMeters * scale;
  const tol = 8;

  if (sel.wallSide === 'north' || sel.wallSide === 'south') {
    const baseX = rx + pos;
    const baseY = sel.wallSide === 'north' ? ry : ry + rh;
    if (Math.abs(worldY - baseY) > 12) return null;
    if (Math.abs(worldX - baseX) <= tol) return 'start';
    if (Math.abs(worldX - (baseX + w)) <= tol) return 'end';
    if (worldX >= baseX && worldX <= baseX + w) return 'body';
  } else {
    const baseX = sel.wallSide === 'west' ? rx : rx + rw;
    const baseY = ry + pos;
    if (Math.abs(worldX - baseX) > 12) return null;
    if (Math.abs(worldY - baseY) <= tol) return 'start';
    if (Math.abs(worldY - (baseY + w)) <= tol) return 'end';
    if (worldY >= baseY && worldY <= baseY + w) return 'body';
  }
  return null;
}
