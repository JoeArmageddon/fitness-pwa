'use client';
import { useState, useEffect } from 'react';
import { Dumbbell, UtensilsCrossed, HeartPulse, TrendingUp, Zap, Bell, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { today, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

function ActivityRing({ pct, size = 56, stroke = 5, color, children }: {
  pct: number; size?: number; stroke?: number; color: string; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - Math.min(pct / 100, 1) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, color, sublabel }: {
  href: string; icon: any; label: string; color: string; sublabel?: string;
}) {
  return (
    <Link href={href}
      className="flex flex-col items-center gap-2 p-4 card hover:bg-white/[0.07] active:scale-95 transition-all duration-150 animate-fade-up">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <p className="text-xs font-bold text-white text-center leading-tight">{label}</p>
      {sublabel && <p className="text-[10px] text-white/35 text-center">{sublabel}</p>}
    </Link>
  );
}

export default function DashboardClient() {
  const { nutritionGoal, activeWorkout, alerts, dismissAlert } = useAppStore();
  const [todayData, setTodayData] = useState({ calories: 0, protein: 0, workouts: 0, recovery: 0 });
  const [weekData, setWeekData] = useState({ workouts: 0, avgRecovery: 0, weightChange: 0 });
  const [greeting, setGreeting] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');

    const loadData = async () => {
      const t = today();
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const weekStr = weekAgo.toISOString().split('T')[0];

      const [nutr, rec, wkWkt, wkRec, weights] = await Promise.all([
        supabase.from('meal_entries').select('calories, protein').eq('date', t),
        supabase.from('recovery_logs').select('recovery_score').eq('date', t).maybeSingle(),
        supabase.from('workout_logs').select('id').gte('date', weekStr),
        supabase.from('recovery_logs').select('recovery_score').gte('date', weekStr),
        supabase.from('body_weights').select('weight_kg, date').gte('date', weekStr).order('date'),
      ]);

      const totalCal = nutr.data?.reduce((s, e) => s + e.calories, 0) ?? 0;
      const totalProt = nutr.data?.reduce((s, e) => s + e.protein, 0) ?? 0;
      const avgRec = wkRec.data?.length ? Math.round(wkRec.data.reduce((s, r) => s + r.recovery_score, 0) / wkRec.data.length) : 0;
      const wts = weights.data ?? [];
      const wtChange = wts.length >= 2 ? +(wts[wts.length-1].weight_kg - wts[0].weight_kg).toFixed(1) : 0;

      setTodayData({ calories: Math.round(totalCal), protein: Math.round(totalProt), workouts: 0, recovery: rec.data?.recovery_score ?? 0 });
      setWeekData({ workouts: wkWkt.data?.length ?? 0, avgRecovery: avgRec, weightChange: wtChange });
      setLoaded(true);
    };
    loadData();
  }, []);

  const calPct = (todayData.calories / nutritionGoal.calories) * 100;
  const protPct = (todayData.protein / nutritionGoal.protein) * 100;
  const recPct = todayData.recovery;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/45 text-sm font-medium">{greeting} 👋</p>
            <h1 className="page-title mt-0.5">Dashboard</h1>
          </div>
          {alerts.length > 0 && (
            <div className="relative">
              <button className="w-10 h-10 bg-white/[0.06] rounded-xl flex items-center justify-center">
                <Bell size={18} className="text-white/60" />
              </button>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {alerts.length}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Active workout banner */}
        {activeWorkout.isActive && (
          <Link href="/workout"
            className="flex items-center gap-3 p-4 bg-blue-500/15 border border-blue-500/25 rounded-2xl animate-bounce-in">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Dumbbell size={20} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-blue-300 text-sm">Workout In Progress</p>
              <p className="text-xs text-blue-300/60">Tap to continue</p>
            </div>
            <ChevronRight size={18} className="text-blue-400" />
          </Link>
        )}

        {/* Alerts */}
        {alerts.slice(0, 2).map((alert, i) => (
          <div key={i} className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl animate-fade-up">
            <span className="text-xl">
              {alert.type === 'pr' ? '🏆' : alert.type === 'plateau' ? '⚠️' : alert.type === 'deload' ? '💤' : '📊'}
            </span>
            <div className="flex-1">
              <p className="font-bold text-orange-300 text-sm capitalize">{alert.type.replace('_', ' ')}</p>
              <p className="text-xs text-orange-300/60 mt-0.5">{alert.message}</p>
            </div>
            <button onClick={() => dismissAlert(i)} className="text-white/30 hover:text-white/60 transition-colors mt-0.5">
              <X size={16} />
            </button>
          </div>
        ))}

        {/* Today's rings */}
        <div className="card-glow animate-fade-up">
          <p className="section-header">TODAY'S ACTIVITY</p>
          <div className="flex items-center justify-around py-2">
            {[
              { pct: calPct, color: '#0A84FF', label: 'Calories', value: todayData.calories + ' kcal' },
              { pct: protPct, color: '#30D158', label: 'Protein', value: todayData.protein + 'g' },
              { pct: recPct, color: '#BF5AF2', label: 'Recovery', value: todayData.recovery ? todayData.recovery + '%' : '—' },
            ].map(({ pct, color, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <ActivityRing pct={pct} size={72} stroke={6} color={color}>
                  <span className="text-[11px] font-black text-white" style={{ color }}>{Math.min(Math.round(pct), 999)}%</span>
                </ActivityRing>
                <p className="text-xs font-bold text-white">{value}</p>
                <p className="text-[10px] text-white/35">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Week stats */}
        {loaded && (
          <div className="grid grid-cols-3 gap-3 stagger">
            {[
              { label: 'Workouts', value: weekData.workouts, sublabel: 'this week', color: '#0A84FF' },
              { label: 'Avg Recovery', value: weekData.avgRecovery || '—', sublabel: 'this week', color: '#BF5AF2' },
              { label: 'Weight Δ', value: weekData.weightChange !== 0 ? `${weekData.weightChange > 0 ? '+' : ''}${weekData.weightChange}kg` : 'Stable', sublabel: '7 days', color: weekData.weightChange < 0 ? '#30D158' : weekData.weightChange > 0 ? '#FF453A' : '#FF9F0A' },
            ].map(({ label, value, sublabel, color }) => (
              <div key={label} className="card text-center animate-fade-up">
                <p className="text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
                <p className="text-xs font-bold text-white mt-0.5">{label}</p>
                <p className="text-[10px] text-white/30">{sublabel}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div>
          <p className="section-header">QUICK LOG</p>
          <div className="grid grid-cols-4 gap-3 stagger">
            <QuickAction href="/workout" icon={Dumbbell} label="Workout" color="#0A84FF"
              sublabel={activeWorkout.isActive ? 'In progress' : undefined} />
            <QuickAction href="/nutrition" icon={UtensilsCrossed} label="Food" color="#FF9F0A"
              sublabel={todayData.calories > 0 ? `${todayData.calories} kcal` : undefined} />
            <QuickAction href="/recovery" icon={HeartPulse} label="Recovery" color="#BF5AF2"
              sublabel={todayData.recovery > 0 ? `Score ${todayData.recovery}` : undefined} />
            <QuickAction href="/analytics" icon={TrendingUp} label="Stats" color="#30D158" />
          </div>
        </div>

        {/* Today date */}
        <div className="text-center py-2">
          <p className="text-xs text-white/20">{formatDate(today())}</p>
        </div>
      </div>
    </div>
  );
}