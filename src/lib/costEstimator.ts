import { FloorPlan, Room } from './types';
import { generateBOQ, downloadBoqCsvReport, BOQReport } from './boqEngine';
import { COST_BENCHMARKS, KENYAN_RATES } from './constants';

// ─────────────────────────────────────────────────────────────────────────────
// Cost estimation — dashboard-friendly summary derived from the professional
// elemental BOQ engine (single source of truth).
// ─────────────────────────────────────────────────────────────────────────────

export interface TradeCost {
  id: string;
  name: string;
  amount: number;
  percent: number;
  color: string;
}

export interface RoomCost {
  roomId: string;
  roomName: string;
  floorName: string;
  areaSqM: number;
  finishingCost: number;
}

export type CostBand = 'low' | 'medium' | 'high' | 'above_premium';

export interface CostSummary {
  report: BOQReport;
  total: number;
  costPerSqMeter: number;
  tradeCosts: TradeCost[];
  roomCosts: RoomCost[];
  band: CostBand;
  bandLabel: string;
  benchmarks: typeof COST_BENCHMARKS;
}

const ELEMENT_COLORS = ['#6b7280', '#f59e0b', '#ef4444', '#8b0000', '#7c3aed', '#3b82f6', '#fbbf24', '#10b981', '#64748b'];

function classifyBand(costPerSqM: number): { band: CostBand; label: string } {
  if (costPerSqM <= COST_BENCHMARKS.low) return { band: 'low', label: 'Basic finish' };
  if (costPerSqM <= COST_BENCHMARKS.medium) return { band: 'medium', label: 'Standard finish' };
  if (costPerSqM <= COST_BENCHMARKS.high) return { band: 'high', label: 'Premium finish' };
  return { band: 'above_premium', label: 'Above premium' };
}

function roomFinishingCost(room: Room): number {
  const area = room.widthMeters * room.depthMeters;
  const perimeter = 2 * (room.widthMeters + room.depthMeters);
  const wallArea = perimeter * 2.7;

  let floorRate = KENYAN_RATES.ceramic_tiles_per_m2;
  const finish = room.floorFinish;
  if (finish === 'porcelain_tile') floorRate = KENYAN_RATES.porcelain_tiles_per_m2;
  else if (finish === 'terrazzo') floorRate = KENYAN_RATES.terrazzo_per_m2;
  else if (finish === 'concrete') floorRate = 600;
  else if (['living_room', 'dining_room', 'reception'].includes(room.type)) floorRate = KENYAN_RATES.porcelain_tiles_per_m2;

  const floorCost = area * floorRate * 1.1;
  const plasterPaintCost = wallArea * (350 + (KENYAN_RATES.paint_per_litre * 2) / 9);
  const ceilingCost = area * KENYAN_RATES.ceiling_board_per_m2;
  return Math.round(floorCost + plasterPaintCost + ceilingCost);
}

export function estimateCost(plan: FloorPlan, region?: string): CostSummary {
  const report = generateBOQ(plan, { region });
  const g = report.grandSummary;

  const tradeCosts: TradeCost[] = report.elements.map((el, i) => ({
    id: `el${el.elementNumber}`,
    name: el.elementName,
    amount: el.subtotal,
    percent: g.subtotalBeforeContingency > 0 ? (el.subtotal / g.subtotalBeforeContingency) * 100 : 0,
    color: ELEMENT_COLORS[el.elementNumber - 1] || '#94a3b8',
  }));

  const roomCosts: RoomCost[] = [];
  for (const floor of plan.floors) {
    for (const room of floor.rooms) {
      roomCosts.push({
        roomId: room.id,
        roomName: room.name,
        floorName: floor.floorName,
        areaSqM: room.widthMeters * room.depthMeters,
        finishingCost: roomFinishingCost(room),
      });
    }
  }
  roomCosts.sort((a, b) => b.finishingCost - a.finishingCost);

  const { band, label } = classifyBand(g.costPerSqMeterInclVAT);

  return {
    report,
    total: g.grandTotal,
    costPerSqMeter: g.costPerSqMeterInclVAT,
    tradeCosts,
    roomCosts,
    band,
    bandLabel: label,
    benchmarks: COST_BENCHMARKS,
  };
}

export function formatKES(amount: number): string {
  return 'KES ' + Math.round(amount).toLocaleString('en-KE');
}

export function formatKESShort(amount: number): string {
  if (amount >= 1_000_000) return `KES ${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `KES ${(amount / 1_000).toFixed(0)}K`;
  return `KES ${Math.round(amount)}`;
}

/** Back-compat CSV export — delegates to the elemental BOQ engine. */
export function downloadBoqCsv(plan: FloorPlan, region?: string): void {
  downloadBoqCsvReport(generateBOQ(plan, { region }));
}
