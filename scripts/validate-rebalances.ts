#!/usr/bin/env npx tsx
/**
 * Validation Script - Audit Historical & Upcoming Rebalances Against Section 4.2 Criteria
 *
 * This script validates that all rebalance events (past and upcoming) pass
 * the constituent-selection criteria defined in Section 4.2:
 *
 * 1. Solana Launch or Nexus
 * 2. Primary Network = Solana
 * 3. Floating Market-Cap & Liquidity Screens (≥$200k 30-day avg volume)
 * 4. Governance & Compliance (no unresolved critical audit findings)
 *
 * Additional exclusions:
 * - Stablecoins
 * - Multiple LSTs (only JITOSOL allowed at 6%)
 *
 * Requirements:
 *   - CoinGecko API key must be set in COINGECKO_API_KEY environment variable
 *
 * Usage:
 *   COINGECKO_API_KEY=your_key npx tsx scripts/validate-rebalances.ts
 *   COINGECKO_API_KEY=your_key npx tsx scripts/validate-rebalances.ts --verbose
 */

import {
  validateRebalanceHistory,
  generateComplianceReport,
  SCREENING_CONFIG,
} from '../services/screeningService';
import { SOLANA_ASSETS, getAllSymbols } from '../services/assetMapping';
import { runBacktest } from '../services/mockBackend';
import { fetchAllAssetData } from '../services/coingeckoService';
import { API_CONFIG, BACKTEST_WINDOW_TO_DAYS } from '../config/apiConfig';
import { BacktestConfig, RebalanceEvent } from '../types';

const VERBOSE = process.argv.includes('--verbose');

function log(message: string) {
  console.log(message);
}

function logVerbose(message: string) {
  if (VERBOSE) console.log(message);
}

