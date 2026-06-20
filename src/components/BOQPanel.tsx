'use client';

import { useMemo, useState } from 'react';
import { FloorPlan } from '@/lib/types';
import { generateBOQ, downloadBoqCsvReport } from '@/lib/boqEngine';
import { REGION_LABELS } from '@/lib/constants';
import { formatKES } from '@/lib/costEstimator';
import { useLanguage } from '@/lib/i18n';

const ELEMENT_COLORS = ['#6b7280', '#f59e0b', '#ef4444', '#8b0000', '#7c3aed', '#3b82f6', '#fbbf24', '#10b981', '#64748b'];

export default function BOQPanel({ floorPlan }: { floorPlan: FloorPlan }) {
  const { t } = useLanguage();
  const [region, setRegion] = useState<string>(floorPlan.climateZone ? '' : 'central');
  const [includeVat, setIncludeVat] = useState(true);
  const [openEls, setOpenEls] = useState<Record<number, boolean>>({ 1: true });

  const report = useMemo(
    () => generateBOQ(floorPlan, { region: region || undefined, includeVat }),
    [floorPlan, region, includeVat],
  );

  const g = report.grandSummary;
  const benchMax = 60000;
  const markerPct = Math.min(100, (g.costPerSqMeterInclVAT / benchMax) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-accent-primary text-sm tracking-wide">{t('boq')}</h3>
        <button
          onClick={() => downloadBoqCsvReport(report)}
          className="px-3 py-1.5 bg-bg-card border border-accent-primary/20 text-text-secondary text-xs rounded-lg hover:text-accent-primary hover:border-accent-primary/40 transition-all font-body"
        >
          📊 CSV
        </button>
      </div>

      {/* Header summary */}
      <div className="bg-bg-card/40 border border-border-custom rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary">
          <span>{report.location}</span>
          <span>{report.totalFloorArea} m² · {report.roomCount} rooms</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary text-xs font-body">{t('grandTotal')}</span>
          <span className="text-accent-primary font-display text-lg">{formatKES(g.grandTotal)}</span>
        </div>
        {/* Benchmark bar */}
        <div className="relative h-2.5 rounded-full overflow-hidden bg-gradient-to-r from-accent-success via-accent-warning to-accent-danger mt-1">
          <div className="absolute top-0 -translate-x-1/2 h-2.5 w-1 bg-white" style={{ left: `${markerPct}%` }} />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-text-secondary/60">
          <span>25K basic</span>
          <span>35K std</span>
          <span>50K premium</span>
        </div>
        <p className="text-center text-accent-primary text-[11px] font-mono">
          {formatKES(g.costPerSqMeterInclVAT)}/m² incl. VAT
        </p>
      </div>

      {/* Region + VAT controls */}
      <div className="flex items-center gap-2">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="flex-1 bg-bg-card border border-border-custom rounded-lg px-2 py-1.5 text-xs text-text-primary font-body focus:outline-none focus:border-accent-primary/40"
        >
          {!region && <option value="">Auto ({report.location})</option>}
          {Object.entries(REGION_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-text-secondary font-body cursor-pointer">
          <input type="checkbox" checked={includeVat} onChange={(e) => setIncludeVat(e.target.checked)} className="accent-accent-primary" />
          VAT
        </label>
      </div>

      {/* Elements accordion */}
      <div className="space-y-2">
        {report.elements.map((el) => {
          const open = openEls[el.elementNumber];
          const pct = g.subtotalBeforeContingency > 0 ? (el.subtotal / g.subtotalBeforeContingency) * 100 : 0;
          const color = ELEMENT_COLORS[el.elementNumber - 1] || '#94a3b8';
          return (
            <div key={el.elementNumber} className="bg-bg-card/40 rounded-lg border border-border-custom overflow-hidden">
              <button
                onClick={() => setOpenEls((o) => ({ ...o, [el.elementNumber]: !o[el.elementNumber] }))}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-bg-card/60 transition-colors text-left"
              >
                <span className="text-text-secondary text-xs w-3">{open ? '▾' : '▸'}</span>
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-text-primary font-body text-xs flex-1">
                  {el.elementNumber}. {el.elementName}
                </span>
                <span className="text-text-secondary/60 font-mono text-[10px]">{pct.toFixed(0)}%</span>
                <span className="text-accent-primary font-mono text-xs">{formatKES(el.subtotal)}</span>
              </button>

              {open && (
                <div className="px-2 pb-2 space-y-2">
                  {el.subSections.map((ss) => (
                    <div key={ss.code}>
                      <p className="text-text-secondary/70 text-[10px] font-mono uppercase tracking-wider px-1 py-1">
                        {ss.code} {ss.name}
                      </p>
                      <table className="w-full text-[10px] font-mono">
                        <tbody>
                          {ss.items.map((it) => (
                            <tr key={it.itemCode} className="border-t border-border-custom/30 align-top">
                              <td className="py-1 px-1 text-text-secondary/50 w-10">{it.itemCode}</td>
                              <td className="py-1 px-1 text-text-secondary font-body leading-tight">
                                {it.description}
                                <span className="block text-text-secondary/40 text-[9px] italic mt-0.5" title={it.workings}>
                                  ⓘ {it.workings}
                                </span>
                              </td>
                              <td className="py-1 px-1 text-text-primary text-right whitespace-nowrap">
                                {it.quantity.toLocaleString()} {it.unit}
                              </td>
                              <td className="py-1 px-1 text-text-primary text-right whitespace-nowrap">{it.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand summary */}
      <div className="bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 border border-accent-primary/30 rounded-lg p-3 space-y-1.5">
        <Row label={t('subtotal')} value={formatKES(g.subtotalBeforeContingency)} />
        <Row label={t('contingency')} value={formatKES(g.contingency)} />
        {includeVat && <Row label={t('vat')} value={formatKES(g.vat)} />}
        <div className="border-t border-accent-primary/20 pt-1.5 mt-1.5">
          <Row label={t('grandTotal')} value={formatKES(g.grandTotal)} bold />
        </div>
      </div>

      <p className="text-text-secondary/40 text-[9px] font-body leading-relaxed">
        Rates current June 2026 for {report.location}. Labour included in rates. VAT at 16% per KRA.
        Indicative only — verify with a registered QS before tendering. Generated by BuildAI.
      </p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`font-body text-xs ${bold ? 'text-accent-primary font-medium' : 'text-text-secondary'}`}>{label}</span>
      <span className={`font-mono text-xs ${bold ? 'text-accent-primary font-bold text-sm' : 'text-text-primary'}`}>{value}</span>
    </div>
  );
}
