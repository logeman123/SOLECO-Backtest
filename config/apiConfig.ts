// API configuration and feature flags

export const API_CONFIG = {
  // CoinGecko Pro API base URL
  COINGECKO_BASE_URL: 'https://pro-api.coingecko.com/api/v3',

  // Get API key from environment
  getApiKey: (): string => import.meta.env.VITE_COINGECKO_API_KEY || '',

  // Feature flags
  USE_REAL_DATA: import.meta.env.VITE_USE_REAL_DATA === 'true',
  ENABLE_CACHING: true,

  // Cache TTL: 24 hours for historical data
  CACHE_TTL_MS: 24 * 60 * 60 * 1000,

  // Rate limiting
  REQUEST_DELAY_MS: 200,  // Delay between sequential requests

  // Request timeout
  REQUEST_TIMEOUT_MS: 30000,

  // Max historical days (~3 years)
  MAX_HISTORICAL_DAYS: 1095,
};

// Map backtest window to days
export const BACKTEST_WINDOW_TO_DAYS: Record<string, number> = {
  '6M': 180,
  '12M': 365,
  '24M': 730,
  '36M': 1095,
};
