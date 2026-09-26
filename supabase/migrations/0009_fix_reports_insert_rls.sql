-- ====================================================
-- HTR - MIGRATION 0009: FIX REPORTS INSERT & SELECT RLS
-- ====================================================

-- 1. Ensure Reports insert allows authenticated owner and admin
DROP POLICY IF EXISTS "Reports user insert" ON public.reports;
CREATE POLICY "Reports user insert" ON public.reports 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 2. Ensure Reports select allows owner and admin
DROP POLICY IF EXISTS "Reports select policy" ON public.reports;
DROP POLICY IF EXISTS "Reports user select" ON public.reports;
CREATE POLICY "Reports select policy" ON public.reports 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 3. Ensure Reports update allows owner and admin
DROP POLICY IF EXISTS "Reports user update" ON public.reports;
CREATE POLICY "Reports user update" ON public.reports 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin()) 
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
