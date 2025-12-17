import React, { useState } from 'react';
import {
  Plus,
  X,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Coins,
  Shield,
  Globe,
  FileCheck,
  Trash2,
} from 'lucide-react';
import { CustomAsset, CustomAssetAttestation, hasCompleteAttestation } from '../types/customAsset';
import { SOLANA_ASSETS } from '../services/assetMapping';
import { lookupCoinById, CoinGeckoInfo } from '../services/coingeckoService';
import { API_CONFIG } from '../config/apiConfig';

interface AssetUniverseManagerProps {
  customAssets: CustomAsset[];
  removedAssets: string[];
  onAddAsset: (asset: CustomAsset) => void;
  onRemoveAsset: (symbol: string) => void;
  onRestoreAsset: (symbol: string) => void;
  onUpdateAttestation: (coingeckoId: string, attestation: CustomAssetAttestation) => void;
  disabled?: boolean;
}

const AssetUniverseManager: React.FC<AssetUniverseManagerProps> = ({
  customAssets,
  removedAssets,
  onAddAsset,
  onRemoveAsset,
  onRestoreAsset,
  onUpdateAttestation,
  disabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [coingeckoIdInput, setCoingeckoIdInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [pendingAsset, setPendingAsset] = useState<CoinGeckoInfo | null>(null);
  const [pendingAttestation, setPendingAttestation] = useState<CustomAssetAttestation>({
    solanaLaunchOrNexus: false,
    primaryNetworkSolana: false,
    noUnresolvedAuditFindings: false,
  });

  // Get active default assets (not removed)
  const activeDefaultAssets = SOLANA_ASSETS.filter(
    (a) => !removedAssets.includes(a.symbol) && a.symbol !== 'SOL'
  );

  // Total active assets
  const totalActiveAssets =
    activeDefaultAssets.length + customAssets.filter((a) => a.isIncluded).length;

  const handleLookup = async () => {
    if (!coingeckoIdInput.trim()) return;

    setLookupLoading(true);
    setLookupError(null);
    setPendingAsset(null);

    try {
      // Check if already exists
      const existsInDefault = SOLANA_ASSETS.some(
        (a) => a.coingeckoId === coingeckoIdInput.toLowerCase()
      );
      const existsInCustom = customAssets.some(
        (a) => a.coingeckoId === coingeckoIdInput.toLowerCase()
      );

      if (existsInDefault) {
        setLookupError('This asset is already in the default universe');
        return;
      }
      if (existsInCustom) {
        setLookupError('This asset has already been added');
        return;
      }

      const info = await lookupCoinById(coingeckoIdInput.toLowerCase());
      if (!info) {
        setLookupError('Coin not found on CoinGecko');
        return;
      }

      // Check if it has Solana platform
      if (!info.platforms?.solana && !info.contract_address) {
        setLookupError(
          'Warning: No Solana contract address found. This may not be a Solana token.'
        );
      }

      setPendingAsset(info);
      setPendingAttestation({
        solanaLaunchOrNexus: false,
        primaryNetworkSolana: false,
        noUnresolvedAuditFindings: false,
      });
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Failed to lookup coin');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAddAsset = () => {
    if (!pendingAsset || !hasCompleteAttestation(pendingAttestation)) return;

    const newAsset: CustomAsset = {
      coingeckoId: pendingAsset.id,
      symbol: pendingAsset.symbol,
      name: pendingAsset.name,
      attestation: {
        ...pendingAttestation,
        attestedAt: new Date().toISOString(),
      },
      isIncluded: true,
      contractAddress: pendingAsset.contract_address,
      category: 'Other',
      addedAt: new Date().toISOString(),
    };

    onAddAsset(newAsset);

    // Reset state
    setPendingAsset(null);
    setCoingeckoIdInput('');
    setIsAddingAsset(false);
    setPendingAttestation({
      solanaLaunchOrNexus: false,
      primaryNetworkSolana: false,
      noUnresolvedAuditFindings: false,
    });
  };

  const handleCancel = () => {
    setPendingAsset(null);
    setCoingeckoIdInput('');
    setLookupError(null);
    setIsAddingAsset(false);
    setPendingAttestation({
      solanaLaunchOrNexus: false,
      primaryNetworkSolana: false,
      noUnresolvedAuditFindings: false,
    });
  };

  return (
    <div className="border-t border-lore-border/50 pt-4 mt-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left group"
        disabled={disabled}
      >
        <div className="flex items-center gap-2">
          <Coins size={14} className="text-lore-primary" />
          <span className="text-[10px] font-bold uppercase text-lore-muted tracking-widest">
            Asset Universe
          </span>
          <span className="px-2 py-0.5 rounded bg-lore-highlight text-[10px] text-lore-text">
            {totalActiveAssets} assets
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} className="text-lore-muted" />
        ) : (
          <ChevronDown size={14} className="text-lore-muted" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
          {/* Add Asset Section */}
          {!isAddingAsset ? (
            <button
              onClick={() => setIsAddingAsset(true)}
              disabled={disabled || !API_CONFIG.hasApiKey()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-dashed border-lore-border hover:border-lore-primary/50 hover:bg-lore-highlight/50 transition-all text-lore-muted hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              <span className="text-xs">Add Custom Asset</span>
            </button>
          ) : (
            <div className="bg-lore-base border border-lore-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Add Custom Asset</span>
                <button onClick={handleCancel} className="text-lore-muted hover:text-white">
                  <X size={14} />
                </button>
              </div>

              {/* CoinGecko ID Input */}
              {!pendingAsset && (
                <div className="space-y-2">
                  <label className="text-[10px] text-lore-muted uppercase tracking-widest">
                    CoinGecko ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={coingeckoIdInput}
                      onChange={(e) => setCoingeckoIdInput(e.target.value)}
                      placeholder="e.g., solana, jupiter-exchange-solana"
                      className="flex-1 bg-lore-surface border border-lore-border rounded px-3 py-2 text-xs text-white placeholder-lore-muted focus:border-lore-primary focus:ring-1 focus:ring-lore-primary outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                    />
                    <button
                      onClick={handleLookup}
                      disabled={lookupLoading || !coingeckoIdInput.trim()}
                      className="px-3 py-2 rounded bg-lore-primary text-lore-base text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {lookupLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Search size={14} />
                      )}
                      Lookup
                    </button>
                  </div>
                  {lookupError && (
                    <div className="flex items-center gap-2 text-lore-warning text-[10px]">
                      <AlertCircle size={12} />
                      {lookupError}
                    </div>
                  )}
                  <p className="text-[10px] text-lore-muted">
                    Find the CoinGecko ID from the coin's URL: coingecko.com/coins/
                    <span className="text-lore-primary">[id]</span>
                  </p>
                </div>
              )}

              {/* Asset Found - Attestation Form */}
              {pendingAsset && (
                <div className="space-y-4">
                  {/* Asset Info */}
                  <div className="flex items-center gap-3 p-3 bg-lore-surface rounded-lg border border-lore-border">
                    <div className="w-10 h-10 rounded-full bg-lore-highlight flex items-center justify-center text-lore-primary font-bold">
                      {pendingAsset.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{pendingAsset.name}</div>
                      <div className="text-xs text-lore-muted font-mono">{pendingAsset.symbol}</div>
                    </div>
                    {pendingAsset.contract_address && (
                      <div className="ml-auto">
                        <span className="px-2 py-1 rounded bg-lore-success/10 text-lore-success text-[10px] border border-lore-success/20">
                          Solana Token
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Attestation Checkboxes */}
                  <div className="space-y-2">
                    <div className="text-[10px] text-lore-muted uppercase tracking-widest flex items-center gap-1">
                      <Shield size={10} />
                      Section 4.2 Compliance Attestation
                    </div>
                    <p className="text-[10px] text-lore-muted mb-3">
                      You must verify and attest that this asset meets all criteria:
                    </p>

                    {/* Criteria 1 */}
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-lore-border hover:border-lore-primary/30 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={pendingAttestation.solanaLaunchOrNexus}
                        onChange={(e) =>
                          setPendingAttestation({
                            ...pendingAttestation,
                            solanaLaunchOrNexus: e.target.checked,
                          })
                        }
                        className="mt-0.5 accent-lore-primary"
                      />
                      <div>
                        <div className="text-xs text-white flex items-center gap-2">
                          <Globe size={12} className="text-lore-primary" />
                          Criteria 1: Solana Launch or Nexus
                        </div>
                        <p className="text-[10px] text-lore-muted mt-1">
                          Project launched on Solana OR executes largest share of transactions on
                          Solana
                        </p>
                      </div>
                    </label>

                    {/* Criteria 2 */}
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-lore-border hover:border-lore-primary/30 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={pendingAttestation.primaryNetworkSolana}
                        onChange={(e) =>
                          setPendingAttestation({
                            ...pendingAttestation,
                            primaryNetworkSolana: e.target.checked,
                          })
                        }
                        className="mt-0.5 accent-lore-primary"
                      />
                      <div>
                        <div className="text-xs text-white flex items-center gap-2">
                          <Globe size={12} className="text-lore-primary" />
                          Criteria 2: Primary Network = Solana
                        </div>
                        <p className="text-[10px] text-lore-muted mt-1">
                          Solana is principal venue for liquidity/user activity in 2+ of last 4
                          months
                        </p>
                      </div>
                    </label>

                    {/* Criteria 4 */}
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-lore-border hover:border-lore-primary/30 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={pendingAttestation.noUnresolvedAuditFindings}
                        onChange={(e) =>
                          setPendingAttestation({
                            ...pendingAttestation,
                            noUnresolvedAuditFindings: e.target.checked,
                          })
                        }
                        className="mt-0.5 accent-lore-primary"
                      />
                      <div>
                        <div className="text-xs text-white flex items-center gap-2">
                          <FileCheck size={12} className="text-lore-primary" />
                          Criteria 4: Governance & Compliance
                        </div>
                        <p className="text-[10px] text-lore-muted mt-1">
                          No unresolved critical-severity audit findings
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={handleAddAsset}
                    disabled={!hasCompleteAttestation(pendingAttestation)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-lore-primary text-lore-base font-bold text-xs uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-lore-primary-glow"
                  >
                    <CheckCircle2 size={14} />
                    Add to Universe
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Custom Assets List */}
          {customAssets.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] text-lore-muted uppercase tracking-widest">
                Custom Assets ({customAssets.length})
              </div>
              <div className="space-y-1">
                {customAssets.map((asset) => (
                  <div
                    key={asset.coingeckoId}
                    className="flex items-center justify-between px-3 py-2 rounded-md bg-lore-surface border border-lore-border"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">{asset.symbol}</span>
                      <span className="text-[10px] text-lore-muted">{asset.name}</span>
                      {hasCompleteAttestation(asset.attestation) && (
                        <CheckCircle2 size={12} className="text-lore-success" />
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveAsset(asset.symbol)}
                      className="text-lore-muted hover:text-lore-error transition-colors"
                      title="Remove asset"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed Default Assets */}
          {removedAssets.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] text-lore-muted uppercase tracking-widest">
                Removed Assets ({removedAssets.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {removedAssets.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => onRestoreAsset(symbol)}
                    className="px-2 py-1 rounded text-[10px] bg-lore-error/10 text-lore-error border border-lore-error/20 hover:bg-lore-error/20 transition-colors"
                    title="Click to restore"
                  >
                    {symbol} <X size={10} className="inline" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Default Assets (collapsible) */}
          <details className="group">
            <summary className="text-[10px] text-lore-muted uppercase tracking-widest cursor-pointer hover:text-white transition-colors list-none flex items-center gap-1">
              <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
              Default Assets ({activeDefaultAssets.length})
            </summary>
            <div className="mt-2 flex flex-wrap gap-1">
              {activeDefaultAssets.map((asset) => (
                <div
                  key={asset.symbol}
                  className="group/item relative px-2 py-1 rounded text-[10px] bg-lore-highlight text-lore-text border border-lore-border hover:border-lore-error/50 transition-colors"
                >
                  {asset.symbol}
                  <button
                    onClick={() => onRemoveAsset(asset.symbol)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-lore-error text-white hidden group-hover/item:flex items-center justify-center"
                    title="Remove from universe"
                  >
                    <X size={8} />
                  </button>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default AssetUniverseManager;
