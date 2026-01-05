import { BacktestConfig, BacktestResponse, FinancialStats, Constituent, RebalanceEvent, UniverseSnapshotItem, DataDiscrepancy, InclusionStatus } from '../types';
import { SCREENING_CONFIG } from './screeningService';
import { SOLANA_ASSETS, AssetDefinition } from './assetMapping';

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

// Interface for normalized price data from CoinGecko
interface NormalizedPriceData {
  dates: string[];
  prices: number[];
  marketCaps: number[];
  volumes: number[];
}

// Interface for custom asset info passed to backtest
export interface CustomAssetInfo {
  symbol: string;
  name: string;
  coingeckoId: string;
  // Section 4.2 compliance (attested by user)
  solanaLaunchOrNexus: boolean;
  primaryNetworkSolana: boolean;
  hasUnresolvedAuditFindings: boolean;
  category?: 'DeFi' | 'Meme' | 'Infra' | 'LST' | 'AI' | 'DePIN' | 'NFT' | 'Other';
}

// Internal asset representation for backtest
interface BacktestAsset {
  symbol: string;
  name: string;
  isNative: boolean;
  category: string;
  solanaLaunchOrNexus: boolean;
  primaryNetworkSolana: boolean;
  hasUnresolvedAuditFindings: boolean;
}

// Run backtest with real price data
export const runBacktest = async (
  config: BacktestConfig,
  priceData: Map<string, NormalizedPriceData>,
  options?: {
    fast?: boolean;
    customAssets?: CustomAssetInfo[];
  }
): Promise<BacktestResponse> => {
  const { fast = false, customAssets = [] } = options || {};
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

  // Build universe from asset mapping + custom assets
  const defaultUniverse: BacktestAsset[] = SOLANA_ASSETS
    .filter(a => availableSymbols.includes(a.symbol))
    .map(a => ({
      symbol: a.symbol,
      name: a.name,
      isNative: a.isNative,
      category: a.category,
      solanaLaunchOrNexus: a.solanaLaunchOrNexus,
      primaryNetworkSolana: a.primaryNetworkSolana,
      hasUnresolvedAuditFindings: a.hasUnresolvedAuditFindings,
    }));

  // Convert custom assets to BacktestAsset format
  const customUniverse: BacktestAsset[] = customAssets
    .filter(a => availableSymbols.includes(a.symbol))
    .map(a => ({
      symbol: a.symbol,
      name: a.name,
      isNative: true, // Custom assets attested as Solana native
      category: a.category || 'Other',
      solanaLaunchOrNexus: a.solanaLaunchOrNexus,
      primaryNetworkSolana: a.primaryNetworkSolana,
      hasUnresolvedAuditFindings: a.hasUnresolvedAuditFindings,
    }));

  const fullUniverse = [...defaultUniverse, ...customUniverse];

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

          // Apply Section 4.2 Constituent-Selection Criteria
          // Category exclusions (Stablecoins, SOL benchmark)
          if (asset.category === 'Stablecoin') status = 'REJECTED_CATEGORY';
          else if (asset.symbol === 'SOL') status = 'REJECTED_CATEGORY';
          // Criteria 1: Solana Launch or Nexus
          else if (!asset.solanaLaunchOrNexus) status = 'REJECTED_LAUNCH';
          // Criteria 2: Primary Network = Solana
          else if (!asset.primaryNetworkSolana) status = 'REJECTED_PRIMARY_NETWORK';
          // Native check
          else if (!asset.isNative) status = 'REJECTED_NATIVE';
          // Criteria 3: Volume threshold ($200k 30-day avg)
          else if (currentVol < SCREENING_CONFIG.MIN_AVG_DAILY_VOLUME_USD) status = 'REJECTED_VOL';
          // Criteria 4: Governance & Compliance
          else if (asset.hasUnresolvedAuditFindings) status = 'REJECTED_AUDIT';

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
            auditFlags: []
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
      activeDiscrepancies: []
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
