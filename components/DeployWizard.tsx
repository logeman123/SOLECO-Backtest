
import React, { useState } from 'react';
import { BacktestConfig, DeployedStrategy, ExchangeId, SubscriptionPlan } from '../types';
import { Check, ChevronRight, Wallet, Building2, ShieldCheck, CreditCard, Zap, X } from 'lucide-react';

interface DeployWizardProps {
  config: BacktestConfig;
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (strategy: DeployedStrategy) => void;
}

const DeployWizard: React.FC<DeployWizardProps> = ({ config, isOpen, onClose, onDeploy }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('pro');
  const [selectedExchange, setSelectedExchange] = useState<ExchangeId | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2 && selectedExchange) setStep(3);
  };

  const handleFinalDeploy = () => {
    setIsDeploying(true);
    // Simulate API call
    setTimeout(() => {
      const newStrategy: DeployedStrategy = {
        id: Math.random().toString(36).substr(2, 9),
        name: `Custom ${config.numAssets}-Asset Index`,
        createdAt: new Date().toISOString(),
        config,
        plan: selectedPlan,
        exchange: selectedExchange!,
        status: 'active',
        aum: 0, // Starts empty until funded
        totalReturn: 0,
        todaysReturn: 0
      };
      onDeploy(newStrategy);
      setIsDeploying(false);
      setStep(1); // Reset
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-lore-base border border-lore-border rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sidebar Steps */}
        <div className="w-full md:w-64 bg-lore-surface border-r border-lore-border p-6 flex flex-col justify-between">
            <div>
                <h2 className="text-lg font-bold text-white mb-8">Deploy Strategy</h2>
                <div className="space-y-6">
                    <StepItem 
                        num={1} 
                        title="Select Plan" 
                        active={step === 1} 
                        completed={step > 1} 
                    />
                    <StepItem 
                        num={2} 
                        title="Connect Account" 
                        active={step === 2} 
                        completed={step > 2} 
                    />
                    <StepItem 
                        num={3} 
                        title="Review & Launch" 
                        active={step === 3} 
                        completed={false} 
                    />
                </div>
            </div>
            <div className="text-[10px] text-lore-muted">
                Powered by Lore Wealth
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 bg-lore-base flex flex-col">
            <button onClick={onClose} className="absolute top-4 right-4 text-lore-muted hover:text-white">
                <X size={20} />
            </button>

            {/* STEP 1: PLANS */}
            {step === 1 && (
                <div className="flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-2">Choose your management tier</h3>
                    <p className="text-lore-muted text-sm mb-8">Select how you want this strategy to be executed.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        <PlanCard 
                            title="Lore Core" 
                            price="$0" 
                            period="forever"
                            features={['Manual Rebalancing', 'Basic Analytics', '1 Connected Account']}
                            selected={selectedPlan === 'core'}
                            onSelect={() => setSelectedPlan('core')}
                        />
                        <PlanCard 
                            title="Lore Pro" 
                            price="$29" 
                            period="/ month"
                            features={['Auto-Pilot Rebalancing', 'Tax-Loss Harvesting', 'Unlimited Accounts', 'Priority Support']}
                            selected={selectedPlan === 'pro'}
                            onSelect={() => setSelectedPlan('pro')}
                            recommended
                        />
                    </div>

                    <div className="mt-8 flex justify-end">
                        <Button onClick={handleNext}>
                            Continue <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            )}

            {/* STEP 2: CONNECT */}
            {step === 2 && (
                <div className="flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-2">Connect Custody</h3>
                    <p className="text-lore-muted text-sm mb-8">Link your existing exchange account or wallet. Your assets never leave your custody.</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <ExchangeCard 
                            id="kraken" 
                            name="Kraken" 
                            icon={<Building2 className="text-purple-500" />}
                            selected={selectedExchange === 'kraken'}
                            onSelect={setSelectedExchange}
                        />
                        <ExchangeCard 
                            id="coinbase" 
                            name="Coinbase" 
                            icon={<Building2 className="text-blue-500" />}
                            selected={selectedExchange === 'coinbase'}
                            onSelect={setSelectedExchange}
                        />
                        <ExchangeCard 
                            id="phantom" 
                            name="Phantom" 
                            icon={<Wallet className="text-purple-400" />}
                            selected={selectedExchange === 'phantom'}
                            onSelect={setSelectedExchange}
                        />
                         <ExchangeCard 
                            id="backpack" 
                            name="Backpack" 
                            icon={<Wallet className="text-red-500" />}
                            selected={selectedExchange === 'backpack'}
                            onSelect={setSelectedExchange}
                        />
                    </div>

                    <div className="mt-auto flex justify-end">
                        <Button onClick={handleNext} disabled={!selectedExchange}>
                            Continue <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            )}

            {/* STEP 3: REVIEW */}
            {step === 3 && (
                <div className="flex-1 flex flex-col justify-center items-center text-center">
                    {!isDeploying ? (
                        <>
                            <div className="w-16 h-16 bg-lore-primary/20 rounded-full flex items-center justify-center mb-6 text-lore-primary">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Ready to Launch</h3>
                            <p className="text-lore-muted max-w-md mb-8">
                                You are about to deploy the <strong>{config.numAssets}-Asset Custom Index</strong> to your <strong>{selectedExchange?.toUpperCase()}</strong> account on the <strong>{selectedPlan.toUpperCase()}</strong> plan.
                            </p>
                            
                            <div className="bg-lore-surface border border-lore-border rounded-lg p-4 w-full max-w-sm mb-8 text-left">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-lore-muted">Rebalancing</span>
                                    <span className="text-white capitalize">{config.rebalanceInterval}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-lore-muted">Allocation Cap</span>
                                    <span className="text-white">{(config.maxWeight * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-lore-border pt-2 mt-2">
                                    <span className="text-lore-muted">Estimated Fees</span>
                                    <span className="text-lore-primary font-mono">{selectedPlan === 'pro' ? '$29.00' : '$0.00'}</span>
                                </div>
                            </div>

                            <Button onClick={handleFinalDeploy} size="lg">
                                Confirm & Deploy Strategy
                            </Button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-lore-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                            <h3 className="text-lg font-bold text-white">Initializing Strategy...</h3>
                            <p className="text-lore-muted text-sm mt-2">Verifying API keys and syncing assets</p>
                        </div>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

// --- SUBCOMPONENTS ---

const StepItem = ({ num, title, active, completed }: { num: number, title: string, active: boolean, completed: boolean }) => (
    <div className={`flex items-center gap-3 ${active ? 'opacity-100' : 'opacity-50'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            completed ? 'bg-lore-success text-white' : 
            active ? 'bg-lore-primary text-lore-base' : 'bg-lore-highlight text-lore-muted'
        }`}>
            {completed ? <Check size={14} /> : num}
        </div>
        <span className={`text-sm font-medium ${active ? 'text-white' : 'text-lore-muted'}`}>{title}</span>
    </div>
);

const PlanCard = ({ title, price, period, features, selected, onSelect, recommended }: any) => (
    <div 
        onClick={onSelect}
        className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
            selected 
            ? 'border-lore-primary bg-lore-primary/5 shadow-xl shadow-lore-primary/10' 
            : 'border-lore-border bg-lore-surface hover:border-lore-muted'
        }`}
    >
        {recommended && (
            <div className="absolute -top-3 right-4 bg-lore-primary text-lore-base text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                Recommended
            </div>
        )}
        <h4 className="font-bold text-white mb-1">{title}</h4>
        <div className="flex items-baseline gap-1 mb-4">
            <span className="text-2xl font-bold text-white">{price}</span>
            <span className="text-xs text-lore-muted">{period}</span>
        </div>
        <ul className="space-y-2">
            {features.map((f: string, i: number) => (
                <li key={i} className="flex items-center gap-2 text-xs text-lore-muted">
                    <Check size={12} className="text-lore-primary" /> {f}
                </li>
            ))}
        </ul>
    </div>
);

const ExchangeCard = ({ id, name, icon, selected, onSelect }: any) => (
    <div 
        onClick={() => onSelect(id)}
        className={`p-4 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${
            selected 
            ? 'border-lore-primary bg-lore-primary/10' 
            : 'border-lore-border bg-lore-surface hover:bg-lore-highlight'
        }`}
    >
        <div className="p-2 bg-lore-base rounded-full border border-lore-border">
            {icon}
        </div>
        <span className="font-bold text-sm text-white">{name}</span>
        {selected && <Check size={16} className="ml-auto text-lore-primary" />}
    </div>
);

const Button = ({ children, onClick, disabled, size = 'md' }: any) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-2 rounded-lg font-bold uppercase tracking-widest transition-all ${
            size === 'lg' ? 'px-8 py-3 text-sm' : 'px-6 py-2.5 text-xs'
        } ${
            disabled 
            ? 'bg-lore-highlight text-lore-muted cursor-not-allowed' 
            : 'bg-lore-primary hover:bg-lore-primary-glow text-lore-base shadow-lg shadow-lore-primary/20'
        }`}
    >
        {children}
    </button>
);

export default DeployWizard;
