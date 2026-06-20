'use client';

import { useMemo } from 'react';
import { FloorPlan } from '@/lib/types';
import { estimateCost, formatKES, formatKESShort } from '@/lib/costEstimator';
import { useLanguage } from '@/lib/i18n';

export default function CostDashboard({ floorPlan }: { floorPlan: FloorPlan }) {
  const { t } = useLanguage();
  const cost = useMemo(() => estimateCost(floorPlan), [floorPlan]);

  // Pie chart geometry
  const radius = 60;
  const cx = 70;
  const cy = 70;
  let angle = -Math.PI / 2;
  const slices = cost.tradeCosts.map((tc) => {
    const slice = (tc.percent / 100) * Math.PI * 2;
    const x1 = cx + radius * Math.cos(angle);
    const y1 = cy + radius * Math.sin(angle);
    angle += slice;
    const x2 = cx + radius * Math.cos(angle);
    const y2 = cy + radius * Math.sin(angle);
    const large = slice > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    return { d, color: tc.color, name: tc.name, percent: tc.percent };
  });

  // Benchmark bar — position the marker along a 0..60k scale.
  const maxScale = 60000;
  const markerPct = Math.min(100, (cost.costPerSqMeter / maxScale) * 100);

  return (
    <div className="space-y-4">
      <h3 className="font-display text-accent-primary text-sm tracking-wide">{t('costs')}</h3>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-accent-primary/10 to-transparent border border-accent-primary/30 rounded-lg p-3">
          <p className="text-text-secondary/70 text-[10px] font-mono uppercase">{t('totalCost')}</p>
          <p className="text-accent-primary font-display text-lg mt-1">{formatKESShort(cost.total)}</p>
          <p className="text-text-secondary/60 text-[10px] font-mono mt-0.5">{formatKES(cost.total)}</p>
        </div>
        <div className="bg-bg-card/50 border border-border-custom rounded-lg p-3">
          <p className="text-text-secondary/70 text-[10px] font-mono uppercase">{t('costPerSqm')}</p>
          <p className="text-text-primary font-display text-lg mt-1">{formatKESShort(cost.costPerSqMeter)}</p>
          <p className="text-text-secondary/60 text-[10px] font-body mt-0.5 capitalize">{cost.bandLabel}</p>
        </div>
      </div>

      {/* Pie chart + legend */}
      <div className="bg-bg-card/40 border border-border-custom rounded-lg p-3">
        <p className="text-text-secondary text-xs font-mono uppercase tracking-wider mb-2">{t('breakdown')}</p>
        <div className="flex items-center gap-3">
          <svg width="140" height="140" viewBox="0 0 140 140" className="flex-shrink-0">
            {slices.map((s, i) => (
              <path key={i} d={s.d} fill={s.color} stroke="#16213e" strokeWidth="1" />
            ))}
            <circle cx={cx} cy={cy} r="28" fill="#16213e" />
          </svg>
          <div className="flex-1 space-y-1">
            {cost.tradeCosts.map((tc) => (
              <div key={tc.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: tc.color }} />
                <span className="text-text-secondary text-[10px] font-body flex-1 truncate">{tc.name}</span>
                <span className="text-text-primary text-[10px] font-mono">{tc.percent.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benchmark comparison */}
      <div className="bg-bg-card/40 border border-border-custom rounded-lg p-3">
        <p className="text-text-secondary text-xs font-mono uppercase tracking-wider mb-3">Cost Benchmark (KES/m²)</p>
        <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-accent-success via-accent-warning to-accent-danger">
          <div
            className="absolute top-0 -translate-x-1/2 h-3 w-1 bg-white shadow-lg"
            style={{ left: `${markerPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] font-mono text-text-secondary/70">
          <span>25K basic</span>
          <span>35K standard</span>
          <span>50K premium</span>
        </div>
        <p className="text-center text-accent-primary text-[11px] font-body mt-2">
          This building: {formatKES(cost.costPerSqMeter)}/m² — {cost.bandLabel}
        </p>
      </div>

      {/* Cost by room */}
      <div className="bg-bg-card/40 border border-border-custom rounded-lg p-3">
        <p className="text-text-secondary text-xs font-mono uppercase tracking-wider mb-2">{t('costByRoom')}</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {cost.roomCosts.map((rc) => (
            <div key={rc.roomId} className="flex items-center justify-between text-[11px]">
              <span className="text-text-secondary font-body truncate flex-1">{rc.roomName}</span>
              <span className="text-text-secondary/50 font-mono mr-2">{rc.areaSqM.toFixed(1)}m²</span>
              <span className="text-text-primary font-mono">{formatKESShort(rc.finishingCost)}</span>
            </div>
          ))}
        </div>
        <p className="text-text-secondary/50 text-[9px] font-body mt-2">Room figures show finishing cost only (floor, walls, ceiling).</p>
      </div>
    </div>
  );
}
