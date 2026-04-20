import { useState } from 'react';
import { Check, Zap, Crown, Building2, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { createCheckoutSession } from '../services/subscriptionService';
import { auth } from '../firebase';
import { useAppContext } from '../contexts/AppContext';

export default function PricingView() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const { isPro, setIsAuthModalOpen } = useAppContext();

  const handleUpgrade = async () => {
    const user = auth.currentUser;
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      // These would be real Stripe Price IDs from your dashboard
      const priceId = billingCycle === 'monthly' ? 'price_monthly_id' : 'price_yearly_id';
      await createCheckoutSession(user.uid, priceId, 'Pro Scholar');
    } catch (error: any) {
      console.error("Checkout failed:", error);
      if (error.message.includes("STRIPE_SECRET_KEY")) {
        alert("Payments are not configured. Please add STRIPE_SECRET_KEY to your app's Secrets in settings.");
      } else {
        alert("Failed to initiate checkout. Please check your internet connection or Stripe configuration.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 h-full overflow-y-auto">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-4">
          Upgrade Your Study Experience 🚀
        </h2>
        <p className="text-lg text-slate-500 dark:text-slate-400">
          Get unlimited access to the AI Tutor, WAEC/JAMB Exam Mode, and Voice features to guarantee your success.
        </p>

        {/* Billing Toggle */}
        <div className="mt-8 inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              "px-6 py-2.5 rounded-full text-sm font-bold transition-all",
              billingCycle === 'monthly' 
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={cn(
              "px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2",
              billingCycle === 'yearly' 
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Yearly <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full text-xs">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
        {/* Free Tier */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Basic</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Perfect for getting started</p>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">₦0</span>
            <span className="text-slate-500 dark:text-slate-400">/month</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              10 AI Chat questions per day
            </li>
            <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              Basic Quiz Generator
            </li>
            <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              Notes Summarizer
            </li>
          </ul>
          <button className="w-full py-3 px-4 rounded-xl font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Current Plan
          </button>
        </div>

        {/* Pro Tier */}
        <div className="bg-gradient-to-b from-indigo-600 to-purple-700 rounded-3xl p-8 border border-indigo-500 shadow-xl shadow-indigo-500/20 flex flex-col relative transform md:-translate-y-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Crown className="w-3 h-3" /> Most Popular
            </span>
          </div>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-2">Pro Scholar</h3>
            <p className="text-indigo-200 text-sm">Everything you need to ace your exams</p>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-bold text-white">
              {billingCycle === 'monthly' ? '₦4,000' : '₦38,400'}
            </span>
            <span className="text-indigo-200">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-sm text-white">
              <Check className="w-5 h-5 text-amber-400 shrink-0" />
              <strong>Unlimited</strong> AI Chat Tutor
            </li>
            <li className="flex items-start gap-3 text-sm text-white">
              <Check className="w-5 h-5 text-amber-400 shrink-0" />
              <strong>WAEC & JAMB Exam Mode</strong>
            </li>
            <li className="flex items-start gap-3 text-sm text-white">
              <Check className="w-5 h-5 text-amber-400 shrink-0" />
              Past Questions + AI Solutions
            </li>
            <li className="flex items-start gap-3 text-sm text-white">
              <Check className="w-5 h-5 text-amber-400 shrink-0" />
              Live Voice Tutor & Read Aloud
            </li>
            <li className="flex items-start gap-3 text-sm text-white">
              <Check className="w-5 h-5 text-amber-400 shrink-0" />
              Weak Area Fixer Analytics
            </li>
          </ul>
          <button 
            onClick={handleUpgrade}
            disabled={isLoading || isPro}
            className={cn(
              "w-full py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
              isPro 
                ? "bg-emerald-500 text-white cursor-default" 
                : "text-indigo-900 bg-white hover:bg-indigo-50 shadow-lg"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPro ? (
              <>
                <Check className="w-5 h-5" />
                Active Subscription
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Upgrade to Pro
              </>
            )}
          </button>
        </div>

        {/* School Tier */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Schools & Centers</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">For tutorial centers and schools</p>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">Custom</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              Everything in Pro
            </li>
            <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              Bulk Student Accounts
            </li>
            <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              Teacher Dashboard & Analytics
            </li>
            <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              Custom Curriculum Integration
            </li>
          </ul>
          <button className="w-full py-3 px-4 rounded-xl font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-2">
            <Building2 className="w-5 h-5" />
            Contact Sales
          </button>
        </div>
      </div>
    </div>
  );
}
