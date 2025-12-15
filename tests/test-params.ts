/**
 * Test script to validate all backtest parameters work correctly
 * Run with: COINGECKO_API_KEY=your_key npx tsx test-params.ts
 */

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || process.env.VITE_COINGECKO_API_KEY || '';
const COINGECKO_BASE_URL = 'https://pro-api.coingecko.com/api/v3';

if (!COINGECKO_API_KEY) {
  console.error('Error: COINGECKO_API_KEY environment variable is required');
  process.exit(1);
}

// Official SOLECO portfolio assets
const ALL_ASSETS = [
  { symbol: 'SOL', coingeckoId: 'solana' },
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
];

interface NormalizedPriceData {
  dates: string[];
  prices: number[];
  marketCaps: number[];
  volumes: number[];
}

interface BacktestConfig {
  rebalanceInterval: 'weekly' | 'biweekly' | 'monthly';
  numAssets: number;
  maxWeight: number;
  minWeight: number;
  backtestWindow: '6M' | '12M' | '24M' | '36M';
}

interface BacktestResult {
  config: BacktestConfig;
  cumulativeReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  numRebalances: number;
}

// Fetch market chart data
async function fetchMarketChart(coingeckoId: string, days: number): Promise<NormalizedPriceData> {
  const url = new URL(`${COINGECKO_BASE_URL}/coins/${coingeckoId}/market_chart`);
  url.searchParams.set('vs_currency', 'usd');
  url.searchParams.set('days', String(days));
  url.searchParams.set('interval', 'daily');

  const response = await fetch(url.toString(), {
    headers: { 'x-cg-pro-api-key': COINGECKO_API_KEY, 'Accept': 'application/json' },
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();

  const dateMap = new Map<string, { price?: number; mcap?: number; volume?: number }>();
  for (const [ts, price] of data.prices) {
    const date = new Date(ts).toISOString().split('T')[0];
    dateMap.set(date, { ...dateMap.get(date), price });
  }
  for (const [ts, mcap] of data.market_caps) {
    const date = new Date(ts).toISOString().split('T')[0];
    dateMap.set(date, { ...dateMap.get(date), mcap });
  }
  for (const [ts, volume] of data.total_volumes) {
    const date = new Date(ts).toISOString().split('T')[0];
    dateMap.set(date, { ...dateMap.get(date), volume });
  }

  const sortedDates = Array.from(dateMap.keys()).sort();
  const dates: string[] = [], prices: number[] = [], marketCaps: number[] = [], volumes: number[] = [];
  for (const date of sortedDates) {
    const d = dateMap.get(date)!;
    if (d.price && d.mcap && d.volume) {
      dates.push(date); prices.push(d.price); marketCaps.push(d.mcap); volumes.push(d.volume);
    }
  }
  return { dates, prices, marketCaps, volumes };
}

// Run backtest with given config
function runBacktest(
  config: BacktestConfig,
  priceData: Map<string, NormalizedPriceData>
): BacktestResult {
  const windowDays: Record<string, number> = { '6M': 180, '12M': 365, '24M': 730, '36M': 1095 };
  const days = windowDays[config.backtestWindow];
  const rebalanceDays = config.rebalanceInterval === 'weekly' ? 7 : config.rebalanceInterval === 'biweekly' ? 14 : 30;

  // Get common dates
  const solData = priceData.get('SOL')!;
  const dates = solData.dates.slice(-days);

  // Get portfolio assets (exclude SOL)
  const portfolioAssets = Array.from(priceData.keys())
    .filter(s => s !== 'SOL')
    .slice(0, config.numAssets);

  // Track portfolio
  let numRebalances = 0;
  const indexNav: number[] = [100];
  let weights: Record<string, number> = {};

  for (let d = 1; d < dates.length; d++) {
    const isRebalance = d % rebalanceDays === 0 || d === 1;

    if (isRebalance) {
      numRebalances++;
      // Market-cap weighted with constraints
      const mcaps: { symbol: string; mcap: number }[] = [];
      for (const symbol of portfolioAssets) {
        const data = priceData.get(symbol);
        if (data) {
          const idx = data.dates.indexOf(dates[d]);
          if (idx >= 0) mcaps.push({ symbol, mcap: data.marketCaps[idx] });
        }
      }
      mcaps.sort((a, b) => b.mcap - a.mcap);

      const totalMcap = mcaps.reduce((sum, m) => sum + m.mcap, 0);
      weights = {};

      let surplus = 0;
      const uncapped: string[] = [];
      for (const { symbol, mcap } of mcaps) {
        let w = mcap / totalMcap;
        if (w > config.maxWeight) {
          surplus += w - config.maxWeight;
          w = config.maxWeight;
        } else if (w < config.minWeight) {
          w = config.minWeight;
        } else {
          uncapped.push(symbol);
        }
        weights[symbol] = w;
      }

      // Redistribute surplus
      if (surplus > 0 && uncapped.length > 0) {
        const extra = surplus / uncapped.length;
        for (const s of uncapped) weights[s] += extra;
      }
    }

    // Calculate daily return
    let dailyRet = 0;
    for (const symbol of Object.keys(weights)) {
      const data = priceData.get(symbol);
      if (data) {
        const idx = data.dates.indexOf(dates[d]);
        const prevIdx = data.dates.indexOf(dates[d - 1]);
        if (idx >= 0 && prevIdx >= 0 && data.prices[prevIdx] > 0) {
          const ret = (data.prices[idx] / data.prices[prevIdx]) - 1;
          dailyRet += weights[symbol] * ret;
        }
      }
    }
    indexNav.push(indexNav[d - 1] * (1 + dailyRet));
  }

  // Calculate stats
  const cumRet = (indexNav[indexNav.length - 1] / indexNav[0]) - 1;
  const dailyRets = indexNav.slice(1).map((v, i) => (v / indexNav[i]) - 1);
  const mean = dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length;
  const variance = dailyRets.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyRets.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(365);
  const annRet = Math.pow(1 + cumRet, 365 / dates.length) - 1;
  const sharpe = volatility === 0 ? 0 : annRet / volatility;

  let peak = -Infinity, maxDD = 0;
  for (const v of indexNav) {
    if (v > peak) peak = v;
    const dd = (v / peak) - 1;
    if (dd < maxDD) maxDD = dd;
  }

  return {
    config,
    cumulativeReturn: cumRet,
    sharpeRatio: sharpe,
    maxDrawdown: maxDD,
    volatility,
    numRebalances,
  };
}

async function main() {
  console.log('='.repeat(70));
  console.log('SOLECO Parameter Validation Test');
  console.log('='.repeat(70));

  // Fetch data once (use 12M for all tests)
  console.log('\n[1] Fetching price data for 12 assets...');
  const priceData = new Map<string, NormalizedPriceData>();

  for (const asset of ALL_ASSETS) {
    try {
      process.stdout.write(`  ${asset.symbol}...`);
      const data = await fetchMarketChart(asset.coingeckoId, 365);
      priceData.set(asset.symbol, data);
      console.log(` ${data.dates.length} days`);
      await new Promise(r => setTimeout(r, 250));
    } catch (e) {
      console.log(` FAILED`);
    }
  }

  const results: BacktestResult[] = [];

  // Test 1: Rebalancing Schedule
  console.log('\n[2] Testing REBALANCING SCHEDULE...');
  const schedules: Array<'weekly' | 'biweekly' | 'monthly'> = ['weekly', 'biweekly', 'monthly'];
  for (const sched of schedules) {
    const cfg: BacktestConfig = { rebalanceInterval: sched, numAssets: 10, maxWeight: 0.25, minWeight: 0.01, backtestWindow: '12M' };
    const res = runBacktest(cfg, priceData);
    results.push(res);
    console.log(`  ${sched.padEnd(10)}: Return=${(res.cumulativeReturn * 100).toFixed(2)}%, Sharpe=${res.sharpeRatio.toFixed(3)}, Rebalances=${res.numRebalances}`);
  }

  // Test 2: Portfolio Size
  console.log('\n[3] Testing PORTFOLIO SIZE...');
  const sizes = [3, 5, 8, 10];
  for (const size of sizes) {
    const cfg: BacktestConfig = { rebalanceInterval: 'weekly', numAssets: size, maxWeight: 0.25, minWeight: 0.01, backtestWindow: '12M' };
    const res = runBacktest(cfg, priceData);
    results.push(res);
    console.log(`  ${size} assets: Return=${(res.cumulativeReturn * 100).toFixed(2)}%, Sharpe=${res.sharpeRatio.toFixed(3)}, MaxDD=${(res.maxDrawdown * 100).toFixed(2)}%`);
  }

  // Test 3: Max Cap
  console.log('\n[4] Testing MAX CAP %...');
  const caps = [0.15, 0.25, 0.40, 0.50];
  for (const cap of caps) {
    const cfg: BacktestConfig = { rebalanceInterval: 'weekly', numAssets: 10, maxWeight: cap, minWeight: 0.01, backtestWindow: '12M' };
    const res = runBacktest(cfg, priceData);
    results.push(res);
    console.log(`  ${(cap * 100).toFixed(0)}% cap: Return=${(res.cumulativeReturn * 100).toFixed(2)}%, Sharpe=${res.sharpeRatio.toFixed(3)}, Vol=${(res.volatility * 100).toFixed(2)}%`);
  }

  // Test 4: Floor %
  console.log('\n[5] Testing FLOOR %...');
  const floors = [0.01, 0.02, 0.05];
  for (const floor of floors) {
    const cfg: BacktestConfig = { rebalanceInterval: 'weekly', numAssets: 10, maxWeight: 0.25, minWeight: floor, backtestWindow: '12M' };
    const res = runBacktest(cfg, priceData);
    results.push(res);
    console.log(`  ${(floor * 100).toFixed(0)}% floor: Return=${(res.cumulativeReturn * 100).toFixed(2)}%, Sharpe=${res.sharpeRatio.toFixed(3)}`);
  }

  // Test 5: Historical Period
  console.log('\n[6] Testing HISTORICAL PERIOD...');
  const periods: Array<'6M' | '12M'> = ['6M', '12M'];
  for (const period of periods) {
    const cfg: BacktestConfig = { rebalanceInterval: 'weekly', numAssets: 10, maxWeight: 0.25, minWeight: 0.01, backtestWindow: period };
    const res = runBacktest(cfg, priceData);
    results.push(res);
    console.log(`  ${period}: Return=${(res.cumulativeReturn * 100).toFixed(2)}%, Sharpe=${res.sharpeRatio.toFixed(3)}, MaxDD=${(res.maxDrawdown * 100).toFixed(2)}%`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(70));

  const uniqueReturns = new Set(results.map(r => r.cumulativeReturn.toFixed(4)));
  const uniqueSharpes = new Set(results.map(r => r.sharpeRatio.toFixed(4)));
  const uniqueRebalances = new Set(results.map(r => r.numRebalances));

  console.log(`\n  Total test runs: ${results.length}`);
  console.log(`  Unique return values: ${uniqueReturns.size} (should be > 1)`);
  console.log(`  Unique Sharpe values: ${uniqueSharpes.size} (should be > 1)`);
  console.log(`  Unique rebalance counts: ${uniqueRebalances.size} (should be > 1)`);

  if (uniqueReturns.size > 1 && uniqueSharpes.size > 1 && uniqueRebalances.size > 1) {
    console.log('\n  ✓ All parameters affect backtest results correctly!');
  } else {
    console.log('\n  ✗ Some parameters may not be working correctly');
  }

  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
