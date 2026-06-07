'use client';

import { useState, useEffect } from 'react';
import { FloorPlan } from '@/lib/types';
import { getDesigns, getDesign, deleteDesign, SavedDesignMeta } from '@/lib/designStorage';

interface SavedDesignsProps {
  onLoad: (floorPlan: FloorPlan, id: string) => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SavedDesigns({ onLoad }: SavedDesignsProps) {
  const [designs, setDesigns] = useState<SavedDesignMeta[]>([]);

  const refresh = () => setDesigns(getDesigns());

  useEffect(() => {
    refresh();
  }, []);

  const handleLoad = (id: string) => {
    const design = getDesign(id);
    if (design) {
      onLoad(design.floorPlan, design.id);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteDesign(id);
    refresh();
  };

  if (designs.length === 0) return null;

  return (
    <div className="mb-16 animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-secondary text-sm font-body">
          Your saved designs <span className="text-text-secondary/50">({designs.length})</span>
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {designs.map((d) => (
          <div
            key={d.id}
            onClick={() => handleLoad(d.id)}
            className="group relative bg-bg-card/60 border border-border-custom/50 rounded-xl overflow-hidden cursor-pointer hover:border-accent-primary/40 hover:bg-bg-card transition-all"
          >
            {/* Thumbnail */}
            <div className="aspect-[16/10] bg-bg-primary overflow-hidden">
              {d.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.thumbnail} alt={d.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-secondary/30 text-xs">
                  No preview
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <p className="text-text-primary text-xs font-body font-medium truncate">{d.name}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-text-secondary/60 font-mono text-[10px]">
                  {d.totalArea.toFixed(0)}m² · {d.roomCount} rooms
                </span>
                <span className="text-text-secondary/40 font-mono text-[10px]">
                  {timeAgo(d.updatedAt)}
                </span>
              </div>
            </div>

            {/* Delete button */}
            <button
              onClick={(e) => handleDelete(e, d.id)}
              className="absolute top-2 right-2 w-6 h-6 rounded-md bg-bg-primary/80 backdrop-blur-sm border border-border-custom text-text-secondary/60 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:border-red-400/40 transition-all flex items-center justify-center"
              title="Delete design"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
