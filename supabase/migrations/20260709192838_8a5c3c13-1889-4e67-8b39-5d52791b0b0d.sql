
-- B9-B-FAST: revert DB live gates immediately after pilot
WITH old AS (
  SELECT id, dry_run_only, email_live_enabled
  FROM public.communication_hub_control_settings
  ORDER BY created_at ASC LIMIT 1
),
upd AS (
  UPDATE public.communication_hub_control_settings s
  SET dry_run_only = true,
      email_live_enabled = false
  FROM old
  WHERE s.id = old.id
  RETURNING s.id, s.dry_run_only, s.email_live_enabled
),
audit AS (
  INSERT INTO public.communication_hub_control_audit (setting_key, old_value, new_value, reason, source)
  SELECT 'dry_run_only', to_jsonb(old.dry_run_only), to_jsonb(upd.dry_run_only),
         'B9-B controlled live ADMIN_TEST_NOTICE pilot complete — gates reverted',
         'migration:b9-b-fast-revert'
  FROM old, upd
  UNION ALL
  SELECT 'email_live_enabled', to_jsonb(old.email_live_enabled), to_jsonb(upd.email_live_enabled),
         'B9-B controlled live ADMIN_TEST_NOTICE pilot complete — gates reverted',
         'migration:b9-b-fast-revert'
  FROM old, upd
  UNION ALL
  SELECT 'admin_test_notice_live_sent',
         '{}'::jsonb,
         jsonb_build_object('messageId','65e15e82-6bc4-4714-9dd9-0917d2f50687','requestId','e5b2c127-957e-411c-8109-042340e36d0f','requestNo','CR-20260709192827-96B661','provider_message_id','8ed46e23-b083-4aaf-a1a4-c59debfafaac','recipient_masked','ro***@mishainfotech.com'),
         'B9-B-FAST pilot single live send record',
         'migration:b9-b-fast-revert'
  RETURNING 1
)
SELECT count(*) FROM audit;
