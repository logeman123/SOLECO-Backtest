
// matches the POST /api/backtest/soleco request body
export interface BacktestConfig {
  rebalanceInterval: 'weekly' | 'biweekly' | 'monthly';
  numAssets: number;
  maxWeight: number;
  minWeight: number;
  backtestWindow: '6M' | '12M' | '24M' | '36M';
  startDate?: string | null;
  endDate?: string | null;
  fixedWeights?: Record<string, number> | null;  // Optional fixed portfolio weights
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

// Inclusion status with rejection reasons mapped to Section 4.2 criteria
export type InclusionStatus =
  | 'INCLUDED'
  | 'REJECTED_VOL'              // Criteria 3: Failed $200k 30-day avg daily volume
  | 'REJECTED_NATIVE'           // Criteria 1: Not native to Solana
  | 'REJECTED_RANK'             // Criteria 3: Outside top decile by float-adjusted mcap
  | 'REJECTED_AUDIT'            // Criteria 4: Has unresolved critical audit findings
  | 'REJECTED_CATEGORY'         // Excluded category (Stablecoin, SOL benchmark, extra LSTs)
  | 'REJECTED_LAUNCH'           // Criteria 1: Did not launch on Solana or have Solana nexus
  | 'REJECTED_PRIMARY_NETWORK'; // Criteria 2: Solana not principal venue in 2+ of last 4 months

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
