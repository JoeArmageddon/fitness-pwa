'use client';
import { useState, useEffect } from 'react';
import { Plus, Dumbbell, Check, X, Timer, Trophy, Play, Square, Trash2, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { cn, muscleColor, muscleLabel, formatDate } from '@/lib/utils';
import { epley1RM } from '@/lib/ai';
import { toast } from '@/components/ui/toaster';
import type { WorkoutLog, WorkoutSet, MuscleGroup } from '@/types';

function useTimer(isRunning: boolean, startTime: string | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isRunning || !startTime) return;
    const update = () => setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [isRunning, startTime]);
  return `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
}

function SetRow({ set, index, onChange, onRemove }: {
  set: any; index: number;
  onChange: (u: Partial<WorkoutSet>) => void;
  onRemove: () => void;
}) {
  const est1RM = set.weight && set.reps ? epley1RM(set.weight, set.reps) : null;
  return (
    <div className={cn(
      'rounded-2xl border transition-all duration-200 overflow-hidden',
      set.completed ? 'bg-green-500/10 border-green-500/25' : 'bg-white/[0.04] border-white/[0.07]'
    )}>
      <div className="flex items-center gap-2 p-3">
        <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-white/40">{index + 1}</span>
        </div>
        {[
          { label: 'KG', key: 'weight', mode: 'decimal' as const },
          { label: 'REPS', key: 'reps', mode: 'numeric' as const },
        ].map(({ label, key, mode }) => (
          <div key={key} className="flex-1">
            <p className="text-[9px] text-white/30 font-bold mb-1">{label}</p>
            <input
              type="number"
              value={(set as any)[key] ?? ''}
              onChange={e => onChange({ [key]: key === 'weight' ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0 })}
              className="w-full bg-white/[0.06] border border-white/[0.07] rounded-xl px-2 py-2 text-base font-bold text-center text-white focus:outline-none focus:border-blue-500/50 transition-all"
              placeholder="0"
              inputMode={mode}
            />
          </div>
        ))}
        <div className="w-14">
          <p className="text-[9px] text-white/30 font-bold mb-1">RPE</p>
          <select value={set.rpe ?? ''} onChange={e => onChange({ rpe: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="w-full bg-white/[0.06] border border-white/[0.07] rounded-xl px-1 py-2 text-sm font-bold text-center text-white focus:outline-none">
            <option value="">—</option>
            {[6,7,7.5,8,8.5,9,9.5,10].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button onClick={() => onChange({ completed: !set.completed })}
          className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
            set.completed ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'bg-white/[0.06] border border-white/[0.10]')}>
          <Check size={16} strokeWidth={2.5} className={set.completed ? 'text-white' : 'text-white/25'} />
        </button>
      </div>
      <div className="px-3 pb-2.5 flex items-center">
        {est1RM && <><Trophy size={11} className="text-yellow-500/70 mr-1" /><p className="text-xs text-white/35">Est. 1RM: <span className="font-semibold text-white/60">{est1RM} kg</span></p></>}
        <button onClick={onRemove} className="ml-auto text-white/15 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
      </div>
    </div>
  );
}

function ExerciseBlock({ group, sets, onAddSet, onUpdateSet, onRemoveSet }: {
  group: { name: string; muscle: MuscleGroup; targetSets?: number; targetReps?: string };
  sets: any[];
  onAddSet: () => void;
  onUpdateSet: (i: number, u: any) => void;
  onRemoveSet: (i: number) => void;
}) {
  const color = muscleColor(group.muscle);
  const done = sets.filter(s => s.completed).length;
  return (
    <div className="card animate-fade-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-12 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{group.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold" style={{ color }}>{muscleLabel(group.muscle)}</span>
            {group.targetSets && group.targetReps &&
              <span className="text-xs text-white/25">· {group.targetSets}×{group.targetReps}</span>}
          </div>
        </div>
        <div className={cn('px-2.5 py-1 rounded-full text-xs font-bold tabular-nums',
          done === sets.length && sets.length > 0 ? 'bg-green-500/20 text-green-400' : 'bg-white/[0.06] text-white/40')}>
          {done}/{sets.length}
        </div>
      </div>
      <div className="space-y-2">
        {sets.map((s, i) => <SetRow key={i} set={s} index={i} onChange={u => onUpdateSet(i, u)} onRemove={() => onRemoveSet(i)} />)}
      </div>
      <button onClick={onAddSet}
        className="mt-3 w-full py-3 border border-dashed border-white/[0.09] rounded-xl text-sm font-semibold text-white/30 flex items-center justify-center gap-2 hover:border-blue-500/40 hover:text-blue-400 transition-all">
        <Plus size={15} /> Add Set
      </button>
    </div>
  );
}

function AddExerciseModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (name: string, muscle: MuscleGroup) => void }) {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup>('chest');
  const muscles: MuscleGroup[] = ['chest','back','shoulders','biceps','triceps','quads','hamstrings','glutes','calves','core'];
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full animate-slide-up sheet">
        <div className="sheet-handle" />
        <h2 className="text-xl font-bold text-white mb-5">Add Exercise</h2>
        <div className="space-y-4">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Exercise name" className="input-apple" autoFocus />
          <div>
            <p className="text-[11px] text-white/35 font-bold uppercase tracking-wider mb-3">Muscle Group</p>
            <div className="flex flex-wrap gap-2">
              {muscles.map(m => (
                <button key={m} onClick={() => setMuscle(m)}
                  className={cn('px-3 py-1.5 rounded-full text-sm font-semibold transition-all', muscle === m ? 'text-white' : 'bg-white/[0.06] text-white/50')}
                  style={muscle === m ? { backgroundColor: muscleColor(m) } : {}}>
                  {muscleLabel(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => { if (!name.trim()) return; onAdd(name.trim(), muscle); setName(''); onClose(); }}
          disabled={!name.trim()} className="btn-primary w-full mt-6">Add Exercise</button>
      </div>
    </div>
  );
}

export default function WorkoutPage() {
  const { activeWorkout, startWorkout, addSet, updateSet, removeSet, finishWorkout, discardWorkout, activeProgram } = useAppStore();
  const [groups, setGroups] = useState<Array<{ name: string; muscle: MuscleGroup; targetSets?: number; targetReps?: string; indices: number[] }>>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [programDays, setProgramDays] = useState<any[]>([]);

  const timer = useTimer(activeWorkout.isActive, activeWorkout.startTime);

  useEffect(() => {
    const map: Record<string, typeof groups[0]> = {};
    activeWorkout.sets.forEach((s: any, i: number) => {
      const k = s.exercise_name ?? '';
      if (!map[k]) map[k] = { name: k, muscle: s.muscle_group ?? 'full_body', targetSets: s.target_sets, targetReps: s.target_reps, indices: [] };
      map[k].indices.push(i);
    });
    setGroups(Object.values(map));
  }, [activeWorkout.sets]);

  useEffect(() => {
    if (activeWorkout.isActive) return;
    supabase.from('workout_logs').select('*, workout_sets(*)').order('date', { ascending: false }).limit(3)
      .then(({ data }) => { if (data) setRecentLogs(data.map((d: any) => ({ ...d, sets: d.workout_sets ?? [] }))); });
  }, [activeWorkout.isActive]);

  useEffect(() => {
    if (!activeProgram) return;
    supabase.from('program_days').select('*, program_exercises(*)').eq('program_id', activeProgram.id).order('order_index')
      .then(({ data }) => {
        if (data) setProgramDays(data.map((d: any) => ({
          ...d,
          exercises: (d.program_exercises ?? []).sort((a: any, b: any) => a.order_index - b.order_index)
        })));
      });
  }, [activeProgram]);

  const startDay = (day: any) => {
    startWorkout(day.id, day.day_name);
    day.exercises.forEach((ex: any) => {
      addSet({ exercise_name: ex.name, muscle_group: ex.muscle_group ?? 'full_body', set_number: 1, weight: 0, reps: 0, completed: false, target_sets: ex.sets, target_reps: ex.reps } as any);
    });
    toast(`${day.day_name} loaded! 💪`, 'success');
  };

  const handleFinish = async () => {
    const log = finishWorkout();
    if (!log) { toast('No sets logged', 'warning'); return; }
    setSaving(true);
    try {
      const { data: row, error } = await supabase.from('workout_logs')
        .insert({ date: log.date, program_day_id: log.program_day_id ?? null, day_name: log.day_name ?? null, duration_minutes: log.duration_minutes })
        .select('id').single();
      if (error) throw error;
      await supabase.from('workout_sets').insert(log.sets.map(s => ({
        workout_log_id: row.id, exercise_name: s.exercise_name, set_number: s.set_number, reps: s.reps, weight: s.weight, rpe: s.rpe ?? null, completed: s.completed
      })));
      toast('Workout saved! 💪', 'success');
    } catch { toast('Saved offline', 'warning'); } finally { setSaving(false); }
  };

  const completedSets = activeWorkout.sets.filter((s: any) => s.completed).length;
  const totalSets = activeWorkout.sets.length;

  return (
    <div className="pb-4">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Workout</h1>
          {activeWorkout.isActive && (
            <div className="stat-pill">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white/80 font-bold tabular-nums">{timer}</span>
            </div>
          )}
        </div>
        {activeWorkout.isActive && totalSets > 0 && (
          <div className="mt-3">
            <div className="progress-track"><div className="progress-fill bg-green-500" style={{ width: `${(completedSets/totalSets)*100}%` }} /></div>
            <p className="text-xs text-white/30 mt-1.5">{completedSets}/{totalSets} sets complete</p>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4">
        {!activeWorkout.isActive ? (
          <>
            {activeProgram && programDays.length > 0 ? (
              <div className="card-glow animate-fade-up">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                    <Zap size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{activeProgram.name}</p>
                    <p className="text-xs text-white/40">Tap a day to start with exercises pre-loaded</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {programDays.map((day: any) => (
                    <button key={day.id} onClick={() => startDay(day)}
                      className="w-full flex items-center gap-3 p-4 bg-white/[0.04] border border-white/[0.07] rounded-2xl text-left hover:bg-white/[0.07] active:scale-[0.98] transition-all">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                        <Dumbbell size={17} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm">{day.day_name}</p>
                        <p className="text-xs text-white/35 truncate mt-0.5">
                          {day.focus ?? day.exercises.slice(0,3).map((e: any) => e.name).join(' · ')}
                        </p>
                        <p className="text-xs text-white/25 mt-0.5">{day.exercises.length} exercises</p>
                      </div>
                      <Play size={16} className="text-blue-400 shrink-0" />
                    </button>
                  ))}
                </div>
                <button onClick={() => startWorkout()} className="mt-3 w-full py-2.5 text-sm text-white/30 font-medium border-t border-white/[0.06] hover:text-white/50 transition-colors">
                  + Start empty workout
                </button>
              </div>
            ) : (
              <div className="card text-center py-12 animate-fade-up">
                <div className="w-16 h-16 bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Dumbbell size={30} className="text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Ready to train?</h2>
                <p className="text-white/40 text-sm mb-6">
                  {!activeProgram ? 'Activate a program in the Program tab to see your days here' : 'Start a workout'}
                </p>
                <button onClick={() => startWorkout()} className="btn-primary mx-auto">
                  <Play size={18} /> Start Workout
                </button>
              </div>
            )}
            {recentLogs.length > 0 && (
              <div>
                <p className="section-header">RECENT</p>
                <div className="space-y-3 stagger">
                  {recentLogs.map(log => {
                    const vol = log.sets.reduce((s, x) => s + x.weight * x.reps, 0);
                    return (
                      <div key={log.id} className="card animate-fade-up">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-white">{log.day_name ?? 'Workout'}</h3>
                            <p className="text-xs text-white/35 mt-0.5">{formatDate(log.date)}</p>
                          </div>
                          {log.duration_minutes && <span className="text-xs text-white/35 flex items-center gap-1"><Timer size={12}/>{log.duration_minutes}m</span>}
                        </div>
                        <div className="flex gap-5">
                          <div><p className="text-xs text-white/35">Sets</p><p className="text-lg font-bold text-white">{log.sets.length}</p></div>
                          <div><p className="text-xs text-white/35">Volume</p><p className="text-lg font-bold text-white">{(vol/1000).toFixed(1)}T</p></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 stagger">
              {[{ label: 'Exercises', value: groups.length }, { label: 'Done', value: completedSets }, { label: 'Total', value: totalSets }].map(({ label, value }) => (
                <div key={label} className="card text-center animate-fade-up">
                  <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
                  <p className="text-xs text-white/35 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {groups.map(g => (
              <ExerciseBlock key={g.name} group={g} sets={g.indices.map(i => activeWorkout.sets[i])}
                onAddSet={() => { const last = activeWorkout.sets[g.indices[g.indices.length-1]] as any; addSet({ exercise_name: g.name, muscle_group: g.muscle, set_number: g.indices.length+1, weight: last?.weight??0, reps: last?.reps??0, completed: false, target_sets: g.targetSets, target_reps: g.targetReps } as any); }}
                onUpdateSet={(li, u) => updateSet(g.indices[li], u)}
                onRemoveSet={li => removeSet(g.indices[li])}
              />
            ))}

            <button onClick={() => setShowAdd(true)}
              className="w-full py-4 border border-dashed border-white/[0.08] rounded-2xl text-sm font-semibold text-white/30 flex items-center justify-center gap-2 hover:border-blue-500/40 hover:text-blue-400 transition-all animate-fade-up">
              <Plus size={18} /> Add Exercise
            </button>

            <div className="flex gap-3 animate-fade-up">
              <button onClick={() => { if(confirm('Discard workout?')) discardWorkout(); }} className="btn-secondary flex-1"><X size={18}/> Discard</button>
              <button onClick={handleFinish} disabled={saving || !totalSets} className="btn-primary flex-1">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Square size={18}/>} Finish
              </button>
            </div>
          </>
        )}
      </div>

      <AddExerciseModal isOpen={showAdd} onClose={() => setShowAdd(false)} onAdd={(name, muscle) => { addSet({ exercise_name: name, muscle_group: muscle, set_number: 1, weight: 0, reps: 0, completed: false } as any); toast(`${name} added`, 'success'); }} />
    </div>
  );
}