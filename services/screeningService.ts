/**
 * Screening Service - Section 4.2 Constituent-Selection Criteria
 *
 * Implements the full screening system to evaluate tokens against all criteria:
 * 1. Solana Launch or Nexus
 * 2. Primary Network = Solana
 * 3. Floating Market-Cap & Liquidity Screens
 * 4. Governance & Compliance
 *
 * Additional exclusions:
 * - Stablecoins
 * - Multiple LSTs (only one allowed, currently JITOSOL)
 */

import { InclusionStatus, RebalanceEvent, UniverseSnapshotItem } from '../types';
import { AssetDefinition, SOLANA_ASSETS } from './assetMapping';

// Screening configuration constants (Section 4.2)
export const SCREENING_CONFIG = {
  // Criteria 3: Minimum 30-day average daily on-chain volume
  MIN_AVG_DAILY_VOLUME_USD: 200_000,

  // Maximum number of LST positions allowed per basket
  MAX_LST_POSITIONS: 1,

  // Excluded categories
  EXCLUDED_CATEGORIES: ['Stablecoin'] as const,

  // Benchmark symbol (excluded from index)
  BENCHMARK_SYMBOL: 'SOL',
};

/**
 * Result of screening a single asset
 */
export interface AssetScreeningResult {
  symbol: string;
  name: string;
  status: InclusionStatus;
  criteriaChecks: {
    // Criteria 1: Solana Launch or Nexus
    passedLaunchOrNexus: boolean;
    // Criteria 2: Primary Network = Solana
    passedPrimaryNetwork: boolean;
    // Criteria 3a: Volume threshold
    passedVolumeThreshold: boolean;
    // Criteria 3b: Market cap ranking (checked separately after filtering)
    passedMarketCapRank?: boolean;
    // Criteria 4: No unresolved audit findings
    passedAuditCompliance: boolean;
    // Additional: Category check
    passedCategoryCheck: boolean;
    // Additional: Native check
    passedNativeCheck: boolean;
  };
  marketData?: {
    price: number;
    mcap: number;
    avgDailyVol: number;
  };
  rejectionReason?: string;
}

/**
 * Result of screening the entire universe
 */
export interface UniverseScreeningResult {
  date: string;
  totalEvaluated: number;
  passed: AssetScreeningResult[];
  rejected: AssetScreeningResult[];
  rejectionSummary: {
    byLaunch: number;
    byPrimaryNetwork: number;
    byVolume: number;
    byAudit: number;
    byCategory: number;
    byNative: number;
    byRank: number;
  };
  lstCount: number;
}

/**
 * Market data input for screening
 */
export interface MarketDataInput {
  symbol: string;
  price: number;
  mcap: number;
  avgDailyVol: number;
}

/**
 * Screen a single asset against all Section 4.2 criteria
 */
