
-- Phase 1C-B9-B-B: open live gates for controlled ADMIN_TEST_NOTICE pilot.
SELECT public.set_event_live_control(
  'COMM_HUB', 'ADMIN_TEST_NOTICE', 'live_manual_only',
  'B9-B-B controlled live ADMIN_TEST_NOTICE pilot',
  'low',
  'ENABLE live_manual_only FOR COMM_HUB/ADMIN_TEST_NOTICE',
  '62c928c3-cd5e-421f-a010-50f9123fff70'::uuid
);

UPDATE public.communication_hub_control_settings
   SET dry_run_only = false,
       email_live_enabled = true,
       live_eligible_after = now(),
       live_eligible_max_age_minutes = 30,
       updated_at = now();

INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
VALUES ('control_settings',
  jsonb_build_object('dry_run_only', true, 'email_live_enabled', false),
  jsonb_build_object('dry_run_only', false, 'email_live_enabled', true, 'live_eligible_after', now()),
  'B9-B-B controlled live ADMIN_TEST_NOTICE pilot',
  '62c928c3-cd5e-421f-a010-50f9123fff70'::uuid,
  'communication-hub-control-center');
