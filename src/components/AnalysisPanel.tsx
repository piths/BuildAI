'use client';

import { useState } from 'react';
import { FloorPlan, ClimateZoneId, Orientation } from '@/lib/types';
import { useLanguage } from '@/lib/i18n';
import { TranslationKey } from '@/lib/translations';
import BOQPanel from './BOQPanel';
import CostDashboard from './CostDashboard';
import CompliancePanel from './CompliancePanel';
import TimelineView from './TimelineView';
import GreenScorePanel from './GreenScorePanel';
import ClimatePanel from './ClimatePanel';
import SunlightOverlay from './SunlightOverlay';

type Tab = 'boq' | 'cost' | 'compliance' | 'timeline' | 'green' | 'climate' | 'sun';

const TABS: { id: Tab; key: TranslationKey; icon: string }[] = [
  { id: 'boq', key: 'boq', icon: '📋' },
  { id: 'cost', key: 'costs', icon: '💰' },
  { id: 'compliance', key: 'compliance', icon: '✅' },
  { id: 'timeline', key: 'timeline', icon: '📅' },
  { id: 'green', key: 'greenScore', icon: '🌿' },
  { id: 'climate', key: 'climate', icon: '🌦️' },
  { id: 'sun', key: 'sunlight', icon: '☀️' },
];

interface AnalysisPanelProps {
  floorPlan: FloorPlan;
  currentFloor: number;
  onClose: () => void;
  onUpdatePlan: (plan: FloorPlan) => void;
  onExportPdf: () => void;
}

export default function AnalysisPanel({
  floorPlan,
  currentFloor,
  onClose,
  onUpdatePlan,
  onExportPdf,
}: AnalysisPanelProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('boq');

  const setClimate = (id: ClimateZoneId) => {
    onUpdatePlan({ ...floorPlan, climateZone: id });
  };
  const setOrientation = (o: Orientation) => {
    onUpdatePlan({ ...floorPlan, orientation: o });
  };

  const floor = floorPlan.floors[currentFloor] || floorPlan.floors[0];

  return (
    <div className="fixed inset-y-0 right-0 z-30 w-full max-w-[440px] bg-bg-secondary border-l border-border-custom shadow-2xl flex flex-col animate-fadeInUp">
      {/* Header */}
      <div className="p-4 border-b border-border-custom flex items-center justify-between">
        <h2 className="font-display text-accent-primary text-base tracking-wide">📊 {t('analysis')}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportPdf}
            className="px-3 py-1.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-xs font-body rounded-lg hover:shadow-lg hover:shadow-accent-primary/20 transition-all"
          >
            📄 {t('exportPdf')}
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-card text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-custom overflow-x-auto">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`flex-shrink-0 px-3 py-2.5 text-[11px] font-body transition-all border-b-2 ${
              tab === tabItem.id
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
            title={t(tabItem.key)}
          >
            <span className="mr-1">{tabItem.icon}</span>
            {t(tabItem.key)}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'boq' && <BOQPanel floorPlan={floorPlan} />}
        {tab === 'cost' && <CostDashboard floorPlan={floorPlan} />}
        {tab === 'compliance' && <CompliancePanel floorPlan={floorPlan} climateZone={floorPlan.climateZone} />}
        {tab === 'timeline' && <TimelineView floorPlan={floorPlan} />}
        {tab === 'green' && <GreenScorePanel floorPlan={floorPlan} />}
        {tab === 'climate' && <ClimatePanel climateZone={floorPlan.climateZone} onSelectZone={setClimate} />}
        {tab === 'sun' && (
          <SunlightOverlay floor={floor} orientation={floorPlan.orientation || 'N'} onOrientationChange={setOrientation} />
        )}
      </div>
    </div>
  );
}
