'use client';

import { ClimateZoneId } from '@/lib/types';
import { CLIMATE_ZONE_LIST, CLIMATE_ZONES } from '@/lib/climateZones';
import { useLanguage } from '@/lib/i18n';

export default function ClimatePanel({
  climateZone,
  onSelectZone,
}: {
  climateZone?: ClimateZoneId;
  onSelectZone: (id: ClimateZoneId) => void;
}) {
  const { t, lang } = useLanguage();
  const zone = climateZone ? CLIMATE_ZONES[climateZone] : null;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-accent-primary text-sm tracking-wide">{t('climate')}</h3>

      <div>
        <p className="text-text-secondary text-xs font-body mb-2">{t('selectClimate')}</p>
        <div className="grid grid-cols-1 gap-1.5">
          {CLIMATE_ZONE_LIST.map((z) => (
            <button
              key={z.id}
              onClick={() => onSelectZone(z.id)}
              className={`text-left px-3 py-2 rounded-lg border transition-all ${
                climateZone === z.id
                  ? 'bg-accent-primary/10 border-accent-primary/50'
                  : 'bg-bg-card/40 border-border-custom hover:border-accent-primary/30'
              }`}
            >
              <p className="text-text-primary font-body text-xs">{lang === 'sw' ? z.nameSwahili : z.name}</p>
              <p className="text-text-secondary/60 text-[10px] font-body truncate">{z.counties.slice(0, 4).join(', ')}…</p>
            </button>
          ))}
        </div>
      </div>

      {zone && (
        <div className="space-y-3">
          <div className="bg-bg-card/40 border border-border-custom rounded-lg p-3">
            <p className="text-accent-primary font-display text-sm mb-2">{lang === 'sw' ? zone.nameSwahili : zone.name}</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <Info label="Temp" value={`${zone.avgTemp.min}–${zone.avgTemp.max}°C`} />
              <Info label="Rainfall" value={zone.rainfall.replace(/_/g, ' ')} />
              <Info label="Humidity" value={zone.humidity.replace(/_/g, ' ')} />
              <Info label="Wall" value={`${zone.recommendations.wallThickness}mm`} />
              <Info label="Roof pitch" value={`${zone.recommendations.roofPitch}°`} />
              <Info label="Windows" value={zone.recommendations.windowSize.replace(/_/g, ' ')} />
            </div>
          </div>

          <div className="bg-bg-card/40 border border-border-custom rounded-lg p-3 space-y-2">
            <Rec label="Ventilation" value={zone.recommendations.ventilation.replace(/_/g, ' ')} />
            <Rec label="Insulation" value={zone.recommendations.insulation.replace(/_/g, ' ')} />
            <Rec label="Roofing" value={zone.recommendations.roofMaterial.replace(/_/g, ' ')} />
            <Rec label="Orientation" value={zone.recommendations.orientation} />
          </div>

          <div className="bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 border border-accent-primary/30 rounded-lg p-3">
            <p className="text-accent-primary text-[10px] font-mono uppercase mb-1">Design Notes</p>
            <p className="text-text-secondary text-[11px] font-body leading-relaxed">{zone.recommendations.specialNotes}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-text-secondary/50">{label}: </span>
      <span className="text-text-primary capitalize">{value}</span>
    </div>
  );
}

function Rec({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[11px]">
      <span className="text-text-secondary/60 font-mono uppercase text-[9px]">{label}</span>
      <p className="text-text-primary font-body capitalize">{value}</p>
    </div>
  );
}
