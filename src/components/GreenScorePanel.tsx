'use client';

import { useMemo, useState } from 'react';
import { FloorPlan } from '@/lib/types';
import { calculateGreenScore, GreenStatus } from '@/lib/greenScoring';
import { useLanguage } from '@/lib/i18n';

const GRADE_COLOR: Record<string, string> = {
  A: '#10b981',
  B: '#84cc16',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
};

const STATUS_COLOR: Record<GreenStatus, string> = {
  excellent: '#10b981',
  good: '#84cc16',
  needs_improvement: '#f59e0b',
  poor: '#ef4444',
};

export default function GreenScorePanel({ floorPlan }: { floorPlan: FloorPlan }) {
  const { t, lang } = useLanguage();
  const score = useMemo(() => calculateGreenScore(floorPlan), [floorPlan]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const color = GRADE_COLOR[score.grade];
  const circumference = 2 * Math.PI * 52;
  const dash = (score.totalScore / 100) * circumference;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-accent-primary text-sm tracking-wide">{t('greenScore')}</h3>

      {/* Circular score */}
      <div className="bg-bg-card/40 border border-border-custom rounded-lg p-4 flex items-center gap-4">
        <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#2a2a4a" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform="rotate(-90 60 60)"
          />
          <text x="60" y="56" textAnchor="middle" fontSize="26" fontWeight="bold" fill={color} fontFamily="Orbitron, sans-serif">
            {score.totalScore}
          </text>
          <text x="60" y="74" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">
            / 100
          </text>
        </svg>
        <div>
          <p className="text-text-secondary text-xs font-mono uppercase">{t('overallScore')}</p>
          <p className="font-display text-3xl mt-1" style={{ color }}>
            Grade {score.grade}
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {score.categories.map((cat) => {
          const isOpen = expanded === cat.id;
          const pct = (cat.earnedPoints / cat.maxPoints) * 100;
          return (
            <div key={cat.id} className="bg-bg-card/40 border border-border-custom rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : cat.id)}
                className="w-full px-3 py-2.5 text-left hover:bg-bg-card/60 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-text-primary font-body text-xs">{lang === 'sw' ? cat.nameSwahili : cat.name}</span>
                  <span className="font-mono text-xs" style={{ color: STATUS_COLOR[cat.status] }}>
                    {cat.earnedPoints}/{cat.maxPoints}
                  </span>
                </div>
                <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: STATUS_COLOR[cat.status] }} />
                </div>
              </button>
              {isOpen && cat.recommendations.length > 0 && (
                <div className="px-3 pb-3 pt-1 space-y-1">
                  <p className="text-text-secondary/60 text-[10px] font-mono uppercase">{t('recommendations')}</p>
                  {cat.recommendations.map((r, i) => (
                    <p key={i} className="text-text-secondary text-[11px] font-body leading-snug">{r}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SDG badges */}
      <div className="bg-bg-card/40 border border-border-custom rounded-lg p-3">
        <p className="text-text-secondary/60 text-[10px] font-mono uppercase mb-2">Supports Sustainable Development Goals</p>
        <div className="flex flex-wrap gap-1.5">
          {score.sdgs.map((sdg) => (
            <span key={sdg} className="px-2 py-1 bg-accent-success/10 border border-accent-success/30 text-accent-success text-[10px] font-body rounded-md">
              {sdg}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
