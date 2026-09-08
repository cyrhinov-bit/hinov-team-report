-- Migration 0003: Table des parametres de l'application

CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    company_name TEXT NOT NULL DEFAULT 'HINOV GROUP',
    pdf_header_image TEXT,
    pdf_footer_text TEXT NOT NULL DEFAULT 'HINOV Team Report - Document Confidentiel d''Entreprise',
    primary_color TEXT NOT NULL DEFAULT '#1E3A8A',
    secondary_color TEXT NOT NULL DEFAULT '#4F46E5',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Inserer la configuration par defaut si elle n'existe pas
INSERT INTO public.app_settings (id, company_name, pdf_footer_text, primary_color, secondary_color)
VALUES ('default', 'HINOV GROUP', 'HINOV Team Report - Document Confidentiel d''Entreprise', '#1E3A8A', '#4F46E5')
ON CONFLICT (id) DO NOTHING;

-- Activer RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Politiques RLS :
DROP POLICY IF EXISTS "Allow authenticated users to read app_settings" ON public.app_settings;
CREATE POLICY "Allow authenticated users to read app_settings"
    ON public.app_settings
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow admin to insert app_settings" ON public.app_settings;
CREATE POLICY "Allow admin to insert app_settings"
    ON public.app_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN', 'SUPERADMIN')
        )
    );

DROP POLICY IF EXISTS "Allow admin to update app_settings" ON public.app_settings;
CREATE POLICY "Allow admin to update app_settings"
    ON public.app_settings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN', 'SUPERADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN', 'SUPERADMIN')
        )
    );