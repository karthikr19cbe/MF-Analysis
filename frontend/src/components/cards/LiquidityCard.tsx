import { Droplets } from 'lucide-react';
import { formatLakhs, formatPct } from '../../lib/formatters';
import type { Fund, LiquiditySummary } from '../../types/portfolio';

interface LiquidityCardProps {
  funds: Record<string, Fund>;
  summary: LiquiditySummary;
}

export function LiquidityCard({ funds, summary }: LiquidityCardProps) {
  const fundEntries = Object.entries(funds)
    .filter(([, f]) => f.cash_and_equivalents.total_lakhs > 0)
    .sort((a, b) => b[1].cash_and_equivalents.pct_of_net_assets - a[1].cash_and_equivalents.pct_of_net_assets);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 mb-4">
        <Droplets className="h-5 w-5 text-cyan-400" />
        <h3 className="font-semibold text-slate-200">Liquidity Tracker</h3>
      </div>

      {/* Summary */}
      <div className="bg-cyan-950 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-cyan-400 font-medium">Total Cash</p>
            <p className="text-lg font-bold text-cyan-300">{formatLakhs(summary.total_cash_lakhs)}</p>
          </div>
          <div>
            <p className="text-xs text-cyan-400 font-medium">Total AUM</p>
            <p className="text-lg font-bold text-cyan-300">{formatLakhs(summary.total_aum_lakhs)}</p>
          </div>
          <div>
            <p className="text-xs text-cyan-400 font-medium">Cash %</p>
            <p className="text-lg font-bold text-cyan-300">{formatPct(summary.cash_pct)}</p>
          </div>
        </div>
      </div>

      {/* Per-fund breakdown */}
      {fundEntries.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {fundEntries.map(([name, fund]) => (
            <div key={name} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 truncate" title={name}>{name}</p>
                <p className="text-xs text-slate-500">{fund.amc}</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-sm font-medium text-slate-200">
                  {formatLakhs(fund.cash_and_equivalents.total_lakhs)}
                </p>
                <p className="text-xs text-slate-400">
                  {formatPct(fund.cash_and_equivalents.pct_of_net_assets)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {fundEntries.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">No liquidity data available</p>
      )}
    </div>
  );
}
