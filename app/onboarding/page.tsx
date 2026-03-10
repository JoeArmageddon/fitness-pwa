'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { calculateBMR, calculateTDEE, ACTIVITY_LEVELS } from '@/lib/utils';
import { sanitizeName, sanitizeNumber, sanitizeEnum } from '@/lib/sanitize';
import { ChevronRight, Target, Dumbbell, User, Zap, Check } from 'lucide-react';
import type { Goal, Experience } from '@/types';

const GOALS: { value: Goal; label: string; desc: string; icon: string }[] = [
  { value: 'lose_fat', label: 'Lose Fat', desc: 'Cut body fat while preserving muscle', icon: '🔥' },
  { value: 'build_muscle', label: 'Build Muscle', desc: 'Maximize muscle mass and strength', icon: '💪' },
  { value: 'maintain', label: 'Maintain', desc: 'Stay at current weight and fitness level', icon: '⚖️' },
  { value: 'athletic', label: 'Athletic Performance', desc: 'Improve speed, power, and endurance', icon: '⚡' },
];

const EXPERIENCES: { value: Experience; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'Less than 1 year of consistent training' },
  { value: 'intermediate', label: 'Intermediate', desc: '1-3 years of consistent training' },
  { value: 'advanced', label: 'Advanced', desc: '3+ years of serious training' },
];

const STEPS = ['Goal', 'Experience', 'Body Stats', 'Your Plan'];

