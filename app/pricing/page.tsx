'use client';

import { useRouter } from 'next/navigation';
import { Check, Sparkles, Lock } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { PRO_FEATURES } from '@/lib/limits';

const FREE_FEATURES = [
  '2 workout routines',
  '10 meal entries per day',
  '30-day analytics',
  '1 leaderboard group',
  'Rest timer',
  'AI food & workout parsing (5/day)',
  'Offline support',
  'Progress tracking',
];

export default function PricingPage() {
  const router = useRouter();
  const { plan } = useAppStore();

  return (
    <div className="pb-8">
      <div className="page-header">
        <h1 className="page-title">Plans</h1>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Header */}
        <div className="text-center animate-fade-up">
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
            <Sparkles size={24} className="text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Upgrade to Pro</h2>
          <p className="text-white/40 text-sm mt-1">Unlock your full fitness potential</p>
        </div>

        {/* Pro Card */}
        <div className="card border-yellow-500/25 bg-gradient-to-b from-yellow-500/5 to-transparent animate-fade-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-transparent bg-clip-text uppercase tracking-wider">Pro</span>
                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold">COMING SOON</span>
              </div>
              <p className="text-3xl font-bold text-white">$5<span className="text-lg text-white/40 font-normal">/mo</span></p>
              <p className="text-xs text-white/30 mt-0.5">or $40/year · save 33%</p>
            </div>
            {plan === 'pro' && (
              <span className="text-xs font-bold bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full border border-green-500/20">Active</span>
            )}
          </div>
          <div className="space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <div key={f.feature} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={11} className="text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <p className="text-xs text-white/35">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            disabled
            className="w-full mt-5 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500/40 to-orange-500/40 text-white/40 font-bold py-3.5 rounded-2xl cursor-not-allowed border border-yellow-500/20"
          >
            <Lock size={15} /> Coming Soon
          </button>
          <p className="text-center text-xs text-white/25 mt-2">Stripe payments launching soon</p>
        </div>

        {/* Free Card */}
        <div className="card animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xl font-bold text-white">Free</p>
            {plan === 'free' && (
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">CURRENT PLAN</span>
            )}
          </div>
          <div className="space-y-2">
            {FREE_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white/[0.07] flex items-center justify-center shrink-0">
                  <Check size={11} className="text-white/50" />
                </div>
                <p className="text-sm text-white/60">{f}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-white/20 px-8">
          All features are available in the free plan for personal use. Pro unlocks advanced capabilities for serious athletes.
        </p>
      </div>
    </div>
  );
}
