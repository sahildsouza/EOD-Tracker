-- Function to get email by employee_id for login
CREATE OR REPLACE FUNCTION get_email_by_employee_id(p_employee_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT au.email INTO v_email
    FROM profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE p.employee_id = p_employee_id;
    
    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
