'use client';

import { useMemo } from 'react';
import { Floor, Orientation } from '@/lib/types';
import { analyseSun } from '@/lib/sunAnalysis';
import { useLanguage } from '@/lib/i18n';

const ORIENTATIONS: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const TIP_COLOR = {
  good: '#10b981',
  warning: '#f59e0b',
  neutral: '#94a3b8',
};

export default function SunlightOverlay({
  floor,
  orientation,
  onOrientationChange,
}: {
  floor: Floor;
  orientation: Orientation;
  onOrientationChange: (o: Orientation) => void;
}) {
  const { t } = useLanguage();
  const sun = useMemo(() => analyseSun(floor, orientation), [floor, orientation]);

  const morning = sun.windows.filter((w) => w.period === 'morning');
  const afternoon = sun.windows.filter((w) => w.period === 'afternoon');

  // Compass needle angle (N at top, clockwise).
  const angle = ORIENTATIONS.indexOf(orientation) * 45;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-accent-primary text-sm tracking-wide">{t('sunlight')}</h3>

      {/* Compass + orientation selector */}
      <div className="bg-bg-card/40 border border-border-custom rounded-lg p-3 flex items-center gap-4">
        <svg width="90" height="90" viewBox="0 0 90 90" className="flex-shrink-0">
          <circle cx="45" cy="45" r="40" fill="#0f0f1a" stroke="#2a2a4a" strokeWidth="1.5" />
          {/* sun arc east→west */}
          <path d="M 12 45 A 33 33 0 0 1 78 45" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
          <text x="80" y="48" fontSize="7" fill="#f59e0b">W</text>
          <text x="5" y="48" fontSize="7" fill="#f59e0b">E</text>
          <g transform={`rotate(${angle} 45 45)`}>
            <polygon points="45,12 41,46 49,46" fill="#00d4ff" />
            <polygon points="45,78 41,44 49,44" fill="#64748b" />
          </g>
          <circle cx="45" cy="45" r="3" fill="#e2e8f0" />
          <text x="45" y="9" textAnchor="middle" fontSize="8" fill="#e2e8f0">N</text>
        </svg>
        <div className="flex-1">
          <p className="text-text-secondary text-[10px] font-mono uppercase mb-1.5">Building faces (front → N)</p>
          <div className="grid grid-cols-4 gap-1">
            {ORIENTATIONS.map((o) => (
              <button
                key={o}
                onClick={() => onOrientationChange(o)}
                className={`px-1.5 py-1 rounded text-[10px] font-mono transition-all ${
                  orientation === o
                    ? 'bg-accent-primary text-bg-primary font-bold'
                    : 'bg-bg-primary text-text-secondary hover:text-text-primary'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sun exposure summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2.5">
          <p className="text-yellow-400 text-[10px] font-mono uppercase">🌅 Morning sun</p>
          <p className="text-text-primary font-display text-lg mt-0.5">{morning.length}</p>
          <p className="text-text-secondary/60 text-[10px] font-body">east-facing windows</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2.5">
          <p className="text-orange-400 text-[10px] font-mono uppercase">🌇 Afternoon sun</p>
          <p className="text-text-primary font-display text-lg mt-0.5">{afternoon.length}</p>
          <p className="text-text-secondary/60 text-[10px] font-body">west-facing windows</p>
        </div>
      </div>

      {/* Tips */}
      {sun.tips.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-text-secondary/60 text-[10px] font-mono uppercase">Orientation tips</p>
          {sun.tips.map((tip, i) => (
            <div
              key={i}
              className="rounded-lg border p-2.5 text-[11px] font-body"
              style={{ borderColor: TIP_COLOR[tip.status] + '40', backgroundColor: TIP_COLOR[tip.status] + '12', color: '#e2e8f0' }}
            >
              <span style={{ color: TIP_COLOR[tip.status] }}>
                {tip.status === 'good' ? '✅ ' : tip.status === 'warning' ? '⚠️ ' : 'ℹ️ '}
              </span>
              {tip.message}
            </div>
          ))}
        </div>
      )}
      <p className="text-text-secondary/40 text-[9px] font-body">
        Kenya sits on the equator — east/west exposure matters most. East windows get cool morning sun; west windows get hot afternoon sun.
      </p>
    </div>
  );
}
