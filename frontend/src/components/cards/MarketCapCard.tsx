import { useMemo } from 'react';
import { PieChart } from 'lucide-react';
import type { Stock } from '../../types/portfolio';
import { computeMarketCapBreakdown, type MarketCapCategory } from '../../lib/marketCapClassifier';
import { formatLakhs } from '../../lib/formatters';

interface MarketCapCardProps {
  stocks: Record<string, Stock>;
  equityAum: number;
  allStocks?: Record<string, Stock>;
}

const CAP_COLORS: Record<MarketCapCategory, { bar: string; text: string; bg: string }> = {
  'Large Cap': { bar: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-950' },
  'Mid Cap': { bar: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-950' },
  'Small Cap': { bar: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-950' },
};

export function MarketCapCard({ stocks, equityAum, allStocks }: MarketCapCardProps) {
  const breakdown = useMemo(
    () => computeMarketCapBreakdown(stocks, equityAum, allStocks),
    [stocks, equityAum, allStocks]
  );

  if (breakdown.length === 0) return null;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-200">Market Cap Concentration</h3>
        </div>
        <span className="text-xs text-slate-500">Equity only</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-8 rounded-lg overflow-hidden mb-4">
        {breakdown.map(b => {
          const colors = CAP_COLORS[b.category];
          return (
            <div
              key={b.category}
              className={`${colors.bar} flex items-center justify-center transition-all`}
              style={{ width: `${b.weight_pct}%` }}
              title={`${b.category}: ${b.weight_pct.toFixed(1)}%`}
            >
              {b.weight_pct >= 8 && (
                <span className="text-[11px] font-bold text-white">
                  {b.weight_pct.toFixed(1)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Breakdown rows */}
      <div className="space-y-3">
        {breakdown.map(b => {
          const colors = CAP_COLORS[b.category];
          return (
            <div key={b.category}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-sm ${colors.bar}`} />
                  <span className="text-sm text-slate-300">{b.category}</span>
                  <span className="text-xs text-slate-500">{b.holding_count} stocks</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{formatLakhs(b.total_market_value_lakhs)}</span>
                  <span className={`text-sm font-semibold ${colors.text}`}>{b.weight_pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className={`${colors.bar} h-1.5 rounded-full transition-all`}
                  style={{ width: `${b.weight_pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