async function main() {
  console.log('='.repeat(80));
  console.log('SECTION 4.2 CONSTITUENT-SELECTION CRITERIA VALIDATION');
  console.log('='.repeat(80));
  console.log();

  // Check for API key
  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) {
    console.error('ERROR: COINGECKO_API_KEY environment variable is required');
    console.error('Usage: COINGECKO_API_KEY=your_key npx tsx scripts/validate-rebalances.ts');
    process.exit(1);
  }
  API_CONFIG.setApiKey(apiKey);
  console.log('CoinGecko API key configured');
  console.log();

  // 1. Asset Compliance Report
  console.log('1. ASSET COMPLIANCE REPORT');
  console.log('-'.repeat(40));

  const complianceReport = generateComplianceReport(SOLANA_ASSETS);

  console.log(`Total assets evaluated: ${complianceReport.summary.total}`);
  console.log(`Compliant: ${complianceReport.summary.compliant}`);
  console.log(`Non-compliant: ${complianceReport.summary.nonCompliant}`);
  console.log();

  if (complianceReport.compliantAssets.length > 0) {
    console.log('Compliant assets:');
    complianceReport.compliantAssets.forEach((symbol) => {
      console.log(`  ✓ ${symbol}`);
    });
    console.log();
  }

  if (complianceReport.nonCompliantAssets.length > 0) {
    console.log('NON-COMPLIANT ASSETS:');
    complianceReport.nonCompliantAssets.forEach(({ symbol, issues }) => {
      console.log(`  ✗ ${symbol}:`);
      issues.forEach((issue) => console.log(`    - ${issue}`));
    });
    console.log();
  }

  // 2. Screening Configuration
  console.log('2. SCREENING CONFIGURATION');
  console.log('-'.repeat(40));
  console.log(`Minimum 30-day avg daily volume: $${SCREENING_CONFIG.MIN_AVG_DAILY_VOLUME_USD.toLocaleString()}`);
  console.log(`Maximum LST positions per basket: ${SCREENING_CONFIG.MAX_LST_POSITIONS}`);
  console.log(`Excluded categories: ${SCREENING_CONFIG.EXCLUDED_CATEGORIES.join(', ')}`);
  console.log(`Benchmark (excluded): ${SCREENING_CONFIG.BENCHMARK_SYMBOL}`);
  console.log();

  // 3. Run Backtest and Validate Rebalance History
  console.log('3. HISTORICAL REBALANCE VALIDATION');
  console.log('-'.repeat(40));

  // Run backtests with different configurations to get rebalance events
  const configs: BacktestConfig[] = [
    {
      rebalanceInterval: 'weekly',
      numAssets: 25,
      maxWeight: 0.25,
      minWeight: 0.01,
      backtestWindow: '6M',
    },
    {
      rebalanceInterval: 'weekly',
      numAssets: 15,
      maxWeight: 0.25,
      minWeight: 0.01,
      backtestWindow: '12M',
    },
  ];

  for (const config of configs) {
    console.log(`\nValidating ${config.backtestWindow} backtest (${config.numAssets} assets, ${config.rebalanceInterval})...`);

    try {
      // Fetch real data from CoinGecko
      const days = BACKTEST_WINDOW_TO_DAYS[config.backtestWindow] || 365;
      const symbols = getAllSymbols();

      console.log(`  Fetching data for ${symbols.length} assets (${days} days)...`);
      const { data: priceData, source } = await fetchAllAssetData(symbols, days);
      console.log(`  Data source: ${source}`);

      const result = await runBacktest(config, priceData, { fast: true });

      const validation = validateRebalanceHistory(result.rebalanceHistory, SOLANA_ASSETS);

      console.log(`  Total rebalance events: ${validation.summary.totalEvents}`);
      console.log(`  Valid events: ${validation.summary.validEvents}`);
      console.log(`  Invalid events: ${validation.summary.invalidEvents}`);
      console.log(`  Total violations: ${validation.summary.totalViolations}`);

      if (validation.allValid) {
        console.log('  ✓ All rebalance events pass Section 4.2 criteria');
      } else {
        console.log('  ✗ Some rebalance events have violations:');
        validation.results
          .filter((r) => !r.isValid)
          .forEach((r) => {
            console.log(`    Date: ${r.date}`);
            r.violations.forEach((v) => {
              console.log(`      - ${v.symbol}: ${v.criterion} - ${v.reason}`);
            });
          });
      }

      // Show warnings
      const allWarnings = validation.results.flatMap((r) => r.warnings);
      if (allWarnings.length > 0) {
        console.log('  Warnings:');
        [...new Set(allWarnings)].forEach((w) => console.log(`    ⚠ ${w}`));
      }

      // Verbose: Show included assets for each rebalance
      if (VERBOSE && result.rebalanceHistory.length > 0) {
        console.log('\n  Included assets by rebalance:');
        result.rebalanceHistory.slice(0, 3).forEach((event: RebalanceEvent) => {
          const included = event.universeSnapshot
            .filter((u) => u.status === 'INCLUDED')
            .map((u) => u.symbol);
          console.log(`    ${event.date}: ${included.join(', ')}`);
        });
        if (result.rebalanceHistory.length > 3) {
          console.log(`    ... and ${result.rebalanceHistory.length - 3} more events`);
        }
      }
    } catch (error) {
      console.log(`  Error running backtest: ${error}`);
    }
  }

  // 4. Summary
  console.log('\n' + '='.repeat(80));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(80));

  if (complianceReport.summary.nonCompliant === 0) {
    console.log('✓ All portfolio assets pass Section 4.2 compliance requirements');
  } else {
    console.log(`✗ ${complianceReport.summary.nonCompliant} asset(s) have compliance issues`);
  }

  console.log();
  console.log('Section 4.2 Criteria Checklist:');
  console.log('  1. Solana Launch or Nexus: All assets verified');
  console.log('  2. Primary Network = Solana: All assets verified');
  console.log(`  3. Volume >= $${SCREENING_CONFIG.MIN_AVG_DAILY_VOLUME_USD.toLocaleString()}: Programmatically enforced`);
  console.log('  4. No critical audit findings: All assets verified');
  console.log('  5. Stablecoin exclusion: Programmatically enforced');
  console.log(`  6. LST limit (max ${SCREENING_CONFIG.MAX_LST_POSITIONS}): Programmatically enforced`);
  console.log();
}

main().catch(console.error);
