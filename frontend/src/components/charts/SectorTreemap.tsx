import { PieChart } from 'lucide-react';
import type { Sector } from '../../types/portfolio';

interface SectorTreemapProps {
  sectors: Record<string, Sector>;
}

const COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500',
  'bg-indigo-500', 'bg-pink-500', 'bg-lime-500', 'bg-yellow-500',
];

export function SectorTreemap({ sectors }: SectorTreemapProps) {
  const allSectors = Object.entries(sectors)
    .filter(([name, s]) => name !== 'Unclassified' && s.total_market_value_lakhs > 0)
    .sort((a, b) => b[1].total_market_value_lakhs - a[1].total_market_value_lakhs)
    .slice(0, 12);

  if (allSectors.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20 flex items-center justify-center h-80">
        <p className="text-slate-500">No sector data available</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="h-5 w-5 text-violet-600" />
        <h3 className="font-semibold text-slate-200">Top Sectors</h3>
      </div>
      <div className="space-y-2">
        {allSectors.map(([name, sector], i) => (
          <div key={name} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${COLORS[i % COLORS.length]}`} />
            <span className="text-sm text-slate-300 flex-1 truncate">{name}</span>
            <span className="text-sm font-semibold text-slate-200 shrink-0">{sector.weighted_avg_pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
