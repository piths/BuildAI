'use client';

import { useMemo, useState } from 'react';
import { FloorPlan } from '@/lib/types';
import { calculateBOQ } from '@/lib/boqCalculator';
import { formatKES, downloadBoqCsv } from '@/lib/costEstimator';
import { useLanguage } from '@/lib/i18n';

export default function BOQPanel({ floorPlan }: { floorPlan: FloorPlan }) {
  const { t, lang } = useLanguage();
  const boq = useMemo(() => calculateBOQ(floorPlan), [floorPlan]);
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(boq.trades.map((tr, i) => [tr.id, i === 0])),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-accent-primary text-sm tracking-wide">{t('boq')}</h3>
        <button
          onClick={() => downloadBoqCsv(floorPlan)}
          className="px-3 py-1.5 bg-bg-card border border-accent-primary/20 text-text-secondary text-xs rounded-lg hover:text-accent-primary hover:border-accent-primary/40 transition-all font-body"
        >
          📊 {t('downloadCsv')}
        </button>
      </div>

      {boq.trades.map((trade) => {
        const isOpen = open[trade.id];
        return (
          <div key={trade.id} className="bg-bg-card/40 rounded-lg border border-border-custom overflow-hidden">
            <button
              onClick={() => setOpen((o) => ({ ...o, [trade.id]: !o[trade.id] }))}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-bg-card/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="text-text-secondary text-xs">{isOpen ? '▾' : '▸'}</span>
                <span className="text-text-primary font-body text-sm">{lang === 'sw' ? trade.nameSwahili : trade.name}</span>
              </span>
              <span className="text-accent-primary font-mono text-xs">{formatKES(trade.subtotal)}</span>
            </button>

            {isOpen && (
              <div className="px-2 pb-2">
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr className="text-text-secondary/60 text-left">
                      <th className="py-1 px-1 font-normal">{t('description')}</th>
                      <th className="py-1 px-1 font-normal text-right">{t('quantity')}</th>
                      <th className="py-1 px-1 font-normal">{t('unit')}</th>
                      <th className="py-1 px-1 font-normal text-right">{t('amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trade.items.map((it, i) => (
                      <tr key={i} className="border-t border-border-custom/40">
                        <td className="py-1.5 px-1 text-text-secondary font-body leading-tight">{it.description}</td>
                        <td className="py-1.5 px-1 text-text-primary text-right">{it.quantity.toLocaleString()}</td>
                        <td className="py-1.5 px-1 text-text-secondary/70">{it.unit}</td>
                        <td className="py-1.5 px-1 text-text-primary text-right">{it.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Totals */}
      <div className="bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 border border-accent-primary/30 rounded-lg p-3 space-y-1.5">
        <Row label={t('subtotal')} value={formatKES(boq.subtotal)} />
        <Row label={t('contingency')} value={formatKES(boq.contingency)} />
        <Row label={t('vat')} value={formatKES(boq.vat)} />
        <div className="border-t border-accent-primary/20 pt-1.5 mt-1.5">
          <Row label={t('grandTotal')} value={formatKES(boq.total)} bold />
        </div>
      </div>
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
