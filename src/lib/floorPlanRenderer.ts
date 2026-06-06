import { Floor, Room, FurnitureItem, Wall } from './types';
import { ROOM_COLORS, SCALE_FACTOR, WALL_THICKNESS } from './constants';

interface RenderOptions {
  scale: number;
  offsetX: number;
  offsetY: number;
  hoveredRoom: string | null;
  selectedRoom: string | null;
}

export function renderFloorPlan(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  canvasWidth: number,
  canvasHeight: number,
  options: RenderOptions
) {
  const { scale, offsetX, offsetY, hoveredRoom, selectedRoom } = options;
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

  ctx.restore();
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
  if (wall.openings.length === 0) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    return;
  }

  // Sort openings by position
  const sorted = [...wall.openings].sort((a, b) => a.positionFromLeft - b.positionFromLeft);
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
  ctx.lineWidth = 1.5;

  if (direction === 'horizontal') {
    const dx = wallX + posStart;
    const dy = wallY;
    // Door swing arc
    ctx.beginPath();
    ctx.arc(dx, dy, width, 0, -Math.PI / 2, true);
    ctx.stroke();
    // Door leaf line
    ctx.beginPath();
    ctx.moveTo(dx, dy);
    ctx.lineTo(dx, dy - width);
    ctx.stroke();
  } else {
    const dx = wallX;
    const dy = wallY + posStart;
    ctx.beginPath();
    ctx.arc(dx, dy, width, 0, Math.PI / 2, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dx, dy);
    ctx.lineTo(dx + width, dy);
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
  ctx.fillStyle = color + '30';
  ctx.lineWidth = 1;

  switch (type) {
    case 'sofa':
      ctx.fillRect(0, 0, w, h);
      ctx.strokeRect(0, 0, w, h);
      // Back cushion
      ctx.fillRect(0, 0, w, h * 0.25);
      ctx.strokeRect(0, 0, w, h * 0.25);
      break;

    case 'single_bed':
    case 'double_bed':
      ctx.fillRect(0, 0, w, h);
      ctx.strokeRect(0, 0, w, h);
      // Pillow
      ctx.fillStyle = color + '50';
      ctx.fillRect(w * 0.15, h * 0.05, w * 0.7, h * 0.15);
      ctx.strokeRect(w * 0.15, h * 0.05, w * 0.7, h * 0.15);
      break;

    case 'dining_table':
    case 'coffee_table':
      ctx.fillRect(0, 0, w, h);
      ctx.strokeRect(0, 0, w, h);
      break;

    case 'dining_chair':
    case 'desk_chair':
    case 'office_chair':
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;

    case 'toilet_unit':
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.6, w * 0.4, h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Tank
      ctx.fillRect(w * 0.15, 0, w * 0.7, h * 0.25);
      ctx.strokeRect(w * 0.15, 0, w * 0.7, h * 0.25);
      break;

    case 'bathtub':
      roundedRect(ctx, 0, 0, w, h, 8);
      ctx.fill();
      ctx.stroke();
      roundedRect(ctx, w * 0.1, h * 0.1, w * 0.8, h * 0.8, 6);
      ctx.stroke();
      break;

    case 'shower':
      ctx.fillRect(0, 0, w, h);
      ctx.strokeRect(0, 0, w, h);
      // X pattern
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, h);
      ctx.moveTo(w, 0);
      ctx.lineTo(0, h);
      ctx.stroke();
      break;

    case 'refrigerator':
      ctx.fillRect(0, 0, w, h);
      ctx.strokeRect(0, 0, w, h);
      // Handle
      ctx.beginPath();
      ctx.arc(w * 0.85, h * 0.5, w * 0.08, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'stove':
      ctx.fillRect(0, 0, w, h);
      ctx.strokeRect(0, 0, w, h);
      // Burners
      const bSize = Math.min(w, h) * 0.18;
      ctx.beginPath();
      ctx.arc(w * 0.3, h * 0.3, bSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w * 0.7, h * 0.3, bSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w * 0.3, h * 0.7, bSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w * 0.7, h * 0.7, bSize, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'wardrobe':
      ctx.fillRect(0, 0, w, h);
      ctx.strokeRect(0, 0, w, h);
      // Center line
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      break;

    case 'tv_stand':
      ctx.fillRect(0, 0, w, h);
      ctx.strokeRect(0, 0, w, h);
      break;

    case 'bookshelf':
      ctx.fillRect(0, 0, w, h);
      ctx.strokeRect(0, 0, w, h);
      // Shelves
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (h / 4) * i);
        ctx.lineTo(w, (h / 4) * i);
        ctx.stroke();
      }
      break;

    case 'kitchen_counter':
    case 'kitchen_island':
      ctx.fillRect(0, 0, w, h);
      ctx.strokeRect(0, 0, w, h);
      break;

    case 'potted_plant':
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#10b98140';
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.stroke();
      break;

    case 'desk':
    case 'office_desk':
      ctx.fillRect(0, 0, w, h);
      ctx.strokeRect(0, 0, w, h);
      break;

    case 'bathroom_sink':
    case 'sink':
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w * 0.4, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;

    default:
      ctx.fillRect(0, 0, w, h);
      ctx.strokeRect(0, 0, w, h);
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
