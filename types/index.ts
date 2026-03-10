// ============================================================
// GLOBAL TYPE DEFINITIONS - Fitness OS
// ============================================================

// ── Workout Types ──────────────────────────────────────────

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'legs' | 'quads' | 'hamstrings' | 'glutes' | 'calves'
  | 'core' | 'forearms' | 'traps' | 'lats' | 'full_body';

export interface Exercise {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  secondary_muscles?: MuscleGroup[];
  equipment?: string;
  notes?: string;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight: number;
  rpe?: number;
  completed: boolean;
  notes?: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  program_day_id?: string;
  day_name?: string;
  duration_minutes?: number;
  overall_rpe?: number;
  notes?: string;
  sets: WorkoutSet[];
  created_at: string;
}

export interface PR {
  exercise_id: string;
  exercise_name: string;
  estimated_1rm: number;
  actual_weight: number;
  actual_reps: number;
  date: string;
}

// ── Program Types ──────────────────────────────────────────

export interface ProgramExercise {
  id: string;
  program_day_id: string;
  name: string;
  muscle_group: MuscleGroup;
  sets: number;
  reps: string;
  rest_seconds?: number;
  notes?: string;
  order_index: number;
}

export interface ProgramDay {
  id: string;
  program_id: string;
  day_name: string;
  focus?: string;
  exercises: ProgramExercise[];
  order_index: number;
}

export interface Program {
  id: string;
  name: string;
  mode: 'fixed' | 'custom';
  days: ProgramDay[];
  created_at: string;
  is_active: boolean;
}

// ── Nutrition Types ────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';

export interface FoodItem {
  id: string;
  name: string;
  name_hindi?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number;
  is_custom?: boolean;
  source?: 'local' | 'openfoodfacts' | 'custom';
  serving_size_g?: number;
  serving_label?: string;
}

export interface MealEntry {
  id: string;
  date: string;
  meal_type: MealType;
  food_id: string;
  food_name: string;
  quantity_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  created_at: string;
}

export interface DailyNutritionGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface DailyNutritionSummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  entries: MealEntry[];
  adherence_pct: number;
}

// ── Body Metrics Types ─────────────────────────────────────

export interface BodyWeight {
  id: string;
  date: string;
  weight_kg: number;
  body_fat_pct?: number;
  muscle_mass_kg?: number;
  notes?: string;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  url: string;
  thumbnail_url?: string;
  notes?: string;
  tags?: ('front' | 'back' | 'side')[];
}

export interface BodyMetricsSummary {
  current_weight: number;
  weekly_average: number;
  trend: 'gaining' | 'losing' | 'maintaining';
  change_7d: number;
  change_30d: number;
  plateau_detected: boolean;
  plateau_days?: number;
}

// ── Recovery Types ─────────────────────────────────────────

export interface RecoveryLog {
  id: string;
  date: string;
  sleep_hours: number;
  sleep_quality: 1 | 2 | 3 | 4 | 5;
  stress_level: 1 | 2 | 3 | 4 | 5;
  mood: 1 | 2 | 3 | 4 | 5;
  soreness: 1 | 2 | 3 | 4 | 5;
  energy_level: 1 | 2 | 3 | 4 | 5;
  recovery_score: number;
  notes?: string;
  created_at: string;
}

// ── AI Types ───────────────────────────────────────────────

export interface ParsedWorkoutProgram {
  days: {
    day_name: string;
    focus?: string;
    exercises: {
      name: string;
      sets: number;
      reps: string;
      muscle_group?: MuscleGroup;
    }[];
  }[];
}

export interface ParsedFoodItem {
  name: string;
  quantity_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  source?: 'database' | 'ai' | 'openfoodfacts';
}

export interface ParsedFoodEntry {
  items: ParsedFoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface AIResponse<T> {
  data: T | null;
  source: 'groq' | 'local' | 'openfoodfacts';
  confidence: 'high' | 'medium' | 'low';
  error?: string;
}

// ── Auth & User Types ──────────────────────────────────────

export type Plan = 'free' | 'pro';
export type Goal = 'lose_fat' | 'build_muscle' | 'maintain' | 'athletic';
export type Experience = 'beginner' | 'intermediate' | 'advanced';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  plan: Plan;
  height_cm: number | null;
  weight_kg: number | null;
  goal: Goal | null;
  experience: Experience | null;
  onboarded: boolean;
  created_at: string;
}

// ── Social & Leaderboard Types ─────────────────────────────

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  week_start: string;
  workouts_count: number;
  total_volume_kg: number;
  streak_days: number;
  points: number;
  profile?: Profile;
  rank?: number;
}

// ── Dashboard Types ────────────────────────────────────────

export interface DashboardSummary {
  today: {
    workout_logged: boolean;
    workout_name?: string;
    calories_logged: number;
    calorie_goal: number;
    recovery_score?: number;
  };
  weekly: {
    workouts_completed: number;
    avg_calories: number;
    avg_recovery: number;
    weight_change: number;
  };
  streak: {
    workout_streak: number;
    nutrition_streak: number;
  };
  alerts: ProgressAlert[];
}

export interface ProgressAlert {
  type: 'plateau' | 'pr' | 'deload' | 'increase_weight' | 'reduce_volume' | 'low_recovery';
  message: string;
  severity: 'info' | 'warning' | 'success';
  created_at: string;
}

// ── Analytics Types ────────────────────────────────────────

export interface StrengthDataPoint {
  date: string;
  exercise: string;
  estimated_1rm: number;
  weight: number;
  reps: number;
}

export interface VolumeDataPoint {
  date: string;
  muscle_group: MuscleGroup;
  total_sets: number;
  total_volume: number;
}

export interface WeightTrendPoint {
  date: string;
  weight: number;
  moving_avg_7d: number;
}

export interface NutritionTrendPoint {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goal_calories: number;
}

export interface RecoveryTrendPoint {
  date: string;
  recovery_score: number;
  sleep_hours: number;
  workout_volume?: number;
}
