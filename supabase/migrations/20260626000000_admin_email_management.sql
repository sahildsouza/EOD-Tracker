-- Migration: Admin Email Management RPCs
-- Allows admins to list all user emails and update any user's email address in auth.users.

CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
    id UUID,
    employee_id TEXT,
    full_name TEXT,
    phone TEXT,
    role TEXT,
    designation_id UUID,
    work_location TEXT,
    must_change_password BOOLEAN,
    email VARCHAR,
    designation jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.employee_id, p.full_name, p.phone, p.role, p.designation_id, p.work_location, p.must_change_password,
        au.email::VARCHAR,
        CASE 
          WHEN d.name IS NOT NULL THEN jsonb_build_object('name', d.name)
          ELSE NULL
        END AS designation
    FROM profiles p
    JOIN auth.users au ON p.id = au.id
    LEFT JOIN designations d ON p.designation_id = d.id
    ORDER BY p.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_update_user_email(target_user_id UUID, new_email TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE auth.users 
    SET email = new_email, email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
