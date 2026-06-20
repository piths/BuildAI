'use client';

import { useMemo, useState } from 'react';
import { FloorPlan } from '@/lib/types';
import { generateTimeline } from '@/lib/timelineGenerator';
import { useLanguage } from '@/lib/i18n';

export default function TimelineView({ floorPlan }: { floorPlan: FloorPlan }) {
  const { t, lang } = useLanguage();
  const timeline = useMemo(() => generateTimeline(floorPlan), [floorPlan]);
  const [hover, setHover] = useState<string | null>(null);

  const weeks = timeline.totalWeeks;
  const colW = Math.max(8, Math.min(20, 360 / weeks)); // px per week
  const rowH = 22;

  return (
    <div className="space-y-3">
      <h3 className="font-display text-accent-primary text-sm tracking-wide">{t('timeline')}</h3>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t('estDuration')} value={`${weeks} ${t('weeks')}`} sub={`~${timeline.totalMonths} ${t('months')}`} />
        <Stat label={t('peakCrew')} value={`${timeline.peakCrew}`} sub={t('workers')} />
        <Stat label="Phases" value={`${timeline.phases.length}`} sub="" />
      </div>

      {/* Gantt */}
      <div className="bg-bg-card/40 border border-border-custom rounded-lg p-3 overflow-x-auto">
        <div style={{ minWidth: weeks * colW + 20 }}>
          {/* Week axis */}
          <div className="flex mb-1 ml-0" style={{ height: 14 }}>
            {Array.from({ length: weeks }).map((_, i) => (
              <div
                key={i}
                className="text-[8px] font-mono text-text-secondary/40 text-center border-l border-border-custom/30"
                style={{ width: colW }}
              >
                {(i + 1) % 2 === 1 ? i + 1 : ''}
              </div>
            ))}
          </div>

          {/* Phase rows */}
          <div className="space-y-1 relative">
            {timeline.phases.map((p) => (
              <div key={p.id} className="relative" style={{ height: rowH }}>
                <div
                  className="absolute top-0 rounded cursor-pointer flex items-center transition-all hover:brightness-125"
                  style={{
                    left: (p.startWeek - 1) * colW,
                    width: Math.max(colW * p.durationWeeks, 6),
                    height: rowH - 4,
                    backgroundColor: p.color,
                    opacity: hover && hover !== p.id ? 0.45 : 1,
                  }}
                  onMouseEnter={() => setHover(p.id)}
                  onMouseLeave={() => setHover(null)}
                >
                  <span className="text-[9px] text-white/95 font-body px-1.5 truncate whitespace-nowrap">
                    {lang === 'sw' ? p.nameSwahili : p.name}
                  </span>
                  {p.milestoneAtEnd && (
                    <span
                      className="absolute -right-2 top-1/2 -translate-y-1/2 text-accent-warning text-[10px]"
                      title={p.milestoneAtEnd}
                    >
                      ◆
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover detail */}
      {hover && (() => {
        const p = timeline.phases.find((x) => x.id === hover)!;
        return (
          <div className="bg-bg-card/60 border border-accent-primary/30 rounded-lg p-3">
            <p className="text-text-primary font-body text-sm">{lang === 'sw' ? p.nameSwahili : p.name}</p>
            <div className="text-text-secondary text-[11px] font-mono mt-1 space-y-0.5">
              <p>Week {p.startWeek}–{p.startWeek + p.durationWeeks - 1} ({p.durationWeeks} {t('weeks')})</p>
              <p>👷 {p.crew}</p>
              {p.milestoneAtEnd && <p className="text-accent-warning">◆ {p.milestoneAtEnd}</p>}
            </div>
          </div>
        );
      })()}

      {/* Milestones legend */}
      <div className="text-[10px] font-body text-text-secondary/60 space-y-0.5">
        {timeline.phases.filter((p) => p.milestoneAtEnd).map((p) => (
          <p key={p.id}>
            <span className="text-accent-warning">◆</span> Week {p.startWeek + p.durationWeeks - 1}: {p.milestoneAtEnd}
          </p>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-bg-card/50 border border-border-custom rounded-lg p-2.5 text-center">
      <p className="text-text-secondary/60 text-[9px] font-mono uppercase leading-tight">{label}</p>
      <p className="text-accent-primary font-display text-sm mt-1">{value}</p>
      {sub && <p className="text-text-secondary/50 text-[9px] font-body">{sub}</p>}
    </div>
  );
}
