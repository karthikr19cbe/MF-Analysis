import { RefreshCw, BarChart3, AlertTriangle } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import type { Meta } from '../../types/portfolio';

interface HeaderProps {
  meta: Meta | null;
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
}

export function Header({ meta, onRefresh, loading, error }: HeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-700 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">
                MF Portfolio Analysis
              </h1>
              {meta && (
                <p className="text-sm text-slate-400">
                  Last updated: {formatDate(meta.generated_at)} · {meta.file_count} files · {meta.total_schemes} schemes · {meta.total_unique_stocks} stocks
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 bg-red-950 border border-red-800 rounded-lg px-4 py-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        {meta && meta.file_count === 0 && (
          <div className="mt-3 flex items-center gap-2 bg-amber-950 border border-amber-800 rounded-lg px-4 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-400">
              No disclosure files found. Add XLSX files to the <code className="bg-amber-900 px-1 rounded">disclosures/</code> folder and run the parser.
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
