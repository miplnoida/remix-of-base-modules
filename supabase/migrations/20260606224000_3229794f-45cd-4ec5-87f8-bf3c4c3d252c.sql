
CREATE OR REPLACE FUNCTION public.bn_record_claim_amendment(
  p_claim_id uuid,
  p_field_key varchar,
  p_field_area varchar,
  p_before jsonb,
  p_after jsonb,
  p_reason text,
  p_user_code varchar,
  p_channel varchar,
  p_status_at_change varchar,
  p_approval_status varchar DEFAULT 'APPLIED',
  p_affects_eligibility boolean DEFAULT false,
  p_affects_calculation boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_audit_id uuid;
BEGIN
  IF p_user_code IS NULL OR p_user_code = '' THEN
    RAISE EXCEPTION 'amendment requires user_code';
  END IF;

  INSERT INTO public.system_audit_trail (
    entity_type, entity_id, action, severity, user_name,
    before_value, after_value, payload_json
  ) VALUES (
    'bn_claim', p_claim_id::text, 'AMEND_CLAIM_FIELD', 'info', p_user_code,
    p_before, p_after,
    jsonb_build_object(
      'field_key', p_field_key,
      'field_area', p_field_area,
      'reason', p_reason,
      'channel', p_channel,
      'status_at_change', p_status_at_change,
      'approval_status', p_approval_status
    )
  )
  RETURNING id INTO v_audit_id;

  INSERT INTO public.bn_claim_amendment_log (
    claim_id, field_key, field_area, before_value, after_value, reason,
    amended_by, source_channel, claim_status_at_change, approval_status, audit_trail_id
  ) VALUES (
    p_claim_id, p_field_key, p_field_area, p_before, p_after, p_reason,
    p_user_code, p_channel, p_status_at_change, p_approval_status, v_audit_id
  )
  RETURNING id INTO v_log_id;

  IF p_approval_status IN ('APPLIED','APPROVED') THEN
    UPDATE public.bn_claim
       SET eligibility_stale = CASE WHEN p_affects_eligibility THEN true ELSE eligibility_stale END,
           calculation_stale = CASE WHEN p_affects_calculation THEN true ELSE calculation_stale END
     WHERE id = p_claim_id;
  END IF;

  RETURN v_log_id;
END;
$$;
