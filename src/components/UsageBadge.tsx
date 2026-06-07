'use client';

import { useState, useEffect } from 'react';
import { fetchUsage, UsageInfo, UsageWindow } from '@/lib/ai';

function formatReset(seconds: number | null): string {
  if (seconds === null) return '';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function UsageBar({ label, win }: { label: string; win: UsageWindow }) {
  if (win.usedPercent === null) return null;
  const used = Math.min(100, Math.max(0, win.usedPercent));
  const remaining = (100 - used).toFixed(0);

  const barColor =
    used > 90 ? 'bg-red-400' : used > 70 ? 'bg-accent-warning' : 'bg-accent-success';

  return (
    <div className="mb-2 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <span className="text-text-secondary text-[10px] font-mono uppercase">{label}</span>
        <span className="text-text-primary text-[10px] font-mono">{remaining}% left</span>
      </div>
      <div className="w-full bg-bg-primary rounded-full h-1.5 overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${used}%` }} />
      </div>
      {win.resetsInSeconds !== null && (
        <p className="text-text-secondary/50 text-[9px] font-mono mt-0.5">
          resets in {formatReset(win.resetsInSeconds)}
        </p>
      )}
    </div>
  );
}

export default function UsageBadge() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchUsage()
      .then((data) => {
        if (mounted) setUsage(data);
      })
      .catch(() => {
        if (mounted) setUsage({ signedIn: false });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !usage || !usage.signedIn) return null;

  return (
    <div className="bg-bg-card/80 border border-border-custom rounded-lg px-3 py-2.5 min-w-[180px]">
      <p className="text-accent-primary text-[10px] font-mono uppercase tracking-wider mb-2">
        ChatGPT Usage
      </p>
      {usage.available ? (
        <>
          {usage.primary && <UsageBar label="5h limit" win={usage.primary} />}
          {usage.secondary && <UsageBar label="Weekly" win={usage.secondary} />}
        </>
      ) : (
        <p className="text-text-secondary/60 text-[10px] font-body leading-snug">
          {usage.reason || 'Usage data unavailable for this account.'}
        </p>
      )}
    </div>
  );
}
