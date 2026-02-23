'use client';
import { useState, useEffect } from 'react';
import { Sparkles, Calendar, Dumbbell, Trash2, ChevronDown, ChevronUp, Copy, Play, Zap, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseWorkoutText, inferMuscleGroup } from '@/lib/ai';
import { useAppStore } from '@/lib/store';
import { cn, muscleColor, muscleLabel } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import type { Program, MuscleGroup } from '@/types';

const EXAMPLE = `Monday: Full Body Activation
Goblet Squat
3×12
Push-Ups
3×10
Seated Cable Row
3×12
Dumbbell Romanian Deadlift
3×12
Dumbbell Shoulder Press
2×12

Wednesday: Upper Body Push
Barbell Bench Press 4x8
Incline DB Press 3x10
Overhead Press 3x10
Lateral Raise 3x15
Tricep Pushdown 3x12

Friday: Lower Body + Pull
Barbell Squat 4x8
Romanian Deadlift 3x10
Lat Pulldown 3x12
Seated Row 3x12
Leg Curl 3x12`;

function ProgramCard({ program, isActive, onActivate, onDelete }: {
  program: Program; isActive: boolean;
  onActivate: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={cn('card transition-all duration-200 animate-fade-up', isActive && 'ring-1 ring-blue-500/40')}>
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          isActive ? 'bg-blue-500/20' : 'bg-white/[0.06]')}>
          <Calendar size={18} className={isActive ? 'text-blue-400' : 'text-white/40'} />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2">
            {isActive && <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">ACTIVE</span>}
            <h3 className="font-bold text-white truncate">{program.name}</h3>
          </div>
          <p className="text-xs text-white/40 mt-0.5">{program.days?.length ?? 0} days</p>
        </div>
        <div className="flex items-center gap-2">
          {!isActive && (
            <button onClick={onActivate} className="text-xs font-bold text-blue-400 bg-blue-500/15 border border-blue-500/25 px-3 py-1.5 rounded-xl active:scale-95 transition-all">
              Activate
            </button>
          )}
          <button onClick={onDelete} className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/25 hover:text-red-400 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {expanded && program.days && (
        <div className="mt-4 space-y-3 animate-fade-up">
          {program.days.map((day, di) => (
            <div key={day.id ?? di} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
              <p className="font-bold text-white text-sm mb-0.5">{day.day_name}</p>
              {day.focus && <p className="text-xs text-white/35 mb-3">{day.focus}</p>}
              <div className="space-y-2">
                {day.exercises?.map((ex, ei) => (
                  <div key={ei} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: muscleColor(ex.muscle_group as MuscleGroup) }} />
                    <p className="text-sm text-white flex-1">{ex.name}</p>
                    <p className="text-xs text-white/35 font-bold tabular-nums">{ex.sets}×{ex.reps}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setExpanded(false)} className="flex items-center justify-center gap-1 text-white/30 text-sm w-full py-2">
            <ChevronUp size={14} /> Collapse
          </button>
        </div>
      )}

      {!expanded && (program.days?.length ?? 0) > 0 && (
        <button onClick={() => setExpanded(true)} className="mt-3 flex items-center gap-1 text-blue-400/60 text-sm font-medium">
          <ChevronDown size={13} /> View days
        </button>
      )}
    </div>
  );
}

function ParseModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState<any>(null);

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const result = await parseWorkoutText(text);
      setParsed(result);
    } catch { toast('Parse failed', 'error'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!parsed?.data || !name.trim()) return;
    setSaving(true);
    try {
      const { data: prog, error } = await supabase.from('programs')
        .insert({ name, mode: 'fixed', is_active: false }).select('id').single();
      if (error) throw error;
      for (let di = 0; di < parsed.data.days.length; di++) {
        const day = parsed.data.days[di];
        const { data: dayRow, error: de } = await supabase.from('program_days')
          .insert({ program_id: prog.id, day_name: day.day_name, focus: day.focus ?? null, order_index: di }).select('id').single();
        if (de) throw de;
        if (day.exercises?.length) {
          await supabase.from('program_exercises').insert(day.exercises.map((ex: any, ei: number) => ({
            program_day_id: dayRow.id, name: ex.name,
            muscle_group: ex.muscle_group ?? inferMuscleGroup(ex.name),
            sets: ex.sets ?? 3, reps: ex.reps ?? '10', order_index: ei,
          })));
        }
      }
      toast(`"${name}" saved! 🎯`, 'success');
      setText(''); setName(''); setParsed(null);
      onSaved(); onClose();
    } catch (e) { console.error(e); toast('Save failed', 'error'); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full animate-slide-up sheet max-h-[92vh] overflow-y-auto">
        <div className="sheet-handle" />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Sparkles size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Parse Program</h2>
            <p className="text-xs text-white/40">Paste any workout schedule as plain text</p>
          </div>
        </div>

        <button onClick={() => setText(EXAMPLE)} className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold mb-3">
          <Copy size={11} /> Load example program
        </button>

        <textarea value={text} onChange={e => setText(e.target.value)} autoFocus
          placeholder={'Monday: Full Body\nGoblet Squat 3x12\nPush-Ups 3x10\n...'}
          className="input-apple min-h-[160px] resize-none text-sm font-mono" />

        <button onClick={handleParse} disabled={!text.trim() || loading} className="btn-primary w-full mt-3">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={17} />}
          {loading ? 'Parsing...' : 'Parse Schedule'}
        </button>

        {parsed?.data?.days?.length > 0 && (
          <div className="mt-5 space-y-4 animate-fade-up">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-green-400" />
              <p className="font-bold text-white text-sm">{parsed.data.days.length} days parsed</p>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: parsed.confidence === 'high' ? '#30D15820' : '#FF9F0A20', color: parsed.confidence === 'high' ? '#30D158' : '#FF9F0A' }}>
                {parsed.confidence} · via {parsed.source}
              </span>
            </div>

            {parsed.data.days.map((day: any, i: number) => (
              <div key={i} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                <p className="font-bold text-white text-sm">{day.day_name}</p>
                {day.focus && <p className="text-xs text-white/35 mb-2">{day.focus}</p>}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[...new Set(day.exercises?.map((e: any) => e.muscle_group ?? inferMuscleGroup(e.name)) ?? [])].map((mg: any) => (
                    <span key={mg} className="text-[10px] px-2 py-0.5 rounded-full text-white font-bold" style={{ backgroundColor: muscleColor(mg) }}>
                      {muscleLabel(mg as MuscleGroup)}
                    </span>
                  ))}
                  <span className="text-[10px] text-white/30 self-center">{day.exercises?.length} exercises</span>
                </div>
              </div>
            ))}

            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Program name (e.g. PPL, 3-Day Split)" className="input-apple" />
            <button onClick={handleSave} disabled={!name.trim() || saving} className="btn-primary w-full">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              Save Program
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProgramPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showParse, setShowParse] = useState(false);
  const { activeProgram, setActiveProgram } = useAppStore();

  const loadPrograms = async () => {
    const { data: progs } = await supabase.from('programs').select('*').order('created_at', { ascending: false });
    if (!progs) { setLoading(false); return; }
    const full = await Promise.all(progs.map(async (prog: any) => {
      const { data: days } = await supabase.from('program_days').select('*').eq('program_id', prog.id).order('order_index');
      const daysEx = await Promise.all((days ?? []).map(async (day: any) => {
        const { data: exs } = await supabase.from('program_exercises').select('*').eq('program_day_id', day.id).order('order_index');
        return { ...day, exercises: exs ?? [] };
      }));
      return { ...prog, days: daysEx };
    }));
    setPrograms(full as Program[]);
    setLoading(false);
  };

  useEffect(() => { loadPrograms(); }, []);

  const activate = async (prog: Program) => {
    setActiveProgram(prog);
    await supabase.from('programs').update({ is_active: false }).neq('id', prog.id);
    await supabase.from('programs').update({ is_active: true }).eq('id', prog.id);
    toast(`"${prog.name}" is now active 🔥`, 'success');
    loadPrograms();
  };

  const deleteProgram = async (id: string) => {
    if (!confirm('Delete this program?')) return;
    await supabase.from('programs').delete().eq('id', id);
    if (activeProgram?.id === id) setActiveProgram(null);
    setPrograms(prev => prev.filter(p => p.id !== id));
    toast('Deleted', 'info');
  };

  return (
    <div className="pb-4">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Programs</h1>
          <button onClick={() => setShowParse(true)}
            className="flex items-center gap-1.5 bg-purple-500/20 text-purple-300 text-sm font-bold px-3 py-2 rounded-xl border border-purple-500/25 active:scale-95 transition-all">
            <Sparkles size={14} /> Parse
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-start gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl animate-fade-up">
          <Sparkles size={18} className="text-purple-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-purple-300 text-sm">Text-to-Program</p>
            <p className="text-xs text-purple-300/60 mt-0.5">Paste your workout schedule in plain text — sets, reps, and muscle groups are auto-detected.</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : programs.length === 0 ? (
          <div className="card text-center py-12 animate-fade-up">
            <div className="w-16 h-16 bg-purple-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar size={28} className="text-purple-400" />
            </div>
            <p className="font-bold text-white mb-1">No programs yet</p>
            <p className="text-sm text-white/40 mb-6">Parse your workout schedule to get started</p>
            <button onClick={() => setShowParse(true)} className="btn-primary mx-auto">
              <Sparkles size={17} /> Parse Schedule
            </button>
          </div>
        ) : (
          <div className="space-y-3 stagger">
            {programs.map(prog => (
              <ProgramCard key={prog.id} program={prog} isActive={activeProgram?.id === prog.id}
                onActivate={() => activate(prog)} onDelete={() => deleteProgram(prog.id)} />
            ))}
          </div>
        )}
      </div>

      <ParseModal isOpen={showParse} onClose={() => setShowParse(false)} onSaved={loadPrograms} />
    </div>
  );
}