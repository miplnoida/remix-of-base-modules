
UPDATE public.communication_hub_control_settings
SET dry_run_only = false,
    email_live_enabled = true,
    updated_at = now()
WHERE id = (SELECT id FROM public.communication_hub_control_settings ORDER BY created_at ASC LIMIT 1);

INSERT INTO public.communication_hub_control_audit (setting_key, old_value, new_value, reason, source)
SELECT 'dry_run_only', to_jsonb(true), to_jsonb(false), 'B8-D-B targeted UI live pilot', 'phase-1c-b8-d-b';

INSERT INTO public.communication_hub_control_audit (setting_key, old_value, new_value, reason, source)
SELECT 'email_live_enabled', to_jsonb(false), to_jsonb(true), 'B8-D-B targeted UI live pilot', 'phase-1c-b8-d-b';
