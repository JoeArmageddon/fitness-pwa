// ============================================================
// UTILITY FUNCTIONS
// ============================================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, subDays, eachDayOfInterval } from 'date-fns';

// ── Tailwind helper ────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date helpers ───────────────────────────────────────────
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(date: string): string {
  return format(parseISO(date), 'MMM d, yyyy');
}

export function formatDateShort(date: string): string {
  return format(parseISO(date), 'MMM d');
}

export function getLastNDays(n: number): string[] {
  const end = new Date();
  const start = subDays(end, n - 1);
  return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'));
}

// ── Number helpers ─────────────────────────────────────────
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatWeight(kg: number, decimals = 1): string {
  return `${kg.toFixed(decimals)} kg`;
}

export function formatCalories(cal: number): string {
  return `${Math.round(cal)} kcal`;
}

// ── Moving average ─────────────────────────────────────────
export function movingAverage(values: number[], window = 7): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return round2(slice.reduce((a, b) => a + b, 0) / slice.length);
  });
}

// ── Volume calculation ─────────────────────────────────────
export function calculateVolume(weight: number, reps: number, sets: number): number {
  return weight * reps * sets;
}

// ── Percentage helpers ─────────────────────────────────────
export function pct(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

// ── Recovery score label ───────────────────────────────────
export function recoveryLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: '#00C896' };
  if (score >= 65) return { label: 'Good', color: '#7BC67E' };
  if (score >= 50) return { label: 'Moderate', color: '#FFD166' };
  if (score >= 35) return { label: 'Poor', color: '#EF8C55' };
  return { label: 'Very Poor', color: '#EF5350' };
}

// ── Muscle group display ───────────────────────────────────
export function muscleLabel(muscle: string): string {
  const map: Record<string, string> = {
    chest: 'Chest',
    back: 'Back',
    shoulders: 'Shoulders',
    biceps: 'Biceps',
    triceps: 'Triceps',
    legs: 'Legs',
    quads: 'Quads',
    hamstrings: 'Hamstrings',
    glutes: 'Glutes',
    calves: 'Calves',
    core: 'Core',
    forearms: 'Forearms',
    traps: 'Traps',
    lats: 'Lats',
    full_body: 'Full Body',
  };
  return map[muscle] ?? muscle;
}

export function muscleColor(muscle: string): string {
  const map: Record<string, string> = {
    chest: '#FF6B6B',
    back: '#4ECDC4',
    shoulders: '#45B7D1',
    biceps: '#96CEB4',
    triceps: '#88D8B0',
    legs: '#FFEAA7',
    quads: '#F7DC6F',
    hamstrings: '#D4AC0D',
    glutes: '#F0A500',
    calves: '#FAD7A0',
    core: '#DDA0DD',
    forearms: '#C39BD3',
    traps: '#85C1E9',
    lats: '#5DADE2',
    full_body: '#AAB7B8',
  };
  return map[muscle] ?? '#AAB7B8';
}

// ── Generate unique ID ─────────────────────────────────────
export function uid(): string {
  return crypto.randomUUID();
}

// ── Week start/end ─────────────────────────────────────────
export function weekRange(date: Date = new Date()): { start: string; end: string } {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day + 1); // Monday
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Sunday
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}

// ── BMR / TDEE helpers ─────────────────────────────────────
export function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: 'male' | 'female'
): number {
  // Mifflin-St Jeor
  if (gender === 'male') {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  }
  return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
}

export function calculateTDEE(bmr: number, activityLevel: number): number {
  return Math.round(bmr * activityLevel);
}

// Activity multipliers
export const ACTIVITY_LEVELS = [
  { label: 'Sedentary (desk job)', value: 1.2 },
  { label: 'Lightly Active (1-3 days/week)', value: 1.375 },
  { label: 'Moderately Active (3-5 days/week)', value: 1.55 },
  { label: 'Very Active (6-7 days/week)', value: 1.725 },
  { label: 'Extremely Active (athlete)', value: 1.9 },
];
