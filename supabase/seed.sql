-- ====================================================
-- HINOV TEAM REPORT (HTR) - SEED DATA
-- ====================================================

-- 1. Default Company Settings
INSERT INTO public.company_settings (
    company_name,
    director_email,
    superadmin_report_recipient,
    reminder_cron,
    smtp_from
)
VALUES (
    'HINOV Group',
    'direction@hinovgroup.com',
    'superadmin@hinovgroup.com',
    '0 16 * * 5',
    'rapports@hinovgroup.com'
)
ON CONFLICT DO NOTHING;

-- 2. Create Initial Auth Users & Profiles (Password: Password123!)
-- Uses pgcrypto for encrypted password hash compatible with Supabase Auth
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    superadmin_uid UUID := '00000000-0000-0000-0000-000000000001';
    director_uid   UUID := '00000000-0000-0000-0000-000000000002';
    collab1_uid    UUID := '00000000-0000-0000-0000-000000000003';
    collab2_uid    UUID := '00000000-0000-0000-0000-000000000004';
    collab3_uid    UUID := '00000000-0000-0000-0000-000000000005';
BEGIN
    -- Super Admin
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
    VALUES (
        superadmin_uid,
        '00000000-0000-0000-0000-000000000000',
        'superadmin@hinovgroup.com',
        crypt('Password123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Super Administrateur"}',
        now(), now(), 'authenticated', 'authenticated'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, full_name, email, job_title, department, role, is_active, must_change_password)
    VALUES (superadmin_uid, 'Super Administrateur', 'superadmin@hinovgroup.com', 'Responsable Systèmes d’Information', 'DSI / Sécurité', 'super_admin', true, false)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    -- Director Admin (Dr. Eric Yao)
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
    VALUES (
        director_uid,
        '00000000-0000-0000-0000-000000000000',
        'eric.yao@hinovgroup.com',
        crypt('Password123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Dr. Eric Yao"}',
        now(), now(), 'authenticated', 'authenticated'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, full_name, email, job_title, department, role, is_active, must_change_password, avatar_url)
    VALUES (director_uid, 'Dr. Eric Yao', 'eric.yao@hinovgroup.com', 'Directeur Général Adjoint', 'Comité de Direction', 'directeur_admin', true, false, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    -- Collaborator 1 (Jean-Marc Kouassi)
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
    VALUES (
        collab1_uid,
        '00000000-0000-0000-0000-000000000000',
        'jm.kouassi@hinovgroup.com',
        crypt('Password123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Jean-Marc Kouassi"}',
        now(), now(), 'authenticated', 'authenticated'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, full_name, email, job_title, department, role, is_active, must_change_password, avatar_url)
    VALUES (collab1_uid, 'Jean-Marc Kouassi', 'jm.kouassi@hinovgroup.com', 'Ingénieur Solutions Cloud', 'Direction Technique', 'collaborateur', true, false, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    -- Collaborator 2 (Amina Diallo)
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
    VALUES (
        collab2_uid,
        '00000000-0000-0000-0000-000000000000',
        'amina.diallo@hinovgroup.com',
        crypt('Password123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Amina Diallo"}',
        now(), now(), 'authenticated', 'authenticated'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, full_name, email, job_title, department, role, is_active, must_change_password, avatar_url)
    VALUES (collab2_uid, 'Amina Diallo', 'amina.diallo@hinovgroup.com', 'Product Owner & UX Lead', 'Digital & Innovation', 'collaborateur', true, true, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    -- Collaborator 3 (Serge Bamba)
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
    VALUES (
        collab3_uid,
        '00000000-0000-0000-0000-000000000000',
        'serge.bamba@hinovgroup.com',
        crypt('Password123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Serge Bamba"}',
        now(), now(), 'authenticated', 'authenticated'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, full_name, email, job_title, department, role, is_active, must_change_password)
    VALUES (collab3_uid, 'Serge Bamba', 'serge.bamba@hinovgroup.com', 'Consultant Senior Cybersécurité', 'Direction Technique', 'collaborateur', false, false)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;
END $$;

