import { useMemo } from 'react';
import { Wallet, Briefcase } from 'lucide-react';
import type { PortfolioData } from '../../types/portfolio';
import { formatLakhs, formatPct } from '../../lib/formatters';
import { MarketCapCard } from '../cards/MarketCapCard';
import { LiquidityCard } from '../cards/LiquidityCard';
import { AssetClassCard } from '../cards/AssetClassCard';
import { SectorTreemap } from '../charts/SectorTreemap';
import { TopHoldingsBar } from '../charts/TopHoldingsBar';
import { TopHoldingsByCap } from '../charts/TopHoldingsByCap';
import { HighConvictionTable } from '../tables/HighConvictionTable';

interface DashboardGridProps {
  data: PortfolioData;
  allStocks?: Record<string, import('../../types/portfolio').Stock>;
  fundName?: string | null;
  onViewHoldings?: () => void;
  onViewAssetClassHoldings?: (assetClass: string) => void;
}

export function DashboardGrid({ data, allStocks, fundName, onViewHoldings, onViewAssetClassHoldings }: DashboardGridProps) {
  const isSingleFund = !!fundName;
  const fund = fundName ? data.funds[fundName] : null;

  // Equity AUM for market cap card
  const equityAum = useMemo(() =>
    data.asset_classes['Equity']?.total_market_value_lakhs ?? 0,
    [data.asset_classes]
  );

  // Top 5 concentration
  const top5Pct = useMemo(() => {
    const top5Value = Object.values(data.stocks)
      .filter(s => s.asset_class === 'Equity')
      .sort((a, b) => b.total_market_value_lakhs - a.total_market_value_lakhs)
      .slice(0, 5)
      .reduce((s, h) => s + h.total_market_value_lakhs, 0);
    return data.liquidity_summary.total_aum_lakhs > 0
      ? (top5Value / data.liquidity_summary.total_aum_lakhs * 100) : 0;
  }, [data.stocks, data.liquidity_summary.total_aum_lakhs]);

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Fund-specific header with AUM on right */}
      {isSingleFund && fund && (
        <div className="flex items-center justify-between bg-slate-900 rounded-xl border border-slate-700 p-4 shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">{fundName}</h2>
              <p className="text-sm text-slate-400">
                {fund.amc} · {fund.holding_count} holdings · Cash: {formatPct(fund.cash_and_equivalents.pct_of_net_assets)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-400">{formatLakhs(fund.total_aum_lakhs)}</p>
            <p className="text-xs text-slate-500">Fund AUM</p>
          </div>
        </div>
      )}

      {/* All Funds header with AUM */}
      {!isSingleFund && (
        <div className="flex items-center justify-between bg-slate-900 rounded-xl border border-slate-700 p-4 shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">All Funds Combined</h2>
              <p className="text-sm text-slate-400">
                {data.meta.total_schemes} schemes · {data.meta.total_unique_stocks} stocks
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-400">{formatLakhs(data.liquidity_summary.total_aum_lakhs)}</p>
            <p className="text-xs text-slate-500">Total AUM</p>
          </div>
        </div>
      )}

      {/* Row 1: Asset allocation (compact stacked bar + clickable breakdown) */}
      <AssetClassCard assetClasses={data.asset_classes} onSelect={onViewAssetClassHoldings} />

      {/* Row 2: Top Holdings + Sectors + Market Cap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopHoldingsBar stocks={data.stocks} />
        <SectorTreemap sectors={data.sectors} />
        <MarketCapCard stocks={data.stocks} equityAum={equityAum} allStocks={allStocks} />
      </div>

      {/* Row 2b: Top 10 holdings within each market-cap bucket */}
      <TopHoldingsByCap stocks={data.stocks} allStocks={allStocks} />

      {/* Row 3: Holdings Table */}
      <HighConvictionTable
        data={data.concentration.high_conviction}
        stocks={data.stocks}
        allStocks={allStocks}
        title={isSingleFund ? "Fund Holdings" : "High Conviction Stocks"}
        subtitle={isSingleFund ? "All stocks in this fund by weight" : "Stocks appearing in multiple funds"}
      />

      {/* Row 4: Concentration + Liquidity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Concentration */}
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Concentration</h3>
          <div className="space-y-3">
            {/* Top 5 */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-12 shrink-0">Top 5</span>
              <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${Math.min(top5Pct, 100)}%` }}
                >
                  {top5Pct >= 10 && <span className="text-[10px] font-bold text-white">{top5Pct.toFixed(1)}%</span>}
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-200 w-14 text-right">{top5Pct.toFixed(1)}%</span>
            </div>
            {/* Top 10 */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-12 shrink-0">Top 10</span>
              <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-600 to-violet-400 h-full rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${Math.min(data.concentration.top_10_weight_pct, 100)}%` }}
                >
                  {data.concentration.top_10_weight_pct >= 10 && <span className="text-[10px] font-bold text-white">{data.concentration.top_10_weight_pct.toFixed(1)}%</span>}
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-200 w-14 text-right">{data.concentration.top_10_weight_pct.toFixed(1)}%</span>
            </div>
            <p className={`text-xs font-medium mt-1 ${
              data.concentration.hhi.interpretation === 'Diversified' ? 'text-emerald-400' :
              data.concentration.hhi.interpretation === 'Moderate' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {data.concentration.hhi.interpretation}
            </p>
          </div>
        </div>

        <LiquidityCard funds={data.funds} summary={data.liquidity_summary} />
      </div>

    </div>
  );
}
