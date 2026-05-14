
INSERT INTO security_policy_config (config_key, config_value, display_name, description, category, data_type)
VALUES ('ip_access_policy_enabled', 'false', 'IP Access Policy Enabled', 'Global toggle for IP whitelist enforcement. When false, all IPs are allowed.', 'security', 'boolean')
ON CONFLICT (config_key) DO NOTHING;

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
  v_policy_enabled BOOLEAN;
BEGIN
  SELECT COALESCE(
    (SELECT config_value = 'true' FROM security_policy_config WHERE config_key = 'ip_access_policy_enabled'),
    false
  ) INTO v_policy_enabled;

  IF NOT v_policy_enabled THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'policy_disabled');
  END IF;

  SELECT EXISTS(SELECT 1 FROM ip_access_rules WHERE is_active = true) INTO v_has_active_rules;
  
  IF NOT v_has_active_rules THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_active_rules');
  END IF;

  IF p_ip_address IS NULL OR p_ip_address = '' OR p_ip_address = 'unknown' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_ip');
  END IF;

  v_ip_num := (split_part(p_ip_address, '.', 1)::BIGINT * 16777216) +
              (split_part(p_ip_address, '.', 2)::BIGINT * 65536) +
              (split_part(p_ip_address, '.', 3)::BIGINT * 256) +
              (split_part(p_ip_address, '.', 4)::BIGINT);

  FOR v_rule IN SELECT * FROM ip_access_rules WHERE is_active = true AND rule_type = 'single' LOOP
    IF v_rule.single_ip = p_ip_address THEN
      RETURN jsonb_build_object('allowed', true, 'reason', 'single_ip_match', 'rule_id', v_rule.id);
    END IF;
  END LOOP;

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
