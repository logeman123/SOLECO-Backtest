
import { BacktestConfig, BacktestResponse, FinancialStats, Constituent, UniverseStats, RebalanceEvent, UniverseSnapshotItem, DataDiscrepancy, InclusionStatus, SimulationResult } from '../types';

// Base Mock Assets with Methodology Properties
interface MockAssetBase {
  symbol: string;
  name: string;
  basePrice: number;
  baseMcap: number;
  avgDailyVol: number; 
  isNative: boolean;   
  category: 'L1' | 'DeFi' | 'Meme' | 'Infra' | 'Stablecoin' | 'LST' | 'AI' | 'DePIN' | 'NFT';
}

// 25 Specific Assets based on User Ground Truth
const REAL_SOLANA_ASSETS: MockAssetBase[] = [
  // 1. PUMP (Massive)
  { symbol: 'PUMP', name: 'Pump.fun', basePrice: 1.0, baseMcap: 2.96e9, avgDailyVol: 450e6, isNative: true, category: 'Meme' },
  
  // 2. JUP
  { symbol: 'JUP', name: 'Jupiter', basePrice: 1.1, baseMcap: 1.78e9, avgDailyVol: 100e6, isNative: true, category: 'DeFi' },
  
  // 3. PYTH
  { symbol: 'PYTH', name: 'Pyth Network', basePrice: 0.35, baseMcap: 782e6, avgDailyVol: 40e6, isNative: true, category: 'Infra' },
  
  // 4. GRASS (AI)
  { symbol: 'GRASS', name: 'Grass', basePrice: 1.5, baseMcap: 332e6, avgDailyVol: 45e6, isNative: true, category: 'AI' },

  // 5. ZBCN
  { symbol: 'ZBCN', name: 'Zebec Network', basePrice: 0.003, baseMcap: 321e6, avgDailyVol: 15e6, isNative: true, category: 'DeFi' },

  // 6. MEW
  { symbol: 'MEW', name: 'cat in a dogs world', basePrice: 0.004, baseMcap: 300e6, avgDailyVol: 20e6, isNative: true, category: 'Meme' },

  // 7. TRUMP
  { symbol: 'TRUMP', name: 'Official Trump', basePrice: 4.0, baseMcap: 150e6, avgDailyVol: 10e6, isNative: true, category: 'Meme' },

  // 8. ORCA
  { symbol: 'ORCA', name: 'Orca', basePrice: 2.1, baseMcap: 110e6, avgDailyVol: 5e6, isNative: true, category: 'DeFi' },

  // 10. POPCAT
  { symbol: 'POPCAT', name: 'Popcat', basePrice: 0.4, baseMcap: 106e6, avgDailyVol: 10e6, isNative: true, category: 'Meme' },

  // 11. BOME (Corrected to ~50M)
  { symbol: 'BOME', name: 'Book of Meme', basePrice: 0.008, baseMcap: 50e6, avgDailyVol: 15e6, isNative: true, category: 'Meme' },

  // 12. PENGU
  { symbol: 'PENGU', name: 'Pudgy Penguins', basePrice: 0.05, baseMcap: 40e6, avgDailyVol: 2e6, isNative: true, category: 'NFT' },

  // 13. SAROS
  { symbol: 'SAROS', name: 'Saros', basePrice: 0.005, baseMcap: 25e6, avgDailyVol: 1e6, isNative: true, category: 'DeFi' },

  // --- LSTs & Benchmark Exclusions ---
  { symbol: 'SOL', name: 'Solana', basePrice: 145, baseMcap: 65e9, avgDailyVol: 2e9, isNative: true, category: 'L1' },
  { symbol: 'JITOSOL', name: 'Jito Staked SOL', basePrice: 160, baseMcap: 2.5e9, avgDailyVol: 60e6, isNative: true, category: 'LST' },
  
  // --- Other High Profile for Context ---
  { symbol: 'RENDER', name: 'Render', basePrice: 7.5, baseMcap: 3.5e9, avgDailyVol: 100e6, isNative: true, category: 'DePIN' },
  { symbol: 'WIF', name: 'dogwifhat', basePrice: 2.5, baseMcap: 2.5e9, avgDailyVol: 400e6, isNative: true, category: 'Meme' },
  { symbol: 'BONK', name: 'Bonk', basePrice: 0.000025, baseMcap: 1.5e9, avgDailyVol: 150e6, isNative: true, category: 'Meme' },
  { symbol: 'HNT', name: 'Helium', basePrice: 4.2, baseMcap: 800e6, avgDailyVol: 15e6, isNative: true, category: 'DePIN' },
  { symbol: 'RAY', name: 'Raydium', basePrice: 1.8, baseMcap: 450e6, avgDailyVol: 25e6, isNative: true, category: 'DeFi' },
  { symbol: 'JTO', name: 'Jito', basePrice: 2.8, baseMcap: 380e6, avgDailyVol: 30e6, isNative: true, category: 'DeFi' },
  { symbol: 'DRIFT', name: 'Drift', basePrice: 0.7, baseMcap: 150e6, avgDailyVol: 10e6, isNative: true, category: 'DeFi' },
  { symbol: 'KMNO', name: 'Kamino', basePrice: 0.08, baseMcap: 80e6, avgDailyVol: 5e6, isNative: true, category: 'DeFi' },
  { symbol: 'MET', name: 'Meteora', basePrice: 0.1, baseMcap: 60e6, avgDailyVol: 2e6, isNative: true, category: 'DeFi' },
  { symbol: 'FARTCOIN', name: 'Fartcoin', basePrice: 0.04, baseMcap: 30e6, avgDailyVol: 800000, isNative: true, category: 'Meme' },
  { symbol: 'PNUT', name: 'Peanut the Squirrel', basePrice: 0.1, baseMcap: 80e6, avgDailyVol: 5e6, isNative: true, category: 'Meme' },
  { symbol: 'W', name: 'Wormhole', basePrice: 0.35, baseMcap: 900e6, avgDailyVol: 35e6, isNative: true, category: 'Infra' },
];

