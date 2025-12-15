
import React, { useState, useMemo, useEffect } from 'react';
import { Constituent, ConstituentChartPoint, UniverseStats, RebalanceEvent, UniverseSnapshotItem } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { PieChart, Activity, Layers, History, XCircle, CheckCircle2, Search, AlertCircle } from 'lucide-react';

interface ConstituentAnalysisProps {
  constituents: Constituent[];
  universeStats?: UniverseStats;
  rebalanceHistory?: RebalanceEvent[];
}

const ConstituentAnalysis: React.FC<ConstituentAnalysisProps> = ({ constituents, universeStats, rebalanceHistory }) => {
  const [viewMode, setViewMode] = useState<'detail' | 'composition' | 'audit'>('detail');
  const [inspectorTab, setInspectorTab] = useState<'all' | 'included' | 'rejected'>('all');
  
  // --- TIMELINE STATE ---
  const [timelineIndex, setTimelineIndex] = useState<number>(0);
  
  useEffect(() => {
      if (rebalanceHistory && rebalanceHistory.length > 0) {
          setTimelineIndex(rebalanceHistory.length - 1);
      }
  }, [rebalanceHistory]);

  const currentRebalanceEvent = rebalanceHistory ? rebalanceHistory[timelineIndex] : null;

  // --- SELECTION STATE ---
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
      if (constituents.length > 0 && !selectedId) {
          setSelectedId(constituents[0].id);
      }
  }, [constituents, selectedId]);

  const selectedGlobalAsset = useMemo(
    () => constituents.find(c => c.id === selectedId) || constituents[0],
    [constituents, selectedId]
  );

  // --- CHART DATA ---
  const chartData: ConstituentChartPoint[] = useMemo(() => {
    if (!selectedGlobalAsset) return [];
    return selectedGlobalAsset.history.dates.map((date, i) => ({
      date,
      price: selectedGlobalAsset.history.prices[i],
      marketCap: selectedGlobalAsset.history.marketCaps[i],
      weight: (selectedGlobalAsset.history.weights[i] || 0) * 100
    }));
  }, [selectedGlobalAsset]);

  const compositionData = useMemo(() => {
      if (!constituents.length) return [];
      const dates = constituents[0].history.dates;
      const step = Math.ceil(dates.length / 60); 
      return dates.filter((_, i) => i % step === 0).map((date, idx) => {
          const point: any = { date };
          const realIndex = idx * step;
          constituents.forEach(c => {
             const weight = c.history.weights[realIndex] || 0;
             if (weight > 0.001) {
                point[c.symbol] = weight * 100;
             }
          });
          return point;
      });
  }, [constituents]);

  // Helper formatting
  const formatMcap = (val: number) => val >= 1e9 ? `$${(val / 1e9).toFixed(2)}B` : val >= 1e6 ? `$${(val / 1e6).toFixed(0)}M` : `$${val.toFixed(0)}`;
  const formatVol = (val: number) => val >= 1e6 ? `$${(val / 1e6).toFixed(1)}M` : `$${(val / 1e3).toFixed(0)}k`;
  const colors = ['#14b8a6', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#84cc16', '#06b6d4', '#6366f1', '#a855f7', '#ec4899'];

  // Filter Inspector List
  const inspectorList = useMemo(() => {
      if (!currentRebalanceEvent) return [];
      const allAssets = [...currentRebalanceEvent.universeSnapshot];
      allAssets.sort((a, b) => b.mcap - a.mcap);

      if (inspectorTab === 'included') {
          return allAssets.filter(i => i.status === 'INCLUDED');
      } else if (inspectorTab === 'rejected') {
          return allAssets.filter(i => i.status !== 'INCLUDED');
      }
      return allAssets;
  }, [currentRebalanceEvent, inspectorTab]);

  const getStatusReason = (item: UniverseSnapshotItem) => {
      switch(item.status) {
          case 'INCLUDED': return { text: 'Qualified', color: 'text-lore-success', sub: 'Met all criteria' };
          case 'REJECTED_VOL': return { text: 'Liquidity Failed', color: 'text-lore-error', sub: 'Vol < $200k' };
          case 'REJECTED_NATIVE': return { text: 'Not Native', color: 'text-lore-error', sub: 'Primary chain check' };
          case 'REJECTED_RANK': return { text: 'Rank Too Low', color: 'text-lore-warning', sub: 'Outside target count' };
          case 'REJECTED_AUDIT': return { text: 'Audit Fail', color: 'text-lore-error', sub: 'Critical issues' };
          case 'REJECTED_CATEGORY': return { text: 'Excluded Type', color: 'text-lore-muted', sub: 'LST / Stable / Benchmark' };
          default: return { text: 'Rejected', color: 'text-lore-muted', sub: 'Unknown' };
      }
  };

  if (!constituents || constituents.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
        
      {/* Methodology Stats (Dark Cards) */}
      {universeStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-lore-surface p-4 rounded-lg border border-lore-border">
              <div className="flex items-center gap-3 px-2">
                  <div className="p-2 bg-lore-highlight rounded text-lore-muted"><Activity size={20} /></div>
                  <div>
                      <div className="text-[10px] text-lore-muted font-bold uppercase tracking-widest">Evaluated</div>
                      <div className="text-lg font-mono text-white">{universeStats.totalEvaluated} Assets</div>
                  </div>
              </div>
              <div className="flex items-center gap-3 px-2 border-l border-lore-border">
                  <div className="p-2 bg-lore-error/10 rounded text-lore-error"><XCircle size={20} /></div>
                  <div>
                      <div className="text-[10px] text-lore-muted font-bold uppercase tracking-widest">Filtered Out</div>
                      <div className="text-lg font-mono text-lore-error">-{universeStats.failedVolume + universeStats.failedNative}</div>
                  </div>
              </div>
              <div className="flex items-center gap-3 px-2 border-l border-lore-border">
                  <div className="p-2 bg-lore-primary/10 rounded text-lore-primary"><CheckCircle2 size={20} /></div>
                  <div>
                      <div className="text-[10px] text-lore-muted font-bold uppercase tracking-widest">Eligible</div>
                      <div className="text-lg font-mono text-lore-primary">{universeStats.eligibleCount}</div>
                  </div>
              </div>
              <div className="flex items-center gap-3 px-2 border-l border-lore-border bg-lore-highlight/20 rounded-r">
                   <div className="p-2 bg-lore-primary rounded text-lore-base"><PieChart size={20} /></div>
                  <div>
                      <div className="text-[10px] text-lore-primary font-bold uppercase tracking-widest">Selected</div>
                      <div className="text-lg font-mono text-white">{universeStats.finalSelected}</div>
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[600px]">
        
        {/* LEFT: Controls & List */}
        <div className="xl:col-span-4 bg-lore-surface rounded-lg border border-lore-border flex flex-col h-full overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-4 border-b border-lore-border bg-lore-base/50 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lore-text font-bold flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Layers size={16} className="text-lore-primary" />
                    Analysis Mode
                </h3>
                <div className="flex gap-1 bg-lore-base p-1 rounded border border-lore-border">
                    <button onClick={() => setViewMode('detail')} className={`p-1.5 rounded ${viewMode === 'detail' ? 'bg-lore-highlight text-lore-primary shadow-sm' : 'text-lore-muted hover:text-white'}`} title="Deep Dive"><Activity size={14} /></button>
                    <button onClick={() => setViewMode('composition')} className={`p-1.5 rounded ${viewMode === 'composition' ? 'bg-lore-highlight text-lore-primary shadow-sm' : 'text-lore-muted hover:text-white'}`} title="History"><Layers size={14} /></button>
                    <button onClick={() => setViewMode('audit')} className={`p-1.5 rounded ${viewMode === 'audit' ? 'bg-lore-highlight text-lore-primary shadow-sm' : 'text-lore-muted hover:text-white'}`} title="Inspector"><History size={14} /></button>
                </div>
            </div>

            {viewMode === 'audit' && rebalanceHistory && (
                <div className="bg-lore-base p-3 rounded border border-lore-border">
                    <div className="flex justify-between text-[10px] font-bold text-lore-muted mb-2 uppercase tracking-widest">
                        <span>Rebalance Date</span>
                        <span className="text-lore-primary">{currentRebalanceEvent?.date}</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max={rebalanceHistory.length - 1} 
                        value={timelineIndex}
                        onChange={(e) => setTimelineIndex(parseInt(e.target.value))}
                        className="w-full h-1 bg-lore-highlight rounded-lg appearance-none cursor-pointer accent-lore-primary"
                    />
                </div>
            )}
          </div>

          {/* Asset List */}
          <div className="flex-1 overflow-y-auto">
            {viewMode === 'audit' ? (
                 // INSPECTOR LIST CONTROLS
                 <div className="flex flex-col h-full">
                    {/* Filter Segmented Control */}
                    <div className="grid grid-cols-3 p-2 gap-1 border-b border-lore-border bg-lore-base/30">
                        <button 
                            onClick={() => setInspectorTab('all')}
                            className={`py-1.5 text-[10px] font-mono uppercase rounded transition-all ${inspectorTab === 'all' ? 'bg-lore-highlight text-white shadow-sm font-bold border border-lore-border' : 'text-lore-muted hover:text-white hover:bg-lore-highlight/50'}`}
                         >
                             All
                         </button>
                         <button 
                            onClick={() => setInspectorTab('included')}
                            className={`py-1.5 text-[10px] font-mono uppercase rounded transition-all ${inspectorTab === 'included' ? 'bg-lore-success/10 text-lore-success border border-lore-success/20 font-bold shadow-sm' : 'text-lore-muted hover:text-white hover:bg-lore-highlight/50'}`}
                         >
                             Included
                         </button>
                         <button 
                            onClick={() => setInspectorTab('rejected')}
                            className={`py-1.5 text-[10px] font-mono uppercase rounded transition-all ${inspectorTab === 'rejected' ? 'bg-lore-error/10 text-lore-error border border-lore-error/20 font-bold shadow-sm' : 'text-lore-muted hover:text-white hover:bg-lore-highlight/50'}`}
                         >
                             Rejected
                         </button>
                     </div>
                     
                     {/* Compact List for Sidebar */}
                     <div className="flex-1 overflow-y-auto bg-lore-base/30">
                        {inspectorList.length === 0 && (
                            <div className="p-8 text-center text-lore-muted text-xs italic">
                                No assets found for this filter.
                            </div>
                        )}
                        {inspectorList.map((item, i) => {
                            const info = getStatusReason(item);
                            return (
                                <div key={item.assetId} className="px-4 py-3 border-b border-lore-border/30 hover:bg-lore-highlight/50 transition-colors flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className="text-[10px] font-mono text-lore-muted w-4 opacity-50">#{i+1}</div>
                                        <div>
                                            <div className="font-bold text-xs text-lore-text">{item.symbol}</div>
                                            <div className="text-[10px] text-lore-muted font-mono">{formatMcap(item.mcap)}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-[10px] font-bold uppercase ${info.color}`}>{info.text}</div>
                                        {/* Only show detail on hover to save space */}
                                        <div className="text-[9px] text-lore-muted opacity-60">{info.sub}</div>
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                 </div>
            ) : (
                 // STANDARD LIST
                 <table className="w-full text-left text-sm">
                    <thead className="bg-lore-base sticky top-0 z-10 text-[10px] font-mono uppercase text-lore-muted">
                        <tr>
                            <th className="px-4 py-2 font-normal">Asset</th>
                            <th className="px-4 py-2 text-right font-normal">Weight</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-lore-border/30">
                        {constituents.map(asset => (
                            <tr 
                                key={asset.id} 
                                onClick={() => setSelectedId(asset.id)}
                                className={`cursor-pointer hover:bg-lore-highlight transition-colors ${selectedId === asset.id ? 'bg-lore-highlight border-l-2 border-lore-primary' : 'border-l-2 border-transparent'}`}
                            >
                                <td className="px-4 py-3">
                                    <div className="font-bold text-lore-text">{asset.symbol}</div>
                                    <div className="text-xs text-lore-muted">{asset.name}</div>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-lore-primary-glow">
                                    {(asset.currentWeight * 100).toFixed(2)}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            )}
          </div>
        </div>

        {/* RIGHT: Visualization */}
        <div className="xl:col-span-8 bg-lore-surface rounded-lg border border-lore-border flex flex-col overflow-hidden">
            
            {viewMode === 'detail' && selectedGlobalAsset && (
                 <div className="flex flex-col h-full p-6 space-y-4">
                      <div className="flex justify-between items-start">
                          <div>
                              <h2 className="text-2xl font-bold text-white tracking-tight">{selectedGlobalAsset.name}</h2>
                              <span className="text-lore-primary font-mono text-sm">{selectedGlobalAsset.symbol}</span>
                          </div>
                          <div className="text-right">
                              <div className="text-[10px] text-lore-muted uppercase font-bold tracking-widest">Total Return</div>
                              <div className={`text-2xl font-bold font-mono ${selectedGlobalAsset.stats.cumulative_return >= 0 ? 'text-lore-success' : 'text-lore-error'}`}>
                                  {(selectedGlobalAsset.stats.cumulative_return * 100).toFixed(2)}%
                              </div>
                          </div>
                      </div>
                      
                      {/* Price & Mcap Chart */}
                      <div className="flex-1 min-h-0">
                          <div className="h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData} syncId="constituentSync">
                                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                      <XAxis dataKey="date" hide />
                                      <YAxis yAxisId="left" orientation="left" stroke="#2dd4bf" tickFormatter={(val) => `$${val}`} tick={{fontSize: 10, fontFamily: 'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                                      <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" tickFormatter={(val) => `$${(val/1e6).toFixed(0)}M`} tick={{fontSize: 10, fontFamily: 'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                                      <Tooltip 
                                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                                          itemStyle={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                                      />
                                      <Legend />
                                      <Line yAxisId="left" type="monotone" dataKey="price" stroke="#2dd4bf" strokeWidth={2} dot={false} name="Price ($)" />
                                      <Line yAxisId="right" type="monotone" dataKey="marketCap" stroke="#3b82f6" strokeWidth={2} dot={false} name="Market Cap" />
                                  </LineChart>
                            </ResponsiveContainer>
                          </div>
                      </div>

                      {/* Weight Chart */}
                      <div className="h-32 border-t border-lore-border/50 pt-4">
                          <h4 className="text-[10px] font-bold text-lore-muted uppercase tracking-widest mb-2">Index Weight Allocation</h4>
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} syncId="constituentSync">
                                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                  <XAxis dataKey="date" minTickGap={50} stroke="#71717a" tick={{fontSize: 10, fontFamily: 'JetBrains Mono'}} />
                                  <YAxis stroke="#d946ef" tickFormatter={(val) => `${val}%`} tick={{fontSize: 10, fontFamily: 'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                                  <Tooltip 
                                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                                      itemStyle={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                                      formatter={(val: number) => val.toFixed(2) + '%'}
                                  />
                                  <Area type="stepAfter" dataKey="weight" stroke="#d946ef" fill="#d946ef" fillOpacity={0.1} strokeWidth={2} name="Weight %" />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                 </div>
            )}

            {viewMode === 'composition' && (
                <div className="flex flex-col h-full p-6">
                    <h2 className="text-lg font-bold text-white mb-4">Portfolio Composition</h2>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={compositionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="date" minTickGap={50} stroke="#71717a" tick={{fontSize: 10, fontFamily: 'JetBrains Mono'}} />
                                <YAxis unit="%" stroke="#71717a" tick={{fontSize: 10, fontFamily: 'JetBrains Mono'}} />
                                <Tooltip 
                                    formatter={(val: number) => val.toFixed(2) + '%'} 
                                    itemSorter={(item) => (item.value as number) * -1}
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', maxHeight: '200px', overflow: 'auto' }}
                                    itemStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                                />
                                {constituents.slice(0, 10).map((c, i) => (
                                    <Area 
                                        key={c.id} 
                                        type="monotone" 
                                        dataKey={c.symbol} 
                                        stackId="1" 
                                        stroke={colors[i % colors.length]} 
                                        fill={colors[i % colors.length]} 
                                        fillOpacity={0.6}
                                    />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                        <p className="text-center text-[10px] font-mono text-lore-muted mt-2 uppercase">* Top 10 Constituents Shown</p>
                    </div>
                </div>
            )}

            {viewMode === 'audit' && (
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-lore-border bg-lore-base/30 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Search size={18} className="text-lore-primary" />
                                Rebalance Audit: <span className="font-mono text-lore-primary">{currentRebalanceEvent?.date}</span>
                            </h2>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-lore-base sticky top-0 shadow-sm z-10 text-[10px] font-mono uppercase text-lore-muted">
                                <tr>
                                    <th className="px-6 py-3 font-normal">Asset</th>
                                    <th className="px-6 py-3 font-normal">Market Cap</th>
                                    <th className="px-6 py-3 font-normal">Methodology Check</th>
                                    <th className="px-6 py-3 font-normal text-right">Outcome</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-lore-border/30">
                                {inspectorList.map((item, index) => {
                                    const info = getStatusReason(item);
                                    return (
                                        <tr key={item.assetId} className="hover:bg-lore-highlight group transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-lore-muted text-xs w-6">#{index + 1}</span>
                                                    <div>
                                                        <div className="font-bold text-lore-text">{item.symbol}</div>
                                                        <div className="text-xs text-lore-muted">{item.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 font-mono text-lore-text text-xs">
                                                {formatMcap(item.mcap)}
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex flex-col gap-1 text-xs font-mono">
                                                    {/* Native Check */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lore-muted w-12">Native:</span>
                                                        {item.isNative 
                                                            ? <span className="text-lore-success flex items-center gap-1"><CheckCircle2 size={10}/> Pass</span>
                                                            : <span className="text-lore-error flex items-center gap-1"><XCircle size={10}/> Fail</span>
                                                        }
                                                    </div>
                                                    {/* Volume Check */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lore-muted w-12">Volume:</span>
                                                        <span className={item.avgDailyVol >= 200000 ? 'text-lore-text' : 'text-lore-error font-bold'}>
                                                            {formatVol(item.avgDailyVol)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                 <div className={`text-xs font-bold uppercase ${info.color}`}>{info.text}</div>
                                                 <div className="text-[10px] text-lore-muted">{info.sub}</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default ConstituentAnalysis;
