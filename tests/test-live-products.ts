/**
 * Test script to verify Live Products calculations (Nov 28, 2025 to today)
 * Run with: COINGECKO_API_KEY=your_key npx tsx tests/test-live-products.ts
 */

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || '';
const COINGECKO_BASE_URL = 'https://pro-api.coingecko.com/api/v3';

const START_DATE = '2025-11-28';
const END_DATE = new Date().toISOString().split('T')[0]; // Today

if (!COINGECKO_API_KEY) {
  console.error('Error: COINGECKO_API_KEY required');
  console.error('Run: COINGECKO_API_KEY=your_key npx tsx tests/test-live-products.ts');
  process.exit(1);
}

// All 26 assets from the portfolio
const ASSETS = [
  { symbol: 'SOL', coingeckoId: 'solana', isNative: true, category: 'L1' },
  { symbol: 'PUMP', coingeckoId: 'pump-fun', isNative: true, category: 'Meme' },
  { symbol: 'JITOSOL', coingeckoId: 'jito-staked-sol', isNative: true, category: 'LST' },
  { symbol: 'TRUMP', coingeckoId: 'official-trump', isNative: true, category: 'Meme' },
  { symbol: 'RENDER', coingeckoId: 'render-token', isNative: true, category: 'DePIN' },
  { symbol: 'JUP', coingeckoId: 'jupiter-exchange-solana', isNative: true, category: 'DeFi' },
  { symbol: 'BONK', coingeckoId: 'bonk', isNative: true, category: 'Meme' },
  { symbol: 'PENGU', coingeckoId: 'pudgy-penguins', isNative: true, category: 'NFT' },
  { symbol: 'PYTH', coingeckoId: 'pyth-network', isNative: true, category: 'Infra' },
  { symbol: 'WIF', coingeckoId: 'dogwifcoin', isNative: true, category: 'Meme' },
  { symbol: 'HNT', coingeckoId: 'helium', isNative: true, category: 'DePIN' },
  { symbol: 'RAY', coingeckoId: 'raydium', isNative: true, category: 'DeFi' },
  { symbol: 'ZBCN', coingeckoId: 'zebec-network', isNative: true, category: 'DeFi' },
  { symbol: 'W', coingeckoId: 'wormhole', isNative: true, category: 'Infra' },
  { symbol: 'JTO', coingeckoId: 'jito-governance-token', isNative: true, category: 'DeFi' },
  { symbol: 'FARTCOIN', coingeckoId: 'fartcoin', isNative: true, category: 'Meme' },
  { symbol: 'SAROS', coingeckoId: 'saros-finance', isNative: true, category: 'DeFi' },
  { symbol: 'GRASS', coingeckoId: 'grass', isNative: true, category: 'AI' },
  { symbol: 'MEW', coingeckoId: 'cat-in-a-dogs-world', isNative: true, category: 'Meme' },
  { symbol: 'POPCAT', coingeckoId: 'popcat', isNative: true, category: 'Meme' },
  { symbol: 'DRIFT', coingeckoId: 'drift-protocol', isNative: true, category: 'DeFi' },
  { symbol: 'PNUT', coingeckoId: 'peanut-the-squirrel', isNative: true, category: 'Meme' },
  { symbol: 'ORCA', coingeckoId: 'orca', isNative: true, category: 'DeFi' },
  { symbol: 'BOME', coingeckoId: 'book-of-meme', isNative: true, category: 'Meme' },
  { symbol: 'KMNO', coingeckoId: 'kamino', isNative: true, category: 'DeFi' },
  { symbol: 'MET', coingeckoId: 'meteora', isNative: true, category: 'DeFi' },
];

interface PriceData {
  dates: string[];
  prices: number[];
  marketCaps: number[];
  volumes: number[];
}