// Helper: Generate date array
const generateDates = (months: number): string[] => {
  const dates: string[] = [];
  const today = new Date();
  const days = months * 30;
  
  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

// Helper: Standard Deviation (exported for reuse)
export const calculateStdDev = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
};

// Helper: Calculate financial stats (exported for reuse)
export const calculateStats = (nav: number[]): FinancialStats => {
  if (nav.length < 2) {
    return {
      cumulative_return: 0,
      annualized_return: 0,
      annualized_volatility: 0,
      sharpe_ratio: 0,
      max_drawdown: 0
    };
  }

  const startNav = nav[0];
  const endNav = nav[nav.length - 1];
  const cumulative_return = (endNav / startNav) - 1;

  const dailyReturns: number[] = [];
  let peak = -Infinity;
  let maxDrawdown = 0;

  for (let i = 1; i < nav.length; i++) {
    const ret = (nav[i] / nav[i-1]) - 1;
    dailyReturns.push(ret);
    if (nav[i] > peak) peak = nav[i];
    const drawdown = (nav[i] / peak) - 1;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }

  const daysInPeriod = nav.length;
  const annualized_return = Math.pow(1 + cumulative_return, 365 / daysInPeriod) - 1;
  const dailyVol = calculateStdDev(dailyReturns);
  const annualized_volatility = dailyVol * Math.sqrt(365);
  const sharpe_ratio = annualized_volatility === 0 ? 0 : annualized_return / annualized_volatility;

  return {
    cumulative_return,
    annualized_return,
    annualized_volatility,
    sharpe_ratio,
    max_drawdown: maxDrawdown
  };
};

// Helper: Generate Random Walk
const generateRandomWalk = (length: number, startValue: number, drift: number, vol: number): number[] => {
  const nav = [startValue];
  let current = startValue;
  for (let i = 1; i < length; i++) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    
    const change = drift + (vol * z);
    current = Math.max(0.0000001, current * (1 + change));
    nav.push(current);
  }
  return nav;
};

// --- DETERMINISTIC DATA GENERATION ---
const MAX_DAYS = 36 * 30 + 30; // Buffer
const GLOBAL_DATES = generateDates(36); // Max dates (approx 3 years)
const GLOBAL_ASSET_DATA: Record<string, { prices: number[], mcaps: number[], vols: number[] }> = {};

