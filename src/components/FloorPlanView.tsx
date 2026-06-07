'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { FloorPlan, Room } from '@/lib/types';
import { SCALE_FACTOR } from '@/lib/constants';
import {
  renderFloorPlan,
  getRoomAtPosition,
  getFurnitureAtPosition,
  getFurnitureHandleAtPosition,
  HandleType,
} from '@/lib/floorPlanRenderer';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel';

interface FloorPlanViewProps {
  floorPlan: FloorPlan;
  onFloorPlanUpdate: (plan: FloorPlan) => void;
  onRegenerate: () => void;
  onEditPrompt: () => void;
  onWalkthrough: () => void;
}

type SelectedFurniture = { roomIndex: number; furnitureIndex: number } | null;

type DragMode =
  | { kind: 'pan' }
  | { kind: 'move'; startMouse: { x: number; y: number }; startPos: { x: number; y: number } }
  | { kind: 'resize'; handle: HandleType; startMouse: { x: number; y: number }; startItem: { x: number; y: number; w: number; d: number } }
  | { kind: 'rotate'; startAngle: number; startRotation: number }
  | null;

export default function FloorPlanView({
  floorPlan,
  onFloorPlanUpdate,
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
  const [selectedFurniture, setSelectedFurniture] = useState<SelectedFurniture>(null);
  const [editMode, setEditMode] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; room: Room } | null>(null);
  const [cursor, setCursor] = useState('grab');

  const dragRef = useRef<DragMode>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

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
      selectedFurniture: editMode ? selectedFurniture : null,
    });
  }, [floor, scale, offset, hoveredRoom, selectedRoom, selectedFurniture, editMode]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  // Reset furniture selection when leaving edit mode
  useEffect(() => {
    if (!editMode) setSelectedFurniture(null);
  }, [editMode]);

  const getWorldCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - offset.x,
      y: e.clientY - rect.top - offset.y,
      screenX: e.clientX - rect.left,
      screenY: e.clientY - rect.top,
    };
  };

  // Update a furniture item immutably
  const updateFurniture = (
    roomIndex: number,
    furnitureIndex: number,
    changes: Partial<{ x: number; y: number; widthMeters: number; depthMeters: number; rotation: number }>
  ) => {
    const newPlan: FloorPlan = JSON.parse(JSON.stringify(floorPlan));
    const item = newPlan.floors[currentFloor].rooms[roomIndex].furniture[furnitureIndex];
    Object.assign(item, changes);
    onFloorPlanUpdate(newPlan);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -3 : 3;
    setScale((s) => Math.max(15, Math.min(100, s + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const { x, y } = getWorldCoords(e);
    movedRef.current = false;

    if (editMode) {
      // Check if clicking a resize/rotate handle on the currently selected furniture
      if (selectedFurniture) {
        const room = floor.rooms[selectedFurniture.roomIndex];
        const item = room.furniture[selectedFurniture.furnitureIndex];
        const handle = getFurnitureHandleAtPosition(room, item, x, y, scale);
        if (handle === 'rotate') {
          const cx = (room.x + item.x + item.widthMeters / 2) * scale;
          const cy = (room.y + item.y + item.depthMeters / 2) * scale;
          dragRef.current = {
            kind: 'rotate',
            startAngle: Math.atan2(y - cy, x - cx),
            startRotation: item.rotation || 0,
          };
          return;
        }
        if (handle) {
          dragRef.current = {
            kind: 'resize',
            handle,
            startMouse: { x, y },
            startItem: {
              x: item.x,
              y: item.y,
              w: item.widthMeters,
              d: item.depthMeters,
            },
          };
          return;
        }
      }

      // Check if clicking on a furniture item to select/move
      const hit = getFurnitureAtPosition(floor, x, y, scale);
      if (hit) {
        setSelectedFurniture(hit);
        const item = floor.rooms[hit.roomIndex].furniture[hit.furnitureIndex];
        dragRef.current = {
          kind: 'move',
          startMouse: { x, y },
          startPos: { x: item.x, y: item.y },
        };
        return;
      } else {
        setSelectedFurniture(null);
      }
    }

    // Default: pan
    dragRef.current = { kind: 'pan' };
    panStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y, screenX, screenY } = getWorldCoords(e);
    const drag = dragRef.current;

    if (drag) {
      movedRef.current = true;

      if (drag.kind === 'pan') {
        setOffset({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
        return;
      }

      if (!selectedFurniture) return;
      const room = floor.rooms[selectedFurniture.roomIndex];
      const ri = selectedFurniture.roomIndex;
      const fi = selectedFurniture.furnitureIndex;

      if (drag.kind === 'move') {
        const dxM = (x - drag.startMouse.x) / scale;
        const dyM = (y - drag.startMouse.y) / scale;
        const item = room.furniture[fi];
        let nx = drag.startPos.x + dxM;
        let ny = drag.startPos.y + dyM;
        // Clamp within room bounds
        nx = Math.max(0, Math.min(room.widthMeters - item.widthMeters, nx));
        ny = Math.max(0, Math.min(room.depthMeters - item.depthMeters, ny));
        updateFurniture(ri, fi, { x: Math.round(nx * 20) / 20, y: Math.round(ny * 20) / 20 });
        return;
      }

      if (drag.kind === 'resize') {
        const dxM = (x - drag.startMouse.x) / scale;
        const dyM = (y - drag.startMouse.y) / scale;
        let { x: nx, y: ny, w: nw, d: nd } = drag.startItem;
        const minSize = 0.3;

        if (drag.handle === 'se') {
          nw = drag.startItem.w + dxM;
          nd = drag.startItem.d + dyM;
        } else if (drag.handle === 'ne') {
          nw = drag.startItem.w + dxM;
          nd = drag.startItem.d - dyM;
          ny = drag.startItem.y + dyM;
        } else if (drag.handle === 'sw') {
          nw = drag.startItem.w - dxM;
          nd = drag.startItem.d + dyM;
          nx = drag.startItem.x + dxM;
        } else if (drag.handle === 'nw') {
          nw = drag.startItem.w - dxM;
          nd = drag.startItem.d - dyM;
          nx = drag.startItem.x + dxM;
          ny = drag.startItem.y + dyM;
        }

        // Enforce min size
        if (nw < minSize) { nw = minSize; nx = drag.startItem.x; }
        if (nd < minSize) { nd = minSize; ny = drag.startItem.y; }
        // Clamp within room
        nx = Math.max(0, nx);
        ny = Math.max(0, ny);
        if (nx + nw > room.widthMeters) nw = room.widthMeters - nx;
        if (ny + nd > room.depthMeters) nd = room.depthMeters - ny;

        const r = (v: number) => Math.round(v * 20) / 20;
        updateFurniture(ri, fi, { x: r(nx), y: r(ny), widthMeters: r(nw), depthMeters: r(nd) });
        return;
      }

      if (drag.kind === 'rotate') {
        const item = room.furniture[fi];
        const cx = (room.x + item.x + item.widthMeters / 2) * scale;
        const cy = (room.y + item.y + item.depthMeters / 2) * scale;
        const angle = Math.atan2(y - cy, x - cx);
        const deltaDeg = ((angle - drag.startAngle) * 180) / Math.PI;
        let newRot = drag.startRotation + deltaDeg;
        // Snap to 15-degree increments
        newRot = Math.round(newRot / 15) * 15;
        updateFurniture(ri, fi, { rotation: ((newRot % 360) + 360) % 360 });
        return;
      }
    }

    // Hover behavior (no drag)
    if (editMode) {
      // Update cursor based on what's under the mouse
      if (selectedFurniture) {
        const room = floor.rooms[selectedFurniture.roomIndex];
        const item = room.furniture[selectedFurniture.furnitureIndex];
        const handle = getFurnitureHandleAtPosition(room, item, x, y, scale);
        if (handle === 'rotate') { setCursor('grab'); return; }
        if (handle === 'nw' || handle === 'se') { setCursor('nwse-resize'); return; }
        if (handle === 'ne' || handle === 'sw') { setCursor('nesw-resize'); return; }
      }
      const hit = getFurnitureAtPosition(floor, x, y, scale);
      setCursor(hit ? 'move' : 'default');
      setTooltip(null);
      return;
    }

    // Non-edit mode: room hover + tooltip
    setCursor('grab');
    const room = getRoomAtPosition(floor, x, y, scale);
    if (room) {
      setHoveredRoom(room.id);
      setTooltip({ x: screenX, y: screenY, room });
    } else {
      setHoveredRoom(null);
      setTooltip(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;

    // Treat as click (room select) if it was a pan that didn't move, in non-edit mode
    if (!editMode && drag?.kind === 'pan' && !movedRef.current) {
      const { x, y } = getWorldCoords(e);
      const room = getRoomAtPosition(floor, x, y, scale);
      setSelectedRoom(room);
    }
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

  const deleteSelectedFurniture = () => {
    if (!selectedFurniture) return;
    const newPlan: FloorPlan = JSON.parse(JSON.stringify(floorPlan));
    newPlan.floors[currentFloor].rooms[selectedFurniture.roomIndex].furniture.splice(
      selectedFurniture.furnitureIndex,
      1
    );
    onFloorPlanUpdate(newPlan);
    setSelectedFurniture(null);
  };

  const rotateSelected = () => {
    if (!selectedFurniture) return;
    const item = floor.rooms[selectedFurniture.roomIndex].furniture[selectedFurniture.furnitureIndex];
    const newRot = (((item.rotation || 0) + 90) % 360);
    updateFurniture(selectedFurniture.roomIndex, selectedFurniture.furnitureIndex, { rotation: newRot });
  };

  // Keyboard delete
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!editMode || !selectedFurniture) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedFurniture();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, selectedFurniture, floorPlan, currentFloor]);

  const zoomIn = () => setScale((s) => Math.min(100, s + 5));
  const zoomOut = () => setScale((s) => Math.max(15, s - 5));

  const selectedItem =
    selectedFurniture && floor.rooms[selectedFurniture.roomIndex]
      ? floor.rooms[selectedFurniture.roomIndex].furniture[selectedFurniture.furnitureIndex]
      : null;

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

          {/* Edit Mode Toggle */}
          <button
            onClick={() => setEditMode((m) => !m)}
            className={`px-4 py-2 rounded-lg text-xs font-body border transition-all flex items-center gap-1.5 ${
              editMode
                ? 'bg-accent-secondary text-white border-accent-secondary'
                : 'bg-bg-secondary/90 backdrop-blur-sm text-text-secondary border-border-custom hover:text-text-primary'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {editMode ? 'Editing Furniture' : 'Edit Furniture'}
          </button>
        </div>

        {/* Edit mode help */}
        {editMode && (
          <div className="absolute top-16 left-4 z-10 bg-bg-secondary/90 backdrop-blur-sm border border-accent-secondary/30 rounded-lg px-3 py-2 max-w-xs">
            <p className="text-text-secondary text-[11px] font-body leading-relaxed">
              Click furniture to select. Drag to move, drag corners to resize, purple handle to rotate.
              Press Delete to remove.
            </p>
          </div>
        )}

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
          className="w-full h-full"
          style={{ cursor }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { dragRef.current = null; setTooltip(null); }}
        />

        {/* Selected furniture toolbar */}
        {editMode && selectedItem && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-bg-card/95 backdrop-blur-sm border border-border-custom rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-xl">
            <span className="text-text-primary text-xs font-body capitalize">
              {selectedItem.type.replace(/_/g, ' ')}
            </span>
            <span className="text-text-secondary/60 font-mono text-[10px]">
              {selectedItem.widthMeters.toFixed(1)}×{selectedItem.depthMeters.toFixed(1)}m
            </span>
            <span className="w-px h-4 bg-border-custom" />
            <button
              onClick={rotateSelected}
              className="text-text-secondary hover:text-accent-primary text-xs transition-colors flex items-center gap-1"
              title="Rotate 90°"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Rotate
            </button>
            <button
              onClick={deleteSelectedFurniture}
              className="text-red-400 hover:text-red-300 text-xs transition-colors flex items-center gap-1"
              title="Delete (Del)"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )}

        {/* Tooltip */}
        {tooltip && !editMode && (
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

        {/* Chat Panel */}
        <ChatPanel floorPlan={floorPlan} onFloorPlanUpdate={onFloorPlanUpdate} />
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
