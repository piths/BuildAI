import { FloorPlan, Room } from './types';
import { BillOfQuantities, calculateBOQ } from './boqCalculator';
import { COST_BENCHMARKS, KENYAN_RATES } from './constants';

// ─────────────────────────────────────────────────────────────────────────────
// Cost estimation — turns the BOQ into a dashboard-friendly summary.
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
  boq: BillOfQuantities;
  total: number;
  costPerSqMeter: number;
  tradeCosts: TradeCost[];
  roomCosts: RoomCost[];
  band: CostBand;
  bandLabel: string;
  benchmarks: typeof COST_BENCHMARKS;
}

const TRADE_COLORS: Record<string, string> = {
  substructure: '#6b7280',
  walling: '#f59e0b',
  openings: '#8b0000',
  roofing: '#ef4444',
  finishes: '#7c3aed',
  plumbing: '#3b82f6',
  electrical: '#fbbf24',
  external: '#10b981',
};

function classifyBand(costPerSqM: number): { band: CostBand; label: string } {
  if (costPerSqM <= COST_BENCHMARKS.low) return { band: 'low', label: 'Basic finish' };
  if (costPerSqM <= COST_BENCHMARKS.medium) return { band: 'medium', label: 'Standard finish' };
  if (costPerSqM <= COST_BENCHMARKS.high) return { band: 'high', label: 'Premium finish' };
  return { band: 'above_premium', label: 'Above premium' };
}

/** Rough per-room finishing cost: floor finish + wall plaster/paint + ceiling. */
function roomFinishingCost(room: Room): number {
  const area = room.widthMeters * room.depthMeters;
  const perimeter = 2 * (room.widthMeters + room.depthMeters);
  const wallArea = perimeter * 2.7; // approx wall height

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

export function estimateCost(plan: FloorPlan): CostSummary {
  const boq = calculateBOQ(plan);

  const tradeCosts: TradeCost[] = boq.trades.map((t) => ({
    id: t.id,
    name: t.name,
    amount: t.subtotal,
    percent: boq.subtotal > 0 ? (t.subtotal / boq.subtotal) * 100 : 0,
    color: TRADE_COLORS[t.id] || '#94a3b8',
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

  const { band, label } = classifyBand(boq.costPerSqMeter);

  return {
    boq,
    total: boq.total,
    costPerSqMeter: boq.costPerSqMeter,
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

/** Export the BOQ as a CSV file (opens in Excel / Google Sheets). */
export function downloadBoqCsv(plan: FloorPlan): void {
  const boq = calculateBOQ(plan);
  const rows: string[][] = [['Trade', 'Description', 'Quantity', 'Unit', 'Rate (KES)', 'Amount (KES)']];
  for (const trade of boq.trades) {
    for (const it of trade.items) {
      rows.push([trade.name, it.description, String(it.quantity), it.unit, String(it.rate), String(it.amount)]);
    }
    rows.push([trade.name, 'SUBTOTAL', '', '', '', String(trade.subtotal)]);
  }
  rows.push(['', 'Subtotal', '', '', '', String(boq.subtotal)]);
  rows.push(['', 'Contingency (10%)', '', '', '', String(boq.contingency)]);
  rows.push(['', 'VAT (16%)', '', '', '', String(boq.vat)]);
  rows.push(['', 'GRAND TOTAL', '', '', '', String(boq.total)]);

  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(plan.buildingName || 'BuildAI').replace(/\s+/g, '_')}_BOQ.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
