-- 1. Normalize from_module values per CSV mapping
UPDATE public.c3_email_templates SET from_module = 'registration'
  WHERE template_key IN ('account_activation','account_deactivation','welcome_customer','welcome_admin_notification');

UPDATE public.c3_email_templates SET from_module = 'authentication'
  WHERE template_key IN ('password_reset','otp_verification','otp_login','password_changed');

UPDATE public.c3_email_templates SET from_module = 'payments'
  WHERE template_key IN ('payment_receipt','payment_admin_notification');

UPDATE public.c3_email_templates SET from_module = 'contributions'
  WHERE template_key IN ('c3_submission_confirmation');

UPDATE public.c3_email_templates SET from_module = 'administration'
  WHERE template_key IN ('company_mapping_notification','complaint_received');

-- 2. Mark seed rows as already synced (one-time)
UPDATE public.c3_email_templates
SET is_synced = true,
    last_synced_at = now(),
    sync_error = null
WHERE is_deleted = false;

-- 3. Restrict future from_module values to the 5 canonical modules
ALTER TABLE public.c3_email_templates
  DROP CONSTRAINT IF EXISTS c3_email_templates_from_module_check;

ALTER TABLE public.c3_email_templates
  ADD CONSTRAINT c3_email_templates_from_module_check
  CHECK (from_module IN ('registration','authentication','payments','contributions','administration'));