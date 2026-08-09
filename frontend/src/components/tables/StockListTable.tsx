import { useState, useMemo } from 'react';
import { X, ArrowUpDown, Search, Filter } from 'lucide-react';
import type { Stock } from '../../types/portfolio';
import { formatLakhs, formatPct, formatNumber } from '../../lib/formatters';
import { buildMarketCapMap, type MarketCapCategory } from '../../lib/marketCapClassifier';

const CAP_BADGE: Record<MarketCapCategory, string> = {
  'Large Cap': 'bg-blue-950 text-blue-400 border-blue-800',
  'Mid Cap': 'bg-amber-950 text-amber-400 border-amber-800',
  'Small Cap': 'bg-emerald-950 text-emerald-400 border-emerald-800',
};

interface StockListTableProps {
  stocks: Record<string, Stock>;
  onClose: () => void;
  fundName?: string | null;
  allStocks?: Record<string, Stock>;
}

type SortKey = 'name' | 'sector' | 'total_market_value_lakhs' | 'weighted_avg_pct' | 'fund_count' | 'asset_class';

const ASSET_CLASS_COLORS: Record<string, string> = {
  'Equity': 'bg-blue-100 text-blue-700',
  'REIT': 'bg-violet-100 text-violet-700',
  'Debt': 'bg-amber-100 text-amber-700',
  'Mutual Fund Units': 'bg-cyan-100 text-cyan-700',
  'TREPS': 'bg-emerald-100 text-emerald-700',
  'Net Receivables/Payables': 'bg-gray-100 text-gray-700',
  'Treasury Bills': 'bg-teal-100 text-teal-700',
  'Commercial Paper': 'bg-orange-100 text-orange-700',
  'Money Market': 'bg-purple-100 text-purple-700',
  'Derivatives': 'bg-red-100 text-red-700',
};

export function StockListTable({ stocks, onClose, fundName, allStocks }: StockListTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total_market_value_lakhs');
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState('');
  const [assetClassFilter, setAssetClassFilter] = useState<string>('all');

  const capMap = useMemo(() => buildMarketCapMap(allStocks ?? stocks), [allStocks, stocks]);

  const stockList = Object.values(stocks);

  // Get unique asset classes for filter
  const assetClasses = useMemo(() => {
    const classes = new Set(stockList.map(s => s.asset_class || 'Equity'));
    return ['all', ...Array.from(classes).sort()];
  }, [stockList]);

  const filtered = stockList.filter(s => {
    if (assetClassFilter !== 'all' && (s.asset_class || 'Equity') !== assetClassFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.isin && s.isin.toLowerCase().includes(q)) ||
      s.sector.toLowerCase().includes(q) ||
      (s.asset_class || '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let diff: number;
    if (sortKey === 'name' || sortKey === 'sector' || sortKey === 'asset_class') {
      diff = ((a as Record<string, unknown>)[sortKey] as string || '').localeCompare((b as Record<string, unknown>)[sortKey] as string || '');
    } else {
      diff = (a[sortKey] as number) - (b[sortKey] as number);
    }
    return sortAsc ? diff : -diff;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name' || key === 'sector' || key === 'asset_class');
    }
  };

  const SortHeader = ({ label, field, align = 'left' }: { label: string; field: SortKey; align?: string }) => (
    <th
      className={`py-3 px-3 text-slate-600 font-medium cursor-pointer hover:text-slate-900 text-${align}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? 'text-blue-500' : ''}`} />
      </span>
    </th>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-12 px-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {fundName ? `${fundName} — All Holdings` : 'All Holdings Across Funds'}
            </h2>
            <p className="text-sm text-slate-500">
              {filtered.length} of {stockList.length} holdings
              {assetClassFilter !== 'all' && ` · ${assetClassFilter}`}
              {search && ` · matching "${search}"`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Search + Filter */}
        <div className="px-5 py-3 border-b border-slate-100 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or sector..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={assetClassFilter}
              onChange={e => setAssetClassFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer"
            >
              {assetClasses.map(ac => (
                <option key={ac} value={ac}>
                  {ac === 'all' ? 'All Asset Classes' : ac}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="py-3 px-3 text-left text-slate-500 font-medium w-10">#</th>
                <SortHeader label="Stock Name" field="name" />
                <th className="py-3 px-3 text-left text-slate-600 font-medium">Cap</th>
                <SortHeader label="Asset Class" field="asset_class" />
                <SortHeader label="Sector" field="sector" />
                {!fundName && <SortHeader label="Funds" field="fund_count" align="right" />}
                <SortHeader label="Market Value" field="total_market_value_lakhs" align="right" />
                <SortHeader label="Weight %" field="weighted_avg_pct" align="right" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((stock, i) => (
                <tr key={stock.isin || stock.name + i} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-400 text-xs">{i + 1}</td>
                  <td className="py-2 px-3 font-medium text-slate-800">{stock.name}</td>
                  <td className="py-2 px-3">
                    {stock.asset_class === 'Equity' ? (() => {
                      const cap = (stock.isin && capMap.get(stock.isin)) || 'Small Cap';
                      return (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${CAP_BADGE[cap]}`}>
                          {cap.replace(' Cap', '')}
                        </span>
                      );
                    })() : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ASSET_CLASS_COLORS[stock.asset_class] || 'bg-gray-100 text-gray-700'}`}>
                      {stock.asset_class || 'Equity'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-600">{stock.sector || '—'}</td>
                  {!fundName && (
                    <td className="py-2 px-3 text-right text-slate-700">{stock.fund_count}</td>
                  )}
                  <td className="py-2 px-3 text-right font-medium text-slate-800">
                    {formatLakhs(stock.total_market_value_lakhs)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700">
                    {formatPct(stock.weighted_avg_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-between text-xs text-slate-500">
          <span>{sorted.length} holdings</span>
          <span>
            Total Value: {formatLakhs(sorted.reduce((s, st) => s + st.total_market_value_lakhs, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
