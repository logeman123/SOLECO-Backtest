/**
 * Test script to verify CoinGecko API integration and backtest functionality
 * Run with: npx tsx test-backtest.ts
 */

// CoinGecko API configuration
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || process.env.VITE_COINGECKO_API_KEY || '';
const COINGECKO_BASE_URL = 'https://pro-api.coingecko.com/api/v3';

if (!COINGECKO_API_KEY) {
  console.error('Error: COINGECKO_API_KEY environment variable is required');
  console.error('Set it with: export COINGECKO_API_KEY=your_key_here');
  console.error('Or: export VITE_COINGECKO_API_KEY=your_key_here');
  process.exit(1);
}

// Official SOLECO portfolio assets from ltp_portfolio.txt
const TEST_ASSETS = [
  { symbol: 'SOL', coingeckoId: 'solana' },  // Benchmark
  { symbol: 'PUMP', coingeckoId: 'pump-fun' },
  { symbol: 'JITOSOL', coingeckoId: 'jito-staked-sol' },
  { symbol: 'TRUMP', coingeckoId: 'official-trump' },
  { symbol: 'RENDER', coingeckoId: 'render-token' },
  { symbol: 'JUP', coingeckoId: 'jupiter-exchange-solana' },
  { symbol: 'BONK', coingeckoId: 'bonk' },
  { symbol: 'PENGU', coingeckoId: 'pudgy-penguins' },
  { symbol: 'PYTH', coingeckoId: 'pyth-network' },
  { symbol: 'WIF', coingeckoId: 'dogwifcoin' },
  { symbol: 'HNT', coingeckoId: 'helium' },
  { symbol: 'RAY', coingeckoId: 'raydium' },
  { symbol: 'ZBCN', coingeckoId: 'zebec-network' },
  { symbol: 'W', coingeckoId: 'wormhole' },
  { symbol: 'JTO', coingeckoId: 'jito-governance-token' },
  { symbol: 'FARTCOIN', coingeckoId: 'fartcoin' },
  { symbol: 'SAROS', coingeckoId: 'saros-finance' },
  { symbol: 'GRASS', coingeckoId: 'grass' },
  { symbol: 'MEW', coingeckoId: 'cat-in-a-dogs-world' },
  { symbol: 'POPCAT', coingeckoId: 'popcat' },
  { symbol: 'DRIFT', coingeckoId: 'drift-protocol' },
  { symbol: 'PNUT', coingeckoId: 'peanut-the-squirrel' },
  { symbol: 'ORCA', coingeckoId: 'orca' },
  { symbol: 'BOME', coingeckoId: 'book-of-meme' },
  { symbol: 'KMNO', coingeckoId: 'kamino' },
  { symbol: 'MET', coingeckoId: 'meteora' },
];

interface NormalizedPriceData {
  dates: string[];
  prices: number[];
  marketCaps: number[];
  volumes: number[];
}

