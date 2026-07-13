-- BN-SEC-S1B.1 — Verification queries for the Award Suspension access seed.
-- Run against any environment to prove the reproducible seed matches the
-- accepted BN-SEC-S1B state. All rows should return expected=actual.

WITH module AS (
  SELECT id FROM public.app_modules WHERE name = 'bn_award_suspension'
),
approved_roles AS (
  SELECT id, role_name FROM public.roles
  WHERE role_name IN ('Admin','BN_CLAIMS_OFFICER','BN_SUPERVISOR',
                      'BN_MANAGER','BN_DIRECTOR','BN_AUDITOR')
)
SELECT 'module_rows_for_route' AS check_name, 1 AS expected,
       (SELECT COUNT(*) FROM public.app_modules WHERE route='/bn/award-suspension') AS actual
UNION ALL SELECT 'module_actions_count', 7,
       (SELECT COUNT(*) FROM public.module_actions WHERE module_id=(SELECT id FROM module))
UNION ALL SELECT 'duplicate_action_groups', 0,
       (SELECT COUNT(*) FROM (
          SELECT action_name FROM public.module_actions
          WHERE module_id=(SELECT id FROM module)
          GROUP BY action_name HAVING COUNT(*) > 1) d)
UNION ALL SELECT 'accepted_role_grants', 32,
       (SELECT COUNT(*) FROM public.role_permissions rp
         WHERE rp.module_id=(SELECT id FROM module)
           AND rp.is_granted=true
           AND rp.role_id IN (SELECT id FROM approved_roles))
UNION ALL SELECT 'duplicate_grant_groups', 0,
       (SELECT COUNT(*) FROM (
          SELECT role_id, action_id FROM public.role_permissions
          WHERE module_id=(SELECT id FROM module)
          GROUP BY role_id, action_id HAVING COUNT(*) > 1) d)
UNION ALL SELECT 'finance_operational_grants', 0,
       (SELECT COUNT(*) FROM public.role_permissions rp
          JOIN public.roles r ON r.id=rp.role_id
         WHERE rp.module_id=(SELECT id FROM module)
           AND rp.is_granted=true
           AND r.role_name='FinanceOfficer')
UNION ALL SELECT 'show_in_menu_is_false', 1,
       (SELECT COUNT(*) FROM public.app_modules
         WHERE name='bn_award_suspension' AND show_in_menu=false)
UNION ALL SELECT 'unapproved_role_grants', 0,
       (SELECT COUNT(*) FROM public.role_permissions rp
          JOIN public.roles r ON r.id=rp.role_id
         WHERE rp.module_id=(SELECT id FROM module)
           AND rp.is_granted=true
           AND r.role_name NOT IN ('Admin','BN_CLAIMS_OFFICER','BN_SUPERVISOR',
                                   'BN_MANAGER','BN_DIRECTOR','BN_AUDITOR'));
