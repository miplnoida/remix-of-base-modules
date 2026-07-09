
-- B9-B-FAST: open DB live window briefly for one ADMIN_TEST_NOTICE
WITH old AS (
  SELECT id, dry_run_only, email_live_enabled, live_eligible_after, live_eligible_max_age_minutes
  FROM public.communication_hub_control_settings
  ORDER BY created_at ASC LIMIT 1
),
upd AS (
  UPDATE public.communication_hub_control_settings s
  SET dry_run_only = false,
      email_live_enabled = true,
      dispatch_enabled = true,
      live_eligible_after = now(),
      live_eligible_max_age_minutes = 30
  FROM old
  WHERE s.id = old.id
  RETURNING s.id, s.dry_run_only, s.email_live_enabled, s.live_eligible_after, s.live_eligible_max_age_minutes
),
audit AS (
  INSERT INTO public.communication_hub_control_audit (setting_key, old_value, new_value, reason, source)
  SELECT 'dry_run_only', to_jsonb(old.dry_run_only), to_jsonb(upd.dry_run_only),
         'B9-B controlled live ADMIN_TEST_NOTICE pilot — DB gates opened',
         'migration:b9-b-fast'
  FROM old, upd
  UNION ALL
  SELECT 'email_live_enabled', to_jsonb(old.email_live_enabled), to_jsonb(upd.email_live_enabled),
         'B9-B controlled live ADMIN_TEST_NOTICE pilot — DB gates opened',
         'migration:b9-b-fast'
  FROM old, upd
  UNION ALL
  SELECT 'live_eligible_after', to_jsonb(old.live_eligible_after), to_jsonb(upd.live_eligible_after),
         'B9-B controlled live ADMIN_TEST_NOTICE pilot — DB gates opened',
         'migration:b9-b-fast'
  FROM old, upd
  RETURNING 1
)
SELECT count(*) FROM audit;
