// CoinGecko API response types

export interface CoinGeckoMarketChartResponse {
  prices: [number, number][];       // [timestamp_ms, price]
  market_caps: [number, number][];  // [timestamp_ms, mcap]
  total_volumes: [number, number][]; // [timestamp_ms, volume]
}

// Normalized internal format
export interface NormalizedPriceData {
  dates: string[];      // ISO date strings (YYYY-MM-DD)
  prices: number[];
  marketCaps: number[];
  volumes: number[];
}

// Cache entry structure
export interface CachedAssetData {
  coingeckoId: string;
  data: NormalizedPriceData;
  fetchedAt: number;    // Unix timestamp ms
  expiresAt: number;    // Unix timestamp ms
}

// Data source indicator
export type DataSource = 'real' | 'cached';

// Fetch progress callback
export interface FetchProgress {
  message: string;
  percent: number;
  currentAsset?: string;
}
