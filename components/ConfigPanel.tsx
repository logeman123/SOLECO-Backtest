
import React, { useEffect, useState } from 'react';
import { BacktestConfig } from '../types';
import { DataSource, FetchProgress } from '../types/coingecko';
import { Play, RefreshCw, AlertCircle, ChevronDown, Save, FlaskConical, Sliders, Activity, Database, Wifi, WifiOff, Trash2 } from 'lucide-react';

interface ConfigPanelProps {
  mode: 'dashboard' | 'creator';
  config: BacktestConfig;
  setConfig: (config: BacktestConfig) => void;
  onRun: () => void;
  isLoading: boolean;
  onToggleOptimizer: () => void;
  isOptimizerOpen: boolean;
  onDeploy: () => void;
  dataSource?: DataSource;
  fetchProgress?: FetchProgress | null;
  error?: string | null;
  onClearCache?: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  mode,
  config,
  setConfig,
  onRun,
  isLoading,
  onToggleOptimizer,
  isOptimizerOpen,
  onDeploy,
  dataSource = 'mock',
  fetchProgress,
  error,
  onClearCache,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isDashboard = mode === 'dashboard';

  // Data source indicator configuration
  const dataSourceConfig = {
    real: { color: 'bg-lore-success', label: 'Live Data', icon: Wifi },
    cached: { color: 'bg-lore-warning', label: 'Cached Data', icon: Database },
    mock: { color: 'bg-lore-muted', label: 'Simulated', icon: WifiOff },
  };
  const sourceInfo = dataSourceConfig[dataSource];

  const validate = (newConfig: BacktestConfig) => {
    const newErrors: Record<string, string> = {};
    if (isNaN(newConfig.numAssets)) newErrors.numAssets = "Required";
    else if (newConfig.numAssets < 2) newErrors.numAssets = "Min 2";
    else if (newConfig.numAssets > 100) newErrors.numAssets = "Max 100";
    if (isNaN(newConfig.maxWeight)) newErrors.maxWeight = "Required";
    else if (newConfig.maxWeight > 1.0) newErrors.maxWeight = "Max 100%";
    else if (newConfig.maxWeight <= 0) newErrors.maxWeight = "> 0%";
    if (isNaN(newConfig.minWeight)) newErrors.minWeight = "Required";
    else if (newConfig.minWeight < 0) newErrors.minWeight = "No neg";
    if (!newErrors.maxWeight && !newErrors.minWeight) {
        if (newConfig.maxWeight <= newConfig.minWeight) {
            newErrors.maxWeight = "Max < Min";
        }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    validate(config);
  }, [config]);

  const handleChange = (field: keyof BacktestConfig, value: any) => {
    setConfig({ ...config, [field]: value });
  };

  const hasErrors = Object.keys(errors).length > 0;
  const safeValue = (val: number) => isNaN(val) ? '' : val;

