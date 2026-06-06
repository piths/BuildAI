'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { FloorPlan, Room } from '@/lib/types';
import { SCALE_FACTOR } from '@/lib/constants';
import { renderFloorPlan, getRoomAtPosition } from '@/lib/floorPlanRenderer';
import Sidebar from './Sidebar';

interface FloorPlanViewProps {
  floorPlan: FloorPlan;
  onRegenerate: () => void;
  onEditPrompt: () => void;
  onWalkthrough: () => void;
}

export default function FloorPlanView({
  floorPlan,
  onRegenerate,
  onEditPrompt,
  onWalkthrough,
}: FloorPlanViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [scale, setScale] = useState(SCALE_FACTOR);
  const [offset, setOffset] = useState({ x: 80, y: 80 });
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; room: Room } | null>(null);

  const floor = floorPlan.floors[currentFloor];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    renderFloorPlan(ctx, floor, rect.width, rect.height, {
      scale,
      offsetX: offset.x,
      offsetY: offset.y,
      hoveredRoom,
      selectedRoom: selectedRoom?.id || null,
    });
  }, [floor, scale, offset, hoveredRoom, selectedRoom]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -3 : 3;
    setScale((s) => Math.max(15, Math.min(100, s + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    // Check room hover
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - offset.x;
    const mouseY = e.clientY - rect.top - offset.y;

    const room = getRoomAtPosition(floor, mouseX, mouseY, scale);
    if (room) {
      setHoveredRoom(room.id);
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, room });
    } else {
      setHoveredRoom(null);
      setTooltip(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - offset.x;
    const mouseY = e.clientY - rect.top - offset.y;

    const room = getRoomAtPosition(floor, mouseX, mouseY, scale);
    setSelectedRoom(room);
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(floorPlan, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${floorPlan.buildingName.replace(/\s+/g, '_')}_floorplan.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${floorPlan.buildingName.replace(/\s+/g, '_')}_floorplan.png`;
    a.click();
  };

  const zoomIn = () => setScale((s) => Math.min(100, s + 5));
  const zoomOut = () => setScale((s) => Math.max(15, s - 5));

  return (
    <div className="h-screen flex bg-bg-primary">
      {/* Main Canvas Area */}
      <div className="flex-1 relative" ref={containerRef}>
        {/* Top bar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="bg-bg-secondary/90 backdrop-blur-sm border border-border-custom rounded-lg px-4 py-2 flex items-center gap-3">
            <span className="font-display text-accent-primary text-sm">BuildAI</span>
            <span className="text-border-custom">|</span>
            <span className="text-text-secondary text-xs font-body">{floor.floorName}</span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
          <button
            onClick={zoomIn}
            className="w-9 h-9 bg-bg-secondary/90 backdrop-blur-sm border border-border-custom rounded-lg flex items-center justify-center text-text-primary hover:bg-bg-card transition-all text-lg"
          >
            +
          </button>
          <button
            onClick={zoomOut}
            className="w-9 h-9 bg-bg-secondary/90 backdrop-blur-sm border border-border-custom rounded-lg flex items-center justify-center text-text-primary hover:bg-bg-card transition-all text-lg"
          >
            −
          </button>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setIsDragging(false); setTooltip(null); }}
          onClick={handleClick}
        />

        {/* Tooltip */}
        {tooltip && !isDragging && (
          <div
            className="absolute z-20 bg-bg-card/95 backdrop-blur-sm border border-border-custom rounded-lg px-3 py-2 pointer-events-none shadow-xl"
            style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
          >
            <p className="text-text-primary font-body text-sm font-medium">{tooltip.room.name}</p>
            <p className="text-text-secondary font-mono text-xs">
              {tooltip.room.widthMeters}m × {tooltip.room.depthMeters}m •{' '}
              {(tooltip.room.widthMeters * tooltip.room.depthMeters).toFixed(1)} m²
            </p>
            <p className="text-text-secondary/60 font-mono text-[10px] mt-0.5">
              {tooltip.room.furniture.length} furniture items
            </p>
          </div>
        )}

        {/* Floor tabs for multi-storey */}
        {floorPlan.floors.length > 1 && (
          <div className="absolute bottom-4 left-4 z-10 flex gap-1 bg-bg-secondary/90 backdrop-blur-sm border border-border-custom rounded-lg p-1">
            {floorPlan.floors.map((f, i) => (
              <button
                key={i}
                onClick={() => setCurrentFloor(i)}
                className={`px-3 py-1.5 text-xs rounded-md font-body transition-all ${
                  currentFloor === i
                    ? 'bg-accent-primary text-bg-primary font-medium'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {f.floorName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <Sidebar
        floorPlan={floorPlan}
        currentFloor={currentFloor}
        selectedRoom={selectedRoom}
        onFloorChange={setCurrentFloor}
        onRegenerate={onRegenerate}
        onEditPrompt={onEditPrompt}
        onWalkthrough={onWalkthrough}
        onExportJSON={handleExportJSON}
        onExportImage={handleExportImage}
      />
    </div>
  );
}