export function screenAsset(
  asset: AssetDefinition,
  marketData: MarketDataInput
): AssetScreeningResult {
  const criteriaChecks = {
    // Criteria 1: Solana Launch or Nexus (manual flag)
    passedLaunchOrNexus: asset.solanaLaunchOrNexus === true,

    // Criteria 2: Primary Network = Solana (manual flag)
    passedPrimaryNetwork: asset.primaryNetworkSolana === true,

    // Criteria 3a: Volume >= $200k 30-day average
    passedVolumeThreshold: marketData.avgDailyVol >= SCREENING_CONFIG.MIN_AVG_DAILY_VOLUME_USD,

    // Criteria 4: No unresolved critical audit findings (manual flag)
    passedAuditCompliance: asset.hasUnresolvedAuditFindings === false,

    // Additional: Not a stablecoin and not the benchmark
    passedCategoryCheck:
      !SCREENING_CONFIG.EXCLUDED_CATEGORIES.includes(asset.category as 'Stablecoin') &&
      asset.symbol !== SCREENING_CONFIG.BENCHMARK_SYMBOL,

    // Additional: Native to Solana
    passedNativeCheck: asset.isNative === true,
  };

  // Determine status based on criteria (in priority order)
  let status: InclusionStatus = 'INCLUDED';
  let rejectionReason: string | undefined;

  if (!criteriaChecks.passedCategoryCheck) {
    status = 'REJECTED_CATEGORY';
    rejectionReason = asset.symbol === SCREENING_CONFIG.BENCHMARK_SYMBOL
      ? 'SOL is used as benchmark, not included in index'
      : `Asset category '${asset.category}' is excluded`;
  } else if (!criteriaChecks.passedLaunchOrNexus) {
    status = 'REJECTED_LAUNCH';
    rejectionReason = 'Failed Criteria 1: Did not launch on Solana or have Solana nexus';
  } else if (!criteriaChecks.passedPrimaryNetwork) {
    status = 'REJECTED_PRIMARY_NETWORK';
    rejectionReason = 'Failed Criteria 2: Solana is not principal venue for liquidity/activity';
  } else if (!criteriaChecks.passedNativeCheck) {
    status = 'REJECTED_NATIVE';
    rejectionReason = 'Asset is not native to Solana network';
  } else if (!criteriaChecks.passedVolumeThreshold) {
    status = 'REJECTED_VOL';
    rejectionReason = `Failed Criteria 3: Volume $${marketData.avgDailyVol.toLocaleString()} < $${SCREENING_CONFIG.MIN_AVG_DAILY_VOLUME_USD.toLocaleString()} threshold`;
  } else if (!criteriaChecks.passedAuditCompliance) {
    status = 'REJECTED_AUDIT';
    rejectionReason = 'Failed Criteria 4: Has unresolved critical-severity audit findings';
  }

  return {
    symbol: asset.symbol,
    name: asset.name,
    status,
    criteriaChecks,
    marketData: {
      price: marketData.price,
      mcap: marketData.mcap,
      avgDailyVol: marketData.avgDailyVol,
    },
    rejectionReason,
  };
}

/**
 * Screen the entire universe of assets
 */
export function screenUniverse(
  assets: AssetDefinition[],
  marketDataMap: Map<string, MarketDataInput>,
  options: {
    numAssets: number;
    date?: string;
  }
): UniverseScreeningResult {
  const date = options.date || new Date().toISOString().split('T')[0];
  const results: AssetScreeningResult[] = [];

  // Screen each asset
  for (const asset of assets) {
    const marketData = marketDataMap.get(asset.symbol);
    if (!marketData) {
      results.push({
        symbol: asset.symbol,
        name: asset.name,
        status: 'REJECTED_VOL',
        criteriaChecks: {
          passedLaunchOrNexus: false,
          passedPrimaryNetwork: false,
          passedVolumeThreshold: false,
          passedAuditCompliance: false,
          passedCategoryCheck: false,
          passedNativeCheck: false,
        },
        rejectionReason: 'No market data available',
      });
      continue;
    }
    results.push(screenAsset(asset, marketData));
  }

  // Handle LST limit: only keep the highest mcap LST
  const lstResults = results.filter(
    (r) => r.status === 'INCLUDED' && assets.find((a) => a.symbol === r.symbol)?.category === 'LST'
  );
  if (lstResults.length > SCREENING_CONFIG.MAX_LST_POSITIONS) {
    lstResults.sort((a, b) => (b.marketData?.mcap || 0) - (a.marketData?.mcap || 0));
    for (let i = SCREENING_CONFIG.MAX_LST_POSITIONS; i < lstResults.length; i++) {
      const result = results.find((r) => r.symbol === lstResults[i].symbol);
      if (result) {
        result.status = 'REJECTED_CATEGORY';
        result.rejectionReason = `Only ${SCREENING_CONFIG.MAX_LST_POSITIONS} LST position(s) allowed per basket`;
      }
    }
  }

  // Market cap ranking: select top N by mcap
  const passing = results.filter((r) => r.status === 'INCLUDED');
  passing.sort((a, b) => (b.marketData?.mcap || 0) - (a.marketData?.mcap || 0));

  // Mark those outside top N as rejected by rank
  for (let i = options.numAssets; i < passing.length; i++) {
    const result = results.find((r) => r.symbol === passing[i].symbol);
    if (result) {
      result.status = 'REJECTED_RANK';
      result.criteriaChecks.passedMarketCapRank = false;
      result.rejectionReason = `Outside top ${options.numAssets} by market cap`;
    }
  }

  // Mark top N as passing market cap rank
  for (let i = 0; i < Math.min(options.numAssets, passing.length); i++) {
    const result = results.find((r) => r.symbol === passing[i].symbol);
    if (result) {
      result.criteriaChecks.passedMarketCapRank = true;
    }
  }

  // Build summary
  const passed = results.filter((r) => r.status === 'INCLUDED');
  const rejected = results.filter((r) => r.status !== 'INCLUDED');

  return {
    date,
    totalEvaluated: results.length,
    passed,
    rejected,
    rejectionSummary: {
      byLaunch: results.filter((r) => r.status === 'REJECTED_LAUNCH').length,
      byPrimaryNetwork: results.filter((r) => r.status === 'REJECTED_PRIMARY_NETWORK').length,
      byVolume: results.filter((r) => r.status === 'REJECTED_VOL').length,
      byAudit: results.filter((r) => r.status === 'REJECTED_AUDIT').length,
      byCategory: results.filter((r) => r.status === 'REJECTED_CATEGORY').length,
      byNative: results.filter((r) => r.status === 'REJECTED_NATIVE').length,
      byRank: results.filter((r) => r.status === 'REJECTED_RANK').length,
    },
    lstCount: lstResults.length,
  };
}

