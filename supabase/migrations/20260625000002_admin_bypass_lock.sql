-- Allow admins to bypass day lock triggers during user deletion or administrative fixes
CREATE OR REPLACE FUNCTION enforce_lock_daily_statuses() RETURNS TRIGGER AS $$
BEGIN
    IF is_admin() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    IF is_day_locked(COALESCE(NEW.date, OLD.date)) THEN
        RAISE EXCEPTION 'This day is locked and cannot be modified.';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION enforce_lock_log_entries() RETURNS TRIGGER AS $$
BEGIN
    IF is_admin() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    IF is_day_locked(COALESCE(NEW.date, OLD.date)) THEN
        RAISE EXCEPTION 'This day is locked and cannot be modified.';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
