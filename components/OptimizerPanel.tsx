
import React, { useState, useMemo } from 'react';
import { BacktestConfig, SimulationResult } from '../types';
import { runBacktest } from '../services/mockBackend';
import { fetchAllAssetData, getAllSymbols } from '../services/coingeckoService';
import { BACKTEST_WINDOW_TO_DAYS, API_CONFIG } from '../config/apiConfig';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FlaskConical, Play, ArrowRight } from 'lucide-react';

interface OptimizerPanelProps {
  baseConfig: BacktestConfig;
  onApplyConfig: (config: BacktestConfig) => void;
  isOpen: boolean;
}

// Strategy optimizer that runs parameter sweeps using real data
async function runStrategyOptimizer(baseConfig: BacktestConfig): Promise<SimulationResult[]> {
  // Check API key
  if (!API_CONFIG.getApiKey()) {
    throw new Error('API key required for optimizer');
  }

  // First, fetch all data once (to avoid re-fetching for each iteration)
  const days = BACKTEST_WINDOW_TO_DAYS[baseConfig.backtestWindow] || 365;
  const symbols = getAllSymbols();
  const { data: priceData } = await fetchAllAssetData(symbols, days);

  // Define parameter variations
  const numAssetsOptions = [5, 10, 15, 20, 25];
  const maxWeightOptions = [0.15, 0.20, 0.25, 0.30];
  const rebalanceOptions: ('weekly' | 'biweekly' | 'monthly')[] = ['weekly', 'biweekly', 'monthly'];

  const results: SimulationResult[] = [];

  // Run backtests for each combination
  for (const numAssets of numAssetsOptions) {
    for (const maxWeight of maxWeightOptions) {
      for (const rebalanceInterval of rebalanceOptions) {
        const config: BacktestConfig = {
          ...baseConfig,
          numAssets,
          maxWeight,
          rebalanceInterval,
        };

        try {
          const result = await runBacktest(config, priceData, { fast: true });
          results.push({
            id: `sim-${numAssets}-${maxWeight}-${rebalanceInterval}`,
            config,
            stats: result.index.stats,
          });
        } catch (error) {
          console.warn(`Optimizer iteration failed for config:`, config, error);
        }
      }
    }
  }

  // Sort by Sharpe ratio (highest first)
  results.sort((a, b) => b.stats.sharpe_ratio - a.stats.sharpe_ratio);

  return results;
}