/**
 * Validate a rebalance event against Section 4.2 criteria
 * Returns validation result with any violations found
 */
export interface RebalanceValidationResult {
  date: string;
  isValid: boolean;
  includedAssets: string[];
  violations: {
    symbol: string;
    criterion: string;
    reason: string;
  }[];
  warnings: string[];
}

export function validateRebalanceEvent(
  event: RebalanceEvent,
  assetDefinitions: AssetDefinition[] = SOLANA_ASSETS
): RebalanceValidationResult {
  const violations: { symbol: string; criterion: string; reason: string }[] = [];
  const warnings: string[] = [];
  const includedAssets: string[] = [];

  // Get assets that were included in this rebalance
  const includedItems = event.universeSnapshot.filter((item) => item.status === 'INCLUDED');

  for (const item of includedItems) {
    includedAssets.push(item.symbol);

    // Find the asset definition
    const assetDef = assetDefinitions.find((a) => a.symbol === item.symbol);

    if (!assetDef) {
      violations.push({
        symbol: item.symbol,
        criterion: 'Definition',
        reason: 'Asset not found in SOLANA_ASSETS definition',
      });
      continue;
    }

    // Criteria 1: Solana Launch or Nexus
    if (!assetDef.solanaLaunchOrNexus) {
      violations.push({
        symbol: item.symbol,
        criterion: 'Criteria 1: Solana Launch or Nexus',
        reason: 'Asset did not launch on Solana or have Solana nexus',
      });
    }

    // Criteria 2: Primary Network = Solana
    if (!assetDef.primaryNetworkSolana) {
      violations.push({
        symbol: item.symbol,
        criterion: 'Criteria 2: Primary Network',
        reason: 'Solana is not the principal venue for liquidity/activity',
      });
    }

    // Criteria 3: Volume threshold
    if (item.avgDailyVol < SCREENING_CONFIG.MIN_AVG_DAILY_VOLUME_USD) {
      violations.push({
        symbol: item.symbol,
        criterion: 'Criteria 3: Volume',
        reason: `Volume $${item.avgDailyVol.toLocaleString()} is below $${SCREENING_CONFIG.MIN_AVG_DAILY_VOLUME_USD.toLocaleString()} threshold`,
      });
    }

    // Criteria 4: Audit compliance
    if (assetDef.hasUnresolvedAuditFindings) {
      violations.push({
        symbol: item.symbol,
        criterion: 'Criteria 4: Governance & Compliance',
        reason: 'Asset has unresolved critical-severity audit findings',
      });
    }

    // Category check: Stablecoins
    if (assetDef.category === 'Stablecoin') {
      violations.push({
        symbol: item.symbol,
        criterion: 'Category Exclusion',
        reason: 'Stablecoins are not allowed in the basket',
      });
    }

    // Native check
    if (!assetDef.isNative) {
      violations.push({
        symbol: item.symbol,
        criterion: 'Native Check',
        reason: 'Asset is not native to Solana',
      });
    }
  }

  // LST count check
  const lstAssets = includedItems.filter((item) => {
    const def = assetDefinitions.find((a) => a.symbol === item.symbol);
    return def?.category === 'LST';
  });

  if (lstAssets.length > SCREENING_CONFIG.MAX_LST_POSITIONS) {
    violations.push({
      symbol: lstAssets.map((a) => a.symbol).join(', '),
      criterion: 'LST Limit',
      reason: `Found ${lstAssets.length} LST positions, maximum is ${SCREENING_CONFIG.MAX_LST_POSITIONS}`,
    });
  }

  // Check for SOL inclusion (should only be benchmark)
  if (includedAssets.includes('SOL')) {
    violations.push({
      symbol: 'SOL',
      criterion: 'Benchmark Exclusion',
      reason: 'SOL is the benchmark and should not be included in the index',
    });
  }

  // Add warning if compliance verification is stale (>30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const staleVerifications = assetDefinitions.filter((a) => {
    if (!a.complianceLastVerified) return true;
    return new Date(a.complianceLastVerified) < thirtyDaysAgo;
  });

  if (staleVerifications.length > 0) {
    warnings.push(
      `${staleVerifications.length} asset(s) have stale or missing compliance verification dates`
    );
  }

  return {
    date: event.date,
    isValid: violations.length === 0,
    includedAssets,
    violations,
    warnings,
  };
}

