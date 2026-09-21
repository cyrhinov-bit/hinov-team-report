-- ====================================================
-- HTR - MIGRATION 0004: FIX HANDLE NEW USER TRIGGER
-- ====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id, full_name, email, job_title, department, role, is_active, must_change_password
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'job_title', ''),
        COALESCE(NEW.raw_user_meta_data->>'department', ''),
        CASE 
            WHEN NEW.raw_user_meta_data->>'role' = 'super_admin' THEN 'super_admin'::public.app_role
            WHEN NEW.raw_user_meta_data->>'role' = 'directeur_admin' THEN 'directeur_admin'::public.app_role
            ELSE 'collaborateur'::public.app_role
        END,
        COALESCE((NEW.raw_user_meta_data->>'is_active')::boolean, true),
        COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, true)
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        job_title = EXCLUDED.job_title,
        department = EXCLUDED.department,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        must_change_password = EXCLUDED.must_change_password;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
