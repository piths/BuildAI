'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { FloorPlan, Room, FurnitureType, Opening } from '@/lib/types';
import { SCALE_FACTOR } from '@/lib/constants';
import { GenProvider } from '@/lib/ai';
import {
  renderFloorPlan,
  getRoomAtPosition,
  getFurnitureAtPosition,
  getFurnitureHandleAtPosition,
  getOpeningAtPosition,
  getOpeningHandleAtPosition,
  HandleType,
  SelectedOpening,
  OpeningHandleType,
} from '@/lib/floorPlanRenderer';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel';
import AnalysisPanel from './AnalysisPanel';
import LanguageToggle from './LanguageToggle';
import { generatePdfReport } from '@/lib/pdfGenerator';
import { captureBuildingImage } from '@/lib/sceneCapture';
import { normalizeFloorPlan, planNeedsNormalizing } from '@/lib/planNormalizer';

interface FloorPlanViewProps {
  floorPlan: FloorPlan;
  provider?: GenProvider;
  onFloorPlanUpdate: (plan: FloorPlan) => void;
  onRegenerate: () => void;
  onEditPrompt: () => void;
  onWalkthrough: () => void;
}

type SelectedFurniture = { roomIndex: number; furnitureIndex: number } | null;

type EditTab = 'furniture' | 'openings';

type DragMode =
  | { kind: 'pan' }
  | { kind: 'move'; startMouse: { x: number; y: number }; startPos: { x: number; y: number } }
  | { kind: 'resize'; handle: HandleType; startMouse: { x: number; y: number }; startItem: { x: number; y: number; w: number; d: number } }
  | { kind: 'rotate'; startAngle: number; startRotation: number }
  | { kind: 'move-opening'; startMouse: { x: number; y: number }; startPos: number }
  | { kind: 'resize-opening'; handle: 'start' | 'end'; startMouse: { x: number; y: number }; startPos: number; startWidth: number }
  | null;

const FURNITURE_PALETTE: { category: string; items: { type: FurnitureType; label: string; w: number; d: number }[] }[] = [
  {
    category: 'Seating',
    items: [
      { type: 'sofa', label: 'Sofa', w: 2.0, d: 0.8 },
      { type: 'armchair', label: 'Armchair', w: 0.8, d: 0.8 },
      { type: 'dining_chair', label: 'Chair', w: 0.45, d: 0.45 },
      { type: 'office_chair', label: 'Office Chair', w: 0.6, d: 0.6 },
    ],
  },
  {
    category: 'Tables',
    items: [
      { type: 'dining_table', label: 'Dining Table', w: 1.6, d: 0.9 },
      { type: 'coffee_table', label: 'Coffee Table', w: 1.0, d: 0.5 },
      { type: 'office_desk', label: 'Office Desk', w: 1.4, d: 0.7 },
      { type: 'desk', label: 'Desk', w: 1.2, d: 0.6 },
      { type: 'side_table', label: 'Side Table', w: 0.5, d: 0.5 },
    ],
  },
  {
    category: 'Bedroom',
    items: [
      { type: 'double_bed', label: 'Double Bed', w: 1.8, d: 2.0 },
      { type: 'single_bed', label: 'Single Bed', w: 1.0, d: 2.0 },
      { type: 'wardrobe', label: 'Wardrobe', w: 1.5, d: 0.6 },
      { type: 'dresser', label: 'Dresser', w: 1.0, d: 0.5 },
      { type: 'nightstand', label: 'Nightstand', w: 0.5, d: 0.4 },
    ],
  },
  {
    category: 'Kitchen & Bath',
    items: [
      { type: 'kitchen_counter', label: 'Counter', w: 1.5, d: 0.6 },
      { type: 'stove', label: 'Stove', w: 0.6, d: 0.6 },
      { type: 'refrigerator', label: 'Fridge', w: 0.7, d: 0.7 },
      { type: 'sink', label: 'Sink', w: 0.6, d: 0.5 },
      { type: 'kitchen_island', label: 'Island', w: 1.5, d: 0.9 },
      { type: 'bathtub', label: 'Bathtub', w: 1.7, d: 0.75 },
      { type: 'shower', label: 'Shower', w: 0.9, d: 0.9 },
      { type: 'toilet_unit', label: 'Toilet', w: 0.4, d: 0.65 },
      { type: 'bathroom_sink', label: 'Basin', w: 0.5, d: 0.4 },
    ],
  },
  {
    category: 'Storage & Decor',
    items: [
      { type: 'bookshelf', label: 'Bookshelf', w: 1.2, d: 0.35 },
      { type: 'filing_cabinet', label: 'Filing Cabinet', w: 0.5, d: 0.6 },
      { type: 'tv_stand', label: 'TV Stand', w: 1.5, d: 0.4 },
      { type: 'potted_plant', label: 'Plant', w: 0.4, d: 0.4 },
      { type: 'lamp', label: 'Lamp', w: 0.3, d: 0.3 },
      { type: 'coat_rack', label: 'Coat Rack', w: 0.4, d: 0.4 },
      { type: 'shoe_rack', label: 'Shoe Rack', w: 0.8, d: 0.35 },
    ],
  },
];

