import React, { useState, useEffect, useMemo } from 'react';
import { BacktestConfig, BacktestResponse, ChartDataPoint, DeployedStrategy } from './types';
import { runMockBacktest, runBacktest } from './services/mockBackend';
import { fetchAllAssetData, clearCache, getAllSymbols } from './services/coingeckoService';
import { BACKTEST_WINDOW_TO_DAYS, API_CONFIG } from './config/apiConfig';
import { DataSource, FetchProgress } from './types/coingecko';
import ConfigPanel from './components/ConfigPanel';
import StatsCard from './components/StatsCard';
import PerformanceChart from './components/PerformanceChart';
import ConstituentAnalysis from './components/ConstituentAnalysis';
import OptimizerPanel from './components/OptimizerPanel';
import ApiKeyModal from './components/ApiKeyModal';
import { LayoutDashboard, PenTool, BarChart3, Briefcase, Trash2, Calendar, PieChart, Info, Key } from 'lucide-react';

type ViewMode = 'dashboard' | 'creator' | 'portfolio';

const DEFAULT_CONFIG: BacktestConfig = {
  rebalanceInterval: 'weekly',
  numAssets: 15,
  maxWeight: 0.25,
  minWeight: 0.01,
  backtestWindow: '24M',
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

  const [dashboardConfig, setDashboardConfig] = useState<BacktestConfig>(DEFAULT_CONFIG);
  const [creatorConfig, setCreatorConfig] = useState<BacktestConfig>(DEFAULT_CONFIG);
  const activeConfig = viewMode === 'dashboard' ? dashboardConfig : creatorConfig;

  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>('mock');
  const [fetchProgress, setFetchProgress] = useState<FetchProgress | null>(null);

  const [deployedStrategies, setDeployedStrategies] = useState<DeployedStrategy[]>([]);

  // API Key Modal state
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(!API_CONFIG.hasApiKey());
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const handleRunBacktest = async (cfg: BacktestConfig) => {
    setIsLoading(true);
    setError(null);
    setFetchProgress(null);

    try {
      // Check if we should use real data
      const useRealData = API_CONFIG.USE_REAL_DATA && API_CONFIG.getApiKey();

      if (useRealData) {
        // Fetch real data from CoinGecko
        const days = BACKTEST_WINDOW_TO_DAYS[cfg.backtestWindow] || 365;
        const symbols = getAllSymbols();

        try {
          const { data: priceData, source } = await fetchAllAssetData(symbols, days, {
            onProgress: setFetchProgress,
          });

          setDataSource(source);

          // Run backtest with real data
          const response = await runBacktest(cfg, priceData);
          setResult(response);

          if (source === 'mock') {
            setError('Some data unavailable - using simulated values for missing assets');
          }
        } catch (fetchErr) {
          console.warn('Real data fetch failed, falling back to mock:', fetchErr);
          // Fall back to mock data
          const response = await runMockBacktest(cfg);
          setResult(response);
          setDataSource('mock');
          setError('Using simulated data - real data unavailable');
        }
      } else {
        // Use mock data
        const response = await runMockBacktest(cfg);
        setResult(response);
        setDataSource('mock');
      }
    } catch (err) {
      console.error(err);
      setError("Failed to run simulation. Please try again.");
    } finally {
      setIsLoading(false);
      setFetchProgress(null);
    }
  };

  const handleClearCache = async () => {
    await clearCache();
    setError('Cache cleared - next run will fetch fresh data');
  };

  const handleApiKeySubmit = async (apiKey: string) => {
    setApiKeyError(null);
    API_CONFIG.setApiKey(apiKey);

    // Validate by making a test request
    try {
      const testUrl = `${API_CONFIG.COINGECKO_BASE_URL}/ping`;
      const response = await fetch(testUrl, {
        headers: { 'x-cg-pro-api-key': apiKey },
      });

      if (!response.ok) {
        throw new Error(`Invalid API key (status ${response.status})`);
      }

      setShowApiKeyModal(false);
      // Run backtest with real data
      handleRunBacktest(DEFAULT_CONFIG);
    } catch (err) {
      API_CONFIG.clearApiKey();
      setApiKeyError(err instanceof Error ? err.message : 'Failed to validate API key');
    }
  };

  const handleApiKeySkip = () => {
    setShowApiKeyModal(false);
    // Run backtest with mock data
    handleRunBacktest(DEFAULT_CONFIG);
  };

  const handleChangeApiKey = () => {
    setShowApiKeyModal(true);
    setApiKeyError(null);
  };

  const handleTabChange = (mode: ViewMode) => {
      setViewMode(mode);
      if (mode === 'dashboard') handleRunBacktest(dashboardConfig);
      else if (mode === 'creator') handleRunBacktest(creatorConfig);
  };

  const handleApplyOptimizedConfig = (newConfig: BacktestConfig) => {
      if (viewMode === 'dashboard') setDashboardConfig(newConfig);
      else setCreatorConfig(newConfig);
      setIsOptimizerOpen(false);
      handleRunBacktest(newConfig);
  };

  // Instant Save Logic (Internal Tool)
  const handleQuickDeploy = () => {
    setIsLoading(true);
    // Simulate simple API save
    setTimeout(() => {
        const newStrategy: DeployedStrategy = {
            id: Math.random().toString(36).substr(2, 9),
            name: `Strategy ${new Date().toLocaleDateString()} (${activeConfig.numAssets} Assets)`,
            createdAt: new Date().toISOString(),
            config: { ...activeConfig },
            plan: 'core',
            exchange: 'phantom', 
            status: 'active',
            aum: 0,
            totalReturn: result ? result.index.stats.cumulative_return : 0,
            todaysReturn: (Math.random() * 0.04) - 0.02
        };
        setDeployedStrategies([...deployedStrategies, newStrategy]);
        setIsLoading(false);
        setViewMode('portfolio');
    }, 600);
  };

  const deleteStrategy = (id: string) => {
      setDeployedStrategies(deployedStrategies.filter(s => s.id !== id));
  };

  useEffect(() => {
    // Only auto-run if API key modal is not showing
    if (!showApiKeyModal) {
      handleRunBacktest(DEFAULT_CONFIG);
    }
  }, []);

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!result) return [];
    const { index, benchmark } = result;
    return index.dates.map((date, i) => ({
      date,
      indexNav: Number(index.nav[i].toFixed(2)),
      benchmarkNav: Number(benchmark.nav[i].toFixed(2)),
    }));
  }, [result]);

  return (
    <div className="min-h-screen bg-lore-base text-lore-text font-sans flex flex-col relative selection:bg-lore-primary/20">

      {/* API Key Modal */}
      {showApiKeyModal && (
        <ApiKeyModal
          onSubmit={handleApiKeySubmit}
          onSkip={handleApiKeySkip}
          error={apiKeyError}
        />
      )}

      {/* Header */}
      <header className="bg-lore-base/95 backdrop-blur border-b border-lore-border h-16 flex items-center px-6 z-50 sticky top-0 justify-between">
        <div className="flex items-center gap-3 w-48">
          <div className="bg-gradient-to-br from-lore-primary to-lore-primary-glow p-1.5 rounded-lg shadow-lg shadow-lore-primary/20">
            <LayoutDashboard size={20} className="text-lore-base" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">LORE LABS</h1>
            <span className="text-[10px] text-lore-muted font-mono tracking-widest uppercase flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-lore-warning"></span> Internal
            </span>
          </div>
        </div>

        <div className="flex items-center bg-lore-surface/50 p-1 rounded-lg border border-lore-border/50">
            <button 
                onClick={() => handleTabChange('dashboard')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
                    viewMode === 'dashboard' 
                    ? 'bg-lore-highlight text-white shadow-sm ring-1 ring-white/10' 
                    : 'text-lore-muted hover:text-white hover:bg-lore-highlight/50'
                }`}
            >
                <BarChart3 size={14} />
                Live Products
            </button>
            <div className="w-px h-4 bg-lore-border mx-1"></div>
            <button 
                 onClick={() => handleTabChange('creator')}
                 className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
                    viewMode === 'creator' 
                    ? 'bg-lore-primary text-lore-base shadow-lg shadow-lore-primary/20' 
                    : 'text-lore-muted hover:text-white hover:bg-lore-highlight/50'
                }`}
            >
                <PenTool size={14} />
                Strategy Workbench
            </button>
            <div className="w-px h-4 bg-lore-border mx-1"></div>
            <button 
                 onClick={() => handleTabChange('portfolio')}
                 className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
                    viewMode === 'portfolio' 
                    ? 'bg-white text-lore-base shadow-lg' 
                    : 'text-lore-muted hover:text-white hover:bg-lore-highlight/50'
                }`}
            >
                <Briefcase size={14} />
                My Portfolios {deployedStrategies.length > 0 && <span className="ml-1 px-1.5 rounded-full bg-lore-primary text-lore-base text-[9px]">{deployedStrategies.length}</span>}
            </button>
        </div>

        <div className="w-48 flex justify-end gap-2">
             <button
               onClick={handleChangeApiKey}
               className="flex items-center gap-2 px-3 py-1 rounded-full bg-lore-surface border border-lore-border hover:border-lore-primary/50 transition-colors"
               title="Change API Key"
             >
                <Key size={12} className={API_CONFIG.hasApiKey() ? 'text-lore-success' : 'text-lore-muted'} />
                <span className="text-[10px] text-lore-muted font-mono uppercase tracking-widest">
                  {API_CONFIG.hasApiKey() ? 'API Key Set' : 'No API Key'}
                </span>
            </button>
        </div>
      </header>

      {/* Config Panel */}
      <div className={`sticky top-16 z-40 transition-all duration-300 ease-in-out ${
          (viewMode === 'dashboard' || viewMode === 'creator') ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none h-0'
        }`}>
        <ConfigPanel
          mode={viewMode as 'dashboard' | 'creator'}
          config={activeConfig}
          setConfig={viewMode === 'dashboard' ? setDashboardConfig : setCreatorConfig}
          onRun={() => handleRunBacktest(activeConfig)}
          isLoading={isLoading}
          onToggleOptimizer={() => setIsOptimizerOpen(!isOptimizerOpen)}
          isOptimizerOpen={isOptimizerOpen}
          onDeploy={handleQuickDeploy}
          dataSource={dataSource}
          fetchProgress={fetchProgress}
          error={error}
          onClearCache={handleClearCache}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 max-w-[1800px] mx-auto w-full space-y-8">
        
        {/* PORTFOLIO VIEW */}
        {viewMode === 'portfolio' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                {deployedStrategies.length === 0 ? (
                    <div className="col-span-full h-96 flex flex-col items-center justify-center border-2 border-dashed border-lore-border rounded-xl bg-lore-surface/50">
                        <Briefcase size={48} className="text-lore-muted mb-4 opacity-50" />
                        <h3 className="text-lore-muted font-medium">No active portfolios</h3>
                        <p className="text-xs text-lore-muted/70 mt-1">Save a strategy from the Workbench to see it here.</p>
                        <button onClick={() => setViewMode('creator')} className="mt-4 text-lore-primary text-xs font-bold uppercase hover:underline">Go to Workbench</button>
                    </div>
                ) : (
                    deployedStrategies.map(strategy => (
                        <div key={strategy.id} className="bg-lore-surface border border-lore-border rounded-lg overflow-hidden shadow-lg group hover:border-lore-primary/50 transition-colors">
                            <div className="p-4 border-b border-lore-border/50 flex justify-between items-start bg-lore-base/30">
                                <div>
                                    <h3 className="font-bold text-white text-sm">{strategy.name}</h3>
                                    <div className="text-[10px] text-lore-muted font-mono mt-1">Created: {new Date(strategy.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div className="px-2 py-0.5 rounded bg-lore-success/10 text-lore-success text-[10px] font-bold uppercase border border-lore-success/20">Active</div>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[10px] text-lore-muted uppercase tracking-wider mb-1">Sim. Return</div>
                                        <div className={`text-xl font-mono font-bold ${strategy.totalReturn >= 0 ? 'text-lore-success' : 'text-lore-error'}`}>
                                            {(strategy.totalReturn * 100).toFixed(2)}%
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-lore-muted uppercase tracking-wider mb-1">Assets</div>
                                        <div className="text-xl font-mono font-bold text-white">{strategy.config.numAssets}</div>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-4 border-t border-lore-border/30">
                                     <div className="flex justify-between text-xs">
                                         <span className="text-lore-muted flex items-center gap-2"><Calendar size={12}/> Schedule</span>
                                         <span className="text-white capitalize">{strategy.config.rebalanceInterval}</span>
                                     </div>
                                     <div className="flex justify-between text-xs">
                                         <span className="text-lore-muted flex items-center gap-2"><PieChart size={12}/> Max Cap</span>
                                         <span className="text-white">{(strategy.config.maxWeight * 100).toFixed(0)}%</span>
                                     </div>
                                </div>
                            </div>
                            <div className="p-3 bg-lore-base/50 border-t border-lore-border/50 flex justify-end gap-2">
                                <button onClick={() => deleteStrategy(strategy.id)} className="text-lore-muted hover:text-lore-error p-2 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                                <button onClick={() => { 
                                    setCreatorConfig(strategy.config); 
                                    setViewMode('creator'); 
                                    handleRunBacktest(strategy.config);
                                }} className="text-lore-primary hover:text-white text-xs font-bold uppercase px-3 py-1.5 rounded hover:bg-lore-highlight transition-colors">
                                    Load in Workbench
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* WORKBENCH & DASHBOARD CONTENT */}
        {viewMode !== 'portfolio' && (
            <>
                <OptimizerPanel 
                    baseConfig={activeConfig} 
                    onApplyConfig={handleApplyOptimizedConfig} 
                    isOpen={isOptimizerOpen}
                />

                {result && (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <StatsCard 
                        title={viewMode === 'dashboard' ? "Live Index (SOLECO)" : "Workbench Strategy"}
                        stats={result.index.stats} 
                        color="brand" 
                      />
                      <StatsCard 
                        title="SOL Benchmark" 
                        stats={result.benchmark.stats} 
                        color="slate" 
                      />
                    </div>
                    
                    <div className="bg-lore-surface border border-lore-border rounded-lg p-6 flex flex-col gap-4 shadow-lg relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                           <Info size={64} />
                       </div>
                       <div className="flex items-center gap-2 text-lore-muted relative z-10">
                          <Info size={16} />
                          <span className="text-xs font-mono font-bold uppercase tracking-widest">Active Methodology</span>
                       </div>
                       <div className="relative z-10 space-y-4">
                           <div className="flex justify-between items-end border-b border-lore-border/50 pb-2">
                               <span className="text-xs text-lore-muted">Rebalancing</span>
                               <span className="text-sm font-mono font-bold text-white capitalize">{activeConfig.rebalanceInterval}</span>
                           </div>
                           <div className="flex justify-between items-end border-b border-lore-border/50 pb-2">
                               <span className="text-xs text-lore-muted">Constituents</span>
                               <span className="text-sm font-mono font-bold text-white">{activeConfig.numAssets} Assets</span>
                           </div>
                           <div className="flex justify-between items-end border-b border-lore-border/50 pb-2">
                               <span className="text-xs text-lore-muted">Weighting Cap</span>
                               <span className="text-sm font-mono font-bold text-white">{(activeConfig.maxWeight * 100).toFixed(0)}% Max</span>
                           </div>
                           <div className="pt-2">
                               <div className="text-[10px] text-lore-muted uppercase tracking-widest mb-1">Inclusion Criteria</div>
                               <div className="flex flex-wrap gap-2">
                                   <span className="px-2 py-1 rounded bg-lore-highlight text-[10px] text-lore-text border border-lore-border">Native Only</span>
                                   <span className="px-2 py-1 rounded bg-lore-highlight text-[10px] text-lore-text border border-lore-border">&gt;$200k Vol</span>
                                   <span className="px-2 py-1 rounded bg-lore-highlight text-[10px] text-lore-text border border-lore-border">No Stablecoins</span>
                               </div>
                           </div>
                       </div>
                    </div>
                  </div>
                )}

                <div className="relative min-h-[450px]">
                   {isLoading && (
                      <div className="absolute inset-0 bg-lore-base/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl border border-lore-border">
                        <div className="flex flex-col items-center animate-pulse">
                           <div className="w-10 h-10 border-2 border-lore-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                           <span className="text-lore-primary font-mono text-xs tracking-widest uppercase">Running Simulation...</span>
                        </div>
                      </div>
                   )}
                   <PerformanceChart data={chartData} />
                </div>

                {result && result.constituents && result.constituents.length > 0 && (
                  <div className="pt-8 border-t border-lore-border">
                    <ConstituentAnalysis 
                      constituents={result.constituents} 
                      universeStats={result.universeStats}
                      rebalanceHistory={result.rebalanceHistory}
                    />
                  </div>
                )}
            </>
        )}

      </main>
    </div>
  );
};

export default App;