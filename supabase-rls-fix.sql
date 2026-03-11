-- ============================================================
-- SUPABASE FIX — Run in Supabase SQL Editor
-- Fixes 4 categories of bugs found during testing:
--
-- 1. program_days / program_exercises RLS policies were missing
--    explicit WITH CHECK clauses → 403 on INSERT (programs save)
--
-- 2. body_weights / recovery_logs UNIQUE constraint was on (date)
--    only from v1. After v2 added user_id, upsert fails with
--    error 42P10 (no matching constraint for onConflict)
--
-- 3. nutrition_goals needs UNIQUE(user_id) for onboarding upsert
--
-- 4. group_members RLS policy is self-referential (queries itself)
--    → PostgreSQL detects infinite recursion (error 42P17).
--    Fixed via a SECURITY DEFINER helper function.
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

-- ── group_members / groups infinite recursion fix ────────────
-- The v2 "Members read group_members" policy queries group_members
-- from within a group_members policy → PostgreSQL error 42P17.
-- The v2 "Members read their groups" policy on groups also queries
-- group_members, which can trigger the recursion.
--
-- Fix: create a SECURITY DEFINER helper function that runs outside
-- of RLS context, breaking the circular dependency.

CREATE OR REPLACE FUNCTION get_my_group_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT group_id FROM group_members WHERE user_id = auth.uid();
$$;

-- Drop and recreate group_members SELECT policy (was self-referential)
DROP POLICY IF EXISTS "Members read group_members" ON group_members;
CREATE POLICY "Members read group_members" ON group_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR group_id IN (SELECT get_my_group_ids())
  );

-- Drop and recreate groups SELECT policy (also used group_members directly)
DROP POLICY IF EXISTS "Members read their groups" ON groups;
CREATE POLICY "Members read their groups" ON groups
  FOR SELECT USING (
    created_by = auth.uid()
    OR id IN (SELECT get_my_group_ids())
  );

SELECT 'All fixes applied successfully!' AS status;
