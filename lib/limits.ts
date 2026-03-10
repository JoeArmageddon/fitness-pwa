// ============================================================
// PLAN LIMITS — Feature gating for Free vs Pro
// ============================================================

import type { Plan } from '@/types';

export interface PlanLimits {
  max_routines: number;
  max_meal_entries_per_day: number;
  analytics_days: number;
  max_leaderboard_groups: number;
  progress_photos: boolean;
  custom_foods: boolean;
  ai_parses_per_day: number;
  rest_timer: boolean;
  data_export: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    max_routines: 2,
    max_meal_entries_per_day: 10,
    analytics_days: 30,
    max_leaderboard_groups: 1,
    progress_photos: false,
    custom_foods: false,
    ai_parses_per_day: 5,
    rest_timer: true,
    data_export: false,
  },
  pro: {
    max_routines: Infinity,
    max_meal_entries_per_day: Infinity,
    analytics_days: 365,
    max_leaderboard_groups: Infinity,
    progress_photos: true,
    custom_foods: true,
    ai_parses_per_day: Infinity,
    rest_timer: true,
    data_export: true,
  },
};

export type GatedFeature = keyof PlanLimits;

/** Returns true if user's plan allows the feature */
export function canAccess(plan: Plan, feature: GatedFeature): boolean {
  const limit = PLAN_LIMITS[plan][feature];
  if (typeof limit === 'boolean') return limit;
  if (typeof limit === 'number') return limit > 0;
  return false;
}

/** Returns the numeric limit for a feature (Infinity for pro) */
export function getLimit(plan: Plan, feature: GatedFeature): number {
  const limit = PLAN_LIMITS[plan][feature];
  return typeof limit === 'number' ? limit : limit ? Infinity : 0;
}

export const PRO_FEATURES: { feature: GatedFeature; label: string; description: string }[] = [
  { feature: 'max_routines', label: 'Unlimited Routines', description: 'Create as many workout programs as you want' },
  { feature: 'progress_photos', label: 'Progress Photos', description: 'Track your visual transformation over time' },
  { feature: 'custom_foods', label: 'Custom Foods', description: 'Add your own foods to the nutrition database' },
  { feature: 'analytics_days', label: '1 Year Analytics', description: 'Full historical data for all charts' },
  { feature: 'max_leaderboard_groups', label: 'Unlimited Groups', description: 'Join or create unlimited leaderboard groups' },
  { feature: 'data_export', label: 'Data Export', description: 'Export all your fitness data as CSV' },
  { feature: 'ai_parses_per_day', label: 'Unlimited AI Parsing', description: 'Parse unlimited meals and workouts with AI' },
];
