import { useState } from 'react';
import { LayoutDashboard, Briefcase, List, GitCompare, ChevronRight, ChevronDown } from 'lucide-react';
import type { Fund, ComparisonData } from '../../types/portfolio';


export type ViewMode = 'dashboard' | 'holdings' | 'comparison';

interface SidebarProps {
  funds: Record<string, Fund>;
  selectedFund: string | null;
  onSelectFund: (fund: string | null) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  comparisons?: Record<string, ComparisonData>;
  selectedComparison?: string | null;
  onSelectComparison?: (key: string) => void;
}

export function Sidebar({
  funds,
  selectedFund,
  onSelectFund,
  viewMode,
  onViewModeChange,
  comparisons,
  selectedComparison,
  onSelectComparison,
}: SidebarProps) {
  const [evolutionExpanded, setEvolutionExpanded] = useState(false);

  const fundEntries = Object.entries(funds).sort(
    (a, b) => b[1].total_aum_lakhs - a[1].total_aum_lakhs
  );

  const comparisonEntries = comparisons ? Object.entries(comparisons) : [];
  const hasComparisons = comparisonEntries.length > 0;

  // Default to latest comparison
  const activeCompKey = selectedComparison || (comparisonEntries.length > 0 ? comparisonEntries[comparisonEntries.length - 1][0] : null);
  const activeComp = activeCompKey && comparisons ? comparisons[activeCompKey] : null;

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

        {/* MF Portfolio — individual funds (moved to top) */}
        <div className="pt-3 pb-1 px-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MF Portfolio</p>
        </div>

        {fundEntries.map(([name, fund]) => {
          const isDashActive = selectedFund === name && viewMode === 'dashboard';
          return (
            <button
              key={name}
              onClick={() => { onSelectFund(name); onViewModeChange('dashboard'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                isDashActive
                  ? 'bg-blue-950 text-blue-400 border border-blue-800'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Briefcase className={`h-4 w-4 flex-shrink-0 ${isDashActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <p className="text-sm font-medium truncate min-w-0 flex-1" title={name}>{name}</p>
            </button>
          );
        })}

        {/* Portfolio Evolution — collapsible tree */}
        {hasComparisons && (
          <>
            <button
              onClick={() => setEvolutionExpanded(!evolutionExpanded)}
              className="w-full flex items-center gap-2 pt-3 pb-1 px-3 group"
            >
              {evolutionExpanded
                ? <ChevronDown className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" />
                : <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" />
              }
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
                Portfolio Evolution
              </p>
            </button>

            {evolutionExpanded && (
              <>
                {/* Period selector */}
                {comparisonEntries.length > 1 && (
                  <div className="px-3 pb-2">
                    <select
                      value={activeCompKey || ''}
                      onChange={e => onSelectComparison?.(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-600"
                    >
                      {comparisonEntries.map(([key, comp]) => (
                        <option key={key} value={key}>{comp.prev_label} → {comp.curr_label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {fundEntries.map(([name]) => {
                  const fundComp = activeComp?.funds[name];
                  if (!fundComp) return null;

                  const isActive = viewMode === 'comparison' && selectedFund === name && selectedComparison === activeCompKey;
                  return (
                    <button
                      key={`comp-${name}`}
                      onClick={() => {
                        onSelectFund(name);
                        onViewModeChange('comparison');
                        if (activeCompKey && onSelectComparison) onSelectComparison(activeCompKey);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <GitCompare className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" title={name}>{name}</p>
                        <p className="text-xs text-slate-500">
                          {fundComp.counts.new} new · {fundComp.counts.exit} exits · {fundComp.total_stocks} total
                        </p>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </>
        )}
      </nav>
    </aside>
  );
}
