
-- Phase 1C-B8-F: Email tracking policy foundation. Defaults OFF.

ALTER TABLE public.communication_hub_control_settings
  ADD COLUMN IF NOT EXISTS email_open_tracking_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_click_tracking_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tracking_policy_mode text NOT NULL DEFAULT 'off_by_default';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_tracking_policy_mode'
      AND conrelid = 'public.communication_hub_control_settings'::regclass
  ) THEN
    ALTER TABLE public.communication_hub_control_settings
      ADD CONSTRAINT chk_tracking_policy_mode
      CHECK (tracking_policy_mode IN ('off_by_default','provider_default','explicit_per_event'));
  END IF;
END $$;

-- Message-level snapshot of the tracking decision at send time. Nullable
-- (existing rows leave null). Do NOT retro-fill.
ALTER TABLE public.communication_message
  ADD COLUMN IF NOT EXISTS open_tracking_enabled boolean NULL,
  ADD COLUMN IF NOT EXISTS click_tracking_enabled boolean NULL,
  ADD COLUMN IF NOT EXISTS tracking_policy_source text NULL;

COMMENT ON COLUMN public.communication_hub_control_settings.tracking_policy_mode IS
  'off_by_default | provider_default | explicit_per_event. Governs whether per-send tracking flags may be emitted by the transport.';
COMMENT ON COLUMN public.communication_message.tracking_policy_source IS
  'Records which policy decided tracking at send time: global_default | event_override | template_override | disabled_sensitive_module.';
