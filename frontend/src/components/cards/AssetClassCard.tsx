import { Layers } from 'lucide-react';
import type { AssetClass } from '../../types/portfolio';
import { formatLakhs } from '../../lib/formatters';

interface AssetClassCardProps {
  assetClasses: Record<string, AssetClass>;
  onSelect?: (name: string) => void;
}

const ALLOC_COLORS: Record<string, string> = {
  Equity: 'bg-blue-500', Debt: 'bg-amber-500', 'Money Market': 'bg-purple-500',
  TREPS: 'bg-emerald-500', 'Net Receivables/Payables': 'bg-slate-500',
  'Commercial Paper': 'bg-orange-500', 'Treasury Bills': 'bg-teal-500',
  Derivatives: 'bg-red-500', REIT: 'bg-violet-500',
  'Mutual Fund Units': 'bg-cyan-500', Commodities: 'bg-yellow-500',
  Cash: 'bg-slate-400', 'Government Securities': 'bg-amber-600',
};

export function AssetClassCard({ assetClasses, onSelect }: AssetClassCardProps) {
  const entries = Object.entries(assetClasses)
    .filter(([, d]) => Math.abs(d.total_market_value_lakhs) > 0)
    .sort((a, b) => b[1].total_market_value_lakhs - a[1].total_market_value_lakhs);

  if (entries.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20 flex items-center justify-center h-32">
        <p className="text-slate-500">No asset class data available</p>
      </div>
    );
  }

  // Stacked bar uses positive weights only (Net Receivables can be negative).
  const barTotal = entries.reduce((s, [, d]) => s + Math.max(d.weighted_avg_pct, 0), 0) || 100;

  // Always label the top 2 asset classes inside the bar (with name + %).
  const top2 = new Set(entries.slice(0, 2).map(([name]) => name));

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-200">Asset Allocation</h3>
        </div>
        <span className="text-xs text-slate-500">by weight</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-8 rounded-lg overflow-hidden mb-4 bg-slate-800">
        {entries.map(([name, ac]) => {
          const w = Math.max(ac.weighted_avg_pct, 0);
          if (w <= 0) return null;
          return (
            <div
              key={name}
              className={`${ALLOC_COLORS[name] || 'bg-gray-500'} flex items-center justify-center transition-all overflow-hidden`}
              style={{ width: `${(w / barTotal) * 100}%` }}
              title={`${name}: ${ac.weighted_avg_pct.toFixed(2)}%`}
            >
              {top2.has(name) ? (
                <span className="text-[11px] font-bold text-white whitespace-nowrap px-1">
                  {name} {w.toFixed(1)}%
                </span>
              ) : w / barTotal >= 0.08 ? (
                <span className="text-[11px] font-bold text-white">{w.toFixed(1)}%</span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Breakdown rows (clickable to drill into the asset class) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        {entries.map(([name, ac]) => (
          <button
            key={name}
            onClick={() => onSelect?.(name)}
            disabled={!onSelect}
            className={`flex items-center gap-2 py-1 text-left ${onSelect ? 'hover:bg-slate-800/60 rounded-md px-1 -mx-1 cursor-pointer' : 'cursor-default'}`}
          >
            <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${ALLOC_COLORS[name] || 'bg-gray-500'}`} />
            <span className="text-sm text-slate-300 flex-1 truncate">{name}</span>
            <span className="text-xs text-slate-500 shrink-0">{ac.holding_count}</span>
            <span className="text-xs text-slate-500 shrink-0 w-20 text-right">{formatLakhs(ac.total_market_value_lakhs)}</span>
            <span className="text-sm font-semibold text-slate-200 shrink-0 w-14 text-right">{ac.weighted_avg_pct.toFixed(1)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
