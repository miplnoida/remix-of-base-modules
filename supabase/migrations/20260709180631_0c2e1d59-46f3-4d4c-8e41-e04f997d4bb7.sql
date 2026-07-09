
-- First clear stale live_eligible_after so the false->true trigger sets a fresh timestamp.
UPDATE public.communication_hub_control_settings
SET live_eligible_after = NULL,
    updated_at = now()
WHERE id = (SELECT id FROM public.communication_hub_control_settings ORDER BY created_at ASC LIMIT 1);

-- Now open gates; trigger will set live_eligible_after := now().
UPDATE public.communication_hub_control_settings
SET dry_run_only = false,
    email_live_enabled = true,
    live_eligible_max_age_minutes = 30,
    updated_at = now()
WHERE id = (SELECT id FROM public.communication_hub_control_settings ORDER BY created_at ASC LIMIT 1);

INSERT INTO public.communication_hub_control_audit (setting_key, old_value, new_value, reason, source) VALUES
  ('dry_run_only',       to_jsonb(true),  to_jsonb(false), 'B8-D-B retry targeted UI live pilot', 'phase-1c-b8-d-b-retry'),
  ('email_live_enabled', to_jsonb(false), to_jsonb(true),  'B8-D-B retry targeted UI live pilot', 'phase-1c-b8-d-b-retry'),
  ('live_eligible_after_refresh', to_jsonb('cleared_then_retriggered'::text), to_jsonb(now()::text), 'B8-D-B retry targeted UI live pilot', 'phase-1c-b8-d-b-retry');
