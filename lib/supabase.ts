// ============================================================
// SUPABASE CLIENT
// ============================================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'fitness-pwa-auth',
  },
});

// ── Database helper types ──────────────────────────────────

export type Tables = {
  exercises: {
    id: string;
    name: string;
    muscle_group: string;
    secondary_muscles: string[];
    equipment: string | null;
    notes: string | null;
    created_at: string;
  };
  workout_logs: {
    id: string;
    date: string;
    program_day_id: string | null;
    day_name: string | null;
    duration_minutes: number | null;
    overall_rpe: number | null;
    notes: string | null;
    created_at: string;
  };
  workout_sets: {
    id: string;
    workout_log_id: string;
    exercise_id: string;
    exercise_name: string;
    set_number: number;
    reps: number;
    weight: number;
    rpe: number | null;
    completed: boolean;
    notes: string | null;
  };
  programs: {
    id: string;
    name: string;
    mode: 'fixed' | 'custom';
    is_active: boolean;
    created_at: string;
  };
  program_days: {
    id: string;
    program_id: string;
    day_name: string;
    focus: string | null;
    order_index: number;
  };
  program_exercises: {
    id: string;
    program_day_id: string;
    name: string;
    muscle_group: string;
    sets: number;
    reps: string;
    rest_seconds: number | null;
    notes: string | null;
    order_index: number;
  };
  meal_entries: {
    id: string;
    date: string;
    meal_type: string;
    food_id: string;
    food_name: string;
    quantity_g: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
    created_at: string;
  };
  custom_foods: {
    id: string;
    name: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    fiber_per_100g: number | null;
    serving_size_g: number | null;
    created_at: string;
  };
  body_weights: {
    id: string;
    date: string;
    weight_kg: number;
    body_fat_pct: number | null;
    muscle_mass_kg: number | null;
    notes: string | null;
  };
  progress_photos: {
    id: string;
    date: string;
    storage_path: string;
    notes: string | null;
    tags: string[];
  };
  recovery_logs: {
    id: string;
    date: string;
    sleep_hours: number;
    sleep_quality: number;
    stress_level: number;
    mood: number;
    soreness: number;
    energy_level: number;
    recovery_score: number;
    notes: string | null;
    created_at: string;
  };
  nutrition_goals: {
    id: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
    updated_at: string;
  };
};
