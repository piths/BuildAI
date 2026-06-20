import { FloorPlan } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Construction timeline / Gantt generator.
// Durations are scaled by building size using realistic small-contractor rates,
// then start weeks are resolved from the dependency graph (topological pass).
// ─────────────────────────────────────────────────────────────────────────────

export interface ConstructionPhase {
  id: string;
  name: string;
  nameSwahili: string;
  startWeek: number;
  durationWeeks: number;
  crew: string;
  dependencies: string[];
  color: string;
  milestoneAtEnd?: string;
}

export interface Timeline {
  phases: ConstructionPhase[];
  totalWeeks: number;
  totalMonths: number;
  peakCrew: number;
}

export function generateTimeline(plan: FloorPlan): Timeline {
  const totalArea = plan.totalAreaSqMeters || plan.floors.reduce((s, f) => s + f.rooms.reduce((a, r) => a + r.widthMeters * r.depthMeters, 0), 0);
  const numFloors = plan.floors.length;
  const isMultiStorey = numFloors > 1;

  const phases: ConstructionPhase[] = [
    { id: 'site_prep', name: 'Site Preparation & Setting Out', nameSwahili: 'Maandalizi ya Eneo', startWeek: 1, durationWeeks: 1, crew: '1 foreman, 2 labourers', dependencies: [], color: '#8B4513' },
    { id: 'excavation', name: 'Excavation', nameSwahili: 'Uchimbaji', startWeek: 0, durationWeeks: Math.ceil(totalArea / 80), crew: '1 machine operator OR 6 labourers', dependencies: ['site_prep'], color: '#D2691E', milestoneAtEnd: 'Foundation inspection by county' },
    { id: 'foundation', name: 'Foundation & Ground Floor Slab', nameSwahili: 'Msingi na Sakafu', startWeek: 0, durationWeeks: Math.ceil(totalArea / 40) + (isMultiStorey ? 1 : 0), crew: '2 masons, 1 plumber, 4 labourers', dependencies: ['excavation'], color: '#696969' },
    { id: 'walling', name: 'Superstructure Walling', nameSwahili: 'Ujenzi wa Kuta', startWeek: 0, durationWeeks: Math.ceil(totalArea / 25) * numFloors, crew: '3 masons, 4 labourers', dependencies: ['foundation'], color: '#CD853F' },
    { id: 'ring_beam', name: 'Ring Beam & Lintels', nameSwahili: 'Boriti na Linteli', startWeek: 0, durationWeeks: Math.ceil(numFloors * 1.5), crew: '2 masons, 1 steel fundi, 3 labourers', dependencies: ['walling'], color: '#A0522D' },
    { id: 'roofing', name: 'Roofing (Timber + Covering)', nameSwahili: 'Kuezeka Paa', startWeek: 0, durationWeeks: Math.ceil(totalArea / 50) + 1, crew: '2 carpenters, 2 labourers', dependencies: ['ring_beam'], color: '#B22222', milestoneAtEnd: "Building is 'under roof' — major milestone" },
    { id: 'plumbing_rough', name: 'Plumbing Rough-In', nameSwahili: 'Mabomba (Awali)', startWeek: 0, durationWeeks: 2, crew: '1 plumber, 1 assistant', dependencies: ['roofing'], color: '#4169E1' },
    { id: 'electrical_rough', name: 'Electrical Rough-In', nameSwahili: 'Umeme (Awali)', startWeek: 0, durationWeeks: 2, crew: '1 electrician, 1 assistant', dependencies: ['roofing'], color: '#FFD700' },
    { id: 'plastering', name: 'Plastering (Internal & External)', nameSwahili: 'Kupiga Plasta', startWeek: 0, durationWeeks: Math.ceil(totalArea / 30), crew: '2 plasterers, 2 labourers', dependencies: ['plumbing_rough', 'electrical_rough'], color: '#DEB887' },
    { id: 'flooring', name: 'Floor Finishes (Tiling/Screeding)', nameSwahili: 'Sakafu (Kumalizia)', startWeek: 0, durationWeeks: Math.ceil(totalArea / 40), crew: '2 tilers, 1 labourer', dependencies: ['plastering'], color: '#D2B48C' },
    { id: 'painting', name: 'Painting (2 coats)', nameSwahili: 'Kupaka Rangi', startWeek: 0, durationWeeks: Math.ceil(totalArea / 50) + 1, crew: '2 painters', dependencies: ['plastering'], color: '#FF69B4' },
    { id: 'doors_windows', name: 'Door & Window Installation', nameSwahili: 'Milango na Madirisha', startWeek: 0, durationWeeks: Math.ceil(totalArea / 60) + 1, crew: '1 carpenter/welder, 1 assistant', dependencies: ['plastering'], color: '#8B0000' },
    { id: 'plumbing_final', name: 'Plumbing Fixtures & Fittings', nameSwahili: 'Mabomba (Kumalizia)', startWeek: 0, durationWeeks: 1, crew: '1 plumber, 1 assistant', dependencies: ['flooring'], color: '#1E90FF' },
    { id: 'electrical_final', name: 'Electrical Fixtures & Fittings', nameSwahili: 'Umeme (Kumalizia)', startWeek: 0, durationWeeks: 1, crew: '1 electrician', dependencies: ['painting'], color: '#FFA500' },
    { id: 'external', name: 'External Works (Driveway, Fence, Landscaping)', nameSwahili: 'Kazi za Nje', startWeek: 0, durationWeeks: 2, crew: '2 masons, 2 labourers', dependencies: ['roofing'], color: '#228B22' },
    { id: 'snag_handover', name: 'Snagging & Handover', nameSwahili: 'Ukaguzi na Kukabidhi', startWeek: 0, durationWeeks: 1, crew: 'Foreman + all trades', dependencies: ['plumbing_final', 'electrical_final', 'doors_windows', 'painting', 'external'], color: '#006400', milestoneAtEnd: 'Certificate of Completion' },
  ];

  // Resolve start weeks from dependencies (memoised).
  const byId = new Map(phases.map((p) => [p.id, p]));
  const startCache = new Map<string, number>();

  function resolveStart(id: string): number {
    if (startCache.has(id)) return startCache.get(id)!;
    const phase = byId.get(id)!;
    let start: number;
    if (phase.dependencies.length === 0) {
      start = phase.startWeek > 0 ? phase.startWeek : 1;
    } else {
      const depEnds = phase.dependencies.map((d) => resolveStart(d) + byId.get(d)!.durationWeeks);
      start = Math.max(...depEnds);
    }
    startCache.set(id, start);
    return start;
  }

  for (const p of phases) {
    p.startWeek = resolveStart(p.id);
  }

  const totalWeeks = Math.max(...phases.map((p) => p.startWeek + p.durationWeeks)) - 1;

  // Peak crew: sum crew sizes of phases overlapping each week.
  let peakCrew = 0;
  for (let w = 1; w <= totalWeeks; w++) {
    let crewThisWeek = 0;
    for (const p of phases) {
      if (w >= p.startWeek && w < p.startWeek + p.durationWeeks) {
        crewThisWeek += crewSize(p.crew);
      }
    }
    peakCrew = Math.max(peakCrew, crewThisWeek);
  }

  return {
    phases,
    totalWeeks,
    totalMonths: Math.round((totalWeeks / 4.33) * 10) / 10,
    peakCrew,
  };
}

/** Parse a crew string like "3 masons, 4 labourers" into an approximate head count. */
function crewSize(crew: string): number {
  const matches = crew.match(/\d+/g);
  if (!matches) return 1;
  return matches.reduce((s, n) => s + parseInt(n, 10), 0);
}
