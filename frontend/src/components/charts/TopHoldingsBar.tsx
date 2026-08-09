import { TrendingUp } from 'lucide-react';
import type { Stock } from '../../types/portfolio';

interface TopHoldingsBarProps {
  stocks: Record<string, Stock>;
}

// Pure liquidity buckets — not investment holdings, so excluded from "Top Holdings"
// (otherwise e.g. TREPS / "Clearing Corporation of India" dominates the list).
const NON_HOLDING_CLASSES = new Set(['TREPS', 'Net Receivables/Payables', 'Cash']);

export function TopHoldingsBar({ stocks }: TopHoldingsBarProps) {
  const top12 = Object.values(stocks)
    .filter(s => !NON_HOLDING_CLASSES.has(s.asset_class))
    .sort((a, b) => b.total_market_value_lakhs - a.total_market_value_lakhs)
    .slice(0, 12);

  if (top12.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20 flex items-center justify-center h-80">
        <p className="text-slate-500">No holdings data available</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-slate-200">Top Holdings</h3>
      </div>
      <div className="space-y-1.5">
        {top12.map((stock, i) => (
          <div key={stock.isin || stock.name} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-xs text-slate-500 w-5 text-right shrink-0">{i + 1}.</span>
              <span className="text-sm text-slate-200 truncate">{stock.name}</span>
            </div>
            <span className="text-sm font-semibold text-blue-400 ml-2 shrink-0">{stock.weighted_avg_pct.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