/**
 * Validate all rebalance events in history
 */
export function validateRebalanceHistory(
  rebalanceHistory: RebalanceEvent[],
  assetDefinitions: AssetDefinition[] = SOLANA_ASSETS
): {
  allValid: boolean;
  results: RebalanceValidationResult[];
  summary: {
    totalEvents: number;
    validEvents: number;
    invalidEvents: number;
    totalViolations: number;
  };
} {
  const results = rebalanceHistory.map((event) =>
    validateRebalanceEvent(event, assetDefinitions)
  );

  const validEvents = results.filter((r) => r.isValid).length;
  const invalidEvents = results.filter((r) => !r.isValid).length;
  const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0);

  return {
    allValid: invalidEvents === 0,
    results,
    summary: {
      totalEvents: rebalanceHistory.length,
      validEvents,
      invalidEvents,
      totalViolations,
    },
  };
}

/**
 * Generate a compliance report for a set of assets
 */
export function generateComplianceReport(assets: AssetDefinition[] = SOLANA_ASSETS): {
  compliantAssets: string[];
  nonCompliantAssets: { symbol: string; issues: string[] }[];
  summary: {
    total: number;
    compliant: number;
    nonCompliant: number;
  };
} {
  const compliantAssets: string[] = [];
  const nonCompliantAssets: { symbol: string; issues: string[] }[] = [];

  for (const asset of assets) {
    const issues: string[] = [];

    // Skip benchmark
    if (asset.symbol === SCREENING_CONFIG.BENCHMARK_SYMBOL) {
      continue;
    }

    // Skip excluded categories
    if (SCREENING_CONFIG.EXCLUDED_CATEGORIES.includes(asset.category as 'Stablecoin')) {
      continue;
    }

    if (!asset.solanaLaunchOrNexus) {
      issues.push('Missing Solana Launch or Nexus verification');
    }

    if (!asset.primaryNetworkSolana) {
      issues.push('Missing Primary Network = Solana verification');
    }

    if (asset.hasUnresolvedAuditFindings) {
      issues.push('Has unresolved critical audit findings');
    }

    if (!asset.isNative) {
      issues.push('Not marked as native to Solana');
    }

    if (issues.length === 0) {
      compliantAssets.push(asset.symbol);
    } else {
      nonCompliantAssets.push({ symbol: asset.symbol, issues });
    }
  }

  return {
    compliantAssets,
    nonCompliantAssets,
    summary: {
      total: compliantAssets.length + nonCompliantAssets.length,
      compliant: compliantAssets.length,
      nonCompliant: nonCompliantAssets.length,
    },
  };
}
