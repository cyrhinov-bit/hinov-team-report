-- ====================================================
-- HINOV TEAM REPORT (HTR) - ROW LEVEL SECURITY (RLS)
-- ====================================================

-- 1. ENABLE RLS ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. HELPER FUNCTIONS FOR ROLES
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS app_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT role IN ('directeur_admin', 'super_admin') FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT role = 'super_admin' FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. PROFILES POLICIES
-- Users can read their own profile; Admins can read all profiles
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
CREATE POLICY "Profiles read policy" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR public.is_admin()
    );

-- Users can update basic personal fields; Admins can update via Edge Function / direct
DROP POLICY IF EXISTS "Profiles user self update" ON public.profiles;
CREATE POLICY "Profiles user self update" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id
    ) WITH CHECK (
        auth.uid() = id
    );

-- 4. ACTIVITIES POLICIES
-- Each user accesses only their own activities
DROP POLICY IF EXISTS "Activities owner select" ON public.activities;
CREATE POLICY "Activities owner select" ON public.activities
    FOR SELECT USING (
        auth.uid() = user_id
    );

DROP POLICY IF EXISTS "Activities owner insert" ON public.activities;
CREATE POLICY "Activities owner insert" ON public.activities
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

DROP POLICY IF EXISTS "Activities owner update" ON public.activities;
CREATE POLICY "Activities owner update" ON public.activities
    FOR UPDATE USING (
        auth.uid() = user_id AND is_locked = false
    ) WITH CHECK (
        auth.uid() = user_id AND is_locked = false
    );

DROP POLICY IF EXISTS "Activities owner delete" ON public.activities;
CREATE POLICY "Activities owner delete" ON public.activities
    FOR DELETE USING (
        auth.uid() = user_id AND is_locked = false
    );

-- 5. REPORTS POLICIES
-- Collaborator reads their own; Admins read all
DROP POLICY IF EXISTS "Reports select policy" ON public.reports;
CREATE POLICY "Reports select policy" ON public.reports
    FOR SELECT USING (
        auth.uid() = user_id OR public.is_admin()
    );

DROP POLICY IF EXISTS "Reports user insert" ON public.reports;
CREATE POLICY "Reports user insert" ON public.reports
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

DROP POLICY IF EXISTS "Reports user update" ON public.reports;
CREATE POLICY "Reports user update" ON public.reports
    FOR UPDATE USING (
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() = user_id
    );

-- 6. APP SETTINGS POLICIES
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read app_settings" ON public.app_settings;
CREATE POLICY "Allow authenticated users to read app_settings"
    ON public.app_settings
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow admin to insert or update app_settings" ON public.app_settings;
CREATE POLICY "Allow admin to insert or update app_settings"
    ON public.app_settings
    FOR ALL
    TO authenticated
    USING (
        public.is_admin()
    )
    WITH CHECK (
        public.is_admin()
    );

-- 7. AUDIT LOGS POLICIES
-- Only Admins can view audit logs
DROP POLICY IF EXISTS "Audit logs select" ON public.audit_logs;
CREATE POLICY "Audit logs select" ON public.audit_logs
    FOR SELECT USING (
        public.is_admin()
    );

DROP POLICY IF EXISTS "Audit logs insert" ON public.audit_logs;
CREATE POLICY "Audit logs insert" ON public.audit_logs
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

-- 8. STORAGE BUCKET POLICIES (Avatars and Reports PDF)
-- Note: Create buckets 'avatars' and 'reports_pdf' via Supabase Storage UI or migration

