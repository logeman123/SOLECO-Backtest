
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ChartDataPoint } from '../types';

interface PerformanceChartProps {
  data: ChartDataPoint[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-96 w-full flex items-center justify-center bg-lore-surface rounded-lg border border-dashed border-lore-border">
        <p className="text-lore-muted font-mono text-sm">NO DATA STREAM</p>
      </div>
    );
  }

  return (
    <div className="h-[450px] w-full bg-lore-surface p-6 rounded-lg shadow-lg border border-lore-border">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-mono font-bold text-lore-muted uppercase tracking-widest">NAV Performance (Base 100)</h3>
        <div className="flex gap-4">
             <div className="flex items-center gap-2 text-xs text-lore-text">
                <div className="w-3 h-3 bg-lore-primary rounded-sm"></div> SOLECO
             </div>
             <div className="flex items-center gap-2 text-xs text-lore-muted">
                <div className="w-3 h-3 bg-gray-500 rounded-sm"></div> SOL
             </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 5,
            left: -20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis 
            dataKey="date" 
            tick={{fontSize: 10, fill: '#71717a', fontFamily: 'JetBrains Mono'}} 
            tickLine={false}
            axisLine={{stroke: '#3f3f46'}}
            minTickGap={50}
          />
          <YAxis 
            domain={['auto', 'auto']} 
            tick={{fontSize: 10, fill: '#71717a', fontFamily: 'JetBrains Mono'}} 
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '4px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
            itemStyle={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
            labelStyle={{ color: '#a1a1aa', marginBottom: '0.5rem', fontSize: '10px', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}
          />
          <Line
            type="monotone"
            dataKey="indexNav"
            name="SOLECO Index"
            stroke="#14b8a6" // Lore Primary
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#14b8a6', stroke: '#fff' }}
          />
          <Line
            type="monotone"
            dataKey="benchmarkNav"
            name="SOL Benchmark"
            stroke="#6b7280" // Lighter gray for visibility
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            activeDot={{ r: 4, fill: '#6b7280' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;
