'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { sanitizeName, sanitizeNumber } from '@/lib/sanitize';
import { toast } from '@/components/ui/toaster';
import { User, LogOut, ChevronRight, Sparkles, Target, Dumbbell, Scale, Crown, Key } from 'lucide-react';

const GOAL_LABELS: Record<string, string> = {
  lose_fat: 'Lose Fat', build_muscle: 'Build Muscle', maintain: 'Maintain', athletic: 'Athletic',
};
const EXP_LABELS: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
};

// ── Master key unlock component ──────────────────────────────
function MasterKeySection() {
  const { setPlan, plan } = useAppStore();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  if (plan === 'pro') return null; // already pro, hide entirely

  const handleActivate = async () => {
    if (!key.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/activate-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim() }),
      });
      if (res.ok) {
        setPlan('pro');
        toast('Pro unlocked! 🎉', 'success');
        setOpen(false);
      } else {
        toast('Invalid key', 'error');
      }
    } catch {
      toast('Something went wrong', 'error');
    }
    setLoading(false);
    setKey('');
  };

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Key size={17} className="text-white/30" />
          <span className="text-sm font-medium text-white/50">Developer Access</span>
        </div>
        <ChevronRight size={15} className={`text-white/25 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 animate-fade-up">
          <div className="flex gap-2">
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleActivate()}
              placeholder="Enter master key"
              className="input-apple flex-1 text-sm"
              autoComplete="off"
            />
            <button
              onClick={handleActivate}
              disabled={loading || !key.trim()}
              className="btn-primary px-4 text-sm shrink-0"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Unlock'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, plan, setUser, setProfile, nutritionGoal, setNutritionGoal } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const name = sanitizeName(displayName);
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: name })
      .eq('id', user.id)
      .select()
      .single();
    if (error) { toast('Failed to save', 'error'); }
    else { if (data) setProfile(data as any); toast('Profile updated', 'success'); setEditing(false); }
    setSaving(false);
  };

  const handleSignOut = async () => {
    if (!confirm('Sign out of Apex?')) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.replace('/auth');
  };

  const initials = (profile?.display_name ?? user?.email ?? 'U').slice(0, 2).toUpperCase();

  return (
    <div className="pb-8">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Avatar & Name */}
        <div className="card text-center py-8 animate-fade-up">
          <div className="w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-500/30 flex items-center justify-center mx-auto mb-3">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
              : <span className="text-2xl font-bold text-blue-400">{initials}</span>
            }
          </div>

          {editing ? (
            <div className="space-y-3 px-4">
              <input value={displayName} onChange={e => setDisplayName(e.target.value.slice(0, 40))}
                className="input-apple text-center w-full" placeholder="Display name" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2 text-sm">
                  {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white">{profile?.display_name ?? 'Athlete'}</h2>
              <p className="text-sm text-white/40 mt-0.5">{user?.email}</p>
              <button onClick={() => setEditing(true)} className="mt-3 text-xs text-blue-400 font-semibold">Edit name</button>
            </>
          )}

          {/* Plan badge */}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={plan === 'pro'
              ? { background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.15))', borderColor: 'rgba(255,215,0,0.3)' }
              : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
            {plan === 'pro' ? <Crown size={13} className="text-yellow-400" /> : <User size={13} className="text-white/40" />}
            <span className={`text-xs font-bold ${plan === 'pro' ? 'text-yellow-400' : 'text-white/40'}`}>
              {plan === 'pro' ? 'Pro Member' : 'Free Plan'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="card animate-fade-up" style={{ animationDelay: '50ms' }}>
          <p className="section-header mb-3">Your Stats</p>
          <div className="space-y-3">
            {[
              { icon: Target, label: 'Goal', val: GOAL_LABELS[profile?.goal ?? ''] ?? '—' },
              { icon: Dumbbell, label: 'Experience', val: EXP_LABELS[profile?.experience ?? ''] ?? '—' },
              { icon: Scale, label: 'Calorie Target', val: `${nutritionGoal.calories} kcal/day` },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center">
                  <Icon size={15} className="text-white/40" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white/35">{label}</p>
                  <p className="text-sm font-semibold text-white">{val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="card animate-fade-up" style={{ animationDelay: '100ms' }}>
          <p className="section-header mb-3">Settings</p>
          <div className="space-y-1">
            <button onClick={() => router.push('/pricing')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-3">
                <Sparkles size={17} className="text-yellow-400" />
                <span className="text-sm font-medium text-white">
                  {plan === 'pro' ? 'Pro Plan Active' : 'Upgrade to Pro'}
                </span>
              </div>
              <ChevronRight size={15} className="text-white/25" />
            </button>
            <button onClick={() => router.push('/onboarding')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-3">
                <Target size={17} className="text-blue-400" />
                <span className="text-sm font-medium text-white">Recalculate Goals</span>
              </div>
              <ChevronRight size={15} className="text-white/25" />
            </button>
            <MasterKeySection />
          </div>
        </div>

        {/* Sign Out */}
        <button onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 font-semibold text-sm active:scale-95 transition-all animate-fade-up"
          style={{ animationDelay: '150ms' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
