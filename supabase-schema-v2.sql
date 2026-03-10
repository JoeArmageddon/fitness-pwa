-- ============================================================
-- SUPABASE SCHEMA V2 — Fitness OS
-- Run this in Supabase SQL editor AFTER v1.
-- Adds user_id to all tables, tightens RLS, adds social tables.
-- ============================================================

-- ── Enable Extensions ──────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── STEP 1: Add user_id to existing tables ─────────────────
-- Only adds column if it doesn't exist yet

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programs' AND column_name='user_id') THEN
    ALTER TABLE programs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_logs' AND column_name='user_id') THEN
    ALTER TABLE workout_logs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='user_id') THEN
    ALTER TABLE workout_sets ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meal_entries' AND column_name='user_id') THEN
    ALTER TABLE meal_entries ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_foods' AND column_name='user_id') THEN
    ALTER TABLE custom_foods ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nutrition_goals' AND column_name='user_id') THEN
    ALTER TABLE nutrition_goals ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='body_weights' AND column_name='user_id') THEN
    ALTER TABLE body_weights ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='progress_photos' AND column_name='user_id') THEN
    ALTER TABLE progress_photos ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recovery_logs' AND column_name='user_id') THEN
    ALTER TABLE recovery_logs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── STEP 2: Drop old open RLS policies ────────────────────
DROP POLICY IF EXISTS "Allow all" ON programs;
DROP POLICY IF EXISTS "Allow all" ON program_days;
DROP POLICY IF EXISTS "Allow all" ON program_exercises;
DROP POLICY IF EXISTS "Allow all" ON workout_logs;
DROP POLICY IF EXISTS "Allow all" ON workout_sets;
DROP POLICY IF EXISTS "Allow all" ON meal_entries;
DROP POLICY IF EXISTS "Allow all" ON custom_foods;
DROP POLICY IF EXISTS "Allow all" ON nutrition_goals;
DROP POLICY IF EXISTS "Allow all" ON body_weights;
DROP POLICY IF EXISTS "Allow all" ON progress_photos;
DROP POLICY IF EXISTS "Allow all" ON recovery_logs;

-- ── STEP 3: Secure RLS policies (user_id scoped) ──────────
-- Programs
CREATE POLICY "User owns programs" ON programs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Program days inherit access via program ownership
CREATE POLICY "User owns program_days" ON program_days
  FOR ALL USING (
    EXISTS (SELECT 1 FROM programs WHERE programs.id = program_days.program_id AND programs.user_id = auth.uid())
  );

-- Program exercises inherit via day
CREATE POLICY "User owns program_exercises" ON program_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM program_days
      JOIN programs ON programs.id = program_days.program_id
      WHERE program_days.id = program_exercises.program_day_id AND programs.user_id = auth.uid()
    )
  );

-- Workout logs
CREATE POLICY "User owns workout_logs" ON workout_logs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Workout sets
CREATE POLICY "User owns workout_sets" ON workout_sets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Meal entries
CREATE POLICY "User owns meal_entries" ON meal_entries
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Custom foods
CREATE POLICY "User owns custom_foods" ON custom_foods
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Nutrition goals
CREATE POLICY "User owns nutrition_goals" ON nutrition_goals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Body weights
CREATE POLICY "User owns body_weights" ON body_weights
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Progress photos
CREATE POLICY "User owns progress_photos" ON progress_photos
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recovery logs
CREATE POLICY "User owns recovery_logs" ON recovery_logs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── STEP 4: Profiles table ────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  height_cm NUMERIC(5,1),
  weight_kg NUMERIC(5,1),
  goal TEXT CHECK (goal IN ('lose_fat', 'build_muscle', 'maintain', 'athletic')),
  experience TEXT CHECK (experience IN ('beginner', 'intermediate', 'advanced')),
  onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "User updates own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "User inserts own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── STEP 5: Leaderboard entries ───────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  workouts_count INT DEFAULT 0,
  total_volume_kg NUMERIC(10,2) DEFAULT 0,
  streak_days INT DEFAULT 0,
  points INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
-- Users can read entries for their groups (via group_members join)
CREATE POLICY "Users read leaderboard" ON leaderboard_entries
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = leaderboard_entries.user_id
    )
  );
CREATE POLICY "Users write own leaderboard" ON leaderboard_entries
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── STEP 6: Groups (peer leaderboard) ────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 50),
  invite_code TEXT UNIQUE DEFAULT substr(md5(random()::TEXT), 1, 8),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their groups" ON groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid())
    OR created_by = auth.uid()
  );
CREATE POLICY "Authenticated create group" ON groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- ── STEP 7: Group memberships ─────────────────────────────
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read group_members" ON group_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
  );
CREATE POLICY "Users join groups" ON group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave groups" ON group_members
  FOR DELETE USING (auth.uid() = user_id);

-- ── STEP 8: Indexes for performance ──────────────────────
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_week ON leaderboard_entries(user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_entries_user_date ON meal_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_logs_user_date ON recovery_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_body_weights_user_date ON body_weights(user_id, date DESC);
