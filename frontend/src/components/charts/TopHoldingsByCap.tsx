import { useMemo } from 'react';
import { Layers3 } from 'lucide-react';
import type { Stock } from '../../types/portfolio';
import { buildMarketCapMap, type MarketCapCategory } from '../../lib/marketCapClassifier';

interface TopHoldingsByCapProps {
  stocks: Record<string, Stock>;
  /** Full universe used to build the cap classification (resilient to a fund missing for a month). */
  allStocks?: Record<string, Stock>;
}

const CATS: { key: MarketCapCategory; bar: string; text: string }[] = [
  { key: 'Large Cap', bar: 'bg-blue-500', text: 'text-blue-400' },
  { key: 'Mid Cap', bar: 'bg-amber-500', text: 'text-amber-400' },
  { key: 'Small Cap', bar: 'bg-emerald-500', text: 'text-emerald-400' },
];

export function TopHoldingsByCap({ stocks, allStocks }: TopHoldingsByCapProps) {
  const groups = useMemo(() => {
    const capMap = buildMarketCapMap(allStocks ?? stocks);
    const byCat: Record<MarketCapCategory, Stock[]> = {
      'Large Cap': [], 'Mid Cap': [], 'Small Cap': [],
    };
    for (const s of Object.values(stocks)) {
      if (s.asset_class !== 'Equity') continue;
      // Same default as the breakdown: unclassified equity falls to Small Cap.
      const cat = (s.isin && capMap.get(s.isin)) || 'Small Cap';
      byCat[cat].push(s);
    }
    const top: Record<MarketCapCategory, Stock[]> = {
      'Large Cap': [], 'Mid Cap': [], 'Small Cap': [],
    };
    for (const c of Object.keys(byCat) as MarketCapCategory[]) {
      top[c] = byCat[c]
        .sort((a, b) => b.total_market_value_lakhs - a.total_market_value_lakhs)
        .slice(0, 10);
    }
    return top;
  }, [stocks, allStocks]);

  if (!CATS.some(c => groups[c.key].length > 0)) return null;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers3 className="h-5 w-5 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-200">Top 10 Holdings by Market Cap</h3>
        </div>
        <span className="text-xs text-slate-500">Equity only · by weight</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {CATS.map(cat => {
          const list = groups[cat.key];
          return (
            <div key={cat.key}>
              <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-800">
                <div className={`w-3 h-3 rounded-sm ${cat.bar}`} />
                <span className="text-base font-semibold text-slate-100">{cat.key}</span>
                <span className="text-xs text-slate-500">{list.length}</span>
              </div>
              {list.length === 0 ? (
                <p className="text-xs text-slate-600 py-2">No holdings</p>
              ) : (
                <div className="space-y-1.5">
                  {list.map((s, i) => (
                    <div key={s.isin || s.name} className="flex items-center justify-between gap-2 py-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-slate-500 w-5 text-right shrink-0">{i + 1}.</span>
                        <span className="text-sm text-slate-200 truncate" title={s.name}>{s.name}</span>
                      </div>
                      <span className={`text-sm font-semibold ${cat.text} shrink-0`}>
                        {s.weighted_avg_pct.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
