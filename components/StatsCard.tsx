
import React from 'react';
import { FinancialStats } from '../types';
import { TrendingUp, TrendingDown, Activity, BarChart3, ShieldAlert } from 'lucide-react';

interface StatsCardProps {
  title: string;
  stats: FinancialStats;
  color: 'brand' | 'slate'; // Brand for Index, Slate for Benchmark
}

const StatRow = ({ label, value, isPercent = true, icon: Icon }: { label: string, value: number, isPercent?: boolean, icon: any }) => {
  const formattedValue = isPercent 
    ? `${(value * 100).toFixed(2)}%` 
    : value.toFixed(2);
  
  const isPositive = value >= 0;
  
  let valueColor = 'text-lore-text';
  if (label.includes("Return")) {
    valueColor = isPositive ? 'text-lore-success' : 'text-lore-error';
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-lore-border/50 last:border-0 group hover:bg-lore-highlight/30 px-2 transition-colors -mx-2 rounded">
      <div className="flex items-center gap-2 text-lore-muted text-xs font-medium uppercase tracking-wide">
        <Icon size={14} />
        {label}
      </div>
      <div className={`font-mono text-sm ${valueColor}`}>
        {formattedValue}
      </div>
    </div>
  );
};

const StatsCard: React.FC<StatsCardProps> = ({ title, stats, color }) => {
  const isIndex = color === 'brand';
  // Index gets the glow, Benchmark is muted
  const containerClasses = isIndex 
    ? 'border-lore-primary/30 bg-lore-surface shadow-lg shadow-lore-primary/5' 
    : 'border-lore-border bg-lore-base opacity-80';

  return (
    <div className={`rounded-lg border p-6 transition-all ${containerClasses}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <span className={`text-[10px] font-mono px-2 py-0.5 border rounded uppercase tracking-wider ${
            isIndex 
            ? 'border-lore-primary text-lore-primary bg-lore-primary/10' 
            : 'border-lore-muted text-lore-muted bg-lore-highlight'
        }`}>
          {isIndex ? 'Strategy' : 'Benchmark'}
        </span>
      </div>

      <div className="flex flex-col">
        <StatRow 
          label="Total Return" 
          value={stats.cumulative_return} 
          icon={stats.cumulative_return >= 0 ? TrendingUp : TrendingDown} 
        />
        <StatRow 
          label="Volatility (Ann.)" 
          value={stats.annualized_volatility} 
          icon={Activity} 
        />
        <StatRow 
          label="Sharpe Ratio" 
          value={stats.sharpe_ratio} 
          isPercent={false}
          icon={BarChart3} 
        />
        <StatRow 
          label="Max Drawdown" 
          value={stats.max_drawdown} 
          icon={ShieldAlert} 
        />
      </div>
    </div>
  );
};

export default StatsCard;
