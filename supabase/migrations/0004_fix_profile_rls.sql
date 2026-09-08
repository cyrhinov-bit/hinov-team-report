-- Migration 0004: Fix recursive RLS on profiles with SECURITY DEFINER function

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual read and admin read" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update and admin update" ON public.profiles;
DROP POLICY IF EXISTS "Allow superadmin delete" ON public.profiles;

-- 1. SELECT : Un utilisateur peut lire son profil, les admins/superadmins peuvent lire tous les profils
CREATE POLICY "Allow individual read and admin read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR public.get_current_user_role() IN ('SUPERADMIN', 'ADMIN')
  );

-- 2. UPDATE : Un utilisateur peut modifier son propre profil, les admins/superadmins peuvent modifier
CREATE POLICY "Allow individual update and admin update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR public.get_current_user_role() IN ('SUPERADMIN', 'ADMIN')
  )
  WITH CHECK (
    auth.uid() = id OR public.get_current_user_role() IN ('SUPERADMIN', 'ADMIN')
  );

-- 3. DELETE : Seul le SUPERADMIN peut supprimer un profil
CREATE POLICY "Allow superadmin delete"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    public.get_current_user_role() = 'SUPERADMIN'
  );