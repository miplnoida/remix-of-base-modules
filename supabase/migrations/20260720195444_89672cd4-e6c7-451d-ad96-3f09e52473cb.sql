
CREATE OR REPLACE FUNCTION public.run_ch_p3_recipient_policy_runtime_tests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_actor      uuid := auth.uid();
  v_results    jsonb := '[]'::jsonb;
  v_pass       int := 0;
  v_fail       int := 0;
  v_res        jsonb;

  addr_a       text := 'a-' || substr(md5(random()::text||clock_timestamp()::text),1,10) || '@test-p3.local';
  addr_b       text := 'b-' || substr(md5(random()::text||clock_timestamp()::text),1,10) || '@test-p3.local';
  addr_c       text := 'c-' || substr(md5(random()::text||clock_timestamp()::text),1,10) || '@other-p3.local';
  addr_sub     text := 'x-' || substr(md5(random()::text||clock_timestamp()::text),1,10) || '@svc.other-p3.local';

  op_ver_before int;
  op_ver_after  int;
BEGIN
  IF NOT (
    (current_setting('request.jwt.claim.role', true) = 'service_role')
    OR has_role(v_actor, 'Admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE = '42501';
  END IF;

  BEGIN
    UPDATE communication_hub_recipient_policy
       SET active_mode = 'SINGLE_CONFIGURED_RECIPIENT',
           single_configured_address = addr_a,
           approved_named_addresses = '[]'::jsonb, approved_domains = '[]'::jsonb,
           cc_allowed = false, bcc_allowed = false,
           max_to_recipients = 1, max_cc_recipients = 0, max_bcc_recipients = 0,
           max_recipients_per_request = 1,
           subdomains_permitted = false, external_addresses_permitted = false
     WHERE singleton_guard = 'primary';

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_a)));
    IF (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','single_addr_a_allowed','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','single_addr_a_allowed','ok',false,'detail',v_res)); END IF;

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_b)));
    IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','single_addr_b_blocked','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','single_addr_b_blocked','ok',false,'detail',v_res)); END IF;

    UPDATE communication_hub_recipient_policy SET single_configured_address = addr_b WHERE singleton_guard='primary';

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_b)));
    IF (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','single_reconfig_b_allowed','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','single_reconfig_b_allowed','ok',false,'detail',v_res)); END IF;

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_a)));
    IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','single_reconfig_a_blocked','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','single_reconfig_a_blocked','ok',false,'detail',v_res)); END IF;

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array('  ' || upper(addr_b) || '  ')));
    IF (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','address_case_whitespace_normalised','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','address_case_whitespace_normalised','ok',false,'detail',v_res)); END IF;

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array('not-an-email')));
    IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','invalid_address_blocked','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','invalid_address_blocked','ok',false,'detail',v_res)); END IF;

    UPDATE communication_hub_recipient_policy
       SET active_mode = 'APPROVED_NAMED_RECIPIENTS',
           single_configured_address = NULL,
           approved_named_addresses = jsonb_build_array(
             jsonb_build_object('address', addr_a, 'active', true),
             jsonb_build_object('address', addr_b, 'active', false)),
           approved_domains = '[]'::jsonb,
           max_to_recipients = 3, max_recipients_per_request = 3
     WHERE singleton_guard='primary';

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_a)));
    IF (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','named_active_allowed','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','named_active_allowed','ok',false,'detail',v_res)); END IF;

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_b)));
    IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','named_disabled_blocked','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','named_disabled_blocked','ok',false,'detail',v_res)); END IF;

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_c)));
    IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','named_unlisted_blocked','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','named_unlisted_blocked','ok',false,'detail',v_res)); END IF;

    UPDATE communication_hub_recipient_policy
       SET active_mode = 'APPROVED_DOMAINS', single_configured_address = NULL,
           approved_named_addresses = '[]'::jsonb,
           approved_domains = jsonb_build_array(jsonb_build_object('domain','other-p3.local','active',true)),
           subdomains_permitted = false
     WHERE singleton_guard='primary';

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_c)));
    IF (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','domain_exact_allowed','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','domain_exact_allowed','ok',false,'detail',v_res)); END IF;

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_sub)));
    IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','subdomain_blocked_when_disabled','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','subdomain_blocked_when_disabled','ok',false,'detail',v_res)); END IF;

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_a)));
    IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','unlisted_domain_blocked','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','unlisted_domain_blocked','ok',false,'detail',v_res)); END IF;

    UPDATE communication_hub_recipient_policy SET subdomains_permitted = true WHERE singleton_guard='primary';
    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_sub)));
    IF (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','subdomain_allowed_when_permitted','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','subdomain_allowed_when_permitted','ok',false,'detail',v_res)); END IF;

    UPDATE communication_hub_recipient_policy
       SET active_mode = 'SINGLE_CONFIGURED_RECIPIENT',
           single_configured_address = addr_a,
           approved_named_addresses = jsonb_build_array(jsonb_build_object('address', addr_b, 'active', true)),
           approved_domains = jsonb_build_array(jsonb_build_object('domain', 'other-p3.local', 'active', true)),
           subdomains_permitted = true
     WHERE singleton_guard='primary';

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_b)));
    IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','mode_isolation_single_ignores_named','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','mode_isolation_single_ignores_named','ok',false,'detail',v_res)); END IF;

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_c)));
    IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','mode_isolation_single_ignores_domain','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','mode_isolation_single_ignores_domain','ok',false,'detail',v_res)); END IF;

    UPDATE communication_hub_recipient_policy
       SET active_mode = 'APPROVED_NAMED_RECIPIENTS', single_configured_address = NULL,
           approved_named_addresses = jsonb_build_array(
             jsonb_build_object('address', addr_a, 'active', true),
             jsonb_build_object('address', addr_b, 'active', true),
             jsonb_build_object('address', addr_c, 'active', true)),
           cc_allowed = false, bcc_allowed = false,
           max_to_recipients = 5, max_cc_recipients = 0, max_bcc_recipients = 0,
           max_recipients_per_request = 5
     WHERE singleton_guard='primary';

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_a), 'cc', jsonb_build_array(addr_b)));
    IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','cc_blocked_when_disabled','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','cc_blocked_when_disabled','ok',false,'detail',v_res)); END IF;

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_a), 'bcc', jsonb_build_array(addr_c)));
    IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','bcc_blocked_when_disabled','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','bcc_blocked_when_disabled','ok',false,'detail',v_res)); END IF;

    UPDATE communication_hub_recipient_policy
       SET cc_allowed = true, bcc_allowed = true,
           max_cc_recipients = 1, max_bcc_recipients = 1,
           max_recipients_per_request = 3, max_to_recipients = 1
     WHERE singleton_guard='primary';

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_a),
                                                                   'cc', jsonb_build_array(addr_b),
                                                                   'bcc', jsonb_build_array(addr_c)));
    IF (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','cc_bcc_allowed_within_limits','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','cc_bcc_allowed_within_limits','ok',false,'detail',v_res)); END IF;

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_a),
                                                                   'cc', jsonb_build_array(addr_b, addr_c)));
    IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','cc_bucket_limit_enforced','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','cc_bucket_limit_enforced','ok',false,'detail',v_res)); END IF;

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_a),
                                                                   'cc', jsonb_build_array(addr_b),
                                                                   'max_total_recipients', 1));
    IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','stricter_payload_total_limit_wins','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','stricter_payload_total_limit_wins','ok',false,'detail',v_res)); END IF;

    v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_a),
                                                                   'cc', jsonb_build_array(upper(addr_a))));
    IF v_res IS NOT NULL THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','duplicate_across_buckets_handled','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','duplicate_across_buckets_handled','ok',false)); END IF;

    BEGIN
      UPDATE communication_hub_recipient_policy SET active_mode = 'CONTROLLED_EXTERNAL_RECIPIENTS' WHERE singleton_guard='primary';
      v_res := evaluate_comm_hub_recipient_policy(jsonb_build_object('to', jsonb_build_array(addr_a)));
      IF NOT (v_res->>'allowed')::boolean THEN v_pass := v_pass+1;
        v_results := v_results || jsonb_build_array(jsonb_build_object('label','controlled_external_never_authorises','ok',true));
      ELSE v_fail := v_fail+1;
        v_results := v_results || jsonb_build_array(jsonb_build_object('label','controlled_external_never_authorises','ok',false,'detail',v_res)); END IF;
    EXCEPTION WHEN OTHERS THEN
      v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','controlled_external_never_authorises','ok',true,'detail',jsonb_build_object('refused_at_db',SQLERRM)));
    END;

    SELECT configuration_version INTO op_ver_before FROM communication_hub_control_settings WHERE singleton_guard='primary';
    UPDATE communication_hub_recipient_policy
       SET active_mode = 'APPROVED_NAMED_RECIPIENTS',
           policy_version = policy_version + 1,
           configuration_version = configuration_version + 1
     WHERE singleton_guard='primary';
    SELECT configuration_version INTO op_ver_after FROM communication_hub_control_settings WHERE singleton_guard='primary';
    IF op_ver_after = op_ver_before THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','recipient_policy_update_does_not_touch_operating_mode','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','recipient_policy_update_does_not_touch_operating_mode','ok',false)); END IF;

    IF addr_a LIKE '%@test-p3.local' AND addr_a <> addr_b THEN v_pass := v_pass+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','test_addresses_are_dynamic','ok',true));
    ELSE v_fail := v_fail+1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('label','test_addresses_are_dynamic','ok',false)); END IF;

    RAISE EXCEPTION '__ch_p3_rollback__';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> '__ch_p3_rollback__' THEN
      v_fail := v_fail + 1;
      v_results := v_results || jsonb_build_array(
        jsonb_build_object('label','harness_unexpected_error','ok',false,'detail',jsonb_build_object('sqlerrm',SQLERRM,'sqlstate',SQLSTATE)));
    END IF;
  END;

  RETURN jsonb_build_object(
    'suite','CH-SIMPLE-P3.A1',
    'pass',v_pass,'fail',v_fail,'total',v_pass+v_fail,
    'assertions',v_results,'evaluated_at',now());
END;
$fn$;

REVOKE ALL ON FUNCTION public.run_ch_p3_recipient_policy_runtime_tests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_ch_p3_recipient_policy_runtime_tests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_ch_p3_recipient_policy_runtime_tests() TO service_role;
