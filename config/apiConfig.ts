// API configuration and feature flags

const STORAGE_KEY = 'soleco_coingecko_api_key';

// Runtime API key storage
let runtimeApiKey: string | null = null;

// Load from localStorage on init
if (typeof window !== 'undefined') {
  runtimeApiKey = localStorage.getItem(STORAGE_KEY);
}

export const API_CONFIG = {
  // CoinGecko Pro API base URL
  COINGECKO_BASE_URL: 'https://pro-api.coingecko.com/api/v3',

  // Get API key (runtime/localStorage only - no env vars for Vercel deployment)
  getApiKey: (): string => {
    return runtimeApiKey || '';
  },

  // Set API key at runtime and persist to localStorage
  setApiKey: (key: string): void => {
    runtimeApiKey = key;
    if (typeof window !== 'undefined') {
      if (key) {
        localStorage.setItem(STORAGE_KEY, key);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  },

  // Check if API key is configured (localStorage only)
  hasApiKey: (): boolean => {
    return !!runtimeApiKey;
  },

  // Clear stored API key
  clearApiKey: (): void => {
    runtimeApiKey = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  // Feature flags
  USE_REAL_DATA: true, // Always try real data if API key is available
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
