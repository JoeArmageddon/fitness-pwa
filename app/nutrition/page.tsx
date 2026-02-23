'use client';
import { useState, useEffect } from 'react';
import { Sparkles, Plus, X, Search, ChevronDown, ChevronUp, Utensils, Zap, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { cn, today, formatDate } from '@/lib/utils';
import { searchFoods } from '@/lib/food-database';
import { toast } from '@/components/ui/toaster';
import type { MealEntry } from '@/types';

const MEAL_TYPES = ['breakfast','lunch','dinner','snack','pre_workout','post_workout'] as const;
type MealType = typeof MEAL_TYPES[number];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner',
  snack:'Snack', pre_workout:'Pre-Workout', post_workout:'Post-Workout'
};

// ── Ring ───────────────────────────────────────────────────
function Ring({ pct, size=72, stroke=6, color='#0A84FF', label, value }: {
  pct: number; size?: number; stroke?: number; color?: string; label: string; value: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - Math.min(pct / 100, 1) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <p className="text-[11px] font-bold text-white tabular-nums" style={{ marginTop: -size/2 - 4 }}>{value}</p>
      <p className="text-[10px] text-white/40">{label}</p>
    </div>
  );
}

// ── Macro bar ──────────────────────────────────────────────
function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-semibold text-white/60">{label}</span>
        <span className="text-xs font-bold text-white tabular-nums">{Math.round(value)}<span className="text-white/35">/{goal}g</span></span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── AI Parse Modal ─────────────────────────────────────────
function AIParseModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean; onClose: () => void;
  onAdd: (items: Array<{ name: string; grams: number; cal: number; protein: number; carbs: number; fat: number }>, mealType: MealType) => void;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [apiError, setApiError] = useState<any>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');

  const parse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setApiError(null);
    try {
      const res = await fetch('/api/ai/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        // Show full error details in the modal, not just a toast
        setApiError(data);
        return;
      }
      if (!data.items?.length) {
        setApiError({ error: 'AI returned no food items. Try rephrasing.' });
        return;
      }
      setResult(data);
    } catch (e: any) {
      setApiError({ error: `Network error: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!result?.items) return;
    onAdd(result.items.map((item: any) => ({
      name: item.name, grams: item.quantity_g,
      cal: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat,
    })), mealType);
    setText(''); setResult(null); setApiError(null); onClose();
  };

  const reset = () => { setResult(null); setApiError(null); };

  if (!isOpen) return null;

  const sourceColor = result?.source === 'gemini' ? '#BF5AF2' : '#0A84FF';
  const sourceLabel = result?.source === 'gemini' ? 'Gemini AI' : 'Groq AI';

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full animate-slide-up sheet max-h-[90vh] overflow-y-auto">
        <div className="sheet-handle" />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Sparkles size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Food Parser</h2>
            <p className="text-xs text-white/40">Type exactly what you ate — AI figures out the macros</p>
          </div>
        </div>

        {/* Input */}
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); reset(); }}
          placeholder="e.g. 2 rotis, dal fry, glass of milk"
          className="input-apple min-h-[90px] resize-none text-sm"
          autoFocus
        />

        {/* Meal type */}
        <div className="mt-3 mb-4">
          <p className="text-[11px] text-white/35 font-bold uppercase tracking-wider mb-2">Log as</p>
          <div className="flex gap-2 flex-wrap">
            {MEAL_TYPES.map(t => (
              <button key={t} onClick={() => setMealType(t)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                  mealType === t ? 'bg-blue-500 text-white' : 'bg-white/[0.06] text-white/50')}>
                {MEAL_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <button onClick={parse} disabled={!text.trim() || loading} className="btn-primary w-full">
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Asking AI...</>
            : <><Sparkles size={17} /> Parse with AI</>
          }
        </button>

        {/* ── Error state ── */}
        {apiError && (
          <div className="mt-4 animate-fade-up">
            <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl">
              <p className="font-bold text-red-400 text-sm mb-2">⚠️ {apiError.error}</p>

              {/* No keys — show setup instructions right in the modal */}
              {apiError.noKeys && apiError.setup && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-white/50 font-semibold uppercase tracking-wider">How to fix:</p>
                  {apiError.setup.map((step: string, i: number) => (
                    <div key={i} className="flex gap-2 text-xs text-white/70">
                      <span className="text-blue-400 font-bold shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                  <p className="text-xs text-white/35 mt-3">The Gemini free tier gives you 1,500 AI food parses per day — more than enough.</p>
                </div>
              )}

              {/* AI failed (keys present but API error) */}
              {!apiError.noKeys && apiError.errors && (
                <div className="mt-2 space-y-1">
                  {apiError.errors.map((e: string, i: number) => (
                    <p key={i} className="text-xs text-white/40 font-mono">{e}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Success result ── */}
        {result && (
          <div className="mt-4 animate-fade-up space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{result.items.length} food{result.items.length !== 1 ? 's' : ''} identified</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: `${sourceColor}20`, color: sourceColor }}>
                ✦ {sourceLabel}
              </span>
            </div>

            <div className="space-y-2">
              {result.items.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.04] border border-white/[0.07] rounded-2xl">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm capitalize">{item.name}</p>
                    <p className="text-xs text-white/35 mt-0.5">{item.quantity_g}g</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="text-center"><p className="text-xs font-bold text-white tabular-nums">{Math.round(item.calories)}</p><p className="text-[9px] text-white/30">kcal</p></div>
                    <div className="text-center"><p className="text-xs font-bold text-blue-400 tabular-nums">{item.protein}g</p><p className="text-[9px] text-white/30">prot</p></div>
                    <div className="text-center"><p className="text-xs font-bold text-orange-400 tabular-nums">{item.carbs}g</p><p className="text-[9px] text-white/30">carb</p></div>
                    <div className="text-center"><p className="text-xs font-bold text-yellow-400 tabular-nums">{item.fat}g</p><p className="text-[9px] text-white/30">fat</p></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-4 gap-2 p-3 bg-white/[0.06] border border-white/[0.08] rounded-2xl">
              {[
                { label: 'Calories', value: Math.round(result.total_calories), color: '#fff' },
                { label: 'Protein',  value: `${Math.round(result.total_protein)}g`,  color: '#0A84FF' },
                { label: 'Carbs',    value: `${Math.round(result.total_carbs)}g`,    color: '#FF9F0A' },
                { label: 'Fat',      value: `${Math.round(result.total_fat)}g`,      color: '#FFD60A' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="text-sm font-black tabular-nums" style={{ color }}>{value}</p>
                  <p className="text-[9px] text-white/35">{label}</p>
                </div>
              ))}
            </div>

            <button onClick={handleAdd} className="btn-primary w-full">
              Add to {MEAL_LABELS[mealType]}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Manual Food Search Modal ───────────────────────────────
function SearchModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean; onClose: () => void;
  onAdd: (name: string, grams: number, cal: number, protein: number, carbs: number, fat: number, mealType: MealType) => void;
}) {
  const [query, setQuery] = useState('');
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [selected, setSelected] = useState<any>(null);
  const results = query.length > 1 ? searchFoods(query) : [];

  if (!isOpen) return null;
  const calc = (field: string) => selected ? Math.round((selected[`${field}_per_100g`] * grams) / 100 * 10) / 10 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full animate-slide-up sheet max-h-[88vh] overflow-y-auto">
        <div className="sheet-handle" />
        <h2 className="text-xl font-bold text-white mb-4">Search Food</h2>
        <input type="text" value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }}
          placeholder="Search foods..." className="input-apple mb-3" autoFocus />

        {results.length > 0 && !selected && (
          <div className="space-y-1 mb-4 max-h-52 overflow-y-auto">
            {results.map(f => (
              <button key={f.id} onClick={() => { setSelected(f); setGrams(f.serving_size_g ?? 100); }}
                className="w-full flex items-center gap-3 p-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-left hover:bg-white/[0.07] transition-all">
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{f.name}</p>
                  <p className="text-xs text-white/35">{f.serving_size_g ? `${f.serving_size_g}g serving` : 'per 100g'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{f.calories_per_100g}</p>
                  <p className="text-[10px] text-white/35">kcal/100g</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="animate-fade-up space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <div className="flex-1">
                <p className="font-bold text-white">{selected.name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/40"><X size={16} /></button>
            </div>

            <div>
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Amount (grams)</p>
              <input type="number" value={grams} onChange={e => setGrams(parseFloat(e.target.value) || 0)} className="input-number" inputMode="decimal" />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Calories', value: calc('calories'), color: 'text-white' },
                { label: 'Protein', value: `${calc('protein')}g`, color: 'text-blue-400' },
                { label: 'Carbs', value: `${calc('carbs')}g`, color: 'text-orange-400' },
                { label: 'Fat', value: `${calc('fat')}g`, color: 'text-yellow-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/[0.05] border border-white/[0.08] rounded-xl p-2 text-center">
                  <p className={cn('text-sm font-bold', color)}>{value}</p>
                  <p className="text-[10px] text-white/35">{label}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[11px] text-white/35 font-bold uppercase tracking-wider mb-2">Meal</p>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map(t => (
                  <button key={t} onClick={() => setMealType(t)}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                      mealType === t ? 'bg-blue-500 text-white' : 'bg-white/[0.06] text-white/50')}>
                    {MEAL_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { onAdd(selected.name, grams, calc('calories'), calc('protein'), calc('carbs'), calc('fat'), mealType); setSelected(null); setQuery(''); onClose(); }}
              className="btn-primary w-full">
              Add to Log
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function NutritionPage() {
  const { nutritionGoal } = useAppStore();
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>(null);

  const totals = entries.reduce((acc, e) => ({
    calories: acc.calories + e.calories, protein: acc.protein + e.protein,
    carbs: acc.carbs + e.carbs, fat: acc.fat + e.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const load = async () => {
    const { data } = await supabase.from('meal_entries').select('*').eq('date', today()).order('created_at');
    if (data) setEntries(data as MealEntry[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addEntries = async (items: Array<{ name: string; grams: number; cal: number; protein: number; carbs: number; fat: number }>, mealType: MealType = 'lunch') => {
    for (const item of items) {
      const entry = { date: today(), meal_type: mealType, food_name: item.name, quantity_g: item.grams, calories: item.cal, protein: item.protein, carbs: item.carbs, fat: item.fat };
      const { data } = await supabase.from('meal_entries').insert(entry).select().single();
      if (data) setEntries(prev => [...prev, data as MealEntry]);
    }
    toast(`${items.length} food${items.length > 1 ? 's' : ''} logged! 🍽️`, 'success');
  };

  const addSingle = async (name: string, grams: number, cal: number, protein: number, carbs: number, fat: number, mealType: MealType) => {
    addEntries([{ name, grams, cal, protein, carbs, fat }], mealType);
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('meal_entries').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
    toast('Removed', 'info');
  };

  const calPct = (totals.calories / nutritionGoal.calories) * 100;
  const mealGroups = MEAL_TYPES.map(t => ({ type: t, entries: entries.filter(e => e.meal_type === t) })).filter(g => g.entries.length > 0);

  return (
    <div className="pb-4">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Nutrition</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowAI(true)}
              className="flex items-center gap-1.5 bg-purple-500/20 text-purple-300 text-sm font-bold px-3 py-2 rounded-xl border border-purple-500/25 active:scale-95 transition-all">
              <Sparkles size={14} /> AI
            </button>
            <button onClick={() => setShowSearch(true)}
              className="flex items-center gap-1.5 bg-blue-500/20 text-blue-300 text-sm font-bold px-3 py-2 rounded-xl border border-blue-500/25 active:scale-95 transition-all">
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Calorie overview */}
        <div className="card-glow animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-header" style={{ marginBottom: 4 }}>TODAY</p>
              <p className="text-4xl font-black text-white tabular-nums tracking-tight">
                {Math.round(totals.calories)}<span className="text-lg font-medium text-white/40"> kcal</span>
              </p>
              <p className="text-sm text-white/40 mt-1">of {nutritionGoal.calories} goal · {Math.round(Math.max(0, nutritionGoal.calories - totals.calories))} remaining</p>
            </div>
            <div className="relative w-20 h-20">
              <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle cx="40" cy="40" r="32" fill="none" stroke="#0A84FF" strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 32} strokeDashoffset={2 * Math.PI * 32 * (1 - Math.min(calPct / 100, 1))}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black text-white">{Math.round(calPct)}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <MacroBar label="Protein" value={totals.protein} goal={nutritionGoal.protein} color="#0A84FF" />
            <MacroBar label="Carbs" value={totals.carbs} goal={nutritionGoal.carbs} color="#FF9F0A" />
            <MacroBar label="Fat" value={totals.fat} goal={nutritionGoal.fat} color="#FFD60A" />
          </div>
        </div>

        {/* Macro rings */}
        <div className="card animate-fade-up">
          <div className="flex justify-around py-2">
            <Ring pct={(totals.protein / nutritionGoal.protein) * 100} color="#0A84FF" label="Protein" value={`${Math.round(totals.protein)}g`} />
            <Ring pct={(totals.carbs / nutritionGoal.carbs) * 100} color="#FF9F0A" label="Carbs" value={`${Math.round(totals.carbs)}g`} />
            <Ring pct={(totals.fat / nutritionGoal.fat) * 100} color="#FFD60A" label="Fat" value={`${Math.round(totals.fat)}g`} />
          </div>
        </div>

        {/* Empty state */}
        {!loading && entries.length === 0 && (
          <div className="card text-center py-10 animate-fade-up">
            <div className="w-14 h-14 bg-orange-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Utensils size={26} className="text-orange-400" />
            </div>
            <p className="font-bold text-white mb-1">No food logged yet</p>
            <p className="text-sm text-white/40 mb-5">Type what you ate and AI will find the macros</p>
            <button onClick={() => setShowAI(true)} className="btn-primary mx-auto">
              <Sparkles size={17} /> Parse with AI
            </button>
          </div>
        )}

        {/* Meal groups */}
        {mealGroups.length > 0 && (
          <div>
            <p className="section-header">MEALS</p>
            <div className="space-y-3 stagger">
              {mealGroups.map(({ type, entries: mEntries }) => {
                const mCal = mEntries.reduce((s, e) => s + e.calories, 0);
                const isExpanded = expandedMeal === type;
                return (
                  <div key={type} className="card animate-fade-up overflow-hidden">
                    <button onClick={() => setExpandedMeal(isExpanded ? null : type)}
                      className="w-full flex items-center justify-between">
                      <div className="text-left">
                        <p className="font-bold text-white">{MEAL_LABELS[type]}</p>
                        <p className="text-xs text-white/40 mt-0.5">{mEntries.length} items · {Math.round(mCal)} kcal</p>
                      </div>
                      {isExpanded ? <ChevronUp size={18} className="text-white/30" /> : <ChevronDown size={18} className="text-white/30" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 animate-fade-up">
                        {mEntries.map(e => (
                          <div key={e.id} className="flex items-center gap-3 p-2.5 bg-white/[0.03] rounded-xl">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white capitalize truncate">{e.food_name}</p>
                              <p className="text-xs text-white/35">{e.quantity_g}g</p>
                            </div>
                            <div className="flex gap-3 items-center">
                              <div className="text-right">
                                <p className="text-sm font-bold text-white tabular-nums">{Math.round(e.calories)}</p>
                                <p className="text-[10px] text-white/30">kcal</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-blue-400 tabular-nums">{e.protein}g</p>
                                <p className="text-[10px] text-white/30">prot</p>
                              </div>
                              <button onClick={() => deleteEntry(e.id)} className="ml-1 text-white/15 hover:text-red-400 transition-colors">
                                <X size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <AIParseModal isOpen={showAI} onClose={() => setShowAI(false)}
        onAdd={(items, mealType) => addEntries(items, mealType)} />
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} onAdd={addSingle} />
    </div>
  );
}