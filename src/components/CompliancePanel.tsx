'use client';

import { useMemo } from 'react';
import { FloorPlan, ClimateZoneId } from '@/lib/types';
import { checkCompliance, ComplianceStatus } from '@/lib/complianceChecker';
import { useLanguage } from '@/lib/i18n';

const STATUS_META: Record<ComplianceStatus, { icon: string; color: string; bg: string }> = {
  pass: { icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  fail: { icon: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  warning: { icon: '⚠️', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
};

export default function CompliancePanel({
  floorPlan,
  climateZone,
}: {
  floorPlan: FloorPlan;
  climateZone?: ClimateZoneId;
}) {
  const { t } = useLanguage();
  const report = useMemo(() => checkCompliance(floorPlan, climateZone), [floorPlan, climateZone]);

  const scoreColor = report.score >= 80 ? '#10b981' : report.score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-3">
      <h3 className="font-display text-accent-primary text-sm tracking-wide">{t('compliance')}</h3>

      {/* Score summary */}
      <div className="bg-bg-card/40 border border-border-custom rounded-lg p-3 flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 font-display text-sm"
          style={{ border: `3px solid ${scoreColor}`, color: scoreColor }}
        >
          {report.score}%
        </div>
        <div className="flex-1">
          <p className="text-text-primary font-body text-sm">
            {report.passed}/{report.total} {t('checksPassed')}
          </p>
          <div className="flex gap-3 mt-1 text-[11px] font-mono">
            <span className="text-accent-success">✓ {report.passed}</span>
            <span className="text-accent-warning">⚠ {report.warnings}</span>
            <span className="text-accent-danger">✗ {report.failed}</span>
          </div>
        </div>
      </div>

      {/* Checks */}
      <div className="space-y-2">
        {report.checks.map((c) => {
          const meta = STATUS_META[c.status];
          return (
            <div
              key={c.id}
              className="rounded-lg border p-2.5"
              style={{ backgroundColor: meta.bg, borderColor: meta.color + '40' }}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm leading-none mt-0.5">{meta.icon}</span>
                <div className="flex-1">
                  <p className="text-text-primary font-body text-xs font-medium">{c.description}</p>
                  <p className="text-text-secondary text-[11px] font-body mt-1 leading-snug">{c.details}</p>
                  <p className="text-text-secondary/50 text-[9px] font-mono mt-1">{c.category} · {c.regulation}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
