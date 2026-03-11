import type { PortfolioData, Stock, Sector, AssetClass, Concentration, LiquiditySummary, HighConviction } from '../types/portfolio';
import { calculateHHI, interpretHHI } from './calculations';

/**
 * Extract a per-fund view from the consolidated data.
 * Filters stocks/sectors to only those held by the selected fund.
 */
export function extractFundView(data: PortfolioData, fundName: string): PortfolioData {
  const fund = data.funds[fundName];
  if (!fund) return data;

  // Filter stocks to only those in this fund
  const fundStocks: Record<string, Stock> = {};
  for (const [key, stock] of Object.entries(data.stocks)) {
    const fundHoldings = stock.funds.filter(f => f.scheme_name === fundName);
    if (fundHoldings.length > 0) {
      fundStocks[key] = {
        ...stock,
        total_market_value_lakhs: fundHoldings.reduce((sum, f) => sum + f.market_value_lakhs, 0),
        weighted_avg_pct: fundHoldings.reduce((sum, f) => sum + f.pct_of_net_assets, 0) / fundHoldings.length,
        fund_count: 1,
        funds: fundHoldings,
      };
    }
  }

  // Build sectors from filtered stocks
  const sectors: Record<string, Sector> = {};
  const totalValue = Object.values(fundStocks).reduce((s, st) => s + st.total_market_value_lakhs, 0);
  for (const stock of Object.values(fundStocks)) {
    const sec = stock.sector || 'Unclassified';
    if (!sectors[sec]) {
      sectors[sec] = { total_market_value_lakhs: 0, stock_count: 0, weighted_avg_pct: 0 };
    }
    sectors[sec].total_market_value_lakhs += stock.total_market_value_lakhs;
    sectors[sec].stock_count += 1;
  }
  const fundAum = fund.total_aum_lakhs || totalValue;
  for (const sec of Object.values(sectors)) {
    sec.total_market_value_lakhs = Math.round(sec.total_market_value_lakhs * 100) / 100;
    sec.weighted_avg_pct = fundAum > 0
      ? Math.round((sec.total_market_value_lakhs / fundAum) * 10000) / 100
      : 0;
  }

  // Build asset classes from filtered stocks
  const assetClasses: Record<string, AssetClass> = {};
  for (const stock of Object.values(fundStocks)) {
    const ac = stock.asset_class || 'Equity';
    if (!assetClasses[ac]) {
      assetClasses[ac] = { total_market_value_lakhs: 0, holding_count: 0, weighted_avg_pct: 0 };
    }
    assetClasses[ac].total_market_value_lakhs += stock.total_market_value_lakhs;
    assetClasses[ac].holding_count += 1;
  }
  for (const ac of Object.values(assetClasses)) {
    ac.total_market_value_lakhs = Math.round(ac.total_market_value_lakhs * 100) / 100;
    ac.weighted_avg_pct = fundAum > 0
      ? Math.round((ac.total_market_value_lakhs / fundAum) * 10000) / 100
      : 0;
  }

  // Compute HHI for this fund
  const stockWeights = Object.values(fundStocks).map(s =>
    fundAum > 0 ? s.total_market_value_lakhs / fundAum : 0
  );
  const sectorWeights = Object.values(sectors).map(s =>
    fundAum > 0 ? s.total_market_value_lakhs / fundAum : 0
  );
  const stockHHI = calculateHHI(stockWeights);
  const sectorHHI = calculateHHI(sectorWeights);

  // Top 10 weight
  const sortedStocks = Object.values(fundStocks).sort((a, b) => b.total_market_value_lakhs - a.total_market_value_lakhs);
  const top10Value = sortedStocks.slice(0, 10).reduce((s, st) => s + st.total_market_value_lakhs, 0);
  const top10Weight = fundAum > 0 ? (top10Value / fundAum) * 100 : 0;

  // High conviction — for a single fund, show top holdings by weight
  const highConviction: HighConviction[] = sortedStocks.slice(0, 20).map(s => ({
    isin: s.isin,
    name: s.name,
    fund_count: 1,
    total_funds: 1,
    appearance_pct: 100,
    avg_weight_pct: s.weighted_avg_pct,
    total_market_value_lakhs: s.total_market_value_lakhs,
    sector: s.sector,
    asset_class: s.asset_class,
  }));

  const concentration: Concentration = {
    hhi: {
      by_stock: Math.round(stockHHI * 10000) / 10000,
      by_sector: Math.round(sectorHHI * 10000) / 10000,
      interpretation: interpretHHI(stockHHI),
    },
    top_10_weight_pct: Math.round(top10Weight * 100) / 100,
    high_conviction: highConviction,
  };

  const cash = fund.cash_and_equivalents;
  const liquidity: LiquiditySummary = {
    total_cash_lakhs: cash.total_lakhs,
    total_aum_lakhs: fundAum,
    cash_pct: cash.pct_of_net_assets,
  };

  return {
    meta: {
      ...data.meta,
      total_schemes: 1,
      total_unique_stocks: Object.keys(fundStocks).length,
    },
    stocks: fundStocks,
    sectors,
    asset_classes: assetClasses,
    funds: { [fundName]: fund },
    concentration,
    liquidity_summary: liquidity,
  };
}
