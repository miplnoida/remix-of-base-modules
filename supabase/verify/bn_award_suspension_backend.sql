-- Verification queries for BN-SEC-S1C. Read-only.

-- Schema extension
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_name = 'bn_award_suspension_event'
   AND column_name IN ('proposed_by_user_id','workflow_instance_id','correlation_id','row_version')
 ORDER BY column_name;

-- Controlled vocabulary
SELECT pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conname = 'bn_award_suspension_event_status_chk';

-- Open-case partial unique index
SELECT indexdef FROM pg_indexes WHERE indexname = 'ux_bn_award_suspension_open_case';

-- Command-receipt platform object
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_name = 'core_command_receipt' ORDER BY ordinal_position;

-- Workflow definition + steps + transitions
SELECT workflow_code, version, workflow_status, is_active
  FROM core_workflow_definition WHERE workflow_code = 'BN_AWARD_SUSPENSION';
SELECT step_code, step_type, display_order
  FROM core_workflow_step s
  JOIN core_workflow_definition d ON d.id = s.workflow_definition_id
 WHERE d.workflow_code = 'BN_AWARD_SUSPENSION'
 ORDER BY display_order;
SELECT transition_code, from_step_code, to_step_code, action_type
  FROM core_workflow_transition t
  JOIN core_workflow_definition d ON d.id = t.workflow_definition_id
 WHERE d.workflow_code = 'BN_AWARD_SUSPENSION'
 ORDER BY display_order;

-- Rollout state (must be actions_enabled=false, show_in_menu=false)
SELECT name, is_enabled, actions_enabled, show_in_menu
  FROM app_modules WHERE name = 'bn_award_suspension';

-- RPC presence
SELECT proname
  FROM pg_proc
 WHERE proname LIKE 'bn_award_suspension_%_v1'
 ORDER BY 1;

-- Grants (should be authenticated + service_role only, not anon)
SELECT p.proname, r.rolname
  FROM pg_proc p, aclexplode(p.proacl) a, pg_roles r
 WHERE p.proname LIKE 'bn_award_suspension_%_v1'
   AND a.grantee = r.oid AND a.privilege_type = 'EXECUTE'
   AND r.rolname IN ('anon','authenticated','service_role')
 ORDER BY 1,2;