  return (
    <div className="w-full bg-lore-surface/90 backdrop-blur-xl border-y border-lore-border/50 shadow-2xl shadow-black/50 transition-all z-40">
      <div className="max-w-[1800px] mx-auto px-4 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          
          {/* LABEL */}
          <div className="flex items-center gap-3 shrink-0 hidden xl:flex border-r border-lore-border/50 pr-6">
             <div className="p-2.5 bg-lore-primary rounded-lg text-lore-base shadow-lg shadow-lore-primary/20">
                {isDashboard ? <Activity size={18} /> : <Sliders size={18} />}
             </div>
             <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wide">{isDashboard ? 'Live Methodology' : 'Strategy Workbench'}</h2>
                <p className="text-[10px] text-lore-muted">{isDashboard ? 'Parameters & Constraints' : 'Research & Execution'}</p>
             </div>
          </div>

          {/* DATA SOURCE INDICATOR */}
          <div className="flex items-center gap-2 shrink-0 hidden lg:flex">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-lore-base border border-lore-border">
              <div className={`w-2 h-2 rounded-full ${sourceInfo.color} ${dataSource === 'real' ? 'animate-pulse' : ''}`} />
              <sourceInfo.icon size={12} className="text-lore-muted" />
              <span className="text-[10px] text-lore-muted font-mono uppercase tracking-wider">{sourceInfo.label}</span>
            </div>
            {onClearCache && dataSource !== 'mock' && (
              <button
                onClick={onClearCache}
                className="p-1.5 rounded text-lore-muted hover:text-lore-error hover:bg-lore-highlight transition-colors"
                title="Clear cached data"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {/* CONTROLS */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:flex lg:items-center gap-6 lg:gap-8">
            
            {/* 1. Schedule */}
            <div className="space-y-1.5 shrink-0 min-w-[140px]">
               <label className="text-[10px] font-bold uppercase text-lore-muted tracking-widest block">Rebalancing Schedule</label>
               <div className="relative group">
                 <select
                    className="w-full bg-lore-base border border-lore-border rounded-md px-3 py-2 text-xs font-mono text-white appearance-none focus:border-lore-primary focus:ring-1 focus:ring-lore-primary outline-none cursor-pointer transition-all"
                    value={config.rebalanceInterval}
                    onChange={(e) => handleChange('rebalanceInterval', e.target.value)}
                    disabled={isLoading}
                 >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                 </select>
                 <ChevronDown className="absolute right-3 top-2.5 text-lore-muted pointer-events-none group-hover:text-white transition-colors" size={12} />
               </div>
            </div>

            {/* 2. Portfolio Size */}
            <div className="space-y-1.5 shrink-0 min-w-[160px]">
                <div className="flex justify-between items-end">
                   <label className="text-[10px] font-bold uppercase text-lore-muted tracking-widest">Portfolio Size</label>
                   <span className="text-[10px] font-mono font-bold text-lore-primary bg-lore-primary/10 px-1.5 rounded">{safeValue(config.numAssets)} Assets</span>
                </div>
                <div className="relative flex items-center h-9">
                    <input
                        type="range"
                        min="2"
                        max="50"
                        step="1"
                        className="w-full h-1.5 bg-lore-highlight rounded-lg appearance-none cursor-pointer accent-lore-primary hover:accent-lore-primary-glow"
                        value={safeValue(config.numAssets)}
                        onChange={(e) => handleChange('numAssets', parseInt(e.target.value))}
                        disabled={isLoading}
                    />
                    {errors.numAssets && <span className="absolute -bottom-4 left-0 text-[9px] text-lore-error">{errors.numAssets}</span>}
                </div>
            </div>

            {/* 3. Weighting */}
            <div className="flex gap-4 shrink-0">
                <div className="space-y-1.5 w-24">
                    <label className="text-[10px] font-bold uppercase text-lore-muted tracking-widest block">Max Cap %</label>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.01"
                            max="1.0"
                            className={`w-full bg-lore-base border rounded-md px-3 py-2 text-xs font-mono text-white focus:border-lore-primary focus:ring-1 focus:ring-lore-primary outline-none transition-all ${errors.maxWeight ? 'border-lore-error' : 'border-lore-border'}`}
                            value={safeValue(config.maxWeight)}
                            onChange={(e) => handleChange('maxWeight', parseFloat(e.target.value))}
                            disabled={isLoading}
                        />
                         <span className="absolute right-7 top-2 text-xs text-lore-muted pointer-events-none">%</span>
                         {errors.maxWeight && <div className="absolute top-0 right-1 text-lore-error"><AlertCircle size={8} /></div>}
                    </div>
                </div>
                <div className="space-y-1.5 w-24 opacity-50 hover:opacity-100 transition-opacity">
                    <label className="text-[10px] font-bold uppercase text-lore-muted tracking-widest block">Floor %</label>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.005"
                            max="0.1"
                            className={`w-full bg-lore-base border rounded-md px-3 py-2 text-xs font-mono text-white focus:border-lore-primary focus:ring-1 focus:ring-lore-primary outline-none transition-all ${errors.minWeight ? 'border-lore-error' : 'border-lore-border'}`}
                            value={safeValue(config.minWeight)}
                            onChange={(e) => handleChange('minWeight', parseFloat(e.target.value))}
                            disabled={isLoading}
                        />
                        <span className="absolute right-7 top-2 text-xs text-lore-muted pointer-events-none">%</span>
                    </div>
                </div>
            </div>

            {/* 4. Lookback */}
            <div className="space-y-1.5 shrink-0">
               <label className="text-[10px] font-bold uppercase text-lore-muted tracking-widest block">Historical Period</label>
               <div className="flex bg-lore-base rounded-md border border-lore-border p-1">
                  {['6M', '12M', '24M', '36M'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleChange('backtestWindow', opt)}
                        disabled={isLoading}
                        className={`flex-1 px-3 py-1 text-[10px] font-mono rounded transition-all ${
                          config.backtestWindow === opt
                            ? 'bg-lore-surface text-white font-bold shadow-sm border border-lore-border'
                            : 'text-lore-muted hover:text-white hover:bg-lore-highlight'
                        }`}
                      >
                        {opt}
                      </button>
                  ))}
               </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="shrink-0 w-full lg:w-auto flex gap-3 pl-6 border-l border-lore-border/50">
            
            <button
                onClick={onToggleOptimizer}
                className={`w-10 h-10 flex items-center justify-center rounded-md border transition-all ${isOptimizerOpen ? 'bg-lore-primary/10 border-lore-primary text-lore-primary' : 'bg-lore-base border-lore-border text-lore-muted hover:text-white hover:bg-lore-highlight'}`}
                title="Strategy Optimizer"
            >
                <FlaskConical size={18} />
            </button>

            <button
              onClick={onRun}
              disabled={isLoading || hasErrors}
              className={`w-32 h-10 flex items-center justify-center gap-2 px-3 rounded-md font-bold text-xs uppercase tracking-widest transition-all ${
                isLoading || hasErrors 
                    ? 'bg-lore-highlight text-lore-muted cursor-not-allowed' 
                    : 'bg-lore-surface border border-lore-primary text-lore-primary hover:bg-lore-primary/10'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="animate-spin" size={14} />
                  <span>{fetchProgress ? `${fetchProgress.percent}%` : '...'}</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Simulate</span>
                </>
              )}
            </button>
            
            <button
              onClick={onDeploy}
              disabled={isLoading || hasErrors}
              className={`w-40 h-10 flex items-center justify-center gap-2 px-4 rounded-md font-bold text-xs uppercase tracking-widest transition-all shadow-lg ${
                isLoading || hasErrors 
                    ? 'bg-lore-highlight text-lore-muted cursor-not-allowed' 
                    : 'bg-lore-primary hover:bg-lore-primary-glow hover:shadow-lore-primary/30 text-lore-base transform active:scale-95'
              }`}
            >
                <Save size={14} />
                <span>Save to Portfolio</span>
            </button>
          </div>

        </div>

        {/* PROGRESS BAR & ERROR MESSAGE */}
        {(isLoading && fetchProgress) && (
          <div className="mt-3 pt-3 border-t border-lore-border/30">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-lore-highlight rounded-full overflow-hidden">
                <div
                  className="h-full bg-lore-primary transition-all duration-300 ease-out"
                  style={{ width: `${fetchProgress.percent}%` }}
                />
              </div>
              <span className="text-[10px] text-lore-muted font-mono shrink-0">
                {fetchProgress.currentAsset ? `Fetching ${fetchProgress.currentAsset}...` : fetchProgress.message}
              </span>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="mt-3 pt-3 border-t border-lore-border/30">
            <div className="flex items-center gap-2 text-lore-warning">
              <AlertCircle size={12} />
              <span className="text-[10px] font-mono">{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;