export default function OnboardingPage() {
  const router = useRouter();
  const { setProfile, setNutritionGoal, user } = useAppStore();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>('build_muscle');
  const [experience, setExperience] = useState<Experience>('intermediate');
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('70');
  const [age, setAge] = useState('25');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activity, setActivity] = useState(1);
  const [saving, setSaving] = useState(false);

  const bmr = calculateBMR(parseFloat(weight) || 70, parseFloat(height) || 170, parseInt(age) || 25, gender);
  const tdee = calculateTDEE(bmr, ACTIVITY_LEVELS[activity].value);

  const macroGoal = () => {
    const protein = Math.round((parseFloat(weight) || 70) * 2.2); // 2.2g per kg
    let calories = tdee;
    if (goal === 'lose_fat') calories = Math.round(tdee * 0.8);
    if (goal === 'build_muscle') calories = Math.round(tdee * 1.1);
    const fat = Math.round(calories * 0.25 / 9);
    const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
    return { calories, protein: Math.max(protein, 100), carbs: Math.max(carbs, 50), fat, fiber: 30 };
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    const macros = macroGoal();
    const cleanGoal = sanitizeEnum<Goal>(goal, ['lose_fat', 'build_muscle', 'maintain', 'athletic'], 'maintain');
    const cleanExp = sanitizeEnum<Experience>(experience, ['beginner', 'intermediate', 'advanced'], 'beginner');

    const profileData = {
      goal: cleanGoal,
      experience: cleanExp,
      height_cm: sanitizeNumber(height, 100, 250, 170),
      weight_kg: sanitizeNumber(weight, 30, 300, 70),
      onboarded: true,
    };

    const { data: updatedProfile } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', user.id)
      .select()
      .single();

    await supabase.from('nutrition_goals').upsert({
      user_id: user.id,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: macros.fiber,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (updatedProfile) setProfile(updatedProfile as any);
    setNutritionGoal(macros);
    setSaving(false);
    router.replace('/');
  };

  return (
    <div className="min-h-screen px-5 pt-safe pb-8 flex flex-col">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8 mt-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col items-center gap-1">
            <div className={`h-1 w-full rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-white/10'}`} />
            <span className={`text-[10px] font-bold ${i === step ? 'text-blue-400' : 'text-white/25'}`}>{s}</span>
          </div>
        ))}
      </div>

      <div className="flex-1">
        {/* Step 0: Goal */}
        {step === 0 && (
          <div className="animate-fade-up">
            <div className="mb-6">
              <p className="text-white/50 text-sm mb-1">Step 1 of 4</p>
              <h1 className="text-2xl font-bold text-white">What's your goal?</h1>
            </div>
            <div className="space-y-3">
              {GOALS.map((g) => (
                <button key={g.value} onClick={() => setGoal(g.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${goal === g.value ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/[0.08] bg-white/[0.03]'}`}>
                  <span className="text-2xl">{g.icon}</span>
                  <div>
                    <p className={`font-bold ${goal === g.value ? 'text-blue-300' : 'text-white'}`}>{g.label}</p>
                    <p className="text-xs text-white/40">{g.desc}</p>
                  </div>
                  {goal === g.value && <Check size={16} className="text-blue-400 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Experience */}
        {step === 1 && (
          <div className="animate-fade-up">
            <div className="mb-6">
              <p className="text-white/50 text-sm mb-1">Step 2 of 4</p>
              <h1 className="text-2xl font-bold text-white">Experience level?</h1>
            </div>
            <div className="space-y-3">
              {EXPERIENCES.map((e) => (
                <button key={e.value} onClick={() => setExperience(e.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${experience === e.value ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/[0.08] bg-white/[0.03]'}`}>
                  <div>
                    <p className={`font-bold ${experience === e.value ? 'text-blue-300' : 'text-white'}`}>{e.label}</p>
                    <p className="text-xs text-white/40">{e.desc}</p>
                  </div>
                  {experience === e.value && <Check size={16} className="text-blue-400 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Body Stats */}
        {step === 2 && (
          <div className="animate-fade-up">
            <div className="mb-6">
              <p className="text-white/50 text-sm mb-1">Step 3 of 4</p>
              <h1 className="text-2xl font-bold text-white">Body stats</h1>
              <p className="text-white/40 text-sm mt-1">Used to calculate your personalized nutrition targets</p>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <button onClick={() => setGender('male')}
                  className={`flex-1 py-3 rounded-2xl border font-bold text-sm transition-all ${gender === 'male' ? 'border-blue-500/50 bg-blue-500/10 text-blue-300' : 'border-white/[0.08] text-white/50'}`}>Male</button>
                <button onClick={() => setGender('female')}
                  className={`flex-1 py-3 rounded-2xl border font-bold text-sm transition-all ${gender === 'female' ? 'border-blue-500/50 bg-blue-500/10 text-blue-300' : 'border-white/[0.08] text-white/50'}`}>Female</button>
              </div>
              {[
                { label: 'Age (years)', val: age, set: setAge, min: 13, max: 99 },
                { label: 'Height (cm)', val: height, set: setHeight, min: 100, max: 250 },
                { label: 'Weight (kg)', val: weight, set: setWeight, min: 30, max: 300 },
              ].map(({ label, val, set, min, max }) => (
                <div key={label}>
                  <label className="section-header mb-2 block">{label}</label>
                  <input type="number" value={val}
                    onChange={(e) => set(String(Math.min(max, Math.max(min, Number(e.target.value)))))}
                    className="input-apple w-full input-number" min={min} max={max} />
                </div>
              ))}
              <div>
                <label className="section-header mb-2 block">Activity Level</label>
                <div className="space-y-2">
                  {ACTIVITY_LEVELS.map((al, i) => (
                    <button key={i} onClick={() => setActivity(i)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all ${activity === i ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                      <span className={`font-bold ${activity === i ? 'text-blue-300' : 'text-white'}`}>{al.label}</span>
                      <span className="text-white/35 text-xs">×{al.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <div className="animate-fade-up">
            <div className="mb-6">
              <p className="text-white/50 text-sm mb-1">Step 4 of 4</p>
              <h1 className="text-2xl font-bold text-white">Your personalized plan</h1>
            </div>
            <div className="space-y-4">
              {(() => {
                const m = macroGoal();
                return (
                  <>
                    <div className="card-glow text-center py-6">
                      <p className="section-header mb-1">Daily Calories</p>
                      <p className="text-5xl font-bold text-white">{m.calories}</p>
                      <p className="text-white/40 text-sm mt-1">kcal · TDEE {tdee} · {GOALS.find(g => g.value === goal)?.label}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Protein', val: m.protein, unit: 'g', color: '#0A84FF' },
                        { label: 'Carbs', val: m.carbs, unit: 'g', color: '#FF9F0A' },
                        { label: 'Fat', val: m.fat, unit: 'g', color: '#30D158' },
                      ].map(({ label, val, unit, color }) => (
                        <div key={label} className="card text-center py-4">
                          <p className="text-2xl font-bold" style={{ color }}>{val}</p>
                          <p className="text-xs text-white/40 mt-0.5">{unit} {label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-white/30 text-center px-4">These targets can be adjusted anytime in your profile settings.</p>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">
            Back
          </button>
        )}
        {step < 3 ? (
          <button onClick={() => setStep(s => s + 1)} className="btn-primary flex-1">
            Continue <ChevronRight size={17} />
          </button>
        ) : (
          <button onClick={handleFinish} disabled={saving} className="btn-primary flex-1">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap size={17} />}
            {saving ? 'Setting up...' : "Let's go!"}
          </button>
        )}
      </div>
    </div>
  );
}
