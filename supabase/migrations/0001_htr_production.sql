-- ====================================================
-- HTR (HINOV TEAM REPORT) - PRODUCTION MIGRATION 0001
-- ====================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('collaborateur', 'directeur_admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_status AS ENUM ('en_attente', 'en_cours', 'terminee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_status AS ENUM ('brouillon', 'soumis', 'archive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    job_title TEXT DEFAULT '',
    department TEXT DEFAULT '',
    role app_role NOT NULL DEFAULT 'collaborateur',
    is_active BOOLEAN NOT NULL DEFAULT true,
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    custom_gemini_api_key TEXT,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Général',
    status activity_status NOT NULL DEFAULT 'terminee',
    is_locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activities_user_date ON public.activities(user_id, date);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);

-- 5. REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 53),
    year INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status report_status NOT NULL DEFAULT 'brouillon',
    content_snapshot JSONB DEFAULT '[]'::jsonb,
    difficulties JSONB DEFAULT '[]'::jsonb,
    perspectives JSONB DEFAULT '[]'::jsonb,
    pdf_url TEXT,
    submitted_at TIMESTAMPTZ,
    emailed_at TIMESTAMPTZ,
    email_recipient TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_week_year UNIQUE (user_id, week_number, year)
);

CREATE INDEX IF NOT EXISTS idx_reports_user_week ON public.reports(user_id, week_number, year);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_week_year ON public.reports(week_number, year);

-- 6. APP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    company_name TEXT NOT NULL DEFAULT 'HINOV GROUP',
    pdf_header_image TEXT,
    pdf_footer_text TEXT NOT NULL DEFAULT 'HINOV Team Report • Document Confidentiel d’Entreprise',
    director_email TEXT NOT NULL DEFAULT 'direction@hinovgroup.com',
    superadmin_report_recipient TEXT DEFAULT 'superadmin@hinovgroup.com',
    reminder_cron TEXT DEFAULT 'Tous les vendredis à 16h00',
    primary_color TEXT NOT NULL DEFAULT '#1E3A8A',
    secondary_color TEXT NOT NULL DEFAULT '#4F46E5',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.app_settings (id, company_name, pdf_footer_text, director_email, superadmin_report_recipient)
VALUES ('default', 'HINOV GROUP', 'HINOV Team Report • Document Confidentiel d’Entreprise', 'direction@hinovgroup.com', 'superadmin@hinovgroup.com')
ON CONFLICT (id) DO NOTHING;

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_user_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 8. AUTOMATIC TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_activities_updated_at ON public.activities;
CREATE TRIGGER set_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_reports_updated_at ON public.reports;
CREATE TRIGGER set_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
        COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'collaborateur'::app_role),
        COALESCE((NEW.raw_user_meta_data->>'is_active')::boolean, true),
        COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, true)
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT role IN ('directeur_admin', 'super_admin') FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
CREATE POLICY "Profiles read policy" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles user self update" ON public.profiles;
CREATE POLICY "Profiles user self update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Activities owner select" ON public.activities;
CREATE POLICY "Activities owner select" ON public.activities FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Activities owner insert" ON public.activities;
CREATE POLICY "Activities owner insert" ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Activities owner update" ON public.activities;
CREATE POLICY "Activities owner update" ON public.activities FOR UPDATE USING (auth.uid() = user_id AND is_locked = false) WITH CHECK (auth.uid() = user_id AND is_locked = false);

DROP POLICY IF EXISTS "Activities owner delete" ON public.activities;
CREATE POLICY "Activities owner delete" ON public.activities FOR DELETE USING (auth.uid() = user_id AND is_locked = false);

DROP POLICY IF EXISTS "Reports select policy" ON public.reports;
CREATE POLICY "Reports select policy" ON public.reports FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Reports user insert" ON public.reports;
CREATE POLICY "Reports user insert" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reports user update" ON public.reports;
CREATE POLICY "Reports user update" ON public.reports FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated users to read app_settings" ON public.app_settings;
CREATE POLICY "Allow authenticated users to read app_settings" ON public.app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin to insert or update app_settings" ON public.app_settings;
CREATE POLICY "Allow admin to insert or update app_settings" ON public.app_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Audit logs select" ON public.audit_logs;
CREATE POLICY "Audit logs select" ON public.audit_logs FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Audit logs insert" ON public.audit_logs;
CREATE POLICY "Audit logs insert" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');