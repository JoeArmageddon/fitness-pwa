'use client';

// ============================================================
// RECOVERY PAGE - Sleep, stress, mood, soreness tracking
// ============================================================

import { useState, useEffect } from 'react';
import { Moon, Sun, Heart, Activity, Battery, Zap, ChevronDown } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { calculateRecoveryScore } from '@/lib/ai';
import { cn, today, recoveryLabel, formatDateShort } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import type { RecoveryLog } from '@/types';

// ── Slider Input ───────────────────────────────────────────

function SliderInput({
  label,
  value,
  onChange,
  min = 1,
  max = 5,
  icon: Icon,
  lowLabel,
  highLabel,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  icon: React.ElementType;
  lowLabel: string;
  highLabel: string;
  color: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color }} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>
          {value}/{max}
        </span>
      </div>

      {/* Custom slider */}
      <div className="relative h-8 flex items-center">
        <div className="absolute inset-x-0 h-2 bg-[#f5f5f7] rounded-full" />
        <div
          className="absolute left-0 h-2 rounded-full transition-all duration-200"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="relative w-full opacity-0 h-8 cursor-pointer z-10"
        />
        {/* Thumb indicator */}
        <div
          className="absolute w-6 h-6 bg-white rounded-full shadow-md border-2 transition-all duration-200 pointer-events-none"
          style={{
            left: `calc(${pct}% - ${pct * 0.01 * 24}px)`,
            borderColor: color,
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

// ── Recovery Score Ring ────────────────────────────────────

function RecoveryRing({ score }: { score: number }) {
  const { label, color } = recoveryLabel(score);
  const size = 140;
  const sw = 12;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f5f5f7" strokeWidth={sw} />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - score / 100)}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <p className="font-semibold text-sm mt-2" style={{ color }}>{label}</p>
    </div>
  );
}

// ── Main Recovery Page ─────────────────────────────────────

export default function RecoveryPage() {
  const [form, setForm] = useState({
    sleep_hours: 7,
    sleep_quality: 3,
    stress_level: 3,
    mood: 3,
    soreness: 3,
    energy_level: 3,
    notes: '',
  });

  const [recentLogs, setRecentLogs] = useState<RecoveryLog[]>([]);
  const [todayLog, setTodayLog] = useState<RecoveryLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const recoveryScore = calculateRecoveryScore(form);
  const { label, color } = recoveryLabel(recoveryScore);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [todayRes, historyRes] = await Promise.all([
      supabase.from('recovery_logs').select('*').eq('date', today()).limit(1),
      supabase
        .from('recovery_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(14),
    ]);

    if (todayRes.data?.[0]) {
      const log = todayRes.data[0] as RecoveryLog;
      setTodayLog(log);
      setForm({
        sleep_hours: log.sleep_hours,
        sleep_quality: log.sleep_quality,
        stress_level: log.stress_level,
        mood: log.mood,
        soreness: log.soreness,
        energy_level: log.energy_level,
        notes: log.notes ?? '',
      });
      setSaved(true);
    }

    setRecentLogs((historyRes.data ?? []) as RecoveryLog[]);
  }

  const handleSave = async () => {
    setLoading(true);
    const data = {
      date: today(),
      ...form,
      recovery_score: recoveryScore,
      notes: form.notes || null,
    };

    const { error } = todayLog
      ? await supabase.from('recovery_logs').update(data).eq('id', todayLog.id)
      : await supabase.from('recovery_logs').insert(data);

    if (error) {
      toast('Failed to save', 'error');
    } else {
      toast('Recovery logged! ✓', 'success');
      setSaved(true);
      loadData();
    }
    setLoading(false);
  };

  const update = (key: keyof typeof form, value: number | string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  // Chart data
  const chartData = [...recentLogs]
    .reverse()
    .map((l) => ({
      date: formatDateShort(l.date),
      score: l.recovery_score,
      sleep: l.sleep_hours,
    }));

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-14 pb-4 bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-border/30">
        <h1 className="text-2xl font-bold tracking-tight">Recovery</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Score preview */}
        <div className="card flex items-center gap-6">
          <RecoveryRing score={recoveryScore} />
          <div className="flex-1 space-y-2">
            <p className="font-bold text-base">Today's Score</p>
            <p className="text-sm text-muted-foreground">
              Adjust the sliders below to log your recovery
            </p>
            {saved && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-xs text-green-600 font-medium">Saved for today</p>
              </div>
            )}
          </div>
        </div>

        {/* Input sliders */}
        <div className="card space-y-6">
          <p className="section-header">LOG RECOVERY</p>

          {/* Sleep hours - special slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon size={16} className="text-indigo-500" />
                <span className="text-sm font-medium">Sleep</span>
              </div>
              <span className="text-sm font-bold text-indigo-500 tabular-nums">
                {form.sleep_hours}h
              </span>
            </div>
            <div className="relative h-8 flex items-center">
              <div className="absolute inset-x-0 h-2 bg-[#f5f5f7] rounded-full" />
              <div
                className="absolute left-0 h-2 rounded-full transition-all"
                style={{ width: `${((form.sleep_hours - 3) / 9) * 100}%`, backgroundColor: '#6366F1' }}
              />
              <input
                type="range"
                min={3}
                max={12}
                step={0.5}
                value={form.sleep_hours}
                onChange={(e) => update('sleep_hours', parseFloat(e.target.value))}
                className="relative w-full opacity-0 h-8 cursor-pointer z-10"
              />
              <div
                className="absolute w-6 h-6 bg-white rounded-full shadow-md border-2 border-indigo-500 transition-all pointer-events-none"
                style={{ left: `calc(${((form.sleep_hours - 3) / 9) * 100}% - ${((form.sleep_hours - 3) / 9) * 24}px)` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3h</span><span>12h</span>
            </div>
          </div>

          <SliderInput
            label="Sleep Quality"
            value={form.sleep_quality}
            onChange={(v) => update('sleep_quality', v)}
            icon={Moon}
            lowLabel="Poor"
            highLabel="Perfect"
            color="#6366F1"
          />

          <SliderInput
            label="Energy Level"
            value={form.energy_level}
            onChange={(v) => update('energy_level', v)}
            icon={Battery}
            lowLabel="Drained"
            highLabel="Energized"
            color="#F59E0B"
          />

          <SliderInput
            label="Mood"
            value={form.mood}
            onChange={(v) => update('mood', v)}
            icon={Sun}
            lowLabel="Terrible"
            highLabel="Great"
            color="#10B981"
          />

          <SliderInput
            label="Stress Level"
            value={form.stress_level}
            onChange={(v) => update('stress_level', v)}
            icon={Zap}
            lowLabel="Relaxed"
            highLabel="Very Stressed"
            color="#EF4444"
          />

          <SliderInput
            label="Muscle Soreness"
            value={form.soreness}
            onChange={(v) => update('soreness', v)}
            icon={Activity}
            lowLabel="None"
            highLabel="Severe"
            color="#8B5CF6"
          />

          <input
            type="text"
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Any notes... (optional)"
            className="input-apple"
          />

          <button
            onClick={handleSave}
            disabled={loading}
            className={cn(
              'btn-primary w-full',
              saved && 'bg-green-500'
            )}
          >
            {loading ? 'Saving...' : saved ? '✓ Saved' : 'Save Recovery Log'}
          </button>
        </div>

        {/* Recovery trend chart */}
        {chartData.length > 2 && (
          <div className="card">
            <p className="section-header">14-DAY RECOVERY TREND</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="recoveryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#6e6e73' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#6e6e73' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  formatter={(v: number) => [`${v}`, 'Recovery']}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fill="url(#recoveryGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent logs */}
        {recentLogs.length > 0 && (
          <div className="card">
            <p className="section-header">RECENT</p>
            <div className="space-y-0">
              {recentLogs.slice(0, 7).map((log) => {
                const { label: lbl, color: clr } = recoveryLabel(log.recovery_score);
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{formatDateShort(log.date)}</p>
                      <p className="text-xs text-muted-foreground">{log.sleep_hours}h sleep</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: clr }}>{lbl}</span>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: clr }}
                      >
                        {log.recovery_score}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