const OptimizerPanel: React.FC<OptimizerPanelProps> = ({ baseConfig, onApplyConfig, isOpen }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const simResults = await runStrategyOptimizer(baseConfig);
      setResults(simResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimizer failed');
    } finally {
      setIsRunning(false);
    }
  };

  const topResults = useMemo(() => {
      return results ? results.slice(0, 5) : [];
  }, [results]);

  const chartData = useMemo(() => {
      if (!results) return [];
      return results.map(r => ({
          x: Number((r.stats.annualized_volatility * 100).toFixed(2)), // Volatility
          y: Number((r.stats.annualized_return * 100).toFixed(2)),     // Return
          z: r.stats.sharpe_ratio,
          config: r.config
      }));
  }, [results]);

  if (!isOpen) return null;

  return (
    <div className="w-full max-w-[1800px] mx-auto mt-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="bg-lore-surface border border-lore-primary/20 rounded-lg shadow-2xl shadow-lore-primary/5 overflow-hidden relative">

            {/* Header / Control Bar */}
            <div className="p-4 border-b border-lore-border flex flex-col md:flex-row justify-between items-center gap-4 bg-lore-surface">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-lore-primary/10 rounded text-lore-primary">
                        <FlaskConical size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Strategy Optimizer</h3>
                        <p className="text-[11px] text-lore-muted">Simulate 60+ parameter combinations to maximize Sharpe Ratio.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {error && (
                        <span className="text-lore-error text-xs">{error}</span>
                    )}
                    {!isRunning && !results && (
                        <button
                            onClick={handleRun}
                            className="flex items-center gap-2 px-6 py-2 bg-lore-primary hover:bg-lore-primary-glow text-lore-base font-bold rounded text-xs uppercase tracking-widest transition-all shadow-lg shadow-lore-primary/20"
                        >
                            <Play size={14} /> Run Simulation Sweep
                        </button>
                    )}
                    {isRunning && (
                        <div className="flex items-center gap-3 text-lore-primary text-xs font-mono uppercase tracking-widest">
                             <div className="w-4 h-4 border-2 border-lore-primary border-t-transparent rounded-full animate-spin"></div>
                             Running Iterations...
                        </div>
                    )}
                    {results && !isRunning && (
                        <button
                            onClick={handleRun}
                            className="flex items-center gap-2 px-4 py-2 bg-lore-highlight hover:text-white text-lore-muted font-medium rounded text-xs uppercase tracking-widest transition-colors"
                        >
                            Re-Run
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            {results && (
                <div className="grid grid-cols-1 lg:grid-cols-3 border-t border-lore-border/50">

                    {/* LEFT: Efficient Frontier Chart */}
                    <div className="lg:col-span-2 p-6 border-r border-lore-border/50 bg-lore-base/30">
                        <h4 className="text-xs font-bold text-lore-muted uppercase tracking-widest mb-4">Risk / Return Landscape</h4>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                    <XAxis type="number" dataKey="x" name="Volatility" unit="%" tick={{fontSize: 10, fill: '#71717a'}} stroke="#3f3f46" label={{ value: 'Ann. Volatility', position: 'bottom', offset: 0, fill: '#71717a', fontSize: 10 }} />
                                    <YAxis type="number" dataKey="y" name="Return" unit="%" tick={{fontSize: 10, fill: '#71717a'}} stroke="#3f3f46" label={{ value: 'Ann. Return', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 10 }} />
                                    <Tooltip
                                        cursor={{ strokeDasharray: '3 3' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-lore-surface border border-lore-border p-2 rounded shadow-xl text-xs font-mono">
                                                        <div className="text-lore-primary font-bold mb-1">Sharpe: {data.z.toFixed(2)}</div>
                                                        <div className="text-lore-muted">Return: {data.y}%</div>
                                                        <div className="text-lore-muted">Risk: {data.x}%</div>
                                                        <div className="mt-2 pt-2 border-t border-lore-border text-[10px]">
                                                            Assets: {data.config.numAssets} | Max: {data.config.maxWeight*100}% | {data.config.rebalanceInterval}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Scatter name="Simulations" data={chartData} fill="#8884d8">
                                        {chartData.map((entry, index) => {
                                            // Color mapping based on Sharpe Ratio
                                            // Assuming sharpe range 0.5 - 2.5
                                            const intensity = Math.min(1, Math.max(0, (entry.z - 0.5) / 2));
                                            // Interpolate Red to Green/Teal
                                            const r = Math.round(244 * (1 - intensity) + 20 * intensity);
                                            const g = Math.round(63 * (1 - intensity) + 184 * intensity);
                                            const b = Math.round(94 * (1 - intensity) + 166 * intensity);
                                            return <Cell key={`cell-${index}`} fill={`rgb(${r},${g},${b})`} />;
                                        })}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* RIGHT: Top Performers List */}
                    <div className="p-0 bg-lore-surface flex flex-col h-[350px]">
                         <div className="p-4 border-b border-lore-border bg-lore-highlight/10">
                             <h4 className="text-xs font-bold text-lore-primary uppercase tracking-widest">Top Configurations</h4>
                         </div>
                         <div className="overflow-y-auto flex-1">
                             {topResults.map((res, idx) => (
                                 <div key={idx} className="p-4 border-b border-lore-border/50 hover:bg-lore-highlight/20 transition-colors group">
                                     <div className="flex justify-between items-start mb-2">
                                         <div className="flex items-center gap-2">
                                             <span className="font-mono text-xs text-lore-muted">#{idx + 1}</span>
                                             <div className="text-sm font-bold text-white">Sharpe: {res.stats.sharpe_ratio.toFixed(2)}</div>
                                         </div>
                                         <button
                                            onClick={() => onApplyConfig(res.config)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] uppercase font-bold text-lore-primary hover:underline"
                                         >
                                             Apply <ArrowRight size={10} />
                                         </button>
                                     </div>

                                     <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-lore-muted">
                                         <div className="bg-lore-base p-1.5 rounded border border-lore-border text-center">
                                             <span className="block text-[9px] opacity-60">Assets</span>
                                             <span className="text-lore-text">{res.config.numAssets}</span>
                                         </div>
                                         <div className="bg-lore-base p-1.5 rounded border border-lore-border text-center">
                                             <span className="block text-[9px] opacity-60">Rebalance</span>
                                             <span className="text-lore-text capitalize">{res.config.rebalanceInterval}</span>
                                         </div>
                                         <div className="bg-lore-base p-1.5 rounded border border-lore-border text-center">
                                             <span className="block text-[9px] opacity-60">Max Wgt</span>
                                             <span className="text-lore-text">{res.config.maxWeight * 100}%</span>
                                         </div>
                                     </div>

                                     <div className="mt-2 flex justify-between text-[10px] text-lore-muted">
                                          <span>Ret: <span className="text-lore-success">{(res.stats.annualized_return * 100).toFixed(1)}%</span></span>
                                          <span>Vol: <span className="text-lore-warning">{(res.stats.annualized_volatility * 100).toFixed(1)}%</span></span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>
            )}

            {!results && !isRunning && (
                 <div className="p-12 text-center text-lore-muted flex flex-col items-center justify-center h-[350px]">
                     <FlaskConical size={48} className="mb-4 opacity-20" />
                     <p className="text-sm max-w-md">
                        The optimizer will run varying combinations of asset counts, weight caps, and rebalance schedules against real market data to find the optimal risk-adjusted return.
                     </p>
                 </div>
            )}

        </div>
    </div>
  );
};

export default OptimizerPanel;
