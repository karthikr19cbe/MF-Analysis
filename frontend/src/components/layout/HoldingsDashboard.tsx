import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, ArrowUpDown, Search, Layers } from 'lucide-react';
import type { Stock } from '../../types/portfolio';
import { formatLakhs, formatPct, formatNumber } from '../../lib/formatters';

interface HoldingsDashboardProps {
  stocks: Record<string, Stock>;
  fundName?: string | null;
}

type SortKey = 'name' | 'sector' | 'total_market_value_lakhs' | 'weighted_avg_pct' | 'fund_count';

const ASSET_CLASS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Equity':                   { bg: 'bg-blue-950',    text: 'text-blue-400',    border: 'border-blue-800' },
  'REIT':                     { bg: 'bg-violet-950',  text: 'text-violet-400',  border: 'border-violet-800' },
  'Debt':                     { bg: 'bg-amber-950',   text: 'text-amber-400',   border: 'border-amber-800' },
  'Mutual Fund Units':        { bg: 'bg-cyan-950',    text: 'text-cyan-400',    border: 'border-cyan-800' },
  'TREPS':                    { bg: 'bg-emerald-950', text: 'text-emerald-400', border: 'border-emerald-800' },
  'Net Receivables/Payables': { bg: 'bg-gray-900',    text: 'text-gray-400',    border: 'border-gray-700' },
  'Treasury Bills':           { bg: 'bg-teal-950',    text: 'text-teal-400',    border: 'border-teal-800' },
  'Commercial Paper':         { bg: 'bg-orange-950',  text: 'text-orange-400',  border: 'border-orange-800' },
  'Money Market':             { bg: 'bg-purple-950',  text: 'text-purple-400',  border: 'border-purple-800' },
  'Derivatives':              { bg: 'bg-red-950',     text: 'text-red-400',     border: 'border-red-800' },
};

