import { useMemo } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { PortfolioData, FundComparison } from '../../types/portfolio';
import { formatLakhs, formatPct } from '../../lib/formatters';
import { extractFundView } from '../../lib/fundView';

interface FundOnePagerProps {
  data: PortfolioData;
  fundName: string;
  onViewEvolution?: (statusFilter?: string | null) => void;
}

export function FundOnePager({ data, fundName, onViewEvolution }: FundOnePagerProps) {
  const fundData = useMemo(() => extractFundView(data, fundName), [data, fundName]);
  const fund = fundData.funds[fundName];
  if (!fund) return null;

  // Top holdings sorted by value
  const topHoldings = useMemo(() =>
    Object.values(fundData.stocks)
      .filter(s => s.asset_class === 'Equity')
      .sort((a, b) => b.total_market_value_lakhs - a.total_market_value_lakhs)
      .slice(0, 12),
    [fundData.stocks]
  );

  // Top sectors sorted by value
  const topSectors = useMemo(() =>
    Object.entries(fundData.sectors)
      .filter(([name]) => name !== 'Unclassified')
      .sort((a, b) => b[1].total_market_value_lakhs - a[1].total_market_value_lakhs)
      .slice(0, 12),
    [fundData.sectors]
  );

  // Asset allocation from asset_classes
  const assetAlloc = useMemo(() =>
    Object.entries(fundData.asset_classes)
      .sort((a, b) => b[1].total_market_value_lakhs - a[1].total_market_value_lakhs),
    [fundData.asset_classes]
  );

  // Get comparison data for this fund (latest comparison only)
  const comparison: FundComparison | null = useMemo(() => {
    if (!data.comparisons) return null;
    const compKeys = Object.keys(data.comparisons);
    // Use the last comparison (latest two months)
    const latestKey = compKeys[compKeys.length - 1];
    if (!latestKey) return null;
    const comp = data.comparisons[latestKey];
    // Try exact fund name match, or match by normalized name
    return comp.funds[fundName] ?? null;
  }, [data.comparisons, fundName]);

  // Top 5 weight
  const top5Value = topHoldings.slice(0, 5).reduce((s, h) => s + h.total_market_value_lakhs, 0);
  const top5Pct = fundData.liquidity_summary.total_aum_lakhs > 0
    ? (top5Value / fundData.liquidity_summary.total_aum_lakhs * 100) : 0;
  const top10Pct = fundData.concentration.top_10_weight_pct;

  const totalStocks = Object.values(fundData.stocks).filter(s => s.asset_class === 'Equity').length;
  const cashPct = fund.cash_and_equivalents.pct_of_net_assets;

  const allocColors: Record<string, string> = {
    Equity: 'bg-blue-500', Debt: 'bg-amber-500', 'Money Market': 'bg-purple-500',
    TREPS: 'bg-emerald-500', 'Net Receivables/Payables': 'bg-slate-500',
    'Commercial Paper': 'bg-orange-500', 'Treasury Bills': 'bg-teal-500',
    Derivatives: 'bg-red-500', REIT: 'bg-violet-500',
    'Mutual Fund Units': 'bg-cyan-500',
  };

  const sectorColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500',
    'bg-indigo-500', 'bg-pink-500', 'bg-lime-500', 'bg-yellow-500',
  ];

  return (
    <div className="px-6 py-6 space-y-5">
      {/* Fund Header */}
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
        <h2 className="text-xl font-bold text-slate-100 mb-1">{fundName}</h2>
        <p className="text-sm text-slate-400 mb-4">{fund.amc}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800 rounded-lg p-3 text-center border border-slate-700">
            <p className="text-lg font-bold text-blue-400">{formatLakhs(fund.total_aum_lakhs)}</p>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">AUM</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 text-center border border-slate-700">
            <p className="text-lg font-bold text-violet-400">{totalStocks}</p>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Stocks</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 text-center border border-slate-700">
            <p className="text-lg font-bold text-emerald-400">{fund.holding_count}</p>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Holdings</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 text-center border border-slate-700">
            <p className="text-lg font-bold text-amber-400">{formatPct(cashPct)}</p>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Cash</p>
          </div>
        </div>
      </div>

      {/* Monthly Evolution */}
      {comparison && (
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Monthly Evolution
            </h3>
            <span className="text-xs text-slate-500">
              {comparison.prev_period} → {comparison.curr_period}
            </span>
          </div>

          {/* Status counters — clickable to navigate to Portfolio Evolution */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
            {[
              { label: 'TOTAL', filter: null as string | null, value: comparison.total_stocks, color: 'text-slate-100', bg: 'bg-slate-800', border: 'border-slate-600' },
              { label: 'NEW', filter: 'New', value: comparison.counts.new, color: 'text-emerald-400', bg: 'bg-emerald-950', border: 'border-emerald-800' },
              { label: 'EXITS', filter: 'Exit', value: comparison.counts.exit, color: 'text-red-400', bg: 'bg-red-950', border: 'border-red-800' },
              { label: 'INC', filter: 'Inc', value: comparison.counts.inc, color: 'text-blue-400', bg: 'bg-blue-950', border: 'border-blue-800' },
              { label: 'DEC', filter: 'Dec', value: comparison.counts.dec, color: 'text-orange-400', bg: 'bg-orange-950', border: 'border-orange-800' },
              { label: 'HOLD', filter: 'Hold', value: comparison.counts.hold, color: 'text-slate-300', bg: 'bg-slate-800', border: 'border-slate-600' },
            ].map(({ label, filter, value, color, bg, border }) => (
              <button
                key={label}
                onClick={() => onViewEvolution?.(filter)}
                className={`${bg} border ${border} rounded-lg p-2 text-center cursor-pointer hover:brightness-125 transition-all`}
              >
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
              </button>
            ))}
          </div>

          {/* Key changes table — show New entries and Exits */}
          {(comparison.counts.new > 0 || comparison.counts.exit > 0) && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="py-1.5 px-2 text-left text-slate-500 font-medium">Stock</th>
                    <th className="py-1.5 px-2 text-left text-slate-500 font-medium">Sector</th>
                    <th className="py-1.5 px-2 text-left text-slate-500 font-medium">Asset Class</th>
                    <th className="py-1.5 px-2 text-center text-slate-500 font-medium">Status</th>
                    <th className="py-1.5 px-2 text-right text-slate-500 font-medium">Weight %</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.stocks
                    .filter(s => s.status === 'New' || s.status === 'Exit')
                    .sort((a, b) => {
                      if (a.status !== b.status) return a.status === 'New' ? -1 : 1;
                      return Math.abs(b.delta_pct) - Math.abs(a.delta_pct);
                    })
                    .map((stock) => {
                      const isNew = stock.status === 'New';
                      return (
                        <tr key={stock.isin || stock.name} className="border-b border-slate-800 hover:bg-slate-800/40">
                          <td className="py-1.5 px-2 text-slate-300">{stock.name}</td>
                          <td className="py-1.5 px-2 text-slate-500 max-w-[120px] truncate">{stock.sector || '—'}</td>
                          <td className="py-1.5 px-2 text-slate-500 whitespace-nowrap">{stock.asset_class || '—'}</td>
                          <td className="py-1.5 px-2 text-center">
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                              isNew ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                            }`}>
                              {isNew ? 'New' : 'Exit'}
                            </span>
                          </td>
                          <td className={`py-1.5 px-2 text-right font-mono ${isNew ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isNew ? (stock.curr_pct?.toFixed(2) ?? '—') : (stock.prev_pct?.toFixed(2) ?? '—')}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* Top increases and decreases */}
          {(comparison.counts.inc > 0 || comparison.counts.dec > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              {/* Top Increases */}
              <div>
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1.5">Top Increases</p>
                <div className="space-y-1">
                  {comparison.stocks
                    .filter(s => s.status === 'Inc')
                    .sort((a, b) => b.delta_pct - a.delta_pct)
                    .slice(0, 5)
                    .map(s => (
                      <div key={s.isin || s.name} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 truncate flex-1">{s.name}</span>
                        <span className="text-emerald-400 font-mono ml-2 shrink-0 flex items-center gap-0.5">
                          <ArrowUp className="h-3 w-3" />+{s.delta_pct.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
              {/* Top Decreases */}
              <div>
                <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider mb-1.5">Top Decreases</p>
                <div className="space-y-1">
                  {comparison.stocks
                    .filter(s => s.status === 'Dec')
                    .sort((a, b) => a.delta_pct - b.delta_pct)
                    .slice(0, 5)
                    .map(s => (
                      <div key={s.isin || s.name} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 truncate flex-1">{s.name}</span>
                        <span className="text-red-400 font-mono ml-2 shrink-0 flex items-center gap-0.5">
                          <ArrowDown className="h-3 w-3" />{s.delta_pct.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Two-column layout: Top Holdings + Top Sectors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Holdings */}
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Top Holdings</h3>
          <div className="space-y-1.5">
            {topHoldings.map((stock, i) => {
              const pct = fundData.liquidity_summary.total_aum_lakhs > 0
                ? (stock.total_market_value_lakhs / fundData.liquidity_summary.total_aum_lakhs * 100) : 0;
              return (
                <div key={stock.isin || stock.name} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs text-slate-500 w-5 text-right shrink-0">{i + 1}.</span>
                    <span className="text-sm text-slate-200 truncate">{stock.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-400 ml-2 shrink-0">{pct.toFixed(2)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Sectors */}
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Top Sectors</h3>
          <div className="space-y-2">
            {topSectors.map(([name, sector], i) => (
              <div key={name} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${sectorColors[i % sectorColors.length]}`} />
                <span className="text-sm text-slate-300 flex-1 truncate">{name}</span>
                <span className="text-sm font-semibold text-slate-200 shrink-0">{sector.weighted_avg_pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Asset Allocation */}
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Asset Allocation</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {assetAlloc.map(([name, ac]) => (
            <div
              key={name}
              className={`${allocColors[name] || 'bg-gray-600'} rounded-lg px-4 py-2 text-center`}
            >
              <p className="text-xs font-bold text-white">{name}: {ac.weighted_avg_pct.toFixed(1)}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Concentration */}
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Concentration</h3>
        <div className="space-y-3">
          {/* Top 5 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-12 shrink-0">Top 5</span>
            <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full flex items-center justify-end pr-2"
                style={{ width: `${Math.min(top5Pct, 100)}%` }}
              >
                {top5Pct >= 10 && <span className="text-[10px] font-bold text-white">{top5Pct.toFixed(2)}%</span>}
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-200 w-16 text-right">{top5Pct.toFixed(2)}%</span>
          </div>
          {/* Top 10 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-12 shrink-0">Top 10</span>
            <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-violet-600 to-violet-400 h-full rounded-full flex items-center justify-end pr-2"
                style={{ width: `${Math.min(top10Pct, 100)}%` }}
              >
                {top10Pct >= 10 && <span className="text-[10px] font-bold text-white">{top10Pct.toFixed(2)}%</span>}
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-200 w-16 text-right">{top10Pct.toFixed(2)}%</span>
          </div>

          <p className={`text-xs font-medium mt-1 ${
            fundData.concentration.hhi.interpretation === 'Diversified' ? 'text-emerald-400' :
            fundData.concentration.hhi.interpretation === 'Moderate' ? 'text-amber-400' : 'text-red-400'
          }`}>
            {fundData.concentration.hhi.interpretation}
          </p>
        </div>
      </div>

      {/* Fund Info */}
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Fund Info</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs">AUM</p>
            <p className="text-slate-200 font-medium">{formatLakhs(fund.total_aum_lakhs)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Total Holdings</p>
            <p className="text-slate-200 font-medium">{fund.holding_count}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Equity Stocks</p>
            <p className="text-slate-200 font-medium">{totalStocks}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Sectors</p>
            <p className="text-slate-200 font-medium">{Object.keys(fundData.sectors).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
