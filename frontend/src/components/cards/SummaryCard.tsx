import type { ReactNode } from 'react';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  color?: string;
  onClick?: () => void;
}

export function SummaryCard({ title, value, subtitle, icon, color = 'text-blue-600', onClick }: SummaryCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg shadow-black/20 ${onClick ? 'cursor-pointer hover:border-slate-500 transition-colors' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-3 bg-slate-800 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}
