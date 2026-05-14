
-- Fix: Drop existing function signature before recreation
DROP FUNCTION IF EXISTS public.resolve_holiday_pay_policy(date, integer, integer, text);

CREATE OR REPLACE FUNCTION public.resolve_holiday_pay_policy(
  p_period_date DATE,
  p_month INTEGER,
  p_year INTEGER,
  p_policy_type TEXT DEFAULT 'default'
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_exception RECORD;
  v_default RECORD;
  v_distribution_enabled BOOLEAN;
BEGIN
  SELECT * INTO v_exception
  FROM c3_holiday_pay_policy_exceptions
  WHERE is_active = true AND policy_type = p_policy_type
    AND exception_month = p_month AND year_from <= p_year
    AND (year_to IS NULL OR year_to >= p_year) AND override_default = true
  ORDER BY exception_type = 'onetime' DESC, year_from DESC LIMIT 1;

  IF FOUND THEN
    v_distribution_enabled := COALESCE(v_exception.distribution_enabled, false);
    IF v_distribution_enabled AND p_policy_type = 'with_dates' THEN
      v_result := jsonb_build_object(
        'source', 'exception', 'id', v_exception.id, 'policy_type', v_exception.policy_type,
        'distribution_enabled', true, 'levy_include', false, 'levy_calculation_method', 'merge',
        'levy_calc_flat_enabled', false, 'levy_calc_flat_percentage', NULL, 'levy_calc_slab_enabled', false,
        'levy_distribution', v_exception.levy_distribution,
        'ssc_include', false, 'ssc_contrib_employee', false, 'ssc_contrib_employer', false,
        'ssc_contrib_eib', false, 'include_in_severance', false);
    ELSE
      v_result := jsonb_build_object(
        'source', 'exception', 'id', v_exception.id, 'policy_type', v_exception.policy_type,
        'distribution_enabled', v_distribution_enabled,
        'levy_include', COALESCE(v_exception.levy_include, true),
        'levy_calculation_method', COALESCE(v_exception.levy_calculation_method, 'merge'),
        'levy_calc_flat_enabled', COALESCE(v_exception.levy_calc_flat_enabled, false),
        'levy_calc_flat_percentage', v_exception.levy_calc_flat_percentage,
        'levy_calc_slab_enabled', COALESCE(v_exception.levy_calc_slab_enabled, false),
        'levy_distribution', v_exception.levy_distribution,
        'ssc_include', COALESCE(v_exception.ssc_include, true),
        'ssc_contrib_employee', COALESCE(v_exception.ssc_contrib_employee, true),
        'ssc_contrib_employer', COALESCE(v_exception.ssc_contrib_employer, true),
        'ssc_contrib_eib', COALESCE(v_exception.ssc_contrib_eib, false),
        'include_in_severance', COALESCE(v_exception.include_in_severance, false));
    END IF;
    RETURN v_result;
  END IF;

  SELECT * INTO v_default
  FROM c3_holiday_pay_policy_defaults
  WHERE is_active = true AND policy_type = p_policy_type
  ORDER BY effective_from DESC LIMIT 1;

  IF FOUND THEN
    v_distribution_enabled := COALESCE(v_default.distribution_enabled, false);
    IF v_distribution_enabled AND p_policy_type = 'with_dates' THEN
      v_result := jsonb_build_object(
        'source', 'default', 'id', v_default.id, 'policy_type', v_default.policy_type,
        'distribution_enabled', true, 'levy_include', false, 'levy_calculation_method', 'merge',
        'levy_calc_flat_enabled', false, 'levy_calc_flat_percentage', NULL, 'levy_calc_slab_enabled', false,
        'levy_distribution', v_default.levy_distribution,
        'ssc_include', false, 'ssc_contrib_employee', false, 'ssc_contrib_employer', false,
        'ssc_contrib_eib', false, 'include_in_severance', false);
    ELSE
      v_result := jsonb_build_object(
        'source', 'default', 'id', v_default.id, 'policy_type', v_default.policy_type,
        'distribution_enabled', v_distribution_enabled,
        'levy_include', COALESCE(v_default.levy_include, true),
        'levy_calculation_method', COALESCE(v_default.levy_calculation_method, 'merge'),
        'levy_calc_flat_enabled', COALESCE(v_default.levy_calc_flat_enabled, false),
        'levy_calc_flat_percentage', v_default.levy_calc_flat_percentage,
        'levy_calc_slab_enabled', COALESCE(v_default.levy_calc_slab_enabled, false),
        'levy_distribution', v_default.levy_distribution,
        'ssc_include', COALESCE(v_default.ssc_include, true),
        'ssc_contrib_employee', COALESCE(v_default.ssc_contrib_employee, true),
        'ssc_contrib_employer', COALESCE(v_default.ssc_contrib_employer, true),
        'ssc_contrib_eib', COALESCE(v_default.ssc_contrib_eib, false),
        'include_in_severance', COALESCE(v_default.include_in_severance, false));
    END IF;
    RETURN v_result;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_holiday_pay_policy(DATE, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_holiday_pay_policy(DATE, INTEGER, INTEGER, TEXT) TO anon;

-- Create IP Access Rules table
CREATE TABLE IF NOT EXISTS public.ip_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('single', 'range')),
  single_ip TEXT,
  range_start_ip TEXT,
  range_end_ip TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  remarks TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RPC function to validate IP against whitelist
CREATE OR REPLACE FUNCTION public.check_ip_whitelist(p_ip_address TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rule RECORD;
  v_ip_num BIGINT;
  v_start_num BIGINT;
  v_end_num BIGINT;
  v_has_active_rules BOOLEAN;
BEGIN
  -- Check if there are any active rules at all
  SELECT EXISTS(SELECT 1 FROM ip_access_rules WHERE is_active = true) INTO v_has_active_rules;
  
  -- If no active rules exist, allow all access (whitelist not configured)
  IF NOT v_has_active_rules THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_active_rules');
  END IF;

  -- Validate IP format
  IF p_ip_address IS NULL OR p_ip_address = '' OR p_ip_address = 'unknown' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_ip');
  END IF;

  -- Convert IP to numeric for range comparison
  v_ip_num := (split_part(p_ip_address, '.', 1)::BIGINT * 16777216) +
              (split_part(p_ip_address, '.', 2)::BIGINT * 65536) +
              (split_part(p_ip_address, '.', 3)::BIGINT * 256) +
              (split_part(p_ip_address, '.', 4)::BIGINT);

  -- Check single IP rules
  FOR v_rule IN SELECT * FROM ip_access_rules WHERE is_active = true AND rule_type = 'single' LOOP
    IF v_rule.single_ip = p_ip_address THEN
      RETURN jsonb_build_object('allowed', true, 'reason', 'single_ip_match', 'rule_id', v_rule.id);
    END IF;
  END LOOP;

  -- Check range rules
  FOR v_rule IN SELECT * FROM ip_access_rules WHERE is_active = true AND rule_type = 'range' LOOP
    v_start_num := (split_part(v_rule.range_start_ip, '.', 1)::BIGINT * 16777216) +
                   (split_part(v_rule.range_start_ip, '.', 2)::BIGINT * 65536) +
                   (split_part(v_rule.range_start_ip, '.', 3)::BIGINT * 256) +
                   (split_part(v_rule.range_start_ip, '.', 4)::BIGINT);
    v_end_num := (split_part(v_rule.range_end_ip, '.', 1)::BIGINT * 16777216) +
                 (split_part(v_rule.range_end_ip, '.', 2)::BIGINT * 65536) +
                 (split_part(v_rule.range_end_ip, '.', 3)::BIGINT * 256) +
                 (split_part(v_rule.range_end_ip, '.', 4)::BIGINT);
    IF v_ip_num >= v_start_num AND v_ip_num <= v_end_num THEN
      RETURN jsonb_build_object('allowed', true, 'reason', 'range_match', 'rule_id', v_rule.id);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('allowed', false, 'reason', 'no_matching_rule');
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_ip_whitelist(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ip_whitelist(TEXT) TO anon;

-- Validation function for IP rules (called by edge function)
CREATE OR REPLACE FUNCTION public.validate_and_save_ip_rule(
  p_id UUID DEFAULT NULL,
  p_rule_type TEXT DEFAULT 'single',
  p_single_ip TEXT DEFAULT NULL,
  p_range_start_ip TEXT DEFAULT NULL,
  p_range_end_ip TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true,
  p_remarks TEXT DEFAULT NULL,
  p_user_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ip_pattern TEXT := '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$';
  v_start_num BIGINT;
  v_end_num BIGINT;
  v_result_id UUID;
  v_octets TEXT[];
  v_i INT;
BEGIN
  -- Validate rule_type
  IF p_rule_type NOT IN ('single', 'range') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid rule type. Must be single or range.');
  END IF;

  -- For single IP rules
  IF p_rule_type = 'single' THEN
    IF p_single_ip IS NULL OR p_single_ip = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Single IP address is required.');
    END IF;
    IF p_single_ip !~ v_ip_pattern THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid IP address format.');
    END IF;
    -- Validate octets are 0-255
    v_octets := string_to_array(p_single_ip, '.');
    FOR v_i IN 1..4 LOOP
      IF v_octets[v_i]::INT < 0 OR v_octets[v_i]::INT > 255 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Each IP octet must be between 0 and 255.');
      END IF;
    END LOOP;
  END IF;

  -- For range IP rules
  IF p_rule_type = 'range' THEN
    IF p_range_start_ip IS NULL OR p_range_end_ip IS NULL OR p_range_start_ip = '' OR p_range_end_ip = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Both start and end IP addresses are required for range rules.');
    END IF;
    IF p_range_start_ip !~ v_ip_pattern OR p_range_end_ip !~ v_ip_pattern THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid IP address format for range.');
    END IF;
    -- Validate octets
    v_octets := string_to_array(p_range_start_ip, '.');
    FOR v_i IN 1..4 LOOP
      IF v_octets[v_i]::INT < 0 OR v_octets[v_i]::INT > 255 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Start IP: each octet must be between 0 and 255.');
      END IF;
    END LOOP;
    v_octets := string_to_array(p_range_end_ip, '.');
    FOR v_i IN 1..4 LOOP
      IF v_octets[v_i]::INT < 0 OR v_octets[v_i]::INT > 255 THEN
        RETURN jsonb_build_object('success', false, 'error', 'End IP: each octet must be between 0 and 255.');
      END IF;
    END LOOP;
    -- Compare range
    v_start_num := (split_part(p_range_start_ip, '.', 1)::BIGINT * 16777216) +
                   (split_part(p_range_start_ip, '.', 2)::BIGINT * 65536) +
                   (split_part(p_range_start_ip, '.', 3)::BIGINT * 256) +
                   (split_part(p_range_start_ip, '.', 4)::BIGINT);
    v_end_num := (split_part(p_range_end_ip, '.', 1)::BIGINT * 16777216) +
                 (split_part(p_range_end_ip, '.', 2)::BIGINT * 65536) +
                 (split_part(p_range_end_ip, '.', 3)::BIGINT * 256) +
                 (split_part(p_range_end_ip, '.', 4)::BIGINT);
    IF v_end_num <= v_start_num THEN
      RETURN jsonb_build_object('success', false, 'error', 'End IP must be greater than start IP.');
    END IF;
  END IF;

  -- Insert or update
  IF p_id IS NOT NULL THEN
    UPDATE ip_access_rules SET
      rule_type = p_rule_type,
      single_ip = CASE WHEN p_rule_type = 'single' THEN p_single_ip ELSE NULL END,
      range_start_ip = CASE WHEN p_rule_type = 'range' THEN p_range_start_ip ELSE NULL END,
      range_end_ip = CASE WHEN p_rule_type = 'range' THEN p_range_end_ip ELSE NULL END,
      is_active = p_is_active,
      remarks = p_remarks,
      updated_by = p_user_code,
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_result_id;
  ELSE
    INSERT INTO ip_access_rules (rule_type, single_ip, range_start_ip, range_end_ip, is_active, remarks, created_by, updated_by)
    VALUES (
      p_rule_type,
      CASE WHEN p_rule_type = 'single' THEN p_single_ip ELSE NULL END,
      CASE WHEN p_rule_type = 'range' THEN p_range_start_ip ELSE NULL END,
      CASE WHEN p_rule_type = 'range' THEN p_range_end_ip ELSE NULL END,
      p_is_active, p_remarks, p_user_code, p_user_code
    )
    RETURNING id INTO v_result_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_result_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_and_save_ip_rule(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO authenticated;
