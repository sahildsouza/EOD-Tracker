-- Migration: Admin Reset User Password RPC
-- Allows admins to reset any user's password to default ('Password123!') and require them to change it upon next login.

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

CREATE OR REPLACE FUNCTION admin_reset_user_password(target_user_id UUID, new_password TEXT DEFAULT 'Password123!')
RETURNS VOID AS $$
BEGIN
    UPDATE auth.users 
    SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')), updated_at = now()
    WHERE id = target_user_id;

    UPDATE profiles
    SET must_change_password = true
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
