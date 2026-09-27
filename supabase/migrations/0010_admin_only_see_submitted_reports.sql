-- =================================================================
-- HTR - MIGRATION 0010: RESTRICT ADMIN TO VIEW ONLY SUBMITTED REPORTS
-- =================================================================

-- Collaborators can view their own reports (drafts and submitted);
-- Admins / Directors can ONLY view reports that have been officially submitted (status = 'soumis') or their own personal report.

DROP POLICY IF EXISTS "Reports select policy" ON public.reports;
DROP POLICY IF EXISTS "Reports user select" ON public.reports;

CREATE POLICY "Reports select policy" ON public.reports 
  FOR SELECT 
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR (public.is_admin() AND status = 'soumis')
  );
