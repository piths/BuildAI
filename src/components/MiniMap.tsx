'use client';

import { useRef, useEffect } from 'react';
import { Floor } from '@/lib/types';
import { ROOM_COLORS } from '@/lib/constants';

interface MiniMapProps {
  floor: Floor;
  cameraX: number;
  cameraZ: number;
  cameraYaw: number;
}

export default function MiniMap({ floor, cameraX, cameraZ, cameraYaw }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 160;
    canvas.width = size;
    canvas.height = size;

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const room of floor.rooms) {
      minX = Math.min(minX, room.x);
      minY = Math.min(minY, room.y);
      maxX = Math.max(maxX, room.x + room.widthMeters);
      maxY = Math.max(maxY, room.y + room.depthMeters);
    }

    const padding = 1;
    const rangeX = maxX - minX + padding * 2;
    const rangeY = maxY - minY + padding * 2;
    const scale = Math.min(size / rangeX, size / rangeY) * 0.85;
    const offsetX = (size - rangeX * scale) / 2 - minX * scale + padding * scale;
    const offsetY = (size - rangeY * scale) / 2 - minY * scale + padding * scale;

    // Clear
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);

    // Draw rooms
    for (const room of floor.rooms) {
      const rx = room.x * scale + offsetX;
      const ry = room.y * scale + offsetY;
      const rw = room.widthMeters * scale;
      const rh = room.depthMeters * scale;
      const colors = ROOM_COLORS[room.type] || ROOM_COLORS.corridor;

      ctx.fillStyle = colors.fill.replace('0.15', '0.4').replace('0.12', '0.35').replace('0.1', '0.3');
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = colors.stroke + '80';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(rx, ry, rw, rh);
    }

    // Draw camera position
    const camX = cameraX * scale + offsetX;
    const camY = cameraZ * scale + offsetY;

    // View direction line
    const lineLen = 12;
    const dirX = camX + Math.sin(-cameraYaw + Math.PI) * lineLen;
    const dirY = camY + Math.cos(-cameraYaw + Math.PI) * lineLen;

    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(camX, camY);
    ctx.lineTo(dirX, dirY);
    ctx.stroke();

    // Camera dot
    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.arc(camX, camY, 4, 0, Math.PI * 2);
    ctx.fill();

    // FOV cone
    ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(camX, camY);
    const fovAngle = Math.PI / 4;
    const coneLen = 20;
    ctx.lineTo(
      camX + Math.sin(-cameraYaw + Math.PI - fovAngle) * coneLen,
      camY + Math.cos(-cameraYaw + Math.PI - fovAngle) * coneLen
    );
    ctx.lineTo(
      camX + Math.sin(-cameraYaw + Math.PI + fovAngle) * coneLen,
      camY + Math.cos(-cameraYaw + Math.PI + fovAngle) * coneLen
    );
    ctx.closePath();
    ctx.fill();
  }, [floor, cameraX, cameraZ, cameraYaw]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg border border-border-custom/50 shadow-lg"
      style={{ width: '160px', height: '160px' }}
    />
  );
}
