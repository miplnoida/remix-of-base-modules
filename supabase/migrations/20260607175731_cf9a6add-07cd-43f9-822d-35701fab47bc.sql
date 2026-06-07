ALTER TABLE public.bn_product_channel_config
  ADD COLUMN IF NOT EXISTS payment_details_visibility VARCHAR(20) NOT NULL DEFAULT 'SHOW',
  ADD COLUMN IF NOT EXISTS allow_manual_workbasket_override BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bn_product_channel_config_payment_details_visibility_chk'
  ) THEN
    ALTER TABLE public.bn_product_channel_config
      ADD CONSTRAINT bn_product_channel_config_payment_details_visibility_chk
      CHECK (payment_details_visibility IN ('SHOW','HIDE','READONLY'));
  END IF;
END$$;

COMMENT ON COLUMN public.bn_product_channel_config.payment_details_visibility IS
  'Controls payment-details step in intake: SHOW (default editable), HIDE (skip step), READONLY (display existing profile only).';
COMMENT ON COLUMN public.bn_product_channel_config.allow_manual_workbasket_override IS
  'When true, staff may select a workbasket override during intake; otherwise routing is automatic.';