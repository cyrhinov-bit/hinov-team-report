-- ====================================================
-- HTR - MIGRATION 0003: FIX ACTIVITIES & REPORTS RLS
-- ====================================================

-- 1. Ensure Activities Update allows locking by owner
DROP POLICY IF EXISTS "Activities owner update" ON public.activities;
CREATE POLICY "Activities owner update" ON public.activities 
  FOR UPDATE 
  USING (auth.uid() = user_id AND (is_locked = false OR public.is_admin()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 2. Allow Admins and Owner to select activities
DROP POLICY IF EXISTS "Activities owner select" ON public.activities;
CREATE POLICY "Activities owner select" ON public.activities 
  FOR SELECT 
  USING (auth.uid() = user_id OR public.is_admin());

-- 3. Ensure Reports update allows owner and admin
DROP POLICY IF EXISTS "Reports user update" ON public.reports;
CREATE POLICY "Reports user update" ON public.reports 
  FOR UPDATE 
  USING (auth.uid() = user_id OR public.is_admin()) 
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

