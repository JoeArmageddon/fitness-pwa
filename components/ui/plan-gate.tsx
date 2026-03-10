'use client';

import { useRouter } from 'next/navigation';
import { Lock, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { canAccess } from '@/lib/limits';
import type { GatedFeature } from '@/lib/limits';

const FEATURE_LABELS: Partial<Record<GatedFeature, string>> = {
  progress_photos: 'Progress Photos',
  custom_foods: 'Custom Foods',
  data_export: 'Data Export',
  max_routines: 'Unlimited Routines',
  analytics_days: 'Full Analytics History',
  max_leaderboard_groups: 'Unlimited Groups',
  ai_parses_per_day: 'Unlimited AI Parsing',
};

interface PlanGateProps {
  feature: GatedFeature;
  children: React.ReactNode;
  /** If true, renders children but with a disabled overlay instead of hiding them */
  overlay?: boolean;
}

export function PlanGate({ feature, children, overlay = false }: PlanGateProps) {
  const { plan } = useAppStore();
  const router = useRouter();
  const allowed = canAccess(plan, feature);

  if (allowed) return <>{children}</>;

  if (overlay) {
    return (
      <div className="relative">
        <div className="pointer-events-none opacity-30 select-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm">
          <UpgradePrompt feature={feature} onUpgrade={() => router.push('/pricing')} compact />
        </div>
      </div>
    );
  }

  return <UpgradePrompt feature={feature} onUpgrade={() => router.push('/pricing')} />;
}

function UpgradePrompt({
  feature,
  onUpgrade,
  compact = false,
}: {
  feature: GatedFeature;
  onUpgrade: () => void;
  compact?: boolean;
}) {
  const label = FEATURE_LABELS[feature] ?? 'This Feature';

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <div className="w-9 h-9 rounded-xl bg-yellow-500/20 flex items-center justify-center">
          <Lock size={16} className="text-yellow-400" />
        </div>
        <p className="text-xs font-bold text-white">Pro Feature</p>
        <button
          onClick={onUpgrade}
          className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold px-3 py-1.5 rounded-xl"
        >
          Upgrade
        </button>
      </div>
    );
  }

  return (
    <div className="card border-yellow-500/20 bg-yellow-500/5 text-center py-8 animate-fade-up">
      <div className="w-14 h-14 bg-yellow-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Sparkles size={24} className="text-yellow-400" />
      </div>
      <p className="font-bold text-white mb-1">{label} is Pro</p>
      <p className="text-sm text-white/40 mb-5 px-4">
        Upgrade to Apex Pro to unlock {label.toLowerCase()} and all premium features.
      </p>
      <button
        onClick={onUpgrade}
        className="mx-auto flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold px-6 py-3 rounded-2xl active:scale-95 transition-all"
      >
        <Sparkles size={16} /> Upgrade to Pro
      </button>
    </div>
  );
}
