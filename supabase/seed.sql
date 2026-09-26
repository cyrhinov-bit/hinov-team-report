-- ====================================================
-- HINOV TEAM REPORT (HTR) - SEED DATA (PRODUCTION)
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