async function fetchData(coingeckoId: string, days: number): Promise<PriceData> {
  const url = new URL(`${COINGECKO_BASE_URL}/coins/${coingeckoId}/market_chart`);
  url.searchParams.set('vs_currency', 'usd');
  url.searchParams.set('days', String(days));
  url.searchParams.set('interval', 'daily');

  const response = await fetch(url.toString(), {
    headers: { 'x-cg-pro-api-key': COINGECKO_API_KEY },
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status} for ${coingeckoId}`);
  }

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

  const sorted = Array.from(dateMap.keys()).sort();
  const dates: string[] = [], prices: number[] = [], marketCaps: number[] = [], volumes: number[] = [];

  for (const date of sorted) {
    const d = dateMap.get(date)!;
    if (d.price && d.mcap && d.volume) {
      dates.push(date);
      prices.push(d.price);
      marketCaps.push(d.mcap);
      volumes.push(d.volume);
    }
  }

  return { dates, prices, marketCaps, volumes };
}

function calculateStats(nav: number[]) {
  if (nav.length < 2) return { cumReturn: 0, annReturn: 0, vol: 0, sharpe: 0, maxDD: 0 };

  const cumReturn = (nav[nav.length - 1] / nav[0]) - 1;
  const dailyRets: number[] = [];
  let peak = -Infinity, maxDD = 0;

  for (let i = 1; i < nav.length; i++) {
    dailyRets.push((nav[i] / nav[i - 1]) - 1);
    if (nav[i] > peak) peak = nav[i];
    const dd = (nav[i] / peak) - 1;
    if (dd < maxDD) maxDD = dd;
  }

  const annReturn = Math.pow(1 + cumReturn, 365 / nav.length) - 1;
  const mean = dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length;
  const variance = dailyRets.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyRets.length;
  const vol = Math.sqrt(variance) * Math.sqrt(365);
  const sharpe = vol === 0 ? 0 : annReturn / vol;

  return { cumReturn, annReturn, vol, sharpe, maxDD };
}

async function main() {
  console.log('='.repeat(70));
  console.log('LIVE PRODUCTS TEST - Nov 28, 2025 to Today');
  console.log('='.repeat(70));
  console.log(`Target date range: ${START_DATE} to ${END_DATE}`);

  // Calculate days needed
  const startMs = new Date(START_DATE).getTime();
  const endMs = new Date(END_DATE).getTime();
  const daysNeeded = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) + 14;
  console.log(`Fetching ${daysNeeded} days of data...\n`);

  // Fetch all asset data
  const priceData = new Map<string, PriceData & { symbol: string; isNative: boolean; category: string }>();

  for (const asset of ASSETS) {
    try {
      process.stdout.write(`  Fetching ${asset.symbol}...`);
      const data = await fetchData(asset.coingeckoId, daysNeeded);
      priceData.set(asset.symbol, { ...data, symbol: asset.symbol, isNative: asset.isNative, category: asset.category });
      console.log(` ✓ (${data.dates.length} days)`);
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.log(` ✗ Failed`);
    }
  }

  // Get SOL as reference for dates
  const solData = priceData.get('SOL');
  if (!solData) throw new Error('SOL data required');

  // Filter to target date range
  const startIdx = solData.dates.findIndex(d => d >= START_DATE);
  const endIdx = solData.dates.findIndex(d => d > END_DATE);
  const dates = solData.dates.slice(startIdx >= 0 ? startIdx : 0, endIdx >= 0 ? endIdx : solData.dates.length);

  console.log(`\nFiltered date range: ${dates[0]} to ${dates[dates.length - 1]} (${dates.length} days)`);

  // Build aligned data
  const alignedData = new Map<string, { prices: number[]; mcaps: number[]; vols: number[] }>();
  for (const [symbol, data] of priceData.entries()) {
    const dateToIdx = new Map(data.dates.map((d, i) => [d, i]));
    const prices: number[] = [], mcaps: number[] = [], vols: number[] = [];

    for (const date of dates) {
      const idx = dateToIdx.get(date);
      if (idx !== undefined) {
        prices.push(data.prices[idx]);
        mcaps.push(data.marketCaps[idx]);
        vols.push(data.volumes[idx]);
      } else {
        prices.push(prices.length > 0 ? prices[prices.length - 1] : data.prices[0]);
        mcaps.push(mcaps.length > 0 ? mcaps[mcaps.length - 1] : data.marketCaps[0]);
        vols.push(vols.length > 0 ? vols[vols.length - 1] : data.volumes[0]);
      }
    }
    alignedData.set(symbol, { prices, mcaps, vols });
  }

  // Official SOLECO fixed weights (from launch allocation)
  const FIXED_WEIGHTS: Record<string, number> = {
    BONK: 0.0600,
    JITOSOL: 0.0600,
    JUP: 0.0600,
    PENGU: 0.0600,
    PUMP: 0.0600,
    RENDER: 0.0600,
    TRUMP: 0.0600,
    PYTH: 0.0527,
    HNT: 0.0490,
    WIF: 0.0461,
    ZBCN: 0.0429,
    RAY: 0.0408,
    FARTCOIN: 0.0407,
    W: 0.0348,
    JTO: 0.0330,
    KMNO: 0.0315,
    GRASS: 0.0292,
    MET: 0.0288,
    MEW: 0.0241,
    POPCAT: 0.0237,
    DRIFT: 0.0230,
    PNUT: 0.0226,
    ORCA: 0.0204,
    BOME: 0.0193,
    SAROS: 0.0174,
  };

  console.log(`\nRunning backtest with FIXED weights (official SOLECO allocation)`);

  // Use fixed weights - set on first day, then drift
  const currentWeights = new Map<string, number>();
  const indexNav: number[] = [100];

  // Initialize portfolio with fixed weights
  for (const [symbol, weight] of Object.entries(FIXED_WEIGHTS)) {
    if (alignedData.has(symbol)) {
      currentWeights.set(symbol, weight);
    }
  }

  console.log(`\nPortfolio (${currentWeights.size} assets):`);
  let totalWeight = 0;
  Array.from(currentWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([sym, w]) => {
      console.log(`  ${sym}: ${(w * 100).toFixed(2)}%`);
      totalWeight += w;
    });
  console.log(`  ... and ${currentWeights.size - 10} more`);
  console.log(`  Total weight: ${(Array.from(currentWeights.values()).reduce((a,b) => a+b, 0) * 100).toFixed(2)}%`);

  for (let d = 1; d < dates.length; d++) {
    // Calculate daily return using FIXED weights (daily rebalance to target weights)
    let dailyRet = 0;
    for (const [symbol, weight] of currentWeights.entries()) {
      const data = alignedData.get(symbol);
      if (data && data.prices[d] && data.prices[d - 1]) {
        const ret = (data.prices[d] / data.prices[d - 1]) - 1;
        dailyRet += weight * ret;
      }
    }
    indexNav.push(indexNav[d - 1] * (1 + dailyRet));
    // No drift - weights stay fixed (daily rebalance)
  }

  // Calculate benchmark (SOL)
  const solPrices = alignedData.get('SOL')!.prices;
  const benchmarkNav = solPrices.map(p => (p / solPrices[0]) * 100);

  // Calculate stats
  const indexStats = calculateStats(indexNav);
  const benchStats = calculateStats(benchmarkNav);

  console.log('\n' + '='.repeat(70));
  console.log('RESULTS');
  console.log('='.repeat(70));

  console.log('\n  SOLECO Index:');
  console.log(`    Total Return:       ${(indexStats.cumReturn * 100).toFixed(2)}%`);
  console.log(`    Volatility (Ann.):  ${(indexStats.vol * 100).toFixed(2)}%`);
  console.log(`    Sharpe Ratio:       ${indexStats.sharpe.toFixed(2)}`);
  console.log(`    Max Drawdown:       ${(indexStats.maxDD * 100).toFixed(2)}%`);

  console.log('\n  SOL Benchmark:');
  console.log(`    Total Return:       ${(benchStats.cumReturn * 100).toFixed(2)}%`);
  console.log(`    Volatility (Ann.):  ${(benchStats.vol * 100).toFixed(2)}%`);
  console.log(`    Sharpe Ratio:       ${benchStats.sharpe.toFixed(2)}`);
  console.log(`    Max Drawdown:       ${(benchStats.maxDD * 100).toFixed(2)}%`);

  console.log('\n' + '='.repeat(70));
  console.log('Compare these values with what you see in the UI!');
  console.log('='.repeat(70));
}

main().catch(console.error);
