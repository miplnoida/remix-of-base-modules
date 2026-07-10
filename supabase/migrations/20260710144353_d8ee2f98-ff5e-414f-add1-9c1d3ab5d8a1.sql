
-- EPIC 4D-LIVE-LEGAL-1-CLOSEOUT: revert safety gates after successful Legal pilot.
UPDATE public.communication_hub_control_settings
SET dry_run_only = true,
    email_live_enabled = false,
    updated_at = now();

INSERT INTO public.communication_hub_control_audit (setting_key, old_value, new_value, reason, source)
VALUES
 ('dry_run_only',       to_jsonb(false), to_jsonb(true),  'EPIC 4D-LIVE-LEGAL-1-CLOSEOUT: revert to dry_run_only after Legal live pilot success', 'closeout-migration'),
 ('email_live_enabled', to_jsonb(true),  to_jsonb(false), 'EPIC 4D-LIVE-LEGAL-1-CLOSEOUT: disable live email after Legal live pilot success',    'closeout-migration');

UPDATE public.communication_hub_event_live_control
SET status = 'dry_run_only',
    reason = 'EPIC 4D-LIVE-LEGAL-1-CLOSEOUT: revert after successful Legal live pilot (message b717d257, provider 749654eb)',
    changed_at = now()
WHERE module_code='LEGAL' AND event_code='INTERNAL_CASE_ASSIGNMENT_NOTICE';
