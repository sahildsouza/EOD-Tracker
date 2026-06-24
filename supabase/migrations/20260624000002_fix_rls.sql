CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Run without RLS
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN v_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop old policies
DROP POLICY IF EXISTS "Admins full access on designations" ON designations;
DROP POLICY IF EXISTS "Admins full access on shifts" ON shifts;
DROP POLICY IF EXISTS "Admins full access on profiles" ON profiles;
DROP POLICY IF EXISTS "Admins full access on daily_statuses" ON daily_statuses;
DROP POLICY IF EXISTS "Admins view all log_entries" ON log_entries;

-- Recreate policies using the new function
CREATE POLICY "Admins full access on designations" ON designations FOR ALL USING (is_admin());
CREATE POLICY "Admins full access on shifts" ON shifts FOR ALL USING (is_admin());
CREATE POLICY "Admins full access on profiles" ON profiles FOR ALL USING (is_admin());
CREATE POLICY "Admins full access on daily_statuses" ON daily_statuses FOR ALL USING (is_admin());
CREATE POLICY "Admins view all log_entries" ON log_entries FOR SELECT USING (is_admin());
