'use client';

import { FloorPlan, Floor, Room } from '@/lib/types';
import { ROOM_COLORS, COST_PER_SQM } from '@/lib/constants';

interface SidebarProps {
  floorPlan: FloorPlan;
  currentFloor: number;
  selectedRoom: Room | null;
  onFloorChange: (floor: number) => void;
  onRegenerate: () => void;
  onEditPrompt: () => void;
  onWalkthrough: () => void;
  onExportJSON: () => void;
  onExportImage: () => void;
}

export default function Sidebar({
  floorPlan,
  currentFloor,
  selectedRoom,
  onFloorChange,
  onRegenerate,
  onEditPrompt,
  onWalkthrough,
  onExportJSON,
  onExportImage,
}: SidebarProps) {
  const floor = floorPlan.floors[currentFloor];
  const totalArea = floorPlan.totalAreaSqMeters;
  const totalRooms = floorPlan.floors.reduce((sum, f) => sum + f.rooms.length, 0);
  const estimatedCost = totalArea * COST_PER_SQM;

  return (
    <div className="w-80 bg-bg-secondary border-l border-border-custom h-full overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-border-custom">
        <h2 className="font-display text-lg text-accent-primary tracking-wide truncate">
          {floorPlan.buildingName}
        </h2>
      </div>

      {/* Floor Selector */}
      {floorPlan.floors.length > 1 && (
        <div className="p-4 border-b border-border-custom">
          <p className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">Floor</p>
          <div className="flex gap-1 flex-wrap">
            {floorPlan.floors.map((f, i) => (
              <button
                key={i}
                onClick={() => onFloorChange(i)}
                className={`px-3 py-1.5 text-xs rounded-lg font-body transition-all ${
                  currentFloor === i
                    ? 'bg-accent-primary text-bg-primary font-medium'
                    : 'bg-bg-card text-text-secondary hover:bg-bg-card/80'
                }`}
              >
                {f.floorName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="p-4 border-b border-border-custom">
        <p className="text-text-secondary text-xs font-mono mb-3 uppercase tracking-wider">Statistics</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Area" value={`${totalArea.toFixed(1)} m²`} />
          <StatCard label="Rooms" value={`${totalRooms}`} />
          <StatCard label="Floors" value={`${floorPlan.floors.length}`} />
          <StatCard
            label="Est. Cost"
            value={`KES ${(estimatedCost / 1_000_000).toFixed(2)}M`}
          />
        </div>
      </div>

      {/* Room List */}
      <div className="p-4 border-b border-border-custom flex-1 overflow-y-auto">
        <p className="text-text-secondary text-xs font-mono mb-3 uppercase tracking-wider">
          Rooms — {floor.floorName}
        </p>
        <div className="space-y-1.5">
          {floor.rooms.map((room) => {
            const colors = ROOM_COLORS[room.type] || ROOM_COLORS.corridor;
            const area = (room.widthMeters * room.depthMeters).toFixed(1);
            const isSelected = selectedRoom?.id === room.id;

            return (
              <div
                key={room.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  isSelected
                    ? 'bg-accent-primary/10 border border-accent-primary/30'
                    : 'hover:bg-bg-card/50'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: colors.stroke }}
                />
                <span className="text-text-primary font-body flex-1 truncate">{room.name}</span>
                <span className="text-text-secondary/60 font-mono text-xs">{area}m²</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Room Detail */}
      {selectedRoom && (
        <div className="p-4 border-b border-border-custom bg-bg-card/30">
          <p className="text-accent-primary font-display text-sm mb-2">{selectedRoom.name}</p>
          <div className="text-text-secondary text-xs font-mono space-y-1">
            <p>Dimensions: {selectedRoom.widthMeters}m × {selectedRoom.depthMeters}m</p>
            <p>Area: {(selectedRoom.widthMeters * selectedRoom.depthMeters).toFixed(1)} m²</p>
            <p>Furniture: {selectedRoom.furniture.length} items</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="p-4 border-b border-border-custom">
        <p className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">Legend</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(ROOM_COLORS)
            .filter(([type]) =>
              floor.rooms.some((r) => r.type === type)
            )
            .map(([type, colors]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors.stroke }} />
                <span className="text-text-secondary text-[10px] font-body">{colors.label}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2">
        <button
          onClick={onWalkthrough}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-display text-xs tracking-wide rounded-lg hover:shadow-lg hover:shadow-accent-primary/20 transition-all"
        >
          🚶 Walk Through
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onRegenerate}
            className="px-3 py-2 bg-bg-card border border-border-custom text-text-secondary text-xs rounded-lg hover:text-text-primary hover:border-accent-primary/30 transition-all font-body"
          >
            🔄 Regenerate
          </button>
          <button
            onClick={onEditPrompt}
            className="px-3 py-2 bg-bg-card border border-border-custom text-text-secondary text-xs rounded-lg hover:text-text-primary hover:border-accent-primary/30 transition-all font-body"
          >
            ✏️ Edit Prompt
          </button>
          <button
            onClick={onExportJSON}
            className="px-3 py-2 bg-bg-card border border-border-custom text-text-secondary text-xs rounded-lg hover:text-text-primary hover:border-accent-primary/30 transition-all font-body"
          >
            💾 Save Plan
          </button>
          <button
            onClick={onExportImage}
            className="px-3 py-2 bg-bg-card border border-border-custom text-text-secondary text-xs rounded-lg hover:text-text-primary hover:border-accent-primary/30 transition-all font-body"
          >
            📄 Export PNG
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-card/50 rounded-lg p-2.5">
      <p className="text-text-secondary/60 text-[10px] font-mono uppercase">{label}</p>
      <p className="text-text-primary font-display text-sm mt-0.5">{value}</p>
    </div>
  );
}
