
// matches the POST /api/backtest/soleco request body
export interface BacktestConfig {
  rebalanceInterval: 'weekly' | 'biweekly' | 'monthly';
  numAssets: number;
  maxWeight: number;
  minWeight: number;
  backtestWindow: '6M' | '12M' | '24M' | '36M';
  startDate?: string | null;
  endDate?: string | null;
}

export interface FinancialStats {
  cumulative_return: number;
  annualized_return: number;
  annualized_volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
}

export interface SeriesData {
  code: string;
  dates: string[];
  nav: number[];
  stats: FinancialStats;
}

export interface AssetHistory {
  dates: string[];
  prices: number[];
  marketCaps: number[];
  weights: number[]; // Historical weight at each data point
}

// New Types for Audit Trail
export type DataProvider = 'CoinGecko' | 'Birdeye' | 'Jupiter' | 'Chainlink';

export interface DataDiscrepancy {
  type: 'PRICE_divergence' | 'VOLUME_threshold_conflict' | 'METADATA_conflict';
  severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
  description: string;
  providerValues: Record<string, string | number>;
  contested: boolean; // Was inclusion debated?
}

export type InclusionStatus = 'INCLUDED' | 'REJECTED_VOL' | 'REJECTED_NATIVE' | 'REJECTED_RANK' | 'REJECTED_AUDIT' | 'REJECTED_CATEGORY';

export interface UniverseSnapshotItem {
  assetId: string;
  symbol: string;
  name: string;
  price: number;
  mcap: number;
  avgDailyVol: number;
  isNative: boolean;
  status: InclusionStatus;
  weight: number; // 0 if rejected
  auditFlags: DataDiscrepancy[];
}

export interface RebalanceEvent {
  date: string;
  universeSnapshot: UniverseSnapshotItem[]; // Full universe state at this time
  totalMcap: number;
  turnover: number; // % of portfolio changed
}

export interface Constituent {
  id: string;
  symbol: string;
  name: string;
  currentWeight: number;
  history: AssetHistory;
  stats: FinancialStats;
  // Latest audit status
  activeDiscrepancies: DataDiscrepancy[]; 
}

export interface UniverseStats {
  totalEvaluated: number;
  failedVolume: number;
  failedNative: number;
  eligibleCount: number;
  finalSelected: number;
}

// matches the POST /api/backtest/soleco response body
export interface BacktestResponse {
  config: BacktestConfig;
  index: SeriesData;
  benchmark: SeriesData;
  constituents: Constituent[];
  rebalanceHistory: RebalanceEvent[]; // New audit timeline
  universeStats: UniverseStats;
}

export interface SimulationResult {
  id: string;
  config: BacktestConfig;
  stats: FinancialStats;
}

// Used for Recharts data mapping
export interface ChartDataPoint {
  date: string;
  indexNav: number;
  benchmarkNav: number;
}

export interface ConstituentChartPoint {
  date: string;
  price: number;
  marketCap: number;
  weight: number;
}

// --- DEPLOYMENT TYPES ---
export type SubscriptionPlan = 'free' | 'core' | 'pro';
export type ExchangeId = 'kraken' | 'coinbase' | 'phantom' | 'backpack';

export interface DeployedStrategy {
  id: string;
  name: string;
  createdAt: string;
  config: BacktestConfig;
  plan: SubscriptionPlan;
  exchange: ExchangeId;
  status: 'active' | 'paused' | 'syncing';
  aum: number;
  totalReturn: number; // Simulated live return
  todaysReturn: number;
}
