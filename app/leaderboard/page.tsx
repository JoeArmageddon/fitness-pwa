'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { Trophy, Users, Plus, Copy, Check, Crown, Flame, Dumbbell, RefreshCw } from 'lucide-react';
import { sanitizeName } from '@/lib/sanitize';

interface GroupWithMembers {
  id: string;
  name: string;
  invite_code: string;
  members: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    points: number;
    workouts_count: number;
    streak_days: number;
    rank?: number;
  }[];
}

function Avatar({ name, url, size = 36 }: { name: string | null; url: string | null; size?: number }) {
  const initials = (name ?? 'U').slice(0, 2).toUpperCase();
  const colors = ['#0A84FF', '#30D158', '#BF5AF2', '#FF9F0A', '#FF453A', '#64D2FF'];
  const color = colors[initials.charCodeAt(0) % colors.length];
  if (url) return <img src={url} alt={name ?? ''} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0"
      style={{ width: size, height: size, backgroundColor: color + '33', border: `1.5px solid ${color}55`, color, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

export default function LeaderboardPage() {
  const { user, plan } = useAppStore();
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');
  const [myStats, setMyStats] = useState({ points: 0, workouts: 0, streak: 0 });

  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    return monday.toISOString().slice(0, 10);
  };

  const updateLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard/update', { method: 'POST' });
      const data = await res.json();
      if (data.success) setMyStats({ points: data.points, workouts: data.workouts, streak: data.streak });
    } catch {}
  }, []);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get my group memberships
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (!memberships?.length) { setGroups([]); setLoading(false); return; }

      const groupIds = memberships.map((m: { group_id: string }) => m.group_id);

      // Get group details
      const { data: groupData } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      if (!groupData) { setGroups([]); setLoading(false); return; }

      // For each group, get members with their leaderboard entries
      const weekStart = getWeekStart();
      const fullGroups: GroupWithMembers[] = [];

      for (const group of groupData) {
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', group.id);

        if (!members) continue;
        const memberIds = members.map((m: { user_id: string }) => m.user_id);

        // Get profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', memberIds);

        // Get leaderboard entries for this week
        const { data: entries } = await supabase
          .from('leaderboard_entries')
          .select('user_id, points, workouts_count, streak_days')
          .in('user_id', memberIds)
          .eq('week_start', weekStart);

        const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
        const entryMap = new Map((entries ?? []).map((e: any) => [e.user_id, e]));

        const membersList = memberIds.map((uid: string) => {
          const p = profileMap.get(uid);
          const e = entryMap.get(uid);
          return {
            user_id: uid,
            display_name: p?.display_name ?? null,
            avatar_url: p?.avatar_url ?? null,
            points: e?.points ?? 0,
            workouts_count: e?.workouts_count ?? 0,
            streak_days: e?.streak_days ?? 0,
          };
        }).sort((a: any, b: any) => b.points - a.points).map((m: any, i: number) => ({ ...m, rank: i + 1 }));

        fullGroups.push({ ...group, members: membersList });
      }

      setGroups(fullGroups);
      if (fullGroups.length > 0 && !activeGroup) setActiveGroup(fullGroups[0].id);
    } catch {}
    setLoading(false);
  }, [user, activeGroup]);

  useEffect(() => {
    updateLeaderboard();
    loadGroups();
  }, [updateLeaderboard, loadGroups]);

  const joinGroup = async () => {
    if (!user || !inviteCode.trim()) return;
    setSaving(true);
    const code = inviteCode.trim().toLowerCase().slice(0, 20);
    const { data: group } = await supabase.from('groups').select('id, name').eq('invite_code', code).single();
    if (!group) { toast('Invalid invite code', 'error'); setSaving(false); return; }
    const { error } = await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id });
    if (error && error.code !== '23505') { toast('Failed to join', 'error'); }
    else { toast(`Joined "${group.name}"!`, 'success'); setShowJoin(false); setInviteCode(''); loadGroups(); }
    setSaving(false);
  };

  const createGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    // Free plan: max 1 group
    if (plan === 'free' && groups.length >= 1) {
      toast('Free plan allows 1 group. Upgrade to Pro for unlimited.', 'warning');
      return;
    }
    setSaving(true);
    const name = sanitizeName(newGroupName).slice(0, 40);
    const { data: group, error } = await supabase.from('groups').insert({ name, created_by: user.id }).select().single();
    if (error || !group) { toast('Failed to create group', 'error'); setSaving(false); return; }
    await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id });
    toast(`Group "${name}" created!`, 'success');
    setShowCreate(false); setNewGroupName(''); loadGroups();
    setSaving(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
    toast('Invite code copied!', 'success');
  };

  const currentGroup = groups.find(g => g.id === activeGroup);
  const myRank = currentGroup?.members.findIndex(m => m.user_id === user?.id) ?? -1;

  return (
    <div className="pb-4">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Leaderboard</h1>
          <div className="flex gap-2">
            <button onClick={() => { updateLeaderboard(); loadGroups(); }}
              className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
              <RefreshCw size={15} className="text-white/50" />
            </button>
            <button onClick={() => setShowJoin(true)}
              className="flex items-center gap-1.5 bg-blue-500/20 text-blue-300 text-sm font-bold px-3 py-2 rounded-xl border border-blue-500/25 active:scale-95 transition-all">
              <Plus size={14} /> Join
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* My stats this week */}
        <div className="card-glow animate-fade-up">
          <p className="section-header mb-3">Your Week</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Trophy, label: 'Points', val: myStats.points, color: '#FFD60A' },
              { icon: Dumbbell, label: 'Workouts', val: myStats.workouts, color: '#0A84FF' },
              { icon: Flame, label: 'Streak', val: `${myStats.streak}d`, color: '#FF9F0A' },
            ].map(({ icon: Icon, label, val, color }) => (
              <div key={label} className="bg-white/[0.04] rounded-2xl p-3 text-center">
                <Icon size={16} className="mx-auto mb-1" style={{ color }} />
                <p className="text-xl font-bold text-white">{val}</p>
                <p className="text-[11px] text-white/35">{label}</p>
              </div>
            ))}
          </div>
          {myRank >= 0 && (
            <p className="text-center text-xs text-white/40 mt-3">
              You're <span className="text-white font-bold">#{myRank + 1}</span> in {currentGroup?.name}
            </p>
          )}
        </div>

        {/* Group tabs */}
        {groups.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {groups.map(g => (
              <button key={g.id} onClick={() => setActiveGroup(g.id)}
                className={cn('shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold transition-all',
                  activeGroup === g.id ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/[0.05] text-white/50')}>
                {g.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
        ) : groups.length === 0 ? (
          <div className="card text-center py-12 animate-fade-up">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy size={28} className="text-yellow-400" />
            </div>
            <p className="font-bold text-white mb-1">No groups yet</p>
            <p className="text-sm text-white/40 mb-6">Join a group with an invite code or create one</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowJoin(true)} className="btn-secondary text-sm px-4 py-2.5">
                <Users size={14} /> Join Group
              </button>
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm px-4 py-2.5">
                <Plus size={14} /> Create Group
              </button>
            </div>
          </div>
        ) : currentGroup ? (
          <div className="space-y-2 animate-fade-up">
            {/* Invite code */}
            <div className="flex items-center justify-between p-3 bg-white/[0.04] rounded-2xl border border-white/[0.07]">
              <div>
                <p className="text-xs text-white/40 font-bold">INVITE CODE</p>
                <p className="font-mono font-bold text-white tracking-widest">{currentGroup.invite_code}</p>
              </div>
              <button onClick={() => copyCode(currentGroup.invite_code)}
                className="flex items-center gap-1.5 text-xs text-blue-400 font-bold px-3 py-2 bg-blue-500/10 rounded-xl">
                {copied === currentGroup.invite_code ? <Check size={12} /> : <Copy size={12} />}
                {copied === currentGroup.invite_code ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Leaderboard */}
            <div className="section-header mb-2 mt-2">THIS WEEK — {currentGroup.name.toUpperCase()}</div>
            {currentGroup.members.map((m, i) => (
              <div key={m.user_id}
                className={cn('flex items-center gap-3 p-3.5 rounded-2xl border transition-all animate-fade-up',
                  m.user_id === user?.id ? 'border-blue-500/30 bg-blue-500/8' : 'border-white/[0.06] bg-white/[0.03]')}
                style={{ animationDelay: `${i * 40}ms` }}>
                <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                  i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-white/10 text-white/60' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/[0.05] text-white/30')}>
                  {i === 0 ? <Crown size={14} /> : i + 1}
                </div>
                <Avatar name={m.display_name} url={m.avatar_url} size={36} />
                <div className="flex-1 min-w-0">
                  <p className={cn('font-bold text-sm truncate', m.user_id === user?.id ? 'text-blue-300' : 'text-white')}>
                    {m.display_name ?? 'Athlete'} {m.user_id === user?.id && '(you)'}
                  </p>
                  <p className="text-xs text-white/35">{m.workouts_count} workouts · {m.streak_days}d streak</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-white">{m.points}</p>
                  <p className="text-[10px] text-white/30">pts</p>
                </div>
              </div>
            ))}

            <button onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-3 text-white/30 text-sm border border-white/[0.06] rounded-2xl active:scale-98 transition-all mt-2">
              <Plus size={14} /> Create another group
            </button>
          </div>
        ) : null}
      </div>

      {/* Join Modal */}
      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={() => setShowJoin(false)} />
          <div className="relative w-full sheet animate-slide-up">
            <div className="sheet-handle" />
            <h2 className="text-xl font-bold text-white mb-5">Join a Group</h2>
            <p className="text-sm text-white/40 mb-4">Ask your friend for their invite code</p>
            <input value={inviteCode} onChange={e => setInviteCode(e.target.value.slice(0, 20))}
              placeholder="Enter invite code (e.g. a1b2c3d4)"
              className="input-apple w-full font-mono mb-4" autoFocus />
            <button onClick={joinGroup} disabled={!inviteCode.trim() || saving} className="btn-primary w-full">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Users size={17} />}
              {saving ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={() => setShowCreate(false)} />
          <div className="relative w-full sheet animate-slide-up">
            <div className="sheet-handle" />
            <h2 className="text-xl font-bold text-white mb-5">Create a Group</h2>
            <input value={newGroupName} onChange={e => setNewGroupName(e.target.value.slice(0, 40))}
              placeholder="Group name (e.g. Team Gains)"
              className="input-apple w-full mb-4" autoFocus />
            <button onClick={createGroup} disabled={!newGroupName.trim() || saving} className="btn-primary w-full">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trophy size={17} />}
              {saving ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
