
UPDATE public.communication_hub_control_settings
   SET dry_run_only = true,
       email_live_enabled = false,
       updated_at = now();

INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
VALUES ('control_settings',
  jsonb_build_object('dry_run_only', false, 'email_live_enabled', true),
  jsonb_build_object('dry_run_only', true, 'email_live_enabled', false),
  'B9-B-B live ADMIN_TEST_NOTICE pilot complete — gates reverted',
  '62c928c3-cd5e-421f-a010-50f9123fff70'::uuid,
  'communication-hub-control-center');
