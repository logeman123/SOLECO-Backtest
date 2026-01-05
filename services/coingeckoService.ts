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

// Custom asset ID mapping for user-added assets
interface CustomAssetId {
  symbol: string;
  coingeckoId: string;
}

// Main function: Fetch all asset data with caching
export async function fetchAllAssetData(
  symbols: string[],
  days: number,
  options?: {
    forceRefresh?: boolean;
    onProgress?: (progress: FetchProgress) => void;
    customAssetIds?: CustomAssetId[]; // For user-added assets not in SOLANA_ASSETS
  }
): Promise<{ data: Map<string, NormalizedPriceData>; source: DataSource }> {
  const { forceRefresh = false, onProgress, customAssetIds = [] } = options || {};
  const result = new Map<string, NormalizedPriceData>();
  let dataSource: DataSource = 'real';
  let usedCache = false;

  // Build a list of assets to fetch: default assets + custom assets
  const assetsToFetch: { symbol: string; coingeckoId: string; isCustom: boolean }[] = [];

  for (const symbol of symbols) {
    // Check if it's a default asset
    const defaultAsset = getAssetBySymbol(symbol);
    if (defaultAsset) {
      assetsToFetch.push({ symbol, coingeckoId: defaultAsset.coingeckoId, isCustom: false });
    } else {
      // Check if it's a custom asset
      const customAsset = customAssetIds.find((a) => a.symbol === symbol);
      if (customAsset) {
        assetsToFetch.push({ symbol, coingeckoId: customAsset.coingeckoId, isCustom: true });
      }
    }
  }

  const total = assetsToFetch.length;
  let completed = 0;

  for (const asset of assetsToFetch) {
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

      // Try to use stale cache as last resort
      const staleCache = await cacheService.get(coingeckoId, days);
      if (staleCache) {
        console.log(`Using stale cache for ${symbol}`);
        result.set(symbol, staleCache.data);
        usedCache = true;
      } else {
        // No data available - skip this asset
        console.warn(`No data available for ${symbol} - skipping`);
      }
    }

    completed++;
  }

  onProgress?.({
    message: 'Complete',
    percent: 100,
  });

  // Determine data source
  if (usedCache && result.size === assetsToFetch.length) {
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

    // Try stale cache as last resort
    const staleCache = await cacheService.get(coingeckoId, days);
    if (staleCache) return staleCache.data;

    // No data available
    throw new Error(`Failed to fetch data for ${symbol} and no cache available`);
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

/**
 * CoinGecko coin info response (simplified)
 */
export interface CoinGeckoInfo {
  id: string;
  symbol: string;
  name: string;
  contract_address?: string;
  platforms?: Record<string, string>;
  categories?: string[];
}

/**
 * Lookup coin info by CoinGecko ID
 * Returns basic info about the coin (symbol, name, contract address)
 */
export async function lookupCoinById(coingeckoId: string): Promise<CoinGeckoInfo | null> {
  const apiKey = API_CONFIG.getApiKey();
  if (!apiKey) {
    throw new Error('API key required for coin lookup');
  }

  try {
    const url = `${API_CONFIG.COINGECKO_BASE_URL}/coins/${coingeckoId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`;

    const response = await fetch(url, {
      headers: {
        'x-cg-pro-api-key': apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Coin not found
      }
      throw new CoinGeckoApiError(response.status, await response.text(), coingeckoId);
    }

    const data = await response.json();

    // Extract Solana contract address if available
    let solanaAddress: string | undefined;
    if (data.platforms && data.platforms.solana) {
      solanaAddress = data.platforms.solana;
    } else if (data.detail_platforms?.solana?.contract_address) {
      solanaAddress = data.detail_platforms.solana.contract_address;
    }

    return {
      id: data.id,
      symbol: data.symbol?.toUpperCase() || coingeckoId,
      name: data.name || coingeckoId,
      contract_address: solanaAddress,
      platforms: data.platforms,
      categories: data.categories,
    };
  } catch (error) {
    if (error instanceof CoinGeckoApiError) throw error;
    console.error('Error looking up coin:', error);
    throw error;
  }
}
