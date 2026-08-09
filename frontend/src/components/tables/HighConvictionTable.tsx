import { useState, useMemo } from 'react';
import { Star, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import type { HighConviction, Stock } from '../../types/portfolio';
import { formatLakhs, formatPct, formatNumber } from '../../lib/formatters';
import { buildMarketCapMap, type MarketCapCategory } from '../../lib/marketCapClassifier';

const CAP_BADGE: Record<MarketCapCategory, string> = {
  'Large Cap': 'bg-blue-950 text-blue-400 border-blue-800',
  'Mid Cap': 'bg-amber-950 text-amber-400 border-amber-800',
  'Small Cap': 'bg-emerald-950 text-emerald-400 border-emerald-800',
};

interface HighConvictionTableProps {
  data: HighConviction[];
  stocks: Record<string, Stock>;
  allStocks?: Record<string, Stock>;
  title?: string;
  subtitle?: string;
}

type SortKey = 'fund_count' | 'avg_weight_pct' | 'appearance_pct' | 'total_market_value_lakhs';

export function HighConvictionTable({ data, stocks, allStocks, title = "High Conviction Stocks", subtitle = "Stocks appearing in multiple funds" }: HighConvictionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('fund_count');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const capMap = useMemo(() => buildMarketCapMap(allStocks ?? stocks), [allStocks, stocks]);

  const sorted = [...data].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortAsc ? diff : -diff;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getStockFunds = (stock: HighConviction) => {
    // Look up by ISIN first, then by name-based key
    if (stock.isin && stocks[stock.isin]) {
      return stocks[stock.isin].funds;
    }
    const nameKey = `NAME__${stock.name}`;
    if (stocks[nameKey]) {
      return stocks[nameKey].funds;
    }
    return [];
  };

  if (data.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-slate-200">{title}</h3>
        </div>
        <p className="text-sm text-slate-500 text-center py-8">No holdings data found</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 mb-4">
        <Star className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold text-slate-200">{title}</h3>
        <span className="text-xs text-slate-500 ml-auto">{subtitle}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="w-8 py-3 px-1"></th>
              <th className="text-left py-3 px-2 text-slate-400 font-medium">Stock</th>
              <th className="text-left py-3 px-2 text-slate-400 font-medium">Type</th>
              <th className="text-left py-3 px-2 text-slate-400 font-medium">Cap</th>
              <th className="text-left py-3 px-2 text-slate-400 font-medium">Sector</th>
              <th
                className="text-right py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-slate-100"
                onClick={() => handleSort('fund_count')}
              >
                <span className="inline-flex items-center gap-1">
                  Funds <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th
                className="text-right py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-slate-100"
                onClick={() => handleSort('appearance_pct')}
              >
                <span className="inline-flex items-center gap-1">
                  Appearance % <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th
                className="text-right py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-slate-100"
                onClick={() => handleSort('avg_weight_pct')}
              >
                <span className="inline-flex items-center gap-1">
                  Total Weight <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th
                className="text-right py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-slate-100"
                onClick={() => handleSort('total_market_value_lakhs')}
              >
                <span className="inline-flex items-center gap-1">
                  Total Value <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((stock, i) => {
              const rowKey = stock.isin || stock.name + i;
              // "High" = appears in >=50% of funds — only meaningful across multiple funds.
              const highConviction = stock.appearance_pct >= 50 && stock.total_funds > 1;
              const isExpanded = expandedRows.has(rowKey);
              const funds = getStockFunds(stock);

              return (
                <>
                  <tr
                    key={rowKey}
                    className="border-b border-slate-800 hover:bg-slate-800 cursor-pointer"
                    onClick={() => toggleRow(rowKey)}
                  >
                    <td className="py-2.5 px-1 text-slate-500">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />
                      }
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200">{stock.name}</span>
                        {highConviction && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-900 text-amber-400">
                            High
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                        stock.asset_class === 'Equity' ? 'bg-blue-950 text-blue-400' :
                        stock.asset_class === 'Derivatives' ? 'bg-red-950 text-red-400' :
                        stock.asset_class === 'TREPS' ? 'bg-emerald-950 text-emerald-400' :
                        stock.asset_class === 'REIT' ? 'bg-violet-950 text-violet-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {stock.asset_class || 'Equity'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      {stock.asset_class === 'Equity' ? (() => {
                        const cap = (stock.isin && capMap.get(stock.isin)) || 'Small Cap';
                        return (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${CAP_BADGE[cap]}`}>
                            {cap.replace(' Cap', '')}
                          </span>
                        );
                      })() : <span className="text-slate-500 text-xs">—</span>}
                    </td>
                    <td className="py-2.5 px-2 text-slate-400">{stock.sector || '—'}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-slate-200">
                      {stock.fund_count}/{stock.total_funds}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-300">{formatPct(stock.appearance_pct)}</td>
                    <td className="py-2.5 px-2 text-right text-slate-300">{formatPct(stock.avg_weight_pct)}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-slate-200">
                      {formatLakhs(stock.total_market_value_lakhs)}
                    </td>
                  </tr>
                  {isExpanded && funds.length > 0 && (
                    <tr key={rowKey + '-detail'}>
                      <td colSpan={9} className="px-2 pb-3">
                        <div className="ml-6 bg-slate-800 rounded-lg border border-slate-800 overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-800">
                                <th className="text-left py-2 px-3 text-slate-400 font-medium">Fund / Scheme</th>
                                <th className="text-left py-2 px-3 text-slate-400 font-medium">AMC</th>
                                <th className="text-right py-2 px-3 text-slate-400 font-medium">Quantity</th>
                                <th className="text-right py-2 px-3 text-slate-400 font-medium">Market Value</th>
                                <th className="text-right py-2 px-3 text-slate-400 font-medium">% of Net Assets</th>
                              </tr>
                            </thead>
                            <tbody>
                              {funds.map((fund, fi) => (
                                <tr key={fi} className="border-t border-slate-800">
                                  <td className="py-2 px-3 text-slate-300 font-medium">{fund.scheme_name}</td>
                                  <td className="py-2 px-3 text-slate-400">{fund.amc}</td>
                                  <td className="py-2 px-3 text-right text-slate-400 font-mono">
                                    {formatNumber(fund.quantity)}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-300 font-medium">
                                    {formatLakhs(fund.market_value_lakhs)}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-400">
                                    {formatPct(fund.pct_of_net_assets)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
