-- ====================================================
-- HTR - MIGRATION 0008: DELETE DEMO ACCOUNTS
-- ====================================================

DO $$
DECLARE
    demo_emails TEXT[] := ARRAY[
        'superadmin@hinovgroup.com',
        'eric.yao@hinovgroup.com',
        'jm.kouassi@hinovgroup.com',
        'amina.diallo@hinovgroup.com',
        'serge.bamba@hinovgroup.com'
    ];
    demo_uids UUID[] := ARRAY[
        '00000000-0000-0000-0000-000000000001'::uuid,
        '00000000-0000-0000-0000-000000000002'::uuid,
        '00000000-0000-0000-0000-000000000003'::uuid,
        '00000000-0000-0000-0000-000000000004'::uuid,
        '00000000-0000-0000-0000-000000000005'::uuid
    ];
BEGIN
    -- 1. Delete associated activities for demo users
    DELETE FROM public.activities 
    WHERE user_id = ANY(demo_uids) 
       OR user_id IN (SELECT id FROM auth.users WHERE email = ANY(demo_emails));

    -- 2. Delete associated weekly reports for demo users
    DELETE FROM public.reports 
    WHERE user_id = ANY(demo_uids) 
       OR user_id IN (SELECT id FROM auth.users WHERE email = ANY(demo_emails));

    -- 3. Delete associated audit logs for demo users
    DELETE FROM public.audit_logs 
    WHERE user_id = ANY(demo_uids) 
       OR user_id IN (SELECT id FROM auth.users WHERE email = ANY(demo_emails));

    -- 4. Delete profiles for demo users
    DELETE FROM public.profiles 
    WHERE id = ANY(demo_uids) 
       OR email = ANY(demo_emails);

    -- 5. Delete auth accounts from auth.users
    DELETE FROM auth.users 
    WHERE id = ANY(demo_uids) 
       OR email = ANY(demo_emails);
END $$;
