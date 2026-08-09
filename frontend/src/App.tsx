import { useState, useMemo, useCallback } from 'react';
import { usePortfolioData } from './hooks/usePortfolioData';
import { Header } from './components/layout/Header';
import { Sidebar, type ViewMode } from './components/layout/Sidebar';
import { DashboardGrid } from './components/layout/DashboardGrid';
import { HoldingsDashboard } from './components/layout/HoldingsDashboard';
import { PortfolioEvolution } from './components/layout/PortfolioEvolution';
import { extractFundView } from './lib/fundView';

function App() {
  const { data, loading, error, refresh } = usePortfolioData();
  const [selectedFund, setSelectedFund] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedComparison, setSelectedComparison] = useState<string | null>(null);
  const [assetClassFilter, setAssetClassFilter] = useState<string | null>(null);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const viewData = useMemo(() => {
    if (!data) return null;
    if (!selectedFund) return data;
    return extractFundView(data, selectedFund);
  }, [data, selectedFund]);

  // Get comparison data for the selected fund
  const comparisonData = useMemo(() => {
    if (!data?.comparisons || !selectedFund) return null;
    const keys = Object.keys(data.comparisons);
    const compKey = selectedComparison || keys[keys.length - 1];
    if (!compKey) return null;
    return data.comparisons[compKey]?.funds[selectedFund] ?? null;
  }, [data, selectedFund, selectedComparison]);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header
        meta={data?.meta ?? null}
        onRefresh={refresh}
        loading={loading}
        error={error}
      />

      <div className="flex">
        {/* Left sidebar */}
        {data && (
          <Sidebar
            funds={data.funds}
            selectedFund={selectedFund}
            onSelectFund={setSelectedFund}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            comparisons={data.comparisons}
            selectedComparison={selectedComparison}
            onSelectComparison={setSelectedComparison}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {loading && !data && (
            <div className="px-6 py-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20 animate-pulse">
                    <div className="h-4 bg-slate-700 rounded w-24 mb-3" />
                    <div className="h-8 bg-slate-700 rounded w-32" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20 h-96 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-40 mb-4" />
                  <div className="h-80 bg-slate-800 rounded" />
                </div>
                <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20 h-96 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-40 mb-4" />
                  <div className="h-80 bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          )}

          {viewData && viewMode === 'dashboard' && (
            <DashboardGrid
              data={viewData}
              allStocks={selectedFund ? data?.stocks : undefined}
              fundName={selectedFund}
              onViewHoldings={() => { setAssetClassFilter(null); handleViewModeChange('holdings'); }}
              onViewAssetClassHoldings={(ac) => { setAssetClassFilter(ac); handleViewModeChange('holdings'); }}
            />
          )}

          {viewData && viewMode === 'holdings' && (
            <HoldingsDashboard stocks={viewData.stocks} fundName={selectedFund} initialAssetClassFilter={assetClassFilter} allStocks={selectedFund ? data?.stocks : undefined} />
          )}

          {viewMode === 'comparison' && comparisonData && (
            <PortfolioEvolution comparison={comparisonData} />
          )}

          {viewMode === 'comparison' && !comparisonData && selectedFund && (
            <div className="px-6 py-20 text-center">
              <p className="text-slate-400 text-lg">No comparison data available for this fund.</p>
              <p className="text-slate-500 text-sm mt-1">Multi-period data is needed for this fund.</p>
            </div>
          )}

          {!loading && !data && !error && (
            <div className="px-6 py-20 text-center">
              <p className="text-slate-400 text-lg">No data loaded. Run the parser and refresh.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
