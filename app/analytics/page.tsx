'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ComposedChart,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { cn, formatDateShort, movingAverage, muscleColor, muscleLabel, getLastNDays } from '@/lib/utils';
import { epley1RM } from '@/lib/ai';
import type { MuscleGroup } from '@/types';

type AnalyticsTab = 'strength' | 'volume' | 'body' | 'nutrition' | 'recovery';
const TABS: { id: AnalyticsTab; label: string }[] = [
  { id: 'strength', label: 'Strength' },
  { id: 'volume',   label: 'Volume'   },
  { id: 'body',     label: 'Body'     },
  { id: 'nutrition',label: 'Nutrition'},
  { id: 'recovery', label: 'Recovery' },
];

// ── Shared dark tooltip ────────────────────────────────────
function DarkTooltip({ active, payload, label, unit = '' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(20,20,28,0.95)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{unit ? ` ${unit}` : ''}
        </p>
      ))}
    </div>
  );
}

const TICK = { fill: 'rgba(255,255,255,0.25)', fontSize: 10 };
const AXIS_PROPS = { tickLine: false, axisLine: false };

function ChartSkeleton() {
  return <div className="skeleton h-48 rounded-2xl" />;
}

// ── Stat card pair ─────────────────────────────────────────
function StatRow({ items }: { items: Array<{ label: string; value: string | number; color?: string }> }) {
  return (
    <div className={`grid gap-3 grid-cols-${items.length}`}>
      {items.map(({ label, value, color }) => (
        <div key={label} className="card text-center">
          <p className="text-2xl font-black text-white tabular-nums" style={color ? { color } : {}}>{value}</p>
          <p className="text-xs text-white/40 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── STRENGTH ───────────────────────────────────────────────
function StrengthAnalytics() {
  const [exercises, setExercises] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState<Array<{ date: string; e1rm: number; weight: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('workout_sets').select('exercise_name')
      .then(({ data }) => {
        const unique = [...new Set((data ?? []).map((d: any) => d.exercise_name))].filter(Boolean) as string[];
        setExercises(unique);
        if (unique.length) setSelected(unique[0]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selected) return;
    supabase.from('workout_sets')
      .select('weight, reps, workout_logs!inner(date)')
      .eq('exercise_name', selected).eq('completed', true)
      .order('workout_logs(date)', { ascending: true }).limit(60)
      .then(({ data }) => {
        if (!data) return;
        setData((data as any[]).map(s => ({
          date: formatDateShort(s.workout_logs.date),
          e1rm: epley1RM(s.weight, s.reps),
          weight: s.weight,
        })));
      });
  }, [selected]);

  if (loading) return <ChartSkeleton />;
  if (!exercises.length) return (
    <div className="card text-center py-12">
      <p className="text-white/40">No workout data yet</p>
      <p className="text-xs text-white/25 mt-1">Complete some workouts to see strength curves</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Exercise selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {exercises.map(ex => (
          <button key={ex} onClick={() => setSelected(ex)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 border',
              selected === ex
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white/[0.05] text-white/50 border-white/[0.08] hover:border-white/20')}>
            {ex}
          </button>
        ))}
      </div>

      {data.length > 0 ? (
        <>
          <div className="card">
            <p className="section-header">EST. 1RM PROGRESSION</p>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={data} margin={{ top: 5, right: 5, left: -24, bottom: 5 }}>
                <defs>
                  <linearGradient id="e1rmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0A84FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={TICK} {...AXIS_PROPS} interval="preserveStartEnd" />
                <YAxis tick={TICK} {...AXIS_PROPS} />
                <Tooltip content={<DarkTooltip unit="kg" />} />
                <Area type="monotone" dataKey="e1rm" name="Est. 1RM" stroke="#0A84FF" strokeWidth={2.5} fill="url(#e1rmGrad)" dot={false} />
                <Line type="monotone" dataKey="weight" name="Top Weight" stroke="#FF9F0A" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <StatRow items={[
            { label: 'Best Est. 1RM', value: `${Math.max(...data.map(d => d.e1rm)).toFixed(1)} kg`, color: '#0A84FF' },
            { label: 'Top Weight', value: `${Math.max(...data.map(d => d.weight)).toFixed(1)} kg`, color: '#FF9F0A' },
          ]} />
        </>
      ) : (
        <div className="card text-center py-8">
          <p className="text-white/40 text-sm">No data for {selected} yet</p>
        </div>
      )}
    </div>
  );
}

// ── VOLUME ─────────────────────────────────────────────────
function VolumeAnalytics() {
  const [data, setData] = useState<Array<{ muscle: string; sets: number; volume: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30>(7);

  useEffect(() => {
    setLoading(true);
    const fromDate = getLastNDays(period)[0];
    supabase.from('workout_sets')
      .select('exercise_name, weight, reps, workout_logs!inner(date)')
      .gte('workout_logs.date', fromDate).eq('completed', true)
      .then(({ data: sets }) => {
        const map: Record<string, { sets: number; volume: number }> = {};
        (sets ?? []).forEach((s: any) => {
          const n = s.exercise_name?.toLowerCase() ?? '';
          let muscle = 'full_body';
          if (n.includes('bench') || n.includes('chest') || n.includes('fly') || n.includes('pec')) muscle = 'chest';
          else if (n.includes('row') || n.includes('pullup') || n.includes('pull-up') || n.includes('pulldown') || n.includes('deadlift') || n.includes('lat')) muscle = 'back';
          else if (n.includes('shoulder') || n.includes('ohp') || n.includes('overhead') || n.includes('lateral') || n.includes('delt')) muscle = 'shoulders';
          else if (n.includes('curl') || n.includes('bicep')) muscle = 'biceps';
          else if (n.includes('tricep') || n.includes('pushdown') || n.includes('skull')) muscle = 'triceps';
          else if (n.includes('squat') || n.includes('leg press') || n.includes('quad')) muscle = 'quads';
          else if (n.includes('rdl') || n.includes('romanian') || n.includes('hamstring') || n.includes('leg curl')) muscle = 'hamstrings';
          else if (n.includes('glute') || n.includes('hip thrust')) muscle = 'glutes';
          else if (n.includes('calf') || n.includes('calves')) muscle = 'calves';
          else if (n.includes('plank') || n.includes('crunch') || n.includes('core') || n.includes('abs')) muscle = 'core';
          if (!map[muscle]) map[muscle] = { sets: 0, volume: 0 };
          map[muscle].sets += 1;
          map[muscle].volume += s.weight * s.reps;
        });
        setData(Object.entries(map).map(([muscle, s]) => ({ muscle, ...s })).sort((a, b) => b.sets - a.sets));
        setLoading(false);
      });
  }, [period]);

  if (loading) return <ChartSkeleton />;

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex gap-2">
        {([7, 30] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={cn('flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
              period === p ? 'bg-blue-500 text-white' : 'bg-white/[0.06] text-white/50 border border-white/[0.08]')}>
            Last {p} days
          </button>
        ))}
      </div>

      {data.length > 0 ? (
        <>
          <div className="card">
            <p className="section-header">SETS PER MUSCLE GROUP</p>
            <ResponsiveContainer width="100%" height={Math.max(data.length * 32, 180)}>
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 72, bottom: 5 }}>
                <XAxis type="number" tick={TICK} {...AXIS_PROPS} />
                <YAxis type="category" dataKey="muscle" tick={{ ...TICK, fill: 'rgba(255,255,255,0.55)' }} {...AXIS_PROPS} tickFormatter={v => muscleLabel(v as MuscleGroup)} width={68} />
                <Tooltip content={<DarkTooltip />} formatter={(v: number) => [`${v} sets`]} />
                <Bar dataKey="sets" radius={[0, 8, 8, 0]}>
                  {data.map(d => <Cell key={d.muscle} fill={muscleColor(d.muscle as MuscleGroup)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {data.length >= 3 && (
            <div className="card">
              <p className="section-header">MUSCLE BALANCE</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={data.slice(0, 8)}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="muscle" tick={{ ...TICK, fill: 'rgba(255,255,255,0.40)' }} tickFormatter={v => muscleLabel(v as MuscleGroup)} />
                  <Radar dataKey="sets" fill="#0A84FF" fillOpacity={0.2} stroke="#0A84FF" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12">
          <p className="text-white/40 text-sm">No workout data in this period</p>
        </div>
      )}
    </div>
  );
}

// ── BODY ───────────────────────────────────────────────────
function BodyAnalytics() {
  const [data, setData] = useState<Array<{ date: string; weight: number | null; movAvg: number; bf?: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('body_weights').select('date, weight_kg, body_fat_pct').order('date', { ascending: true }).limit(90)
      .then(({ data }) => {
        if (!data) return;
        const weights = data.map((d: any) => d.weight_kg);
        const avgs = movingAverage(weights, 7);
        setData(data.map((d: any, i: number) => ({
          date: formatDateShort(d.date),
          weight: d.weight_kg,
          movAvg: +avgs[i].toFixed(2),
          bf: d.body_fat_pct,
        })));
        setLoading(false);
      });
  }, []);

  if (loading) return <ChartSkeleton />;
  if (!data.length) return <div className="card text-center py-12"><p className="text-white/40">No body weight data yet</p></div>;

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="card">
        <p className="section-header">WEIGHT TREND (90 DAYS)</p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: -24, bottom: 5 }}>
            <defs>
              <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#0A84FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={TICK} {...AXIS_PROPS} interval="preserveStartEnd" />
            <YAxis tick={TICK} {...AXIS_PROPS} domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip content={<DarkTooltip unit="kg" />} />
            <Area type="monotone" dataKey="weight" name="Weight" stroke="#0A84FF" strokeWidth={1} fill="url(#wGrad)" dot={false} strokeOpacity={0.5} />
            <Line type="monotone" dataKey="movAvg" name="7-day Avg" stroke="#0A84FF" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {data.some(d => d.bf) && (
        <div className="card">
          <p className="section-header">BODY FAT %</p>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={data.filter(d => d.bf)} margin={{ top: 5, right: 5, left: -24, bottom: 5 }}>
              <defs>
                <linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#BF5AF2" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#BF5AF2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={TICK} {...AXIS_PROPS} />
              <YAxis tick={TICK} {...AXIS_PROPS} />
              <Tooltip content={<DarkTooltip unit="%" />} />
              <Area type="monotone" dataKey="bf" name="Body Fat" stroke="#BF5AF2" strokeWidth={2.5} fill="url(#bfGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── NUTRITION ──────────────────────────────────────────────
function NutritionAnalytics() {
  const [data, setData] = useState<Array<{ date: string; calories: number; protein: number; carbs: number; fat: number }>>([]);
  const [loading, setLoading] = useState(true);
  const GOAL_CAL = 2000;

  useEffect(() => {
    const days = getLastNDays(30);
    supabase.from('meal_entries').select('date, calories, protein, carbs, fat').gte('date', days[0])
      .then(({ data: entries }) => {
        const byDate: Record<string, { cal: number; p: number; c: number; f: number }> = {};
        (entries ?? []).forEach((e: any) => {
          if (!byDate[e.date]) byDate[e.date] = { cal: 0, p: 0, c: 0, f: 0 };
          byDate[e.date].cal += e.calories;
          byDate[e.date].p += e.protein;
          byDate[e.date].c += e.carbs;
          byDate[e.date].f += e.fat;
        });
        setData(days.map(d => ({
          date: formatDateShort(d),
          calories: Math.round(byDate[d]?.cal ?? 0),
          protein: Math.round(byDate[d]?.p ?? 0),
          carbs: Math.round(byDate[d]?.c ?? 0),
          fat: Math.round(byDate[d]?.f ?? 0),
        })));
        setLoading(false);
      });
  }, []);

  if (loading) return <ChartSkeleton />;

  const logged = data.filter(d => d.calories > 0);
  const avg = logged.length ? Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length) : 0;
  const adherence = Math.round((data.filter(d => d.calories > 0 && Math.abs(d.calories - GOAL_CAL) < GOAL_CAL * 0.15).length / 30) * 100);
  const avgProt = logged.length ? Math.round(logged.reduce((s, d) => s + d.protein, 0) / logged.length) : 0;
  const avgCarbs = logged.length ? Math.round(logged.reduce((s, d) => s + d.carbs, 0) / logged.length) : 0;
  const avgFat = logged.length ? Math.round(logged.reduce((s, d) => s + d.fat, 0) / logged.length) : 0;

  return (
    <div className="space-y-4 animate-fade-up">
      <StatRow items={[
        { label: 'Avg Daily kcal', value: avg, color: '#0A84FF' },
        { label: 'Goal Adherence', value: `${adherence}%`, color: '#30D158' },
      ]} />

      <div className="card">
        <p className="section-header">CALORIE HISTORY (30 DAYS)</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -24, bottom: 5 }}>
            <XAxis dataKey="date" tick={TICK} {...AXIS_PROPS} interval={4} />
            <YAxis tick={TICK} {...AXIS_PROPS} />
            <Tooltip content={<DarkTooltip unit="kcal" />} />
            <Bar dataKey="calories" name="Calories" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={
                  d.calories === 0 ? 'rgba(255,255,255,0.05)' :
                  Math.abs(d.calories - GOAL_CAL) < GOAL_CAL * 0.1 ? '#30D158' :
                  d.calories > GOAL_CAL ? '#FF453A' : '#0A84FF'
                } />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3">
          {[['#30D158','On target'],['#0A84FF','Under'],['#FF453A','Over']].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-xs text-white/40">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="section-header">AVG MACRO SPLIT</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Protein', value: `${avgProt}g`, color: '#0A84FF' },
            { label: 'Carbs',   value: `${avgCarbs}g`, color: '#FF9F0A' },
            { label: 'Fat',     value: `${avgFat}g`,   color: '#FFD60A' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.04] rounded-xl py-3">
              <p className="text-xl font-black" style={{ color }}>{value}</p>
              <p className="text-xs text-white/35 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── RECOVERY ───────────────────────────────────────────────
function RecoveryAnalytics() {
  const [data, setData] = useState<Array<{ date: string; recovery: number; sleep: number; volume: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const days = getLastNDays(30);
    Promise.all([
      supabase.from('recovery_logs').select('date, recovery_score, sleep_hours').gte('date', days[0]),
      supabase.from('workout_sets').select('weight, reps, workout_logs!inner(date)').gte('workout_logs.date', days[0]).eq('completed', true),
    ]).then(([recRes, setsRes]) => {
      const recMap: Record<string, { score: number; sleep: number }> = {};
      (recRes.data ?? []).forEach((r: any) => { recMap[r.date] = { score: r.recovery_score, sleep: r.sleep_hours }; });
      const volMap: Record<string, number> = {};
      (setsRes.data ?? []).forEach((s: any) => {
        const d = s.workout_logs.date;
        volMap[d] = (volMap[d] ?? 0) + s.weight * s.reps;
      });
      setData(days.map(d => ({
        date: formatDateShort(d),
        recovery: recMap[d]?.score ?? 0,
        sleep: recMap[d]?.sleep ?? 0,
        volume: Math.round((volMap[d] ?? 0) / 1000),
      })));
      setLoading(false);
    });
  }, []);

  if (loading) return <ChartSkeleton />;

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="card">
        <p className="section-header">RECOVERY VS VOLUME</p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: -24, bottom: 5 }}>
            <XAxis dataKey="date" tick={TICK} {...AXIS_PROPS} interval={4} />
            <YAxis yAxisId="rec" tick={TICK} {...AXIS_PROPS} domain={[0, 100]} />
            <YAxis yAxisId="vol" orientation="right" tick={TICK} {...AXIS_PROPS} />
            <Tooltip content={<DarkTooltip />} />
            <Bar yAxisId="vol" dataKey="volume" name="Volume (T)" fill="rgba(10,132,255,0.25)" radius={[3, 3, 0, 0]} />
            <Line yAxisId="rec" type="monotone" dataKey="recovery" name="Recovery" stroke="#30D158" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <p className="section-header">SLEEP TREND</p>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={data.filter(d => d.sleep > 0)} margin={{ top: 5, right: 5, left: -24, bottom: 5 }}>
            <defs>
              <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#BF5AF2" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#BF5AF2" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={TICK} {...AXIS_PROPS} />
            <YAxis domain={[4, 10]} tick={TICK} {...AXIS_PROPS} />
            <Tooltip content={<DarkTooltip unit="hrs" />} />
            <Area type="monotone" dataKey="sleep" name="Sleep" stroke="#BF5AF2" strokeWidth={2.5} fill="url(#sleepGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('strength');

  return (
    <div className="pb-4">
      {/* Header — fully dark */}
      <div className="page-header">
        <h1 className="page-title mb-3">Analytics</h1>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all shrink-0',
                activeTab === id
                  ? 'bg-white text-black'
                  : 'bg-white/[0.07] text-white/50 hover:bg-white/[0.10]'
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-4">
        <Suspense fallback={<ChartSkeleton />}>
          {activeTab === 'strength'  && <StrengthAnalytics />}
          {activeTab === 'volume'    && <VolumeAnalytics />}
          {activeTab === 'body'      && <BodyAnalytics />}
          {activeTab === 'nutrition' && <NutritionAnalytics />}
          {activeTab === 'recovery'  && <RecoveryAnalytics />}
        </Suspense>
      </div>
    </div>
  );
}