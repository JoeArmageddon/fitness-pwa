-- ============================================================
-- FITNESS PWA - COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Exercises ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  muscle_group  TEXT NOT NULL,
  secondary_muscles TEXT[] DEFAULT '{}',
  equipment     TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Programs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  mode        TEXT NOT NULL DEFAULT 'fixed' CHECK (mode IN ('fixed', 'custom')),
  is_active   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_days (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  program_id  UUID REFERENCES programs(id) ON DELETE CASCADE,
  day_name    TEXT NOT NULL,
  focus       TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS program_exercises (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  program_day_id   UUID REFERENCES program_days(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  muscle_group     TEXT NOT NULL,
  sets             INTEGER NOT NULL DEFAULT 3,
  reps             TEXT NOT NULL DEFAULT '8-12',
  rest_seconds     INTEGER,
  notes            TEXT,
  order_index      INTEGER DEFAULT 0
);

-- ── Workout Logs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_logs (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  program_day_id    UUID REFERENCES program_days(id),
  day_name          TEXT,
  duration_minutes  INTEGER,
  overall_rpe       NUMERIC(3,1),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workout_log_id   UUID REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise_id      UUID REFERENCES exercises(id),
  exercise_name    TEXT NOT NULL,
  set_number       INTEGER NOT NULL,
  reps             INTEGER NOT NULL,
  weight           NUMERIC(6,2) NOT NULL DEFAULT 0,
  rpe              NUMERIC(3,1),
  completed        BOOLEAN DEFAULT TRUE,
  notes            TEXT
);

-- ── Nutrition ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_entries (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type   TEXT NOT NULL DEFAULT 'lunch' CHECK (meal_type IN ('breakfast','lunch','dinner','snack','pre_workout','post_workout')),
  food_id     TEXT,
  food_name   TEXT NOT NULL,
  quantity_g  NUMERIC(8,2) NOT NULL,
  calories    NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein     NUMERIC(8,2) NOT NULL DEFAULT 0,
  carbs       NUMERIC(8,2) NOT NULL DEFAULT 0,
  fat         NUMERIC(8,2) NOT NULL DEFAULT 0,
  fiber       NUMERIC(8,2),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_foods (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name                TEXT NOT NULL,
  calories_per_100g   NUMERIC(8,2) NOT NULL,
  protein_per_100g    NUMERIC(8,2) NOT NULL DEFAULT 0,
  carbs_per_100g      NUMERIC(8,2) NOT NULL DEFAULT 0,
  fat_per_100g        NUMERIC(8,2) NOT NULL DEFAULT 0,
  fiber_per_100g      NUMERIC(8,2),
  serving_size_g      NUMERIC(8,2),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nutrition_goals (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  calories    INTEGER NOT NULL DEFAULT 2000,
  protein     INTEGER NOT NULL DEFAULT 150,
  carbs       INTEGER NOT NULL DEFAULT 200,
  fat         INTEGER NOT NULL DEFAULT 65,
  fiber       INTEGER DEFAULT 30,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default nutrition goal
INSERT INTO nutrition_goals (calories, protein, carbs, fat) 
VALUES (2000, 150, 200, 65)
ON CONFLICT DO NOTHING;

-- ── Body Metrics ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS body_weights (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg       NUMERIC(6,2) NOT NULL,
  body_fat_pct    NUMERIC(4,1),
  muscle_mass_kg  NUMERIC(6,2),
  notes           TEXT,
  UNIQUE(date)
);

CREATE TABLE IF NOT EXISTS progress_photos (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  storage_path  TEXT NOT NULL,
  notes         TEXT,
  tags          TEXT[] DEFAULT '{}'
);

-- ── Recovery ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recovery_logs (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours     NUMERIC(4,1) NOT NULL DEFAULT 7,
  sleep_quality   INTEGER NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
  stress_level    INTEGER NOT NULL CHECK (stress_level BETWEEN 1 AND 5),
  mood            INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
  soreness        INTEGER NOT NULL CHECK (soreness BETWEEN 1 AND 5),
  energy_level    INTEGER NOT NULL CHECK (energy_level BETWEEN 1 AND 5),
  recovery_score  INTEGER NOT NULL DEFAULT 0 CHECK (recovery_score BETWEEN 0 AND 100),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- ── Indexes for performance ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sets_log ON workout_sets(workout_log_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_name);
CREATE INDEX IF NOT EXISTS idx_meal_entries_date ON meal_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_body_weights_date ON body_weights(date DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_logs_date ON recovery_logs(date DESC);

-- ── Row Level Security ─────────────────────────────────────
-- This is a single-user app, so we use simple open policies
-- You can add auth later if needed

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_logs ENABLE ROW LEVEL SECURITY;

-- Open policies (single user - no auth required)
CREATE POLICY "Allow all for exercises" ON exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for programs" ON programs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for program_days" ON program_days FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for program_exercises" ON program_exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for workout_logs" ON workout_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for workout_sets" ON workout_sets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for meal_entries" ON meal_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for custom_foods" ON custom_foods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for nutrition_goals" ON nutrition_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for body_weights" ON body_weights FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for progress_photos" ON progress_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for recovery_logs" ON recovery_logs FOR ALL USING (true) WITH CHECK (true);

-- ── Storage Bucket ─────────────────────────────────────────
-- Run separately in Supabase dashboard > Storage:
-- Create bucket named "progress-photos" (public: true)
-- Or run this:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', true);

SELECT 'Database schema created successfully!' AS status;
