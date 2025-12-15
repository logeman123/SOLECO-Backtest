// CoinGecko API service with rate limiting and caching
import { CoinGeckoMarketChartResponse, NormalizedPriceData, FetchProgress, DataSource } from '../types/coingecko';
import { API_CONFIG } from '../config/apiConfig';
import { cacheService } from './cacheService';
import { SOLANA_ASSETS, getAssetBySymbol } from './assetMapping';

// Custom error class for API errors
export class CoinGeckoApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public coingeckoId?: string
  ) {
    super(`CoinGecko API error ${status} for ${coingeckoId || 'unknown'}: ${body}`);
    this.name = 'CoinGeckoApiError';
  }
}

// Sleep utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Transform CoinGecko response to our internal format
function normalizeData(raw: CoinGeckoMarketChartResponse): NormalizedPriceData {
  // CoinGecko returns arrays of [timestamp_ms, value]
  // We need to align all three arrays and convert to our format

  const dateMap = new Map<string, { price?: number; mcap?: number; volume?: number }>();

  // Process prices
  for (const [timestamp, price] of raw.prices) {
    const date = new Date(timestamp).toISOString().split('T')[0];
    const existing = dateMap.get(date) || {};
    existing.price = price;
    dateMap.set(date, existing);
  }

  // Process market caps
  for (const [timestamp, mcap] of raw.market_caps) {
    const date = new Date(timestamp).toISOString().split('T')[0];
    const existing = dateMap.get(date) || {};
    existing.mcap = mcap;
    dateMap.set(date, existing);
  }

  // Process volumes
  for (const [timestamp, volume] of raw.total_volumes) {
    const date = new Date(timestamp).toISOString().split('T')[0];
    const existing = dateMap.get(date) || {};
    existing.volume = volume;
    dateMap.set(date, existing);
  }

  // Convert map to sorted arrays
  const sortedDates = Array.from(dateMap.keys()).sort();
  const dates: string[] = [];
  const prices: number[] = [];
  const marketCaps: number[] = [];
  const volumes: number[] = [];

  for (const date of sortedDates) {
    const data = dateMap.get(date)!;
    // Only include days with all data
    if (data.price !== undefined && data.mcap !== undefined && data.volume !== undefined) {
      dates.push(date);
      prices.push(data.price);
      marketCaps.push(data.mcap);
      volumes.push(data.volume);
    }
  }

  return { dates, prices, marketCaps, volumes };
}

// Generate mock data for fallback
function generateMockDataForAsset(symbol: string, days: number): NormalizedPriceData {
  const asset = getAssetBySymbol(symbol);
  if (!asset) {
    throw new Error(`Unknown asset: ${symbol}`);
  }

  const dates: string[] = [];
  const prices: number[] = [];
  const marketCaps: number[] = [];
  const volumes: number[] = [];

  const today = new Date();
  let currentPrice = asset.fallbackBasePrice;
  const supply = asset.fallbackBaseMcap / asset.fallbackBasePrice;

  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);

    // Random walk for price
    const change = (Math.random() - 0.48) * 0.05; // Slight upward bias
    currentPrice = Math.max(0.0000001, currentPrice * (1 + change));
    prices.push(currentPrice);

    // Market cap follows price
    const mcap = currentPrice * supply * (1 + ((days - i) / days) * 0.05);
    marketCaps.push(mcap);

    // Random volume around average
    const volNoise = (Math.random() - 0.5) * 0.4;
    volumes.push(asset.fallbackAvgDailyVol * (1 + volNoise));
  }

  return { dates, prices, marketCaps, volumes };
}