const BADGE_COLORS: Record<string, string> = {
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

function getColors(ac: string) {
  return ASSET_CLASS_COLORS[ac] || { bg: 'bg-gray-900', text: 'text-gray-400', border: 'border-gray-700' };
}

export function HoldingsDashboard({ stocks, fundName }: HoldingsDashboardProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('total_market_value_lakhs');
  const [sortAsc, setSortAsc] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const stockList = Object.values(stocks);

  const filtered = useMemo(() => {
    if (!search) return stockList;
    const q = search.toLowerCase();
    return stockList.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.isin && s.isin.toLowerCase().includes(q)) ||
      s.sector.toLowerCase().includes(q)
    );
  }, [stockList, search]);

  // Group by asset class
  const groups = useMemo(() => {
    const map = new Map<string, Stock[]>();
    for (const stock of filtered) {
      const ac = stock.asset_class || 'Equity';
      if (!map.has(ac)) map.set(ac, []);
      map.get(ac)!.push(stock);
    }

    // Sort stocks within each group
    for (const [, stocks] of map) {
      stocks.sort((a, b) => {
        let diff: number;
        if (sortKey === 'name' || sortKey === 'sector') {
          diff = (a[sortKey] || '').localeCompare(b[sortKey] || '');
        } else {
          diff = (a[sortKey] as number) - (b[sortKey] as number);
        }
        return sortAsc ? diff : -diff;
      });
    }

    // Sort groups by total value descending
    return Array.from(map.entries()).sort((a, b) => {
      const totalA = a[1].reduce((s, st) => s + st.total_market_value_lakhs, 0);
      const totalB = b[1].reduce((s, st) => s + st.total_market_value_lakhs, 0);
      return totalB - totalA;
    });
  }, [filtered, sortKey, sortAsc]);

  const totalValue = filtered.reduce((s, st) => s + st.total_market_value_lakhs, 0);
  const totalWeightPct = filtered.reduce((s, st) => s + st.weighted_avg_pct, 0);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name' || key === 'sector');
    }
  };

  const toggleGroup = (ac: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(ac)) next.delete(ac);
      else next.add(ac);
      return next;
    });
  };

  const SortHeader = ({ label, field, align = 'left' }: { label: string; field: SortKey; align?: string }) => (
    <th
      className={`py-2.5 px-3 text-slate-400 font-medium cursor-pointer hover:text-slate-200 text-${align}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? 'text-blue-500' : ''}`} />
      </span>
    </th>
  );

  return (
    <div className="px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            {fundName ? `${fundName} — Holdings` : 'All Holdings Across Funds'}
          </h2>
          <p className="text-sm text-slate-400">
            {filtered.length} holdings · {groups.length} asset classes · Total: {formatLakhs(totalValue)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name, ISIN, or sector..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg text-sm bg-slate-900 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Asset Class Groups */}
      {groups.map(([assetClass, groupStocks]) => {
        const colors = getColors(assetClass);
        const isCollapsed = collapsedGroups.has(assetClass);
        const groupValue = groupStocks.reduce((s, st) => s + st.total_market_value_lakhs, 0);
        const groupPct = groupStocks.reduce((s, st) => s + st.weighted_avg_pct, 0);

        return (
          <div key={assetClass} className={`bg-slate-900 rounded-xl border ${colors.border} shadow-lg shadow-black/20 overflow-hidden`}>
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(assetClass)}
              className={`w-full flex items-center gap-3 px-5 py-4 ${colors.bg} hover:opacity-90 transition-opacity`}
            >
              {isCollapsed
                ? <ChevronRight className={`h-5 w-5 ${colors.text}`} />
                : <ChevronDown className={`h-5 w-5 ${colors.text}`} />
              }
              <Layers className={`h-5 w-5 ${colors.text}`} />
              <div className="flex-1 text-left">
                <span className={`font-semibold ${colors.text}`}>{assetClass}</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-slate-400">
                  {groupStocks.length} {groupStocks.length === 1 ? 'holding' : 'holdings'}
                </span>
                <span className={`font-semibold ${colors.text}`}>
                  {formatPct(groupPct)}
                </span>
                <span className="font-semibold text-slate-200">
                  {formatLakhs(groupValue)}
                </span>
              </div>
            </button>

            {/* Group Table */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800">
                      <th className="py-2.5 px-3 text-left text-slate-400 font-medium w-10">#</th>
                      <SortHeader label="Stock Name" field="name" />
                      <th className="py-2.5 px-3 text-left text-slate-400 font-medium">ISIN</th>
                      <SortHeader label="Sector" field="sector" />
                      {!fundName && <SortHeader label="Funds" field="fund_count" align="right" />}
                      <SortHeader label="Market Value" field="total_market_value_lakhs" align="right" />
                      <SortHeader label="Weight %" field="weighted_avg_pct" align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {groupStocks.map((stock, i) => (
                      <tr key={stock.isin || stock.name + i} className="border-b border-slate-800 hover:bg-slate-800">
                        <td className="py-2 px-3 text-slate-500 text-xs">{i + 1}</td>
                        <td className="py-2 px-3 font-medium text-slate-200">{stock.name}</td>
                        <td className="py-2 px-3 text-slate-400 font-mono text-xs">{stock.isin || '—'}</td>
                        <td className="py-2 px-3 text-slate-400">{stock.sector || '—'}</td>
                        {!fundName && (
                          <td className="py-2 px-3 text-right text-slate-300">{stock.fund_count}</td>
                        )}
                        <td className="py-2 px-3 text-right font-medium text-slate-200">
                          {formatLakhs(stock.total_market_value_lakhs)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300">
                          {formatPct(stock.weighted_avg_pct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`${colors.bg}`}>
                      <td colSpan={fundName ? 4 : 5} className={`py-2 px-3 text-sm font-medium ${colors.text}`}>
                        Subtotal
                      </td>
                      <td className={`py-2 px-3 text-right font-semibold ${colors.text}`}>
                        {formatLakhs(groupValue)}
                      </td>
                      <td className={`py-2 px-3 text-right font-semibold ${colors.text}`}>
                        {formatPct(groupPct)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Grand Total */}
      {groups.length > 0 && (
        <div className="bg-slate-700 rounded-xl px-5 py-3 flex items-center justify-between text-white text-sm">
          <span className="font-semibold">Grand Total</span>
          <div className="flex items-center gap-6">
            <span>{filtered.length} holdings</span>
            <span className="font-semibold">{formatPct(totalWeightPct)}</span>
            <span className="font-semibold">{formatLakhs(totalValue)}</span>
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-12 text-center">
          <p className="text-slate-500">No holdings match your search</p>
        </div>
      )}
    </div>
  );
}
