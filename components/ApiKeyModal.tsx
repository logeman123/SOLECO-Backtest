import React, { useState } from 'react';
import { Key, ExternalLink, AlertCircle } from 'lucide-react';

interface ApiKeyModalProps {
  onSubmit: (apiKey: string) => void;
  onSkip: () => void;
  error?: string | null;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSubmit, onSkip, error }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsValidating(true);
    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 300));
    onSubmit(apiKey.trim());
    setIsValidating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-lore-surface border border-lore-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-lore-border bg-lore-base/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-lore-primary/10 rounded-lg border border-lore-primary/20">
              <Key size={20} className="text-lore-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">CoinGecko API Key</h2>
              <p className="text-xs text-lore-muted">Required for live price data</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-lore-text">
            Enter your CoinGecko Pro API key to fetch real-time market data.
            Your key is stored locally and never sent to our servers.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-lore-muted tracking-widest block">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="CG-xxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-lore-base border border-lore-border rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-lore-muted/50 focus:border-lore-primary focus:ring-1 focus:ring-lore-primary outline-none transition-all"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-lore-error/10 border border-lore-error/20 rounded-lg">
              <AlertCircle size={14} className="text-lore-error shrink-0" />
              <span className="text-xs text-lore-error">{error}</span>
            </div>
          )}

          <a
            href="https://www.coingecko.com/en/api/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-lore-primary hover:text-lore-primary-glow transition-colors"
          >
            <ExternalLink size={12} />
            Get a free API key from CoinGecko
          </a>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 px-4 py-2.5 rounded-lg border border-lore-border text-lore-muted hover:text-white hover:bg-lore-highlight text-sm font-medium transition-all"
            >
              Use Simulated Data
            </button>
            <button
              type="submit"
              disabled={!apiKey.trim() || isValidating}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                apiKey.trim() && !isValidating
                  ? 'bg-lore-primary hover:bg-lore-primary-glow text-lore-base'
                  : 'bg-lore-highlight text-lore-muted cursor-not-allowed'
              }`}
            >
              {isValidating ? 'Validating...' : 'Connect'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-lore-base/30 border-t border-lore-border">
          <p className="text-[10px] text-lore-muted text-center">
            Your API key is stored in your browser's local storage and is only used to fetch data from CoinGecko.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