// Initialize Mock Data Once
REAL_SOLANA_ASSETS.forEach(asset => {
    const volMod = Math.max(0.5, 10e9 / asset.baseMcap); 
    const assetVol = 0.03 + (Math.random() * 0.03 * Math.min(2, volMod)); 
    const assetDrift = (Math.random() * 0.0025) - 0.0005;
    
    const prices = generateRandomWalk(GLOBAL_DATES.length, asset.basePrice, assetDrift, assetVol);
    const supply = asset.baseMcap / asset.basePrice;
    const mcaps = prices.map((p, idx) => p * supply * (1 + (idx/GLOBAL_DATES.length * 0.05)));
    
    const vols = prices.map(() => {
        const noise = (Math.random() - 0.5) * 0.4; 
        return asset.avgDailyVol * (1 + noise);
    });
    
    GLOBAL_ASSET_DATA[asset.symbol] = { prices, mcaps, vols };
});

// Simulate discrepancies
const simulateAuditChecks = (asset: MockAssetBase, currentVol: number): DataDiscrepancy[] => {
  const discrepancies: DataDiscrepancy[] = [];
  
  if (currentVol > 180000 && currentVol < 220000) {
    if (Math.random() < 0.3) {
      discrepancies.push({
        type: 'VOLUME_threshold_conflict',
        severity: 'CRITICAL',
        description: 'Conflicting volume reports across providers crossing $200k threshold.',
        providerValues: {
          'CoinGecko': `$${(currentVol * 1.05).toFixed(0)}`,
          'Birdeye': `$${(currentVol * 0.90).toFixed(0)}`, 
          'Jupiter': `$${(currentVol * 1.02).toFixed(0)}`,
        },
        contested: true
      });
    }
  }
  return discrepancies;
};

