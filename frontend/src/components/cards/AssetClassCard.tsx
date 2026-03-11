import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Layers } from 'lucide-react';
import type { AssetClass } from '../../types/portfolio';
import { formatLakhs, formatPct } from '../../lib/formatters';

interface AssetClassCardProps {
  assetClasses: Record<string, AssetClass>;
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#10b981',
  '#6b7280', '#14b8a6', '#f97316', '#a855f7', '#ef4444',
  '#94a3b8',
];

export function AssetClassCard({ assetClasses }: AssetClassCardProps) {
  const allEntries = Object.entries(assetClasses)
    .filter(([, data]) => data.total_market_value_lakhs > 0)
    .sort((a, b) => b[1].total_market_value_lakhs - a[1].total_market_value_lakhs);

  // Top 10 + Others
  const top10 = allEntries.slice(0, 10);
  const rest = allEntries.slice(10);
  const entries = rest.length > 0
    ? [
        ...top10,
        ['Others', {
          total_market_value_lakhs: rest.reduce((s, [, d]) => s + d.total_market_value_lakhs, 0),
          holding_count: rest.reduce((s, [, d]) => s + d.holding_count, 0),
          weighted_avg_pct: rest.reduce((s, [, d]) => s + d.weighted_avg_pct, 0),
        }] as [string, AssetClass],
      ]
    : top10;

  const data = entries.map(([name, d], index) => ({
    name: name.length > 18 ? name.slice(0, 18) + '…' : name,
    fullName: name,
    value: d.total_market_value_lakhs,
    count: d.holding_count,
    pct: d.weighted_avg_pct,
    index,
  }));

  if (data.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20 flex items-center justify-center h-80">
        <p className="text-slate-500">No asset class data available</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-5 w-5 text-indigo-600" />
        <h3 className="font-semibold text-slate-200">Asset Class Breakdown</h3>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
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
                  <p className="text-slate-400">Weight: {formatPct(item.pct)}</p>
                  <p className="text-slate-400">Holdings: {item.count}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
