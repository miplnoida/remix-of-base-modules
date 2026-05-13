
CREATE OR REPLACE FUNCTION public.resolve_payer_email(
  p_payer_type TEXT,
  p_payer_id TEXT
) RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email TEXT;
BEGIN
  IF p_payer_type = 'ER' THEN
    SELECT email INTO v_email FROM er_master WHERE regno = p_payer_id LIMIT 1;
  ELSIF p_payer_type IN ('IP', 'SE', 'VC') THEN
    SELECT email_addr INTO v_email FROM ip_master WHERE ssn = p_payer_id LIMIT 1;
  ELSIF p_payer_type = 'AP' THEN
    SELECT email INTO v_email FROM cn_payer WHERE payer_id = p_payer_id LIMIT 1;
  END IF;
  RETURN COALESCE(v_email, '');
END;
$$;
