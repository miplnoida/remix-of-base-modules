-- Fix the Audit Engagements module route to point directly to /audit/audits
UPDATE app_modules 
SET route = '/audit/audits' 
WHERE id = 'a1100001-0001-4000-8000-000000000003' AND name = 'audit_engagements';
