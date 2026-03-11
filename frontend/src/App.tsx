import { useState, useMemo } from 'react';
import { usePortfolioData } from './hooks/usePortfolioData';
import { Header } from './components/layout/Header';
import { Sidebar, type ViewMode } from './components/layout/Sidebar';
import { DashboardGrid } from './components/layout/DashboardGrid';
import { HoldingsDashboard } from './components/layout/HoldingsDashboard';
import { extractFundView } from './lib/fundView';

function App() {
  const { data, loading, error, refresh } = usePortfolioData();
  const [selectedFund, setSelectedFund] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

  const viewData = useMemo(() => {
    if (!data) return null;
    if (!selectedFund) return data;
    return extractFundView(data, selectedFund);
  }, [data, selectedFund]);

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
            onViewModeChange={setViewMode}
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
            <DashboardGrid data={viewData} fundName={selectedFund} onViewHoldings={() => setViewMode('holdings')} />
          )}

          {viewData && viewMode === 'holdings' && (
            <HoldingsDashboard stocks={viewData.stocks} fundName={selectedFund} />
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