// Fetch single asset from CoinGecko
async function fetchFromApi(
  coingeckoId: string,
  days: number,
  signal?: AbortSignal
): Promise<NormalizedPriceData> {
  const apiKey = API_CONFIG.getApiKey();
  if (!apiKey) {
    throw new CoinGeckoApiError(401, 'API key not configured', coingeckoId);
  }

  const url = new URL(`${API_CONFIG.COINGECKO_BASE_URL}/coins/${coingeckoId}/market_chart`);
  url.searchParams.set('vs_currency', 'usd');
  url.searchParams.set('days', String(days));
  url.searchParams.set('interval', 'daily');
  url.searchParams.set('precision', 'full');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'x-cg-pro-api-key': apiKey,
        'Accept': 'application/json',
      },
      signal: signal || controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new CoinGeckoApiError(response.status, body, coingeckoId);
    }

    const data: CoinGeckoMarketChartResponse = await response.json();
    return normalizeData(data);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Main function: Fetch all asset data with caching
export async function fetchAllAssetData(
  symbols: string[],
  days: number,
  options?: {
    forceRefresh?: boolean;
    onProgress?: (progress: FetchProgress) => void;
  }
): Promise<{ data: Map<string, NormalizedPriceData>; source: DataSource }> {
  const { forceRefresh = false, onProgress } = options || {};
  const result = new Map<string, NormalizedPriceData>();
  let dataSource: DataSource = 'real';
  let usedCache = false;
  let usedMock = false;

  // Filter to valid symbols
  const validAssets = symbols
    .map(s => getAssetBySymbol(s))
    .filter((a): a is NonNullable<typeof a> => a !== undefined);

  const total = validAssets.length;
  let completed = 0;

  for (const asset of validAssets) {
    const { symbol, coingeckoId } = asset;

    onProgress?.({
      message: `Fetching ${symbol}...`,
      percent: Math.round((completed / total) * 100),
      currentAsset: symbol,
    });

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await cacheService.get(coingeckoId, days);
      if (cached) {
        result.set(symbol, cached.data);
        usedCache = true;
        completed++;
        continue;
      }
    }

    // Fetch from API
    try {
      const data = await fetchFromApi(coingeckoId, days);
      result.set(symbol, data);

      // Cache the result
      await cacheService.set(coingeckoId, days, data);

      // Rate limiting delay
      await sleep(API_CONFIG.REQUEST_DELAY_MS);
    } catch (error) {
      console.warn(`Failed to fetch ${symbol} from CoinGecko:`, error);

      // Try to use stale cache
      const staleCache = await cacheService.get(coingeckoId, days);
      if (staleCache) {
        console.log(`Using stale cache for ${symbol}`);
        result.set(symbol, staleCache.data);
        usedCache = true;
      } else {
        // Fall back to mock data
        console.log(`Using mock data for ${symbol}`);
        const mockData = generateMockDataForAsset(symbol, days);
        result.set(symbol, mockData);
        usedMock = true;
      }
    }

    completed++;
  }

  onProgress?.({
    message: 'Complete',
    percent: 100,
  });

  // Determine data source
  if (usedMock) {
    dataSource = 'mock';
  } else if (usedCache && result.size === validAssets.length) {
    dataSource = 'cached';
  }

  return { data: result, source: dataSource };
}

// Fetch single asset (with caching)
export async function fetchAssetData(
  symbol: string,
  days: number,
  forceRefresh = false
): Promise<NormalizedPriceData | null> {
  const asset = getAssetBySymbol(symbol);
  if (!asset) return null;

  const { coingeckoId } = asset;

  // Check cache
  if (!forceRefresh) {
    const cached = await cacheService.get(coingeckoId, days);
    if (cached) return cached.data;
  }

  // Fetch from API
  try {
    const data = await fetchFromApi(coingeckoId, days);
    await cacheService.set(coingeckoId, days, data);
    return data;
  } catch (error) {
    console.warn(`Failed to fetch ${symbol}:`, error);

    // Try stale cache
    const staleCache = await cacheService.get(coingeckoId, days);
    if (staleCache) return staleCache.data;

    // Fall back to mock
    return generateMockDataForAsset(symbol, days);
  }
}

// Clear all cached data
export async function clearCache(): Promise<void> {
  await cacheService.clear();
}

// Get all symbols
export function getAllSymbols(): string[] {
  return SOLANA_ASSETS.map(a => a.symbol);
}
