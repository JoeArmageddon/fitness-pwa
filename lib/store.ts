// ============================================================
// GLOBAL STATE MANAGEMENT - Zustand
// Persists offline, syncs when connected
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  WorkoutLog,
  WorkoutSet,
  MealEntry,
  BodyWeight,
  RecoveryLog,
  Program,
  DailyNutritionGoal,
  ProgressAlert,
} from '@/types';

// ── Offline Queue for unsynced actions ────────────────────

interface Unsynced {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  created_at: string;
}

// ── App State ──────────────────────────────────────────────

interface AppState {
  // Connectivity
  isOnline: boolean;
  setIsOnline: (v: boolean) => void;

  // Active workout session
  activeWorkout: {
    isActive: boolean;
    log: Partial<WorkoutLog>;
    sets: Partial<WorkoutSet>[];
    startTime: string | null;
  };
  startWorkout: (programDayId?: string, dayName?: string) => void;
  addSet: (set: Partial<WorkoutSet>) => void;
  updateSet: (index: number, set: Partial<WorkoutSet>) => void;
  removeSet: (index: number) => void;
  finishWorkout: () => WorkoutLog | null;
  discardWorkout: () => void;

  // Nutrition goals
  nutritionGoal: DailyNutritionGoal;
  setNutritionGoal: (goal: DailyNutritionGoal) => void;

  // Today's data (cached)
  todayNutrition: {
    entries: MealEntry[];
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
  };
  setTodayNutrition: (data: AppState['todayNutrition']) => void;

  // Active program
  activeProgram: Program | null;
  setActiveProgram: (program: Program | null) => void;

  // Alerts
  alerts: ProgressAlert[];
  addAlert: (alert: ProgressAlert) => void;
  dismissAlert: (index: number) => void;

  // Offline queue
  unsyncedQueue: Unsynced[];
  addToQueue: (item: Omit<Unsynced, 'id' | 'created_at'>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
}

// ── Store ──────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Connectivity
      isOnline: true,
      setIsOnline: (v) => set({ isOnline: v }),

      // Active Workout
      activeWorkout: {
        isActive: false,
        log: {},
        sets: [],
        startTime: null,
      },

      startWorkout: (programDayId, dayName) =>
        set({
          activeWorkout: {
            isActive: true,
            log: {
              program_day_id: programDayId,
              day_name: dayName,
              date: new Date().toISOString().split('T')[0],
            },
            sets: [],
            startTime: new Date().toISOString(),
          },
        }),

      addSet: (newSet) =>
        set((state) => ({
          activeWorkout: {
            ...state.activeWorkout,
            sets: [...state.activeWorkout.sets, newSet],
          },
        })),

      updateSet: (index, updatedSet) =>
        set((state) => {
          const sets = [...state.activeWorkout.sets];
          sets[index] = { ...sets[index], ...updatedSet };
          return { activeWorkout: { ...state.activeWorkout, sets } };
        }),

      removeSet: (index) =>
        set((state) => {
          const sets = state.activeWorkout.sets.filter((_, i) => i !== index);
          return { activeWorkout: { ...state.activeWorkout, sets } };
        }),

      finishWorkout: () => {
        const { activeWorkout } = get();
        if (!activeWorkout.isActive || !activeWorkout.sets.length) return null;

        const startTime = activeWorkout.startTime
          ? new Date(activeWorkout.startTime)
          : new Date();
        const duration = Math.round((Date.now() - startTime.getTime()) / 60000);

        const log: WorkoutLog = {
          id: crypto.randomUUID(),
          date: activeWorkout.log.date ?? new Date().toISOString().split('T')[0],
          program_day_id: activeWorkout.log.program_day_id,
          day_name: activeWorkout.log.day_name,
          duration_minutes: duration,
          sets: activeWorkout.sets as WorkoutSet[],
          created_at: new Date().toISOString(),
        };

        set({
          activeWorkout: { isActive: false, log: {}, sets: [], startTime: null },
        });

        return log;
      },

      discardWorkout: () =>
        set({
          activeWorkout: { isActive: false, log: {}, sets: [], startTime: null },
        }),

      // Nutrition Goal
      nutritionGoal: {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 65,
        fiber: 30,
      },
      setNutritionGoal: (goal) => set({ nutritionGoal: goal }),

      // Today's Nutrition
      todayNutrition: {
        entries: [],
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
      },
      setTodayNutrition: (data) => set({ todayNutrition: data }),

      // Active Program
      activeProgram: null,
      setActiveProgram: (program) => set({ activeProgram: program }),

      // Alerts
      alerts: [],
      addAlert: (alert) =>
        set((state) => ({ alerts: [alert, ...state.alerts].slice(0, 10) })),
      dismissAlert: (index) =>
        set((state) => ({
          alerts: state.alerts.filter((_, i) => i !== index),
        })),

      // Offline Queue
      unsyncedQueue: [],
      addToQueue: (item) =>
        set((state) => ({
          unsyncedQueue: [
            ...state.unsyncedQueue,
            { ...item, id: crypto.randomUUID(), created_at: new Date().toISOString() },
          ],
        })),
      removeFromQueue: (id) =>
        set((state) => ({
          unsyncedQueue: state.unsyncedQueue.filter((i) => i.id !== id),
        })),
      clearQueue: () => set({ unsyncedQueue: [] }),
    }),
    {
      name: 'fitness-pwa-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nutritionGoal: state.nutritionGoal,
        activeProgram: state.activeProgram,
        alerts: state.alerts,
        unsyncedQueue: state.unsyncedQueue,
        activeWorkout: state.activeWorkout,
      }),
    }
  )
);
