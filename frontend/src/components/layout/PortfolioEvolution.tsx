import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Minus, Search } from 'lucide-react';
import type { FundComparison, StockComparison } from '../../types/portfolio';
import { formatLakhs, formatPct } from '../../lib/formatters';

interface PortfolioEvolutionProps {
  comparison: FundComparison;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  New: { label: 'New', color: 'text-emerald-400', bg: 'bg-emerald-950', border: 'border-emerald-800' },
  Inc: { label: 'Inc', color: 'text-blue-400', bg: 'bg-blue-950', border: 'border-blue-800' },
  Dec: { label: 'Dec', color: 'text-orange-400', bg: 'bg-orange-950', border: 'border-orange-800' },
  Hold: { label: 'Hold', color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700' },
  Exit: { label: 'Exit', color: 'text-red-400', bg: 'bg-red-950', border: 'border-red-800' },
};

type SortKey = 'name' | 'sector' | 'asset_class' | 'status' | 'delta_pct' | 'curr_pct' | 'prev_pct';

export function PortfolioEvolution({ comparison }: PortfolioEvolutionProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortAsc, setSortAsc] = useState(true);

  const filteredStocks = useMemo(() => {
    let stocks = comparison.stocks;
    if (search) {
      const q = search.toLowerCase();
      stocks = stocks.filter(
        s => s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q) || (s.asset_class && s.asset_class.toLowerCase().includes(q)) || (s.isin && s.isin.toLowerCase().includes(q))
      );
    }
    if (statusFilter) {
      stocks = stocks.filter(s => s.status === statusFilter);
    }
    const statusOrder: Record<string, number> = { New: 0, Inc: 1, Dec: 2, Hold: 3, Exit: 4 };
    return [...stocks].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'sector': cmp = (a.sector || '').localeCompare(b.sector || ''); break;
        case 'asset_class': cmp = (a.asset_class || '').localeCompare(b.asset_class || ''); break;
        case 'status':
          cmp = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
          // Secondary sort: within same status, sort by delta_pct descending (highest change first)
          if (cmp === 0) cmp = b.delta_pct - a.delta_pct;
          break;
        case 'delta_pct': cmp = a.delta_pct - b.delta_pct; break;
        case 'curr_pct': cmp = (a.curr_pct ?? 0) - (b.curr_pct ?? 0); break;
        case 'prev_pct': cmp = (a.prev_pct ?? 0) - (b.prev_pct ?? 0); break;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [comparison.stocks, search, statusFilter, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'name'); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-3 py-2.5 text-left text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      {label} {sortKey === field ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  const formatDelta = (stock: StockComparison) => {
    if (stock.status === 'New') return <span className="text-emerald-400">New</span>;
    if (stock.status === 'Exit') return <span className="text-red-400">Exit</span>;
    // Inc/Dec is determined by the market-value (₹) change, so colour by that:
    // green = value up, orange = value down (red is reserved for Exit). The
    // weight-% change is shown separately/muted because it can move the opposite
    // way (a growing position can still lose weight % if total AUM grows faster).
    const mvDelta = (stock.curr_market_value_lakhs ?? 0) - (stock.prev_market_value_lakhs ?? 0);
    const delta = stock.delta_pct;
    const valueColor =
      stock.status === 'Hold' ? 'text-slate-400'
      : mvDelta > 0 ? 'text-emerald-400'
      : mvDelta < 0 ? 'text-orange-400'
      : 'text-slate-400';
    const pctSign = delta >= 0 ? '+' : '';
    return (
      <span className="whitespace-nowrap">
        <span className={valueColor}>{mvDelta > 0 ? '+' : ''}{formatLakhs(mvDelta)}</span>
        <span className="text-slate-500"> ({pctSign}{delta.toFixed(1)}%)</span>
      </span>
    );
  };

  // Asset allocation bars
  const allocationKeys = [...new Set([
    ...Object.keys(comparison.prev_asset_allocation),
    ...Object.keys(comparison.curr_asset_allocation),
  ])];
  const allocColors: Record<string, string> = {
    Equity: 'bg-blue-500', Debt: 'bg-amber-500', 'Money Market': 'bg-purple-500',
    TREPS: 'bg-emerald-500', 'Net Receivables/Payables': 'bg-slate-500',
    'Commercial Paper': 'bg-orange-500', 'Treasury Bills': 'bg-teal-500',
    Derivatives: 'bg-red-500', REIT: 'bg-violet-500',
  };

  return (
    <div className="px-6 py-6 space-y-5">
      {/* Header */}
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">{comparison.fund_name}</h2>
            <p className="text-sm text-slate-400">
              {comparison.prev_period} → {comparison.curr_period} · {comparison.total_stocks} Stocks
            </p>
          </div>
          <div className="text-right text-sm text-slate-400">
            <p>AUM: {formatLakhs(comparison.prev_aum_lakhs)} → {formatLakhs(comparison.curr_aum_lakhs)}</p>
          </div>
        </div>

        {/* Status counters */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { key: null, label: 'TOTAL', value: comparison.total_stocks, color: 'text-slate-100', bg: 'bg-slate-800', border: 'border-slate-600' },
            { key: 'New', label: 'FRESH BUYS', value: comparison.counts.new, color: 'text-emerald-400', bg: 'bg-emerald-950', border: 'border-emerald-800' },
            { key: 'Exit', label: 'EXITS', value: comparison.counts.exit, color: 'text-red-400', bg: 'bg-red-950', border: 'border-red-800' },
            { key: 'Inc', label: 'INC ▲', value: comparison.counts.inc, color: 'text-blue-400', bg: 'bg-blue-950', border: 'border-blue-800' },
            { key: 'Dec', label: 'DEC ▼', value: comparison.counts.dec, color: 'text-orange-400', bg: 'bg-orange-950', border: 'border-orange-800' },
            { key: 'Hold', label: 'HOLD', value: comparison.counts.hold, color: 'text-slate-300', bg: 'bg-slate-800', border: 'border-slate-600' },
          ].map(({ key, label, value, color, bg, border }) => (
            <button
              key={label}
              onClick={() => setStatusFilter(statusFilter === key ? null : key)}
              className={`${bg} border ${statusFilter === key ? 'border-white ring-1 ring-white/20' : border} rounded-lg p-3 text-center transition-all hover:brightness-110`}
            >
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Asset allocation comparison */}
      {allocationKeys.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Asset Allocation</h3>
          <div className="space-y-2">
            {[
              { label: comparison.prev_period, data: comparison.prev_asset_allocation },
              { label: comparison.curr_period, data: comparison.curr_asset_allocation },
            ].map(({ label, data }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-12 shrink-0">{label.split(' ')[0]}</span>
                <div className="flex-1 flex h-7 rounded overflow-hidden">
                  {allocationKeys.map(k => {
                    const pct = data[k] || 0;
                    if (pct < 0.1) return null;
                    return (
                      <div
                        key={k}
                        className={`${allocColors[k] || 'bg-gray-500'} flex items-center justify-center`}
                        style={{ width: `${pct}%` }}
                        title={`${k}: ${pct.toFixed(1)}%`}
                      >
                        {pct >= 5 && <span className="text-[10px] font-bold text-white">{pct.toFixed(1)}%</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-3 mt-2">
              {allocationKeys.map(k => (
                <div key={k} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-sm ${allocColors[k] || 'bg-gray-500'}`} />
                  <span className="text-[10px] text-slate-500">{k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Movement breakdown: New Buys / Increases / Decreases / Exits — separate */}
      {(comparison.counts.new + comparison.counts.inc + comparison.counts.dec + comparison.counts.exit) > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {([
            { status: 'New', title: 'New Buys', color: 'text-emerald-400', dir: 'up' as const, sort: (a: StockComparison, b: StockComparison) => b.delta_pct - a.delta_pct },
            { status: 'Inc', title: 'Increases', color: 'text-blue-400', dir: 'up' as const, sort: (a: StockComparison, b: StockComparison) => b.delta_pct - a.delta_pct },
            { status: 'Dec', title: 'Decreases', color: 'text-orange-400', dir: 'down' as const, sort: (a: StockComparison, b: StockComparison) => a.delta_pct - b.delta_pct },
            { status: 'Exit', title: 'Exits', color: 'text-red-400', dir: 'down' as const, sort: (a: StockComparison, b: StockComparison) => a.delta_pct - b.delta_pct },
          ]).map(({ status, title, color, dir, sort }) => {
            const items = comparison.stocks.filter(s => s.status === status).sort(sort);
            const total = items.length;
            return (
              <div key={status} className="bg-slate-900 rounded-xl border border-slate-700 p-4 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{title}</h3>
                  <span className="text-xs text-slate-500">{total}</span>
                </div>
                {total === 0 ? (
                  <p className="text-xs text-slate-600 py-1">None this period</p>
                ) : (
                  <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                    {items.map(s => (
                      <div key={s.isin || s.name} className="flex items-center justify-between text-sm gap-2">
                        <span className="text-slate-300 truncate flex-1" title={s.name}>{s.name}</span>
                        <span className={`${color} font-mono shrink-0 flex items-center gap-0.5`}>
                          {dir === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {s.delta_pct >= 0 ? '+' : ''}{s.delta_pct.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search stocks, sectors, ISIN..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-600"
        />
      </div>

      {/* Holdings table */}
      <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-lg shadow-black/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-400 w-10">#</th>
                <SortHeader label="Stock" field="name" />
                <SortHeader label="Sector" field="sector" />
                <SortHeader label="Asset Class" field="asset_class" />
                <SortHeader label="Sts" field="status" />
                <SortHeader label="Δ Change" field="delta_pct" />
                <SortHeader label={comparison.prev_period.split(' ')[0]} field="prev_pct" />
                <SortHeader label={comparison.curr_period.split(' ')[0]} field="curr_pct" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredStocks.map((stock, idx) => {
                const cfg = STATUS_CONFIG[stock.status];
                return (
                  <tr key={`${stock.isin || stock.name}-${stock.status}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2 text-xs text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <p className="text-sm font-medium text-slate-200">{stock.name}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400 max-w-[160px] truncate" title={stock.sector}>
                      {stock.sector || '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">
                      {stock.asset_class || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                        {stock.status === 'Inc' && <ArrowUp className="h-3 w-3" />}
                        {stock.status === 'Dec' && <ArrowDown className="h-3 w-3" />}
                        {stock.status === 'Hold' && <Minus className="h-3 w-3" />}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">{formatDelta(stock)}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {stock.prev_pct != null ? (
                        <>
                          <span className="text-slate-300">{formatLakhs(stock.prev_market_value_lakhs!)}</span>
                          <span className="text-slate-500"> ({stock.prev_pct.toFixed(1)}%)</span>
                        </>
                      ) : '–'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {stock.curr_pct != null ? (
                        <>
                          <span className="text-slate-300">{formatLakhs(stock.curr_market_value_lakhs!)}</span>
                          <span className="text-slate-500"> ({stock.curr_pct.toFixed(1)}%)</span>
                        </>
                      ) : '–'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
