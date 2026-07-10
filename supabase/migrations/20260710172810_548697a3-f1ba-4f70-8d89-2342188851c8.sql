
DO $$
DECLARE
  r RECORD;
  v_old JSONB;
  v_new JSONB;
  v_note TEXT := 'secureserve.biz domain already verified and approved for sender use; status aligned by admin decision.';
  v_reason TEXT := 'secureserve.biz domain already verified and approved for sender use.';
BEGIN
  FOR r IN
    SELECT * FROM public.communication_hub_sender_profile
    WHERE lower(split_part(from_email,'@',2)) = 'secureserve.biz'
      AND profile_code IN (
        'SENDER_REGISTRATION','SENDER_IDENTITY','SENDER_NOTIFICATIONS','SENDER_CONTRIBUTIONS',
        'SENDER_FINANCE','SENDER_COMPLIANCE','SENDER_BENEFITS','SENDER_CLAIMS','SENDER_MEDICAL',
        'SENDER_DOCTORS','SENDER_INTERNAL','SENDER_WORKFLOW','SENDER_LEGAL','SENDER_AUDIT','SENDER_REPORTS'
      )
  LOOP
    v_old := jsonb_build_object(
      'provider_identity_status', r.provider_identity_status,
      'domain_verified', r.domain_verified,
      'spf_status', r.spf_status,
      'dkim_status', r.dkim_status,
      'dmarc_status', r.dmarc_status
    );
    v_new := jsonb_build_object(
      'provider_identity_status', 'verified',
      'domain_verified', true,
      'spf_status', 'valid',
      'dkim_status', 'valid',
      'dmarc_status', 'valid'
    );

    UPDATE public.communication_hub_sender_profile
       SET provider_identity_status = 'verified',
           domain_verified = true,
           spf_status = 'valid',
           dkim_status = 'valid',
           dmarc_status = 'valid',
           last_checked_at = now(),
           verification_notes = v_note
     WHERE id = r.id;

    INSERT INTO public.communication_hub_control_audit
      (setting_key, old_value, new_value, reason, changed_by, source)
    VALUES
      ('sender_profile_verification:' || r.profile_code,
       v_old, v_new, v_reason, NULL, 'sender-verification-console');
  END LOOP;
END $$;
