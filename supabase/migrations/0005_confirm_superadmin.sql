-- ====================================================
-- HTR - MIGRATION 0005: CONFIRM SUPERADMIN USER EMAIL
-- ====================================================

-- 1. Confirm user email in auth.users
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'e.gnonskan@hinovgroup.com';

-- 2. Ensure Super Admin profile is configured
UPDATE public.profiles
SET 
  full_name = 'Evariste GNONSKAN',
  job_title = 'Responsable développement',
  department = 'Développement & Informatique',
  role = 'super_admin',
  is_active = true,
  must_change_password = false
WHERE email = 'e.gnonskan@hinovgroup.com';