export default function FloorPlanView({
  floorPlan,
  provider = 'chatgpt',
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
  const [selectedOpening, setSelectedOpening] = useState<SelectedOpening | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTab, setEditTab] = useState<EditTab>('furniture');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; room: Room } | null>(null);
  const [cursor, setCursor] = useState('grab');

  // Video generation state
  const [videoStatus, setVideoStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Analysis suite (BOQ, cost, compliance, timeline, green, climate, sun)
  const [showAnalysis, setShowAnalysis] = useState(false);

  const handleExportPdf = () => {
    const canvas = canvasRef.current;
    const image = canvas ? canvas.toDataURL('image/png') : null;
    generatePdfReport(floorPlan, { floorPlanImage: image });
  };

  const dragRef = useRef<DragMode>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const healedRef = useRef(false);

  const floor = floorPlan.floors[currentFloor];

  // One-time auto-heal: fix a missing entrance / stray openings on the plan we
  // were handed (e.g. generated before this fix), without disturbing edits.
  useEffect(() => {
    if (healedRef.current) return;
    healedRef.current = true;
    if (planNeedsNormalizing(floorPlan)) {
      onFloorPlanUpdate(normalizeFloorPlan(floorPlan));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      selectedOpening: editMode ? selectedOpening : null,
    });
  }, [floor, scale, offset, hoveredRoom, selectedRoom, selectedFurniture, selectedOpening, editMode]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  // Reset selections when leaving edit mode
  useEffect(() => {
    if (!editMode) {
      setSelectedFurniture(null);
      setSelectedOpening(null);
      setShowAddPanel(false);
    }
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

  // Update an opening immutably
  const updateOpening = (
    sel: SelectedOpening,
    changes: Partial<Opening>
  ) => {
    const newPlan: FloorPlan = JSON.parse(JSON.stringify(floorPlan));
    const room = newPlan.floors[currentFloor].rooms[sel.roomIndex];
    const opening = room.walls[sel.wallSide].openings[sel.openingIndex];
    Object.assign(opening, changes);
    onFloorPlanUpdate(newPlan);
  };

  // Add a new furniture item to a room
  const addFurnitureToRoom = (roomIndex: number, type: FurnitureType, w: number, d: number) => {
    const newPlan: FloorPlan = JSON.parse(JSON.stringify(floorPlan));
    const room = newPlan.floors[currentFloor].rooms[roomIndex];
    // Place in center of room
    const x = Math.max(0, (room.widthMeters - w) / 2);
    const y = Math.max(0, (room.depthMeters - d) / 2);
    room.furniture.push({ type, x, y, rotation: 0, widthMeters: w, depthMeters: d });
    onFloorPlanUpdate(newPlan);
    // Select the newly added item
    setSelectedFurniture({ roomIndex, furnitureIndex: room.furniture.length - 1 });
  };

  // Add a new opening to a wall
  const addOpeningToWall = (roomIndex: number, wallSide: 'north' | 'south' | 'east' | 'west', type: 'door' | 'window') => {
    const newPlan: FloorPlan = JSON.parse(JSON.stringify(floorPlan));
    const room = newPlan.floors[currentFloor].rooms[roomIndex];
    const wall = room.walls[wallSide];

    // If wall doesn't exist, enable it
    if (!wall.hasWall) wall.hasWall = true;
    // Ensure openings array exists
    if (!wall.openings) wall.openings = [];

    const wallLength = (wallSide === 'north' || wallSide === 'south') ? room.widthMeters : room.depthMeters;
    const openingWidth = type === 'door' ? 0.9 : 1.2;

    // Find a free position along the wall
    const existingEnds = wall.openings.map(o => ({ start: o.positionFromLeft, end: o.positionFromLeft + o.widthMeters }));
    existingEnds.sort((a, b) => a.start - b.start);

    let pos = 0.5; // Default position
    // Try to find a gap
    for (let candidate = 0.3; candidate <= wallLength - openingWidth - 0.3; candidate += 0.1) {
      const candidateEnd = candidate + openingWidth;
      const conflict = existingEnds.some(e => !(candidateEnd <= e.start || candidate >= e.end));
      if (!conflict) { pos = candidate; break; }
    }

    const newOpening: Opening = {
      type,
      positionFromLeft: Math.round(pos * 10) / 10,
      widthMeters: openingWidth,
      ...(type === 'window' ? { heightMeters: 1.2, sillHeight: 0.9 } : {}),
    };
    wall.openings.push(newOpening);
    onFloorPlanUpdate(newPlan);
    setSelectedOpening({ roomIndex, wallSide, openingIndex: wall.openings.length - 1 });
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
      // --- Opening interactions (when in openings tab or any tab) ---
      if (selectedOpening) {
        const handle = getOpeningHandleAtPosition(floor, selectedOpening, x, y, scale);
        if (handle === 'body') {
          const room = floor.rooms[selectedOpening.roomIndex];
          const opening = room.walls[selectedOpening.wallSide].openings[selectedOpening.openingIndex];
          dragRef.current = {
            kind: 'move-opening',
            startMouse: { x, y },
            startPos: opening.positionFromLeft,
          };
          return;
        }
        if (handle === 'start' || handle === 'end') {
          const room = floor.rooms[selectedOpening.roomIndex];
          const opening = room.walls[selectedOpening.wallSide].openings[selectedOpening.openingIndex];
          dragRef.current = {
            kind: 'resize-opening',
            handle,
            startMouse: { x, y },
            startPos: opening.positionFromLeft,
            startWidth: opening.widthMeters,
          };
          return;
        }
      }

      // Check if clicking on an opening
      const openingHit = getOpeningAtPosition(floor, x, y, scale);
      if (openingHit) {
        setSelectedOpening(openingHit);
        setSelectedFurniture(null);
        const room = floor.rooms[openingHit.roomIndex];
        const opening = room.walls[openingHit.wallSide].openings[openingHit.openingIndex];
        dragRef.current = {
          kind: 'move-opening',
          startMouse: { x, y },
          startPos: opening.positionFromLeft,
        };
        return;
      }

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
        setSelectedOpening(null);
        const item = floor.rooms[hit.roomIndex].furniture[hit.furnitureIndex];
        dragRef.current = {
          kind: 'move',
          startMouse: { x, y },
          startPos: { x: item.x, y: item.y },
        };
        return;
      } else {
        setSelectedFurniture(null);
        setSelectedOpening(null);
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

      // --- Opening drag ---
      if (drag.kind === 'move-opening' && selectedOpening) {
        const room = floor.rooms[selectedOpening.roomIndex];
        const wall = room.walls[selectedOpening.wallSide];
        const opening = wall.openings[selectedOpening.openingIndex];
        const isHoriz = selectedOpening.wallSide === 'north' || selectedOpening.wallSide === 'south';
        const wallLength = isHoriz ? room.widthMeters : room.depthMeters;
        const delta = isHoriz
          ? (x - drag.startMouse.x) / scale
          : (y - drag.startMouse.y) / scale;
        let newPos = drag.startPos + delta;
        newPos = Math.max(0.05, Math.min(wallLength - opening.widthMeters - 0.05, newPos));
        updateOpening(selectedOpening, { positionFromLeft: Math.round(newPos * 20) / 20 });
        return;
      }

      if (drag.kind === 'resize-opening' && selectedOpening) {
        const room = floor.rooms[selectedOpening.roomIndex];
        const isHoriz = selectedOpening.wallSide === 'north' || selectedOpening.wallSide === 'south';
        const wallLength = isHoriz ? room.widthMeters : room.depthMeters;
        const delta = isHoriz
          ? (x - drag.startMouse.x) / scale
          : (y - drag.startMouse.y) / scale;

        let newPos = drag.startPos;
        let newWidth = drag.startWidth;
        const minWidth = 0.4;

        if (drag.handle === 'end') {
          newWidth = drag.startWidth + delta;
          newWidth = Math.max(minWidth, Math.min(wallLength - newPos - 0.05, newWidth));
        } else {
          // 'start' handle: move start, shrink/grow width
          newPos = drag.startPos + delta;
          newWidth = drag.startWidth - delta;
          if (newWidth < minWidth) { newWidth = minWidth; newPos = drag.startPos + drag.startWidth - minWidth; }
          if (newPos < 0.05) { newWidth = newWidth - (0.05 - newPos); newPos = 0.05; }
        }

        updateOpening(selectedOpening, {
          positionFromLeft: Math.round(newPos * 20) / 20,
          widthMeters: Math.round(newWidth * 20) / 20,
        });
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
      if (selectedOpening) {
        const handle = getOpeningHandleAtPosition(floor, selectedOpening, x, y, scale);
        if (handle === 'start' || handle === 'end') {
          const isHoriz = selectedOpening.wallSide === 'north' || selectedOpening.wallSide === 'south';
          setCursor(isHoriz ? 'ew-resize' : 'ns-resize');
          return;
        }
        if (handle === 'body') { setCursor('grab'); return; }
      }

      // Check for hovering over openings
      const openingHit = getOpeningAtPosition(floor, x, y, scale);
      if (openingHit) { setCursor('pointer'); setTooltip(null); return; }

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

    // Treat as click if it was a pan/no-op that didn't move
    if (drag?.kind === 'pan' && !movedRef.current) {
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

  const handleGenerateVideo = async () => {
    setVideoStatus('generating');
    setVideoUrl(null);
    try {
      // Build spatial description from floor plan data (used for the video motion prompt)
      const roomDetails = floor.rooms.map((r) => {
        const area = (r.widthMeters * r.depthMeters).toFixed(1);
        const furniture = r.furniture.map(f => f.type.replace(/_/g, ' ')).join(', ');
        return `${r.name} (${r.widthMeters}m × ${r.depthMeters}m, ${area}m²${furniture ? ', furnished with ' + furniture : ''})`;
      }).join('; ');

      const buildingWidth = Math.max(...floor.rooms.map(r => r.x + r.widthMeters));
      const buildingDepth = Math.max(...floor.rooms.map(r => r.y + r.depthMeters));

      const description = `a ${floorPlan.buildingName}, a ${buildingWidth}m × ${buildingDepth}m rectangular floor plan (${floorPlan.totalAreaSqMeters.toFixed(0)}m² total). Layout: ${roomDetails}. The apartment has ${floor.rooms.filter(r => r.type === 'bedroom').length} bedrooms, ${floor.rooms.filter(r => r.type === 'kitchen' || r.type === 'living_room' || r.type === 'dining_room').length > 1 ? 'an open-plan living and kitchen area' : 'a separate kitchen'}, and a central hallway connecting the rooms`;

      // Step 1: Seed the video with a render of the ACTUAL building (real layout),
      // so the video is of THIS house — not a generic stock interior.
      let seedImageUrl: string | null = captureBuildingImage(floor, { view: 'dollhouse' });
      let seedIsRender = !!seedImageUrl;

      // Fallback: if the local 3D render fails, generate a reference image from text.
      if (!seedImageUrl) {
        const imgRes = await fetch('/api/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'image', description }),
        });
        const imgData = await imgRes.json();
        if (!imgRes.ok) throw new Error(imgData.error || 'Image generation failed');
        seedImageUrl = imgData.imageUrl;
        seedIsRender = false;
      }

      // Step 2: Submit video generation seeded with the building image
      const vidRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'video',
          imageUrl: seedImageUrl,
          buildingName: floorPlan.buildingName,
          description,
          seedIsRender,
        }),
      });
      const vidData = await vidRes.json();
      if (!vidRes.ok) throw new Error(vidData.error || 'Video submission failed');

      // Step 3: Poll for video completion (every 4s, up to 2 min)
      const requestId = vidData.requestId;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const pollRes = await fetch('/api/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'poll', requestId }),
        });
        const pollData = await pollRes.json();
        if (!pollRes.ok) throw new Error(pollData.error || 'Polling failed');
        if (pollData.status === 'done') {
          setVideoUrl(pollData.videoUrl);
          setVideoStatus('done');
          return;
        }
      }
      throw new Error('Video generation timed out');
    } catch (err) {
      console.error('Video generation error:', err);
      setVideoStatus('error');
    }
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

  const deleteSelectedOpening = () => {
    if (!selectedOpening) return;
    const newPlan: FloorPlan = JSON.parse(JSON.stringify(floorPlan));
    const room = newPlan.floors[currentFloor].rooms[selectedOpening.roomIndex];
    room.walls[selectedOpening.wallSide].openings.splice(selectedOpening.openingIndex, 1);
    onFloorPlanUpdate(newPlan);
    setSelectedOpening(null);
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
      if (!editMode) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFurniture) {
          e.preventDefault();
          deleteSelectedFurniture();
        } else if (selectedOpening) {
          e.preventDefault();
          deleteSelectedOpening();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, selectedFurniture, selectedOpening, floorPlan, currentFloor]);

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
            {editMode ? 'Editing' : 'Edit'}
          </button>

          {/* Edit mode tabs */}
          {editMode && (
            <div className="flex gap-0.5 bg-bg-secondary/90 backdrop-blur-sm border border-border-custom rounded-lg p-0.5">
              <button
                onClick={() => setEditTab('furniture')}
                className={`px-3 py-1.5 rounded-md text-xs font-body transition-all ${
                  editTab === 'furniture' ? 'bg-accent-primary/20 text-accent-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Furniture
              </button>
              <button
                onClick={() => setEditTab('openings')}
                className={`px-3 py-1.5 rounded-md text-xs font-body transition-all ${
                  editTab === 'openings' ? 'bg-accent-primary/20 text-accent-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Doors & Windows
              </button>
            </div>
          )}
        </div>

        {/* Top-right controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <LanguageToggle />
          <button
            onClick={() => setShowAnalysis(true)}
            className="px-4 py-2 rounded-lg text-xs font-body border bg-bg-secondary/90 backdrop-blur-sm text-accent-primary border-accent-primary/30 hover:border-accent-primary/60 transition-all flex items-center gap-1.5"
          >
            📊 Analysis
          </button>
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 rounded-lg text-xs font-body border bg-bg-secondary/90 backdrop-blur-sm text-text-secondary border-border-custom hover:text-text-primary transition-all flex items-center gap-1.5"
          >
            📄 PDF
          </button>
        </div>

        {/* Edit mode help */}
        {editMode && (
          <div className="absolute top-16 left-4 z-10 bg-bg-secondary/90 backdrop-blur-sm border border-accent-secondary/30 rounded-lg px-3 py-2 max-w-xs">
            <p className="text-text-secondary text-[11px] font-body leading-relaxed">
              {editTab === 'furniture'
                ? 'Click furniture to select. Drag to move, corners to resize, purple handle to rotate. Press Delete to remove.'
                : 'Click a door or window to select. Drag to reposition, drag handles to resize. Press Delete to remove.'
              }
            </p>
            <button
              onClick={() => setShowAddPanel((v) => !v)}
              className="mt-1.5 text-accent-primary text-[11px] font-body hover:underline"
            >
              {showAddPanel ? '← Hide panel' : `+ Add ${editTab === 'furniture' ? 'furniture' : 'door/window'}…`}
            </button>
          </div>
        )}

        {/* Add item panel */}
        {editMode && showAddPanel && (
          <div className="absolute top-36 left-4 z-20 w-64 max-h-[60vh] overflow-y-auto bg-bg-card/95 backdrop-blur-sm border border-border-custom rounded-xl shadow-xl p-3">
            {editTab === 'furniture' ? (
              <>
                <p className="text-text-primary text-xs font-body font-medium mb-2">
                  Add Furniture {selectedRoom ? `to ${selectedRoom.name}` : '(select a room first)'}
                </p>
                {!selectedRoom && (
                  <p className="text-text-secondary text-[11px] font-body mb-2">
                    Click a room in the floor plan first, then pick an item to add.
                  </p>
                )}
                {FURNITURE_PALETTE.map((cat) => (
                  <div key={cat.category} className="mb-2">
                    <p className="text-text-secondary text-[10px] font-body uppercase tracking-wider mb-1">{cat.category}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {cat.items.map((item) => (
                        <button
                          key={item.type}
                          disabled={!selectedRoom}
                          onClick={() => {
                            if (!selectedRoom) return;
                            const ri = floor.rooms.findIndex(r => r.id === selectedRoom.id);
                            if (ri >= 0) addFurnitureToRoom(ri, item.type, item.w, item.d);
                          }}
                          className="px-2 py-1.5 text-[11px] font-body rounded-md border border-border-custom text-text-secondary hover:text-text-primary hover:border-accent-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-left"
                        >
                          {item.label}
                          <span className="block text-[9px] text-text-secondary/60">{item.w}×{item.d}m</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <p className="text-text-primary text-xs font-body font-medium mb-2">
                  Add Door or Window
                </p>
                {!selectedRoom && (
                  <p className="text-text-secondary text-[11px] font-body mb-2">
                    Click a room in the floor plan first, then choose a wall.
                  </p>
                )}
                {selectedRoom && (() => {
                  const ri = floor.rooms.findIndex(r => r.id === selectedRoom.id);
                  if (ri < 0) return null;
                  const room = floor.rooms[ri];
                  const sides: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
                  return (
                    <div className="space-y-2">
                      {sides.map((side) => (
                        <div key={side} className="flex items-center gap-2">
                          <span className="text-text-secondary text-[11px] font-body capitalize w-12">{side}</span>
                          <button
                            onClick={() => addOpeningToWall(ri, side, 'door')}
                            className="flex-1 px-2 py-1 text-[11px] font-body rounded border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-all"
                          >
                            + Door
                          </button>
                          <button
                            onClick={() => addOpeningToWall(ri, side, 'window')}
                            className="flex-1 px-2 py-1 text-[11px] font-body rounded border border-blue-400/30 text-blue-400 hover:bg-blue-500/10 transition-all"
                          >
                            + Window
                          </button>
                        </div>
                      ))}
                      <p className="text-text-secondary/60 text-[10px] font-body mt-1">
                        Openings: {(room.walls.north?.openings?.length || 0) + (room.walls.south?.openings?.length || 0) + (room.walls.east?.openings?.length || 0) + (room.walls.west?.openings?.length || 0)} total in this room
                      </p>
                    </div>
                  );
                })()}
              </>
            )}
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

        {/* Selected opening toolbar */}
        {editMode && selectedOpening && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-bg-card/95 backdrop-blur-sm border border-border-custom rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-xl">
            {(() => {
              const room = floor.rooms[selectedOpening.roomIndex];
              const opening = room.walls[selectedOpening.wallSide].openings[selectedOpening.openingIndex];
              return (
                <>
                  <span className={`text-xs font-body capitalize ${opening.type === 'door' ? 'text-cyan-400' : 'text-blue-400'}`}>
                    {opening.type}
                  </span>
                  <span className="text-text-secondary/60 font-mono text-[10px]">
                    {opening.widthMeters.toFixed(2)}m wide
                  </span>
                  <span className="text-text-secondary/60 font-mono text-[10px]">
                    {selectedOpening.wallSide} wall • pos {opening.positionFromLeft.toFixed(2)}m
                  </span>
                  <span className="w-px h-4 bg-border-custom" />
                  <button
                    onClick={() => {
                      // Toggle between door and window
                      const newType = opening.type === 'door' ? 'window' : 'door';
                      const changes: Partial<Opening> = { type: newType };
                      if (newType === 'window') {
                        changes.heightMeters = 1.2;
                        changes.sillHeight = 0.9;
                      }
                      updateOpening(selectedOpening, changes);
                    }}
                    className="text-text-secondary hover:text-accent-primary text-xs transition-colors flex items-center gap-1"
                    title="Toggle door/window"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    → {opening.type === 'door' ? 'Window' : 'Door'}
                  </button>
                  <button
                    onClick={deleteSelectedOpening}
                    className="text-red-400 hover:text-red-300 text-xs transition-colors flex items-center gap-1"
                    title="Delete (Del)"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
              );
            })()}
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
        <ChatPanel floorPlan={floorPlan} onFloorPlanUpdate={onFloorPlanUpdate} provider={provider} />
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
        onGenerateVideo={handleGenerateVideo}
        videoStatus={videoStatus}
        videoUrl={videoUrl}
      />

      {/* Analysis suite slide-over */}
      {showAnalysis && (
        <AnalysisPanel
          floorPlan={floorPlan}
          currentFloor={currentFloor}
          onClose={() => setShowAnalysis(false)}
          onUpdatePlan={onFloorPlanUpdate}
          onExportPdf={handleExportPdf}
        />
      )}
    </div>
  );
}
