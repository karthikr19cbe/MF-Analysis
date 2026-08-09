import type { Stock } from '../types/portfolio';

export type MarketCapCategory = 'Large Cap' | 'Mid Cap' | 'Small Cap';

export interface MarketCapBreakdown {
  category: MarketCapCategory;
  total_market_value_lakhs: number;
  holding_count: number;
  weight_pct: number;
}

// Patterns to identify index funds by market cap category
const LARGE_CAP_PATTERNS = [/nifty\s*100/i, /nifty\s*50/i, /sensex/i, /large\s*cap/i, /bluechip/i];
const MID_CAP_PATTERNS = [/mid\s*cap/i, /midcap/i, /nifty\s*midcap/i, /nifty\s*next/i];
const SMALL_CAP_PATTERNS = [/small\s*cap/i, /smallcap/i, /nifty\s*smallcap/i, /micro\s*cap/i];

function classifyFund(fundName: string): MarketCapCategory | null {
  for (const p of LARGE_CAP_PATTERNS) if (p.test(fundName)) return 'Large Cap';
  for (const p of MID_CAP_PATTERNS) if (p.test(fundName)) return 'Mid Cap';
  for (const p of SMALL_CAP_PATTERNS) if (p.test(fundName)) return 'Small Cap';
  return null;
}

/**
 * Build market cap classification from index fund holdings.
 * Stocks in Nifty 100 index funds → Large Cap
 * Stocks in Midcap index funds → Mid Cap
 * Stocks in Smallcap index funds → Small Cap
 * Everything else → Small Cap (default for unknown equity)
 */
export function buildMarketCapMap(stocks: Record<string, Stock>): Map<string, MarketCapCategory> {
  const isinToCategory = new Map<string, MarketCapCategory>();

  // First pass (authoritative): use the persisted classification stamped by the
  // backend across ALL periods. This survives a single index fund being absent
  // from the current month.
  for (const stock of Object.values(stocks)) {
    if (!stock.isin || stock.asset_class !== 'Equity') continue;
    if (stock.market_cap) {
      isinToCategory.set(stock.isin, stock.market_cap);
    }
  }

  // Fallback pass: classify any still-unclassified ISINs from index-fund
  // membership in the current data (covers older data without a persisted map).
  for (const stock of Object.values(stocks)) {
    if (!stock.isin || stock.asset_class !== 'Equity') continue;
    if (isinToCategory.has(stock.isin)) continue;
    for (const fh of stock.funds) {
      const category = classifyFund(fh.scheme_name);
      if (category) {
        // Higher priority: Large > Mid > Small
        const existing = isinToCategory.get(stock.isin);
        if (!existing || (category === 'Large Cap') ||
            (category === 'Mid Cap' && existing === 'Small Cap')) {
          isinToCategory.set(stock.isin, category);
        }
      }
    }
  }

  return isinToCategory;
}

export function computeMarketCapBreakdown(
  stocks: Record<string, Stock>,
  totalEquityAum: number,
  classificationSource?: Record<string, Stock>,
): MarketCapBreakdown[] {
  const capMap = buildMarketCapMap(classificationSource ?? stocks);

  const buckets: Record<MarketCapCategory, { value: number; count: number }> = {
    'Large Cap': { value: 0, count: 0 },
    'Mid Cap': { value: 0, count: 0 },
    'Small Cap': { value: 0, count: 0 },
  };

  for (const stock of Object.values(stocks)) {
    if (stock.asset_class !== 'Equity') continue;
    const category = (stock.isin && capMap.get(stock.isin)) || 'Small Cap';
    buckets[category].value += stock.total_market_value_lakhs;
    buckets[category].count += 1;
  }

  const order: MarketCapCategory[] = ['Large Cap', 'Mid Cap', 'Small Cap'];
  return order.map(cat => ({
    category: cat,
    total_market_value_lakhs: Math.round(buckets[cat].value * 100) / 100,
    holding_count: buckets[cat].count,
    weight_pct: totalEquityAum > 0
      ? Math.round(buckets[cat].value / totalEquityAum * 10000) / 100
      : 0,
  })).filter(b => b.holding_count > 0);
}
