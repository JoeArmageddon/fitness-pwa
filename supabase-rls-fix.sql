-- ============================================================
-- SUPABASE FIX — Run in Supabase SQL Editor
-- Fixes 3 categories of bugs found during testing:
--
-- 1. program_days / program_exercises RLS policies were missing
--    explicit WITH CHECK clauses → 403 on INSERT (programs save)
--
-- 2. body_weights UNIQUE constraint was on (date) only from v1.
--    After v2 added user_id, upsert(onConflict:'user_id,date')
--    fails with error 42P10 (no matching constraint)
--
-- 3. nutrition_goals needs UNIQUE(user_id) for onboarding upsert
-- ============================================================

-- ── program_days ─────────────────────────────────────────────
-- Drop ALL possible policy names (v1 + v2 + any duplicates)
DROP POLICY IF EXISTS "Allow all for program_days" ON program_days;
DROP POLICY IF EXISTS "Allow all" ON program_days;
DROP POLICY IF EXISTS "User owns program_days" ON program_days;

-- Recreate with explicit WITH CHECK using unqualified column names
-- (table-qualified program_days.program_id breaks auto-derived WITH CHECK)
CREATE POLICY "User owns program_days" ON program_days
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM programs p
      WHERE p.id = program_days.program_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM programs p
      WHERE p.id = program_id
        AND p.user_id = auth.uid()
    )
  );

-- ── program_exercises ────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all for program_exercises" ON program_exercises;
DROP POLICY IF EXISTS "Allow all" ON program_exercises;
DROP POLICY IF EXISTS "User owns program_exercises" ON program_exercises;

CREATE POLICY "User owns program_exercises" ON program_exercises
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN programs p ON p.id = pd.program_id
      WHERE pd.id = program_exercises.program_day_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN programs p ON p.id = pd.program_id
      WHERE pd.id = program_day_id
        AND p.user_id = auth.uid()
    )
  );

-- ── programs (clean up any duplicates) ───────────────────────
DROP POLICY IF EXISTS "Allow all for programs" ON programs;
DROP POLICY IF EXISTS "Allow all" ON programs;
DROP POLICY IF EXISTS "User owns programs" ON programs;

CREATE POLICY "User owns programs" ON programs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── body_weights unique constraint ───────────────────────────
-- v1 schema had UNIQUE(date) only (auto-named body_weights_date_key).
-- v2 added user_id column but no new constraint.
-- upsert({ onConflict: 'user_id,date' }) requires UNIQUE(user_id, date).
ALTER TABLE body_weights DROP CONSTRAINT IF EXISTS body_weights_date_key;
ALTER TABLE body_weights DROP CONSTRAINT IF EXISTS body_weights_user_date_unique;
ALTER TABLE body_weights ADD CONSTRAINT body_weights_user_date_unique UNIQUE (user_id, date);

-- ── recovery_logs unique constraint ──────────────────────────
-- Same pattern: v1 had UNIQUE(date), now needs UNIQUE(user_id, date).
ALTER TABLE recovery_logs DROP CONSTRAINT IF EXISTS recovery_logs_date_key;
ALTER TABLE recovery_logs DROP CONSTRAINT IF EXISTS recovery_logs_user_date_unique;
ALTER TABLE recovery_logs ADD CONSTRAINT recovery_logs_user_date_unique UNIQUE (user_id, date);

-- ── nutrition_goals unique constraint ────────────────────────
-- Onboarding upsert uses onConflict: 'user_id' — requires UNIQUE(user_id).
ALTER TABLE nutrition_goals DROP CONSTRAINT IF EXISTS nutrition_goals_user_id_unique;
ALTER TABLE nutrition_goals ADD CONSTRAINT nutrition_goals_user_id_unique UNIQUE (user_id);

SELECT 'All fixes applied successfully!' AS status;
