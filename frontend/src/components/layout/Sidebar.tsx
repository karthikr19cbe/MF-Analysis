import { LayoutDashboard, Briefcase, List } from 'lucide-react';
import type { Fund } from '../../types/portfolio';
import { formatLakhs } from '../../lib/formatters';

export type ViewMode = 'dashboard' | 'holdings';

interface SidebarProps {
  funds: Record<string, Fund>;
  selectedFund: string | null;
  onSelectFund: (fund: string | null) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function Sidebar({ funds, selectedFund, onSelectFund, viewMode, onViewModeChange }: SidebarProps) {
  const fundEntries = Object.entries(funds).sort(
    (a, b) => b[1].total_aum_lakhs - a[1].total_aum_lakhs
  );

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-700 flex flex-col h-[calc(100vh-73px)] sticky top-[73px]">
      <div className="p-4 border-b border-slate-800">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Views</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* All Funds Dashboard */}
        <button
          onClick={() => { onSelectFund(null); onViewModeChange('dashboard'); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
            selectedFund === null && viewMode === 'dashboard'
              ? 'bg-blue-950 text-blue-400 border border-blue-800'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <LayoutDashboard className={`h-4 w-4 flex-shrink-0 ${selectedFund === null && viewMode === 'dashboard' ? 'text-blue-400' : 'text-slate-400'}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">All Funds</p>
            <p className="text-xs text-slate-500">{fundEntries.length} schemes · Combined view</p>
          </div>
        </button>

        {/* All Holdings view */}
        <button
          onClick={() => { onSelectFund(null); onViewModeChange('holdings'); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
            selectedFund === null && viewMode === 'holdings'
              ? 'bg-blue-950 text-blue-400 border border-blue-800'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <List className={`h-4 w-4 flex-shrink-0 ${selectedFund === null && viewMode === 'holdings' ? 'text-blue-400' : 'text-slate-400'}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">All Holdings</p>
            <p className="text-xs text-slate-500">Grouped by asset class</p>
          </div>
        </button>

        <div className="pt-2 pb-1 px-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Individual Funds</p>
        </div>

        {fundEntries.map(([name, fund]) => (
          <button
            key={name}
            onClick={() => { onSelectFund(name); onViewModeChange('dashboard'); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
              selectedFund === name
                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Briefcase className={`h-4 w-4 flex-shrink-0 ${selectedFund === name ? 'text-blue-400' : 'text-slate-400'}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" title={name}>{name}</p>
              <p className="text-xs text-slate-500">
                {fund.amc} · {formatLakhs(fund.total_aum_lakhs)} · {fund.holding_count} holdings
              </p>
            </div>
          </button>
        ))}
      </nav>
    </aside>
  );
}
