-- Initial Schema for EOD Tracker
-- Uses exactly India Standard Time (Asia/Kolkata) for logical date operations.

-- Designations
CREATE TABLE designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

-- Shifts
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours NUMERIC NOT NULL
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
    designation_id UUID REFERENCES designations(id) ON DELETE SET NULL,
    work_location TEXT,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE
);

-- Daily Status
CREATE TABLE daily_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('shift', 'leave', 'week-off')),
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    UNIQUE(user_id, date)
);

-- Log Entries
CREATE TABLE log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Meeting', 'Support', 'Troubleshooting', 'Break', 'Activity', 'Others')),
    title TEXT NOT NULL CHECK (length(title) <= 100),
    from_time TIMESTAMPTZ NOT NULL,
    to_time TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL,
    notes TEXT CHECK (length(notes) <= 300),
    CHECK (to_time > from_time)
);

-- RLS Setup
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access on designations" ON designations FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Employees can view designations" ON designations FOR SELECT USING (true);

CREATE POLICY "Admins full access on shifts" ON shifts FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Employees can view shifts" ON shifts FOR SELECT USING (true);

CREATE POLICY "Admins full access on profiles" ON profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile email/pw" ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins full access on daily_statuses" ON daily_statuses FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Employees can manage own daily_statuses" ON daily_statuses FOR ALL USING (
    user_id = auth.uid()
);

CREATE POLICY "Admins view all log_entries" ON log_entries FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Employees manage own log_entries" ON log_entries FOR ALL USING (
    user_id = auth.uid()
);

-- Locking logic: We want to prevent INSERTS/UPDATES/DELETES to daily_statuses and log_entries
-- for a specific `date` if the current IST time is past 10:00 AM of the *following* day.

CREATE OR REPLACE FUNCTION is_day_locked(target_date DATE) RETURNS BOOLEAN AS $$
DECLARE
    ist_now TIMESTAMP;
    cutoff_time TIMESTAMP;
BEGIN
    -- Get current time in IST
    ist_now := timezone('Asia/Kolkata', now());
    -- Cutoff is 10:00 AM on the day AFTER target_date
    cutoff_time := (target_date + interval '1 day') + interval '10 hours';
    RETURN ist_now > cutoff_time;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce day lock on daily_statuses
CREATE OR REPLACE FUNCTION enforce_lock_daily_statuses() RETURNS TRIGGER AS $$
BEGIN
    IF is_day_locked(COALESCE(NEW.date, OLD.date)) THEN
        -- Allow Admins to bypass? "locked days cannot be edited regardless of what the client sends"
        -- Actually, requirements say "Once locked, no edits can change it." - not even admins.
        RAISE EXCEPTION 'This day is locked and cannot be modified.';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_lock_daily_statuses
BEFORE INSERT OR UPDATE OR DELETE ON daily_statuses
FOR EACH ROW EXECUTE FUNCTION enforce_lock_daily_statuses();

-- Trigger to enforce day lock on log_entries
CREATE OR REPLACE FUNCTION enforce_lock_log_entries() RETURNS TRIGGER AS $$
BEGIN
    IF is_day_locked(COALESCE(NEW.date, OLD.date)) THEN
        RAISE EXCEPTION 'This day is locked and cannot be modified.';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_lock_log_entries
BEFORE INSERT OR UPDATE OR DELETE ON log_entries
FOR EACH ROW EXECUTE FUNCTION enforce_lock_log_entries();

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, employee_id, full_name, role)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'employee_id',
        new.raw_user_meta_data->>'full_name',
        COALESCE(new.raw_user_meta_data->>'role', 'employee')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
