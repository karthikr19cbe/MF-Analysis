import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { PieChart } from 'lucide-react';
import type { Sector } from '../../types/portfolio';
import { formatLakhs, formatPct } from '../../lib/formatters';

interface SectorTreemapProps {
  sectors: Record<string, Sector>;
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316',
  '#94a3b8',
];

export function SectorTreemap({ sectors }: SectorTreemapProps) {
  const allSectors = Object.entries(sectors)
    .filter(([, s]) => s.total_market_value_lakhs > 0)
    .sort((a, b) => b[1].total_market_value_lakhs - a[1].total_market_value_lakhs);

  // Top 10 + Others
  const top10 = allSectors.slice(0, 10);
  const rest = allSectors.slice(10);
  const grouped = rest.length > 0
    ? [
        ...top10,
        ['Others', {
          total_market_value_lakhs: rest.reduce((s, [, sec]) => s + sec.total_market_value_lakhs, 0),
          weighted_avg_pct: rest.reduce((s, [, sec]) => s + sec.weighted_avg_pct, 0),
          stock_count: rest.reduce((s, [, sec]) => s + sec.stock_count, 0),
        }] as [string, Sector],
      ]
    : top10;

  const data = grouped.map(([name, s], index) => ({
    name: name.length > 18 ? name.slice(0, 18) + '…' : name,
    fullName: name,
    value: s.total_market_value_lakhs,
    pct: s.weighted_avg_pct,
    stockCount: s.stock_count,
    index,
  }));

  if (data.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20 flex items-center justify-center h-80">
        <p className="text-slate-500">No sector data available</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="h-5 w-5 text-violet-600" />
        <h3 className="font-semibold text-slate-200">Top 10 Sectors by Value</h3>
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
                  <p className="text-slate-400">Stocks: {item.stockCount}</p>
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
