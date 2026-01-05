// Asset definitions with CoinGecko ID mapping
// Based on official ltp_portfolio.txt

export interface AssetDefinition {
  symbol: string;
  name: string;
  coingeckoId: string;
  isNative: boolean;
  category: 'L1' | 'DeFi' | 'Meme' | 'Infra' | 'Stablecoin' | 'LST' | 'AI' | 'DePIN' | 'NFT' | 'Other';
  contractAddress: string;

  // === Constituent Selection Criteria (Section 4.2) ===
  // Criteria 1: Solana Launch or Nexus
  // Project launched on Solana OR executes largest share of protocol-level transactions on Solana
  solanaLaunchOrNexus: boolean;

  // Criteria 2: Primary Network = Solana
  // Multi-chain projects: Solana is principal venue for liquidity/user activity in 2+ of last 4 months
  primaryNetworkSolana: boolean;

  // Criteria 4: Governance & Compliance
  // No unresolved critical-severity audit findings
  hasUnresolvedAuditFindings: boolean;

  // Last verification date for compliance fields
  complianceLastVerified?: string;
}

// Official SOLECO portfolio assets from ltp_portfolio.txt
// All assets are pre-vetted to pass Section 4.2 Constituent-Selection Criteria
// Compliance fields verified: 2025-12-17
export const SOLANA_ASSETS: AssetDefinition[] = [
  // Benchmark (excluded from index) - SOL itself is the L1, passes all criteria but excluded as benchmark
  { symbol: 'SOL', name: 'Solana', coingeckoId: 'solana', isNative: true, category: 'L1', contractAddress: '', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },

  // Core portfolio assets - All vetted for Section 4.2 criteria
  { symbol: 'PUMP', name: 'Pump.fun', coingeckoId: 'pump-fun', isNative: true, category: 'Meme', contractAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'JITOSOL', name: 'Jito Staked SOL', coingeckoId: 'jito-staked-sol', isNative: true, category: 'LST', contractAddress: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'TRUMP', name: 'Official Trump', coingeckoId: 'official-trump', isNative: true, category: 'Meme', contractAddress: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'RENDER', name: 'Render', coingeckoId: 'render-token', isNative: true, category: 'DePIN', contractAddress: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'JUP', name: 'Jupiter', coingeckoId: 'jupiter-exchange-solana', isNative: true, category: 'DeFi', contractAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'BONK', name: 'Bonk', coingeckoId: 'bonk', isNative: true, category: 'Meme', contractAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'PENGU', name: 'Pudgy Penguins', coingeckoId: 'pudgy-penguins', isNative: true, category: 'NFT', contractAddress: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'PYTH', name: 'Pyth Network', coingeckoId: 'pyth-network', isNative: true, category: 'Infra', contractAddress: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'WIF', name: 'dogwifhat', coingeckoId: 'dogwifcoin', isNative: true, category: 'Meme', contractAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'HNT', name: 'Helium', coingeckoId: 'helium', isNative: true, category: 'DePIN', contractAddress: 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'RAY', name: 'Raydium', coingeckoId: 'raydium', isNative: true, category: 'DeFi', contractAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'ZBCN', name: 'Zebec Network', coingeckoId: 'zebec-network', isNative: true, category: 'DeFi', contractAddress: 'ZBCNpuD7YMXzTHB2fhGkGi78MNsHGLRXUhRewNRm9RU', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'W', name: 'Wormhole', coingeckoId: 'wormhole', isNative: true, category: 'Infra', contractAddress: '85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'JTO', name: 'Jito', coingeckoId: 'jito-governance-token', isNative: true, category: 'DeFi', contractAddress: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'FARTCOIN', name: 'Fartcoin', coingeckoId: 'fartcoin', isNative: true, category: 'Meme', contractAddress: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'SAROS', name: 'Saros', coingeckoId: 'saros-finance', isNative: true, category: 'DeFi', contractAddress: 'SarosY6Vscao718M4A778z4CGtvcwcGef5M9MEH1LGL', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'GRASS', name: 'Grass', coingeckoId: 'grass', isNative: true, category: 'AI', contractAddress: 'Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'MEW', name: 'cat in a dogs world', coingeckoId: 'cat-in-a-dogs-world', isNative: true, category: 'Meme', contractAddress: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'POPCAT', name: 'Popcat', coingeckoId: 'popcat', isNative: true, category: 'Meme', contractAddress: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'DRIFT', name: 'Drift', coingeckoId: 'drift-protocol', isNative: true, category: 'DeFi', contractAddress: 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'PNUT', name: 'Peanut the Squirrel', coingeckoId: 'peanut-the-squirrel', isNative: true, category: 'Meme', contractAddress: '2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'ORCA', name: 'Orca', coingeckoId: 'orca', isNative: true, category: 'DeFi', contractAddress: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'BOME', name: 'Book of Meme', coingeckoId: 'book-of-meme', isNative: true, category: 'Meme', contractAddress: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'KMNO', name: 'Kamino', coingeckoId: 'kamino', isNative: true, category: 'DeFi', contractAddress: 'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
  { symbol: 'MET', name: 'Meteora', coingeckoId: 'meteora', isNative: true, category: 'DeFi', contractAddress: 'METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL', solanaLaunchOrNexus: true, primaryNetworkSolana: true, hasUnresolvedAuditFindings: false, complianceLastVerified: '2025-12-17' },
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
