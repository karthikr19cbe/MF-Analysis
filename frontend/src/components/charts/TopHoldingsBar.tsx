import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { Stock } from '../../types/portfolio';
import { formatLakhs, formatPct } from '../../lib/formatters';

interface TopHoldingsBarProps {
  stocks: Record<string, Stock>;
}

const COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#f97316', '#eab308', '#84cc16',
];

export function TopHoldingsBar({ stocks }: TopHoldingsBarProps) {
  const top10 = Object.values(stocks)
    .sort((a, b) => b.total_market_value_lakhs - a.total_market_value_lakhs)
    .slice(0, 10)
    .map((s) => ({
      name: s.name.length > 20 ? s.name.slice(0, 20) + '…' : s.name,
      fullName: s.name,
      value: s.total_market_value_lakhs,
      weight: s.weighted_avg_pct,
      fundCount: s.fund_count,
      sector: s.sector,
    }));

  if (top10.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20 flex items-center justify-center h-80">
        <p className="text-slate-500">No holdings data available</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-slate-200">Top 10 Holdings by Value</h3>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={top10} layout="vertical" margin={{ left: 20, right: 20 }}>
          <XAxis type="number" tickFormatter={(v) => formatLakhs(v)} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const item = payload[0].payload;
              return (
                <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-slate-200">{item.fullName}</p>
                  <p className="text-slate-400">Value: {formatLakhs(item.value)}</p>
                  <p className="text-slate-400">Avg Weight: {formatPct(item.weight)}</p>
                  <p className="text-slate-400">Funds: {item.fundCount}</p>
                  <p className="text-slate-400">Sector: {item.sector || 'N/A'}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {top10.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
