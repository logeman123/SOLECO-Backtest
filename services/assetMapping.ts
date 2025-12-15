// Asset definitions with CoinGecko ID mapping
// Based on official ltp_portfolio.txt

export interface AssetDefinition {
  symbol: string;
  name: string;
  coingeckoId: string;
  isNative: boolean;
  category: 'L1' | 'DeFi' | 'Meme' | 'Infra' | 'Stablecoin' | 'LST' | 'AI' | 'DePIN' | 'NFT';
  contractAddress: string;
  // Fallback values used if API fails
  fallbackBasePrice: number;
  fallbackBaseMcap: number;
  fallbackAvgDailyVol: number;
}

// Official SOLECO portfolio assets from ltp_portfolio.txt
export const SOLANA_ASSETS: AssetDefinition[] = [
  // Benchmark (excluded from index)
  { symbol: 'SOL', name: 'Solana', coingeckoId: 'solana', isNative: true, category: 'L1', contractAddress: '', fallbackBasePrice: 145, fallbackBaseMcap: 65e9, fallbackAvgDailyVol: 2e9 },

  // Core portfolio assets
  { symbol: 'PUMP', name: 'Pump.fun', coingeckoId: 'pump-fun', isNative: true, category: 'Meme', contractAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn', fallbackBasePrice: 1.0, fallbackBaseMcap: 2.96e9, fallbackAvgDailyVol: 450e6 },
  { symbol: 'JITOSOL', name: 'Jito Staked SOL', coingeckoId: 'jito-staked-sol', isNative: true, category: 'LST', contractAddress: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', fallbackBasePrice: 160, fallbackBaseMcap: 2.5e9, fallbackAvgDailyVol: 60e6 },
  { symbol: 'TRUMP', name: 'Official Trump', coingeckoId: 'official-trump', isNative: true, category: 'Meme', contractAddress: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN', fallbackBasePrice: 4.0, fallbackBaseMcap: 150e6, fallbackAvgDailyVol: 10e6 },
  { symbol: 'RENDER', name: 'Render', coingeckoId: 'render-token', isNative: true, category: 'DePIN', contractAddress: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof', fallbackBasePrice: 7.5, fallbackBaseMcap: 3.5e9, fallbackAvgDailyVol: 100e6 },
  { symbol: 'JUP', name: 'Jupiter', coingeckoId: 'jupiter-exchange-solana', isNative: true, category: 'DeFi', contractAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', fallbackBasePrice: 1.1, fallbackBaseMcap: 1.78e9, fallbackAvgDailyVol: 100e6 },
  { symbol: 'BONK', name: 'Bonk', coingeckoId: 'bonk', isNative: true, category: 'Meme', contractAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', fallbackBasePrice: 0.000025, fallbackBaseMcap: 1.5e9, fallbackAvgDailyVol: 150e6 },
  { symbol: 'PENGU', name: 'Pudgy Penguins', coingeckoId: 'pudgy-penguins', isNative: true, category: 'NFT', contractAddress: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv', fallbackBasePrice: 0.05, fallbackBaseMcap: 40e6, fallbackAvgDailyVol: 2e6 },
  { symbol: 'PYTH', name: 'Pyth Network', coingeckoId: 'pyth-network', isNative: true, category: 'Infra', contractAddress: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', fallbackBasePrice: 0.35, fallbackBaseMcap: 782e6, fallbackAvgDailyVol: 40e6 },
  { symbol: 'WIF', name: 'dogwifhat', coingeckoId: 'dogwifcoin', isNative: true, category: 'Meme', contractAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', fallbackBasePrice: 2.5, fallbackBaseMcap: 2.5e9, fallbackAvgDailyVol: 400e6 },
  { symbol: 'HNT', name: 'Helium', coingeckoId: 'helium', isNative: true, category: 'DePIN', contractAddress: 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux', fallbackBasePrice: 4.2, fallbackBaseMcap: 800e6, fallbackAvgDailyVol: 15e6 },
  { symbol: 'RAY', name: 'Raydium', coingeckoId: 'raydium', isNative: true, category: 'DeFi', contractAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', fallbackBasePrice: 1.8, fallbackBaseMcap: 450e6, fallbackAvgDailyVol: 25e6 },
  { symbol: 'ZBCN', name: 'Zebec Network', coingeckoId: 'zebec-network', isNative: true, category: 'DeFi', contractAddress: 'ZBCNpuD7YMXzTHB2fhGkGi78MNsHGLRXUhRewNRm9RU', fallbackBasePrice: 0.003, fallbackBaseMcap: 321e6, fallbackAvgDailyVol: 15e6 },
  { symbol: 'W', name: 'Wormhole', coingeckoId: 'wormhole', isNative: true, category: 'Infra', contractAddress: '85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ', fallbackBasePrice: 0.35, fallbackBaseMcap: 900e6, fallbackAvgDailyVol: 35e6 },
  { symbol: 'JTO', name: 'Jito', coingeckoId: 'jito-governance-token', isNative: true, category: 'DeFi', contractAddress: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL', fallbackBasePrice: 2.8, fallbackBaseMcap: 380e6, fallbackAvgDailyVol: 30e6 },
  { symbol: 'FARTCOIN', name: 'Fartcoin', coingeckoId: 'fartcoin', isNative: true, category: 'Meme', contractAddress: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump', fallbackBasePrice: 0.04, fallbackBaseMcap: 30e6, fallbackAvgDailyVol: 800000 },
  { symbol: 'SAROS', name: 'Saros', coingeckoId: 'saros-finance', isNative: true, category: 'DeFi', contractAddress: 'SarosY6Vscao718M4A778z4CGtvcwcGef5M9MEH1LGL', fallbackBasePrice: 0.005, fallbackBaseMcap: 25e6, fallbackAvgDailyVol: 1e6 },
  { symbol: 'GRASS', name: 'Grass', coingeckoId: 'grass', isNative: true, category: 'AI', contractAddress: 'Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs', fallbackBasePrice: 1.5, fallbackBaseMcap: 332e6, fallbackAvgDailyVol: 45e6 },
  { symbol: 'MEW', name: 'cat in a dogs world', coingeckoId: 'cat-in-a-dogs-world', isNative: true, category: 'Meme', contractAddress: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5', fallbackBasePrice: 0.004, fallbackBaseMcap: 300e6, fallbackAvgDailyVol: 20e6 },
  { symbol: 'POPCAT', name: 'Popcat', coingeckoId: 'popcat', isNative: true, category: 'Meme', contractAddress: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', fallbackBasePrice: 0.4, fallbackBaseMcap: 106e6, fallbackAvgDailyVol: 10e6 },
  { symbol: 'DRIFT', name: 'Drift', coingeckoId: 'drift-protocol', isNative: true, category: 'DeFi', contractAddress: 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7', fallbackBasePrice: 0.7, fallbackBaseMcap: 150e6, fallbackAvgDailyVol: 10e6 },
  { symbol: 'PNUT', name: 'Peanut the Squirrel', coingeckoId: 'peanut-the-squirrel', isNative: true, category: 'Meme', contractAddress: '2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump', fallbackBasePrice: 0.1, fallbackBaseMcap: 80e6, fallbackAvgDailyVol: 5e6 },
  { symbol: 'ORCA', name: 'Orca', coingeckoId: 'orca', isNative: true, category: 'DeFi', contractAddress: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', fallbackBasePrice: 2.1, fallbackBaseMcap: 110e6, fallbackAvgDailyVol: 5e6 },
  { symbol: 'BOME', name: 'Book of Meme', coingeckoId: 'book-of-meme', isNative: true, category: 'Meme', contractAddress: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82', fallbackBasePrice: 0.008, fallbackBaseMcap: 50e6, fallbackAvgDailyVol: 15e6 },
  { symbol: 'KMNO', name: 'Kamino', coingeckoId: 'kamino', isNative: true, category: 'DeFi', contractAddress: 'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS', fallbackBasePrice: 0.08, fallbackBaseMcap: 80e6, fallbackAvgDailyVol: 5e6 },
  { symbol: 'MET', name: 'Meteora', coingeckoId: 'meteora', isNative: true, category: 'DeFi', contractAddress: 'METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL', fallbackBasePrice: 0.1, fallbackBaseMcap: 60e6, fallbackAvgDailyVol: 2e6 },
];

// Helper functions
export const getAssetBySymbol = (symbol: string): AssetDefinition | undefined => {
  return SOLANA_ASSETS.find(a => a.symbol === symbol);
};

export const getCoingeckoId = (symbol: string): string | undefined => {
  return SOLANA_ASSETS.find(a => a.symbol === symbol)?.coingeckoId;
};

export const getAllCoingeckoIds = (): string[] => {
  return SOLANA_ASSETS.map(a => a.coingeckoId);
};

export const getSymbolByCoingeckoId = (coingeckoId: string): string | undefined => {
  return SOLANA_ASSETS.find(a => a.coingeckoId === coingeckoId)?.symbol;
};

export const getAllSymbols = (): string[] => {
  return SOLANA_ASSETS.map(a => a.symbol);
};
