-- ============================================================
-- SUPABASE RLS FIX — Run in Supabase SQL Editor
-- Fixes program_days and program_exercises policies that were
-- missing explicit WITH CHECK clauses (caused 403 on INSERT)
-- Also drops the old "Allow all for *" policies from v1
-- ============================================================

-- ── program_days ────────────────────────────────────────────
-- Drop ALL possible policy names (v1 + v2 + any duplicates)
DROP POLICY IF EXISTS "Allow all for program_days" ON program_days;
DROP POLICY IF EXISTS "Allow all" ON program_days;
DROP POLICY IF EXISTS "User owns program_days" ON program_days;

-- Recreate with explicit WITH CHECK (unqualified column names)
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

-- ── Also clean up programs policy (in case of duplicates) ───
DROP POLICY IF EXISTS "Allow all for programs" ON programs;
DROP POLICY IF EXISTS "Allow all" ON programs;
DROP POLICY IF EXISTS "User owns programs" ON programs;

CREATE POLICY "User owns programs" ON programs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

SELECT 'RLS policies fixed successfully!' AS status;
