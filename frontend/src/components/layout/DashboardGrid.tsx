import {
  Wallet,
  Building2,
  BarChart3,
  Layers,
  Briefcase,
} from 'lucide-react';
import type { PortfolioData } from '../../types/portfolio';
import { formatLakhs, formatNumber, formatPct } from '../../lib/formatters';
import { SummaryCard } from '../cards/SummaryCard';
import { HHICard } from '../cards/HHICard';
import { LiquidityCard } from '../cards/LiquidityCard';
import { AssetClassCard } from '../cards/AssetClassCard';
import { SectorTreemap } from '../charts/SectorTreemap';
import { TopHoldingsBar } from '../charts/TopHoldingsBar';
import { HighConvictionTable } from '../tables/HighConvictionTable';

interface DashboardGridProps {
  data: PortfolioData;
  fundName?: string | null;
  onViewHoldings?: () => void;
}

export function DashboardGrid({ data, fundName, onViewHoldings }: DashboardGridProps) {
  const isSingleFund = !!fundName;
  const fund = fundName ? data.funds[fundName] : null;

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Fund-specific header */}
      {isSingleFund && fund && (
        <div className="flex items-center gap-3 bg-slate-900 rounded-xl border border-slate-700 p-4 shadow-lg shadow-black/20">
          <Briefcase className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-100">{fundName}</h2>
            <p className="text-sm text-slate-400">
              {fund.amc} · {fund.holding_count} holdings · Cash: {formatPct(fund.cash_and_equivalents.pct_of_net_assets)}
            </p>
          </div>
        </div>
      )}

      {/* Row 1: Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title={isSingleFund ? "Fund AUM" : "Total AUM"}
          value={formatLakhs(data.liquidity_summary.total_aum_lakhs)}
          subtitle={isSingleFund ? fund?.amc : `Across ${data.meta.total_schemes} schemes`}
          icon={<Wallet className="h-6 w-6 text-blue-600" />}
        />
        <div onClick={onViewHoldings} className={onViewHoldings ? 'cursor-pointer' : ''}>
          <SummaryCard
            title="Unique Stocks"
            value={formatNumber(data.meta.total_unique_stocks)}
            subtitle={isSingleFund ? "In this fund · Click to view all" : "Click to view all stocks"}
            icon={<BarChart3 className="h-6 w-6 text-violet-600" />}
            color="text-violet-600"
          />
        </div>
        <SummaryCard
          title="Top 10 Weight"
          value={formatPct(data.concentration.top_10_weight_pct)}
          subtitle="Concentration in top holdings"
          icon={<Building2 className="h-6 w-6 text-emerald-600" />}
          color="text-emerald-600"
        />
        <SummaryCard
          title="Sectors Covered"
          value={formatNumber(Object.keys(data.sectors).length)}
          subtitle="Industry classifications"
          icon={<Layers className="h-6 w-6 text-amber-600" />}
          color="text-amber-600"
        />
      </div>

      {/* Row 2: Asset Class + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AssetClassCard assetClasses={data.asset_classes} />
        <SectorTreemap sectors={data.sectors} />
        <TopHoldingsBar stocks={data.stocks} />
      </div>

      {/* Row 3: Holdings Table */}
      <HighConvictionTable
        data={data.concentration.high_conviction}
        stocks={data.stocks}
        title={isSingleFund ? "Fund Holdings" : "High Conviction Stocks"}
        subtitle={isSingleFund ? "All stocks in this fund by weight" : "Stocks appearing in multiple funds"}
      />

      {/* Row 4: HHI + Liquidity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HHICard concentration={data.concentration} />
        <LiquidityCard funds={data.funds} summary={data.liquidity_summary} />
      </div>

    </div>
  );
}