export const runMockBacktest = async (config: BacktestConfig, fast = false): Promise<BacktestResponse> => {
  // Artificial delay for UX only if not in fast mode
  if (!fast) {
      await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Trim to backtest window or custom date range
  let dates: string[];

  if (config.startDate && config.endDate) {
    // Use custom date range
    const startIdx = GLOBAL_DATES.findIndex(d => d >= config.startDate!);
    const endIdx = GLOBAL_DATES.findIndex(d => d > config.endDate!);
    dates = GLOBAL_DATES.slice(
      startIdx >= 0 ? startIdx : 0,
      endIdx >= 0 ? endIdx : GLOBAL_DATES.length
    );
  } else {
    // Use backtest window
    const monthMap: Record<string, number> = { '6M': 6, '12M': 12, '24M': 24, '36M': 36 };
    const reqMonths = monthMap[config.backtestWindow] || 12;
    const reqDays = reqMonths * 30;
    const startIndex = Math.max(0, GLOBAL_DATES.length - reqDays);
    dates = GLOBAL_DATES.slice(startIndex);
  }

  // 1. Slice Asset Data - find start index based on first date in dates array
  const dataStartIndex = GLOBAL_DATES.indexOf(dates[0]);
  const assetDataMap: Record<string, { prices: number[], mcaps: number[], vols: number[] }> = {};
  REAL_SOLANA_ASSETS.forEach(asset => {
      const fullData = GLOBAL_ASSET_DATA[asset.symbol];
      assetDataMap[asset.symbol] = {
          prices: fullData.prices.slice(dataStartIndex, dataStartIndex + dates.length),
          mcaps: fullData.mcaps.slice(dataStartIndex, dataStartIndex + dates.length),
          vols: fullData.vols.slice(dataStartIndex, dataStartIndex + dates.length)
      };
  });

  // 2. Run Strategy
  const fullUniverse = [...REAL_SOLANA_ASSETS];
  const rebalanceHistory: RebalanceEvent[] = [];
  const rebalanceIntervalDays = config.rebalanceInterval === 'weekly' ? 7 : config.rebalanceInterval === 'biweekly' ? 14 : 30;
  
  const weightHistoryMap: Record<string, number[]> = {};
  fullUniverse.forEach(a => weightHistoryMap[a.symbol] = new Array(dates.length).fill(0));

  let currentPortfolio: { symbol: string, shares: number, weight: number }[] = [];

  for (let d = 0; d < dates.length; d++) {
    const isRebalanceDay = d % rebalanceIntervalDays === 0 || d === 0;

    if (isRebalanceDay) {
        // --- REBALANCE LOGIC ---
        const evaluatedUniverse: UniverseSnapshotItem[] = fullUniverse.map(asset => {
            const currentVol = assetDataMap[asset.symbol].vols[d];
            const currentMcap = assetDataMap[asset.symbol].mcaps[d];
            const currentPrice = assetDataMap[asset.symbol].prices[d];
            
            let status: InclusionStatus = 'INCLUDED';
            
            if (asset.category === 'Stablecoin') status = 'REJECTED_CATEGORY'; 
            else if (asset.symbol === 'SOL') status = 'REJECTED_CATEGORY'; 
            else if (!asset.isNative) status = 'REJECTED_NATIVE';
            else if (currentVol < 200000) status = 'REJECTED_VOL';

            const auditFlags = simulateAuditChecks(asset, currentVol);
            
            return {
                assetId: `asset-${asset.symbol}`,
                symbol: asset.symbol,
                name: asset.name,
                price: currentPrice,
                mcap: currentMcap,
                avgDailyVol: currentVol,
                isNative: asset.isNative,
                status,
                weight: 0,
                auditFlags
            };
        });

        // LST Handling: Only allow ONE LST
        const lstCandidates = evaluatedUniverse.filter(u => 
            fullUniverse.find(a => a.symbol === u.symbol)?.category === 'LST' && u.status === 'INCLUDED'
        );
        if (lstCandidates.length > 1) {
            lstCandidates.sort((a, b) => b.mcap - a.mcap);
            for (let i = 1; i < lstCandidates.length; i++) {
                lstCandidates[i].status = 'REJECTED_CATEGORY';
            }
        }

        const candidates = evaluatedUniverse.filter(u => u.status === 'INCLUDED');
        candidates.sort((a, b) => b.mcap - a.mcap);

        const selected = candidates.slice(0, config.numAssets);
        candidates.slice(config.numAssets).forEach(c => {
            const originalItem = evaluatedUniverse.find(u => u.symbol === c.symbol);
            if (originalItem) originalItem.status = 'REJECTED_RANK';
        });

        const totalRawMcap = selected.reduce((sum, item) => sum + item.mcap, 0);
        const initialWeights = selected.map(item => ({ symbol: item.symbol, rawWeight: item.mcap / totalRawMcap }));
        
        let surplus = 0;
        let weightConfig = initialWeights.map(w => {
            if (w.rawWeight > config.maxWeight) {
                surplus += w.rawWeight - config.maxWeight;
                return { ...w, weight: config.maxWeight, capped: true };
            }
            return { ...w, weight: w.rawWeight, capped: false };
        });

        if (surplus > 0) {
            const uncappedCount = weightConfig.filter(w => !w.capped).length;
            if (uncappedCount > 0) {
                weightConfig = weightConfig.map(w => !w.capped ? { ...w, weight: w.weight + (surplus/uncappedCount) } : w);
            }
        }

        weightConfig.forEach(w => {
            const uItem = evaluatedUniverse.find(u => u.symbol === w.symbol);
            if (uItem) uItem.weight = w.weight;
        });

        currentPortfolio = weightConfig.map(w => {
            const price = assetDataMap[w.symbol].prices[d];
            return { symbol: w.symbol, shares: w.weight / price, weight: w.weight };
        });

        rebalanceHistory.push({
            date: dates[d],
            universeSnapshot: evaluatedUniverse,
            totalMcap: totalRawMcap,
            turnover: 0 
        });

    } else {
        // --- DRIFT LOGIC ---
        let totalVal = 0;
        const driftPortfolio = currentPortfolio.map(p => {
            const price = assetDataMap[p.symbol].prices[d];
            const val = p.shares * price;
            totalVal += val;
            return { ...p, val };
        });
        
        driftPortfolio.forEach(p => {
            p.weight = p.val / totalVal;
            currentPortfolio.find(cp => cp.symbol === p.symbol)!.weight = p.weight;
        });
    }

    currentPortfolio.forEach(p => {
        weightHistoryMap[p.symbol][d] = p.weight;
    });
  }

  // 4. Final Response
  const eligibleVol = fullUniverse.filter(a => {
      const data = assetDataMap[a.symbol];
      const avg = data.vols.reduce((x,y) => x+y, 0) / data.vols.length;
      return avg >= 200000;
  });
  const failedNative = eligibleVol.filter(a => !a.isNative).length;
  const failedVolume = fullUniverse.length - eligibleVol.length;
  
  const activeSymbols = Object.keys(weightHistoryMap).filter(sym => {
      return weightHistoryMap[sym].some(w => w > 0);
  });

  const constituents: Constituent[] = activeSymbols.map(sym => {
      const assetBase = fullUniverse.find(u => u.symbol === sym)!;
      const data = assetDataMap[sym];
      const weights = weightHistoryMap[sym];
      const latestVol = data.vols[dates.length - 1];
      const activeDiscrepancies = simulateAuditChecks(assetBase, latestVol);

      return {
        id: `asset-${sym}`,
        symbol: sym,
        name: assetBase.name,
        currentWeight: weights[weights.length - 1],
        history: { dates, prices: data.prices, marketCaps: data.mcaps, weights },
        stats: calculateStats(data.prices),
        activeDiscrepancies
      };
  }).sort((a, b) => b.currentWeight - a.currentWeight);

  // Benchmark: SOL
  const solPrices = assetDataMap['SOL'].prices;
  const solStartPrice = solPrices[0];
  const benchmarkNav = solPrices.map(p => (p / solStartPrice) * 100);
  const benchmarkStats = calculateStats(benchmarkNav);
  
  const indexNav: number[] = [100];
  for (let d = 1; d < dates.length; d++) {
      let dailyRet = 0;
      const prevWeights = activeSymbols.map(sym => ({ sym, w: weightHistoryMap[sym][d-1] }));
      prevWeights.forEach(pw => {
          if (pw.w > 0) {
             const prices = assetDataMap[pw.sym].prices;
             const r = (prices[d] / prices[d-1]) - 1;
             dailyRet += pw.w * r;
          }
      });
      indexNav.push(indexNav[d-1] * (1 + dailyRet));
  }

  return {
    config,
    index: { code: 'SOLECO', dates, nav: indexNav, stats: calculateStats(indexNav) },
    benchmark: { code: 'SOL', dates, nav: benchmarkNav, stats: benchmarkStats },
    constituents,
    rebalanceHistory,
    universeStats: {
        totalEvaluated: fullUniverse.length,
        failedVolume,
        failedNative,
        eligibleCount: eligibleVol.length - failedNative,
        finalSelected: config.numAssets
    }
  };
};

export const runStrategyOptimizer = async (baseConfig: BacktestConfig): Promise<SimulationResult[]> => {
    const results: SimulationResult[] = [];
    const rebalanceOptions: BacktestConfig['rebalanceInterval'][] = ['weekly', 'biweekly', 'monthly'];
    const assetCounts = [5, 10, 15, 20, 25];
    const maxWeights = [0.10, 0.20, 0.30, 0.50];

    // Initial Baseline Run to get Benchmark Stats
    const baseline = await runMockBacktest(baseConfig, true);
    const benchmarkStats = baseline.benchmark.stats;

    for (const reb of rebalanceOptions) {
        for (const assets of assetCounts) {
            for (const maxW of maxWeights) {
                const runConfig: BacktestConfig = {
                    ...baseConfig,
                    rebalanceInterval: reb,
                    numAssets: assets,
                    maxWeight: maxW,
                    minWeight: 0.01 
                };
                const result = await runMockBacktest(runConfig, true);
                results.push({
                    id: `${reb}-${assets}-${maxW}`,
                    config: runConfig,
                    stats: result.index.stats
                });
            }
        }
    }
    results.sort((a, b) => b.stats.sharpe_ratio - a.stats.sharpe_ratio);
    // Attach benchmark stats to results (hacky way to pass it back if needed, or just handle in UI)
    // For now we just return strategy results
    return results;
};

// Interface for normalized price data from CoinGecko
interface NormalizedPriceData {
  dates: string[];
  prices: number[];
  marketCaps: number[];
  volumes: number[];
}

// Run backtest with real price data
export const runBacktest = async (
  config: BacktestConfig,
  priceData: Map<string, NormalizedPriceData>,
  fast = false
): Promise<BacktestResponse> => {
  if (!fast) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Get all available symbols from price data
  const availableSymbols = Array.from(priceData.keys());

  // Use SOL (benchmark) dates as reference since it has full history
  // This allows newer tokens to be included with forward-fill for missing early dates
  const solData = priceData.get('SOL');
  if (!solData) {
    throw new Error('SOL data required for benchmark');
  }
  const dates = solData.dates;

  // Trim to backtest window or custom date range
  let backtestDates: string[];

  if (config.startDate && config.endDate) {
    // Use custom date range
    const startIdx = dates.findIndex(d => d >= config.startDate!);
    const endIdx = dates.findIndex(d => d > config.endDate!);
    backtestDates = dates.slice(
      startIdx >= 0 ? startIdx : 0,
      endIdx >= 0 ? endIdx : dates.length
    );
  } else {
    // Use backtest window
    const monthMap: Record<string, number> = { '6M': 6, '12M': 12, '24M': 24, '36M': 36 };
    const reqMonths = monthMap[config.backtestWindow] || 12;
    const reqDays = reqMonths * 30;
    const startIndex = Math.max(0, dates.length - reqDays);
    backtestDates = dates.slice(startIndex);
  }

  // Build asset data map with date-aligned data
  const assetDataMap: Record<string, { prices: number[], mcaps: number[], vols: number[] }> = {};

  for (const [symbol, data] of priceData.entries()) {
    // Find indices for backtest dates in this asset's data
    const dateToIdx = new Map(data.dates.map((d, i) => [d, i]));
    const prices: number[] = [];
    const mcaps: number[] = [];
    const vols: number[] = [];

    for (const date of backtestDates) {
      const idx = dateToIdx.get(date);
      if (idx !== undefined) {
        prices.push(data.prices[idx]);
        mcaps.push(data.marketCaps[idx]);
        vols.push(data.volumes[idx]);
      } else {
        // If date not found, use previous value (forward fill)
        prices.push(prices.length > 0 ? prices[prices.length - 1] : data.prices[0]);
        mcaps.push(mcaps.length > 0 ? mcaps[mcaps.length - 1] : data.marketCaps[0]);
        vols.push(vols.length > 0 ? vols[vols.length - 1] : data.volumes[0]);
      }
    }

    assetDataMap[symbol] = { prices, mcaps, vols };
  }

  // Build universe from asset mapping
  const fullUniverse = REAL_SOLANA_ASSETS.filter(a => availableSymbols.includes(a.symbol));

  const rebalanceHistory: RebalanceEvent[] = [];
  const rebalanceIntervalDays = config.rebalanceInterval === 'weekly' ? 7 : config.rebalanceInterval === 'biweekly' ? 14 : 30;

  const weightHistoryMap: Record<string, number[]> = {};
  fullUniverse.forEach(a => weightHistoryMap[a.symbol] = new Array(backtestDates.length).fill(0));

  let currentPortfolio: { symbol: string, shares: number, weight: number }[] = [];

  for (let d = 0; d < backtestDates.length; d++) {
    const isRebalanceDay = d % rebalanceIntervalDays === 0 || d === 0;

    if (isRebalanceDay) {
      // --- REBALANCE LOGIC ---

      // Check if using fixed weights (Live Products mode)
      if (config.fixedWeights && d === 0) {
        // Use fixed weights - only set on first day, then drift
        const fixedWeightConfig: { symbol: string; weight: number }[] = [];
        for (const [symbol, weight] of Object.entries(config.fixedWeights)) {
          if (assetDataMap[symbol]) {
            fixedWeightConfig.push({ symbol, weight });
          }
        }

        currentPortfolio = fixedWeightConfig.map(w => {
          const price = assetDataMap[w.symbol]?.prices[d] || 1;
          return { symbol: w.symbol, shares: w.weight / price, weight: w.weight };
        });

        // Build simple universe snapshot for fixed weights
        const evaluatedUniverse: UniverseSnapshotItem[] = fixedWeightConfig.map(w => {
          const asset = fullUniverse.find(a => a.symbol === w.symbol);
          const assetData = assetDataMap[w.symbol];
          return {
            assetId: `asset-${w.symbol}`,
            symbol: w.symbol,
            name: asset?.name || w.symbol,
            price: assetData?.prices[d] || 0,
            mcap: assetData?.mcaps[d] || 0,
            avgDailyVol: assetData?.vols[d] || 0,
            isNative: asset?.isNative || true,
            status: 'INCLUDED' as InclusionStatus,
            weight: w.weight,
            auditFlags: []
          };
        });

        rebalanceHistory.push({
          date: backtestDates[d],
          universeSnapshot: evaluatedUniverse,
          totalMcap: evaluatedUniverse.reduce((sum, u) => sum + u.mcap, 0),
          turnover: 0
        });

      } else if (!config.fixedWeights) {
        // Dynamic mcap-weighted rebalancing (Strategy Workbench mode)
        const evaluatedUniverse: UniverseSnapshotItem[] = fullUniverse.map(asset => {
          const assetData = assetDataMap[asset.symbol];
          if (!assetData) {
            return {
              assetId: `asset-${asset.symbol}`,
              symbol: asset.symbol,
              name: asset.name,
              price: 0,
              mcap: 0,
              avgDailyVol: 0,
              isNative: asset.isNative,
              status: 'REJECTED_VOL' as InclusionStatus,
              weight: 0,
              auditFlags: []
            };
          }

          const currentVol = assetData.vols[d];
          const currentMcap = assetData.mcaps[d];
          const currentPrice = assetData.prices[d];

          let status: InclusionStatus = 'INCLUDED';

          if (asset.category === 'Stablecoin') status = 'REJECTED_CATEGORY';
          else if (asset.symbol === 'SOL') status = 'REJECTED_CATEGORY';
          else if (!asset.isNative) status = 'REJECTED_NATIVE';
          else if (currentVol < 200000) status = 'REJECTED_VOL';

          const auditFlags = simulateAuditChecks(asset, currentVol);

          return {
            assetId: `asset-${asset.symbol}`,
            symbol: asset.symbol,
            name: asset.name,
            price: currentPrice,
            mcap: currentMcap,
            avgDailyVol: currentVol,
            isNative: asset.isNative,
            status,
            weight: 0,
            auditFlags
          };
        });

        // LST Handling: Only allow ONE LST
        const lstCandidates = evaluatedUniverse.filter(u =>
          fullUniverse.find(a => a.symbol === u.symbol)?.category === 'LST' && u.status === 'INCLUDED'
        );
        if (lstCandidates.length > 1) {
          lstCandidates.sort((a, b) => b.mcap - a.mcap);
          for (let i = 1; i < lstCandidates.length; i++) {
            lstCandidates[i].status = 'REJECTED_CATEGORY';
          }
        }

        const candidates = evaluatedUniverse.filter(u => u.status === 'INCLUDED');
        candidates.sort((a, b) => b.mcap - a.mcap);

        const selected = candidates.slice(0, config.numAssets);
        candidates.slice(config.numAssets).forEach(c => {
          const originalItem = evaluatedUniverse.find(u => u.symbol === c.symbol);
          if (originalItem) originalItem.status = 'REJECTED_RANK';
        });

        const totalRawMcap = selected.reduce((sum, item) => sum + item.mcap, 0);
        const initialWeights = selected.map(item => ({ symbol: item.symbol, rawWeight: item.mcap / totalRawMcap }));

        let surplus = 0;
        let weightConfig = initialWeights.map(w => {
          if (w.rawWeight > config.maxWeight) {
            surplus += w.rawWeight - config.maxWeight;
            return { ...w, weight: config.maxWeight, capped: true };
          }
          return { ...w, weight: w.rawWeight, capped: false };
        });

        if (surplus > 0) {
          const uncappedCount = weightConfig.filter(w => !w.capped).length;
          if (uncappedCount > 0) {
            weightConfig = weightConfig.map(w => !w.capped ? { ...w, weight: w.weight + (surplus/uncappedCount) } : w);
          }
        }

        weightConfig.forEach(w => {
          const uItem = evaluatedUniverse.find(u => u.symbol === w.symbol);
          if (uItem) uItem.weight = w.weight;
        });

        currentPortfolio = weightConfig.map(w => {
          const price = assetDataMap[w.symbol]?.prices[d] || 1;
          return { symbol: w.symbol, shares: w.weight / price, weight: w.weight };
        });

        rebalanceHistory.push({
          date: backtestDates[d],
          universeSnapshot: evaluatedUniverse,
          totalMcap: totalRawMcap,
          turnover: 0
        });
      }

    } else if (!config.fixedWeights) {
      // --- DRIFT LOGIC (only for dynamic weighting, not fixed weights) ---
      let totalVal = 0;
      const driftPortfolio = currentPortfolio.map(p => {
        const price = assetDataMap[p.symbol]?.prices[d] || 1;
        const val = p.shares * price;
        totalVal += val;
        return { ...p, val };
      });

      driftPortfolio.forEach(p => {
        p.weight = totalVal > 0 ? p.val / totalVal : 0;
        const cp = currentPortfolio.find(cp => cp.symbol === p.symbol);
        if (cp) cp.weight = p.weight;
      });
    }
    // For fixed weights, keep the original weights (no drift)

    currentPortfolio.forEach(p => {
      if (weightHistoryMap[p.symbol]) {
        weightHistoryMap[p.symbol][d] = p.weight;
      }
    });
  }

  // Calculate eligibility stats
  const eligibleVol = fullUniverse.filter(a => {
    const data = assetDataMap[a.symbol];
    if (!data) return false;
    const avg = data.vols.reduce((x,y) => x+y, 0) / data.vols.length;
    return avg >= 200000;
  });
  const failedNative = eligibleVol.filter(a => !a.isNative).length;
  const failedVolume = fullUniverse.length - eligibleVol.length;

  const activeSymbols = Object.keys(weightHistoryMap).filter(sym => {
    return weightHistoryMap[sym].some(w => w > 0);
  });

  const constituents: Constituent[] = activeSymbols.map(sym => {
    const assetBase = fullUniverse.find(u => u.symbol === sym)!;
    const data = assetDataMap[sym];
    const weights = weightHistoryMap[sym];
    const latestVol = data?.vols[backtestDates.length - 1] || 0;
    const activeDiscrepancies = simulateAuditChecks(assetBase, latestVol);

    return {
      id: `asset-${sym}`,
      symbol: sym,
      name: assetBase.name,
      currentWeight: weights[weights.length - 1],
      history: {
        dates: backtestDates,
        prices: data?.prices || [],
        marketCaps: data?.mcaps || [],
        weights
      },
      stats: calculateStats(data?.prices || []),
      activeDiscrepancies
    };
  }).sort((a, b) => b.currentWeight - a.currentWeight);

  // Benchmark: SOL
  const solBenchmarkData = assetDataMap['SOL'];
  const solPrices = solBenchmarkData?.prices || [];
  const solStartPrice = solPrices[0] || 1;
  const benchmarkNav = solPrices.map(p => (p / solStartPrice) * 100);
  const benchmarkStats = calculateStats(benchmarkNav);

  // Calculate index NAV
  const indexNav: number[] = [100];
  for (let d = 1; d < backtestDates.length; d++) {
    let dailyRet = 0;
    const prevWeights = activeSymbols.map(sym => ({ sym, w: weightHistoryMap[sym][d-1] }));
    prevWeights.forEach(pw => {
      if (pw.w > 0) {
        const prices = assetDataMap[pw.sym]?.prices;
        if (prices && prices[d] && prices[d-1]) {
          const r = (prices[d] / prices[d-1]) - 1;
          dailyRet += pw.w * r;
        }
      }
    });
    indexNav.push(indexNav[d-1] * (1 + dailyRet));
  }

  return {
    config,
    index: { code: 'SOLECO', dates: backtestDates, nav: indexNav, stats: calculateStats(indexNav) },
    benchmark: { code: 'SOL', dates: backtestDates, nav: benchmarkNav, stats: benchmarkStats },
    constituents,
    rebalanceHistory,
    universeStats: {
      totalEvaluated: fullUniverse.length,
      failedVolume,
      failedNative,
      eligibleCount: eligibleVol.length - failedNative,
      finalSelected: config.numAssets
    }
  };
};