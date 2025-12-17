/**
 * Custom Asset Types for User-Added Tokens
 *
 * Users can add custom assets to the Strategy Workbench by providing a CoinGecko ID.
 * They must attest to Section 4.2 compliance criteria before the asset is included.
 */

export interface CustomAssetAttestation {
  // Criteria 1: Solana Launch or Nexus
  solanaLaunchOrNexus: boolean;
  // Criteria 2: Primary Network = Solana
  primaryNetworkSolana: boolean;
  // Criteria 4: No unresolved critical audit findings
  noUnresolvedAuditFindings: boolean;
  // Timestamp of attestation
  attestedAt?: string;
}

export interface CustomAsset {
  // CoinGecko ID (user-provided)
  coingeckoId: string;
  // Auto-fetched from CoinGecko
  symbol: string;
  name: string;
  // User attestation for Section 4.2 compliance
  attestation: CustomAssetAttestation;
  // Whether the asset is included in the current strategy
  isIncluded: boolean;
  // Category (auto-detected or user-selected)
  category?: 'DeFi' | 'Meme' | 'Infra' | 'LST' | 'AI' | 'DePIN' | 'NFT' | 'Other';
  // Contract address on Solana (if available from CoinGecko)
  contractAddress?: string;
  // When the asset was added
  addedAt: string;
}

export interface AssetUniverseState {
  // Default assets from SOLANA_ASSETS (always included unless explicitly removed)
  defaultAssets: string[]; // symbols
  // Custom assets added by user
  customAssets: CustomAsset[];
  // Assets explicitly removed by user
  removedAssets: string[]; // symbols
}

/**
 * Check if a custom asset has complete attestation
 */
export function hasCompleteAttestation(attestation: CustomAssetAttestation): boolean {
  return (
    attestation.solanaLaunchOrNexus &&
    attestation.primaryNetworkSolana &&
    attestation.noUnresolvedAuditFindings
  );
}

/**
 * Get missing attestation items
 */
export function getMissingAttestations(attestation: CustomAssetAttestation): string[] {
  const missing: string[] = [];
  if (!attestation.solanaLaunchOrNexus) {
    missing.push('Solana Launch or Nexus');
  }
  if (!attestation.primaryNetworkSolana) {
    missing.push('Primary Network = Solana');
  }
  if (!attestation.noUnresolvedAuditFindings) {
    missing.push('No Unresolved Critical Audit Findings');
  }
  return missing;
}
