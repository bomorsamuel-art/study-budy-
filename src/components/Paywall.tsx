import React from 'react';
import { Crown, Lock, ArrowRight } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { motion } from 'motion/react';

interface PaywallProps {
  children: React.ReactNode;
  featureName: string;
  isUnlocked?: boolean;
}

export default function Paywall({ children, featureName, isUnlocked = false }: PaywallProps) {
  const { isPro, setCurrentView } = useAppContext();

  if (isUnlocked || isPro) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Blurred Preview Content */}
      <div className="absolute inset-0 filter blur-xl select-none pointer-events-none opacity-40">
        {children}
      </div>

      {/* Paywall Overlay */}
      <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-white/30 dark:bg-black/30 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full apple-card p-10 text-center shadow-2xl border-2 border-indigo-500/20"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-white shadow-lg mx-auto mb-6">
            <Lock className="w-10 h-10" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Premium Feature
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            The <span className="font-bold text-indigo-600 dark:text-indigo-400">{featureName}</span> is part of the <strong>Pro Scholar</strong> plan. Upgrade now to unlock it and all other premium tools.
          </p>

          <div className="space-y-4">
            <button 
              onClick={() => setCurrentView('pricing')}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Crown className="w-5 h-5 text-amber-400" />
              Upgrade to Pro
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Secure Checkout with Stripe
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