// Fetch market chart data from CoinGecko
async function fetchMarketChart(coingeckoId: string, days: number): Promise<NormalizedPriceData> {
  const url = new URL(`${COINGECKO_BASE_URL}/coins/${coingeckoId}/market_chart`);
  url.searchParams.set('vs_currency', 'usd');
  url.searchParams.set('days', String(days));
  url.searchParams.set('interval', 'daily');

  console.log(`  Fetching ${coingeckoId}...`);

  const response = await fetch(url.toString(), {
    headers: {
      'x-cg-pro-api-key': COINGECKO_API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }

  const data = await response.json();

  // Normalize the response
  const dateMap = new Map<string, { price?: number; mcap?: number; volume?: number }>();

  for (const [timestamp, price] of data.prices) {
    const date = new Date(timestamp).toISOString().split('T')[0];
    const existing = dateMap.get(date) || {};
    existing.price = price;
    dateMap.set(date, existing);
  }

  for (const [timestamp, mcap] of data.market_caps) {
    const date = new Date(timestamp).toISOString().split('T')[0];
    const existing = dateMap.get(date) || {};
    existing.mcap = mcap;
    dateMap.set(date, existing);
  }

  for (const [timestamp, volume] of data.total_volumes) {
    const date = new Date(timestamp).toISOString().split('T')[0];
    const existing = dateMap.get(date) || {};
    existing.volume = volume;
    dateMap.set(date, existing);
  }

  const sortedDates = Array.from(dateMap.keys()).sort();
  const dates: string[] = [];
  const prices: number[] = [];
  const marketCaps: number[] = [];
  const volumes: number[] = [];

  for (const date of sortedDates) {
    const d = dateMap.get(date)!;
    if (d.price !== undefined && d.mcap !== undefined && d.volume !== undefined) {
      dates.push(date);
      prices.push(d.price);
      marketCaps.push(d.mcap);
      volumes.push(d.volume);
    }
  }

  return { dates, prices, marketCaps, volumes };
}

// Calculate financial stats
function calculateStats(nav: number[]) {
  if (nav.length < 2) {
    return { cumulative_return: 0, annualized_return: 0, volatility: 0, sharpe_ratio: 0, max_drawdown: 0 };
  }

  const startNav = nav[0];
  const endNav = nav[nav.length - 1];
  const cumulative_return = (endNav / startNav) - 1;

  const dailyReturns: number[] = [];
  let peak = -Infinity;
  let maxDrawdown = 0;

  for (let i = 1; i < nav.length; i++) {
    const ret = (nav[i] / nav[i - 1]) - 1;
    dailyReturns.push(ret);
    if (nav[i] > peak) peak = nav[i];
    const drawdown = (nav[i] / peak) - 1;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }

  const daysInPeriod = nav.length;
  const annualized_return = Math.pow(1 + cumulative_return, 365 / daysInPeriod) - 1;

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyReturns.length;
  const dailyVol = Math.sqrt(variance);
  const volatility = dailyVol * Math.sqrt(365);

  const sharpe_ratio = volatility === 0 ? 0 : annualized_return / volatility;

  return { cumulative_return, annualized_return, volatility, sharpe_ratio, max_drawdown: maxDrawdown };
}

// Simple backtest with real data
function runSimpleBacktest(priceData: Map<string, NormalizedPriceData>) {
  // Get SOL for benchmark
  const solData = priceData.get('SOL');
  if (!solData) throw new Error('SOL data required for benchmark');

  // Get common date range
  const dates = solData.dates;
  console.log(`\n  Date range: ${dates[0]} to ${dates[dates.length - 1]} (${dates.length} days)`);

  // Calculate benchmark (SOL) performance
  const solStartPrice = solData.prices[0];
  const benchmarkNav = solData.prices.map(p => (p / solStartPrice) * 100);

  // Simple equal-weight portfolio of non-SOL assets
  const portfolioAssets = Array.from(priceData.keys()).filter(s => s !== 'SOL');
  console.log(`  Portfolio assets: ${portfolioAssets.join(', ')}`);

  // Calculate equal-weight index
  const indexNav: number[] = [100];
  for (let d = 1; d < dates.length; d++) {
    let dailyRet = 0;
    let validAssets = 0;

    for (const symbol of portfolioAssets) {
      const data = priceData.get(symbol);
      if (data && data.prices[d] && data.prices[d - 1]) {
        const ret = (data.prices[d] / data.prices[d - 1]) - 1;
        dailyRet += ret;
        validAssets++;
      }
    }

    if (validAssets > 0) {
      dailyRet /= validAssets; // Equal weight
    }
    indexNav.push(indexNav[d - 1] * (1 + dailyRet));
  }

  return {
    dates,
    indexNav,
    benchmarkNav,
    indexStats: calculateStats(indexNav),
    benchmarkStats: calculateStats(benchmarkNav),
  };
}

// Main test function
async function main() {
  console.log('='.repeat(60));
  console.log('SOLECO Backtester - CoinGecko Integration Test');
  console.log('='.repeat(60));

  // Test 1: API Connection
  console.log('\n[1] Testing CoinGecko API connection...');
  try {
    const testUrl = `${COINGECKO_BASE_URL}/ping`;
    const response = await fetch(testUrl, {
      headers: { 'x-cg-pro-api-key': COINGECKO_API_KEY },
    });
    const data = await response.json();
    console.log(`  ✓ API connected: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error(`  ✗ API connection failed:`, error);
    process.exit(1);
  }

  // Test 2: Fetch price data for test assets
  console.log('\n[2] Fetching historical data (180 days)...');
  const priceData = new Map<string, NormalizedPriceData>();

  for (const asset of TEST_ASSETS) {
    try {
      const data = await fetchMarketChart(asset.coingeckoId, 180);
      priceData.set(asset.symbol, data);
      console.log(`  ✓ ${asset.symbol}: ${data.dates.length} days, latest price: $${data.prices[data.prices.length - 1].toFixed(4)}`);

      // Rate limit delay
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      console.error(`  ✗ ${asset.symbol} failed:`, error);
    }
  }

  if (priceData.size < 2) {
    console.error('\n✗ Not enough data to run backtest');
    process.exit(1);
  }

  // Test 3: Run simple backtest
  console.log('\n[3] Running backtest...');
  try {
    const result = runSimpleBacktest(priceData);

    console.log('\n' + '='.repeat(60));
    console.log('BACKTEST RESULTS');
    console.log('='.repeat(60));

    console.log('\n  SOLECO Index:');
    console.log(`    Cumulative Return:  ${(result.indexStats.cumulative_return * 100).toFixed(2)}%`);
    console.log(`    Annualized Return:  ${(result.indexStats.annualized_return * 100).toFixed(2)}%`);
    console.log(`    Volatility:         ${(result.indexStats.volatility * 100).toFixed(2)}%`);
    console.log(`    Sharpe Ratio:       ${result.indexStats.sharpe_ratio.toFixed(3)}`);
    console.log(`    Max Drawdown:       ${(result.indexStats.max_drawdown * 100).toFixed(2)}%`);

    console.log('\n  SOL Benchmark:');
    console.log(`    Cumulative Return:  ${(result.benchmarkStats.cumulative_return * 100).toFixed(2)}%`);
    console.log(`    Annualized Return:  ${(result.benchmarkStats.annualized_return * 100).toFixed(2)}%`);
    console.log(`    Volatility:         ${(result.benchmarkStats.volatility * 100).toFixed(2)}%`);
    console.log(`    Sharpe Ratio:       ${result.benchmarkStats.sharpe_ratio.toFixed(3)}`);
    console.log(`    Max Drawdown:       ${(result.benchmarkStats.max_drawdown * 100).toFixed(2)}%`);

    const outperformance = result.indexStats.cumulative_return - result.benchmarkStats.cumulative_return;
    console.log(`\n  Outperformance: ${outperformance >= 0 ? '+' : ''}${(outperformance * 100).toFixed(2)}%`);

    console.log('\n' + '='.repeat(60));
    console.log('✓ Test completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('  ✗ Backtest failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
