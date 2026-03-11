import { Target } from 'lucide-react';
import type { Concentration } from '../../types/portfolio';
import { getHHIBgColor } from '../../lib/formatters';

interface HHICardProps {
  concentration: Concentration;
}

export function HHICard({ concentration }: HHICardProps) {
  const { hhi } = concentration;

  const stockPct = Math.min(hhi.by_stock * 100, 100);
  const sectorPct = Math.min(hhi.by_sector * 100, 100);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-slate-400" />
        <h3 className="font-semibold text-slate-200">Concentration Risk (HHI)</h3>
        <span className={`ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full ${getHHIBgColor(hhi.interpretation)}`}>
          {hhi.interpretation}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">Stock-level HHI</span>
            <span className="font-mono font-medium text-slate-200">{hhi.by_stock.toFixed(4)}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 rounded-full transition-all"
              style={{ width: `${stockPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">Sector-level HHI</span>
            <span className="font-mono font-medium text-slate-200">{hhi.by_sector.toFixed(4)}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 rounded-full transition-all"
              style={{ width: `${sectorPct}%` }}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Top 10 Holdings Weight</span>
            <span className="font-semibold text-slate-200">{concentration.top_10_weight_pct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          &lt;0.15 Diversified
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          0.15–0.25 Moderate
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          &gt;0.25 Concentrated
        </div>
      </div>
    </div>
  );
}
