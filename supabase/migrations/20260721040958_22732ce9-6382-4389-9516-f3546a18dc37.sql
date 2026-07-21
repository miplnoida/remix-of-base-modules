
CREATE OR REPLACE FUNCTION public.run_ch_p3d_b2c_runtime_tests()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_results jsonb := '[]'::jsonb;
  v_pass integer := 0;
  v_fail_count integer := 0;
  v_actor uuid := gen_random_uuid();
  v_snap uuid := gen_random_uuid();
  v_scope_a text;
  v_scope_b text;
  v_exec_id uuid;
  v_exec_id2 uuid;
  v_msg_id uuid := gen_random_uuid();
  v_req_id uuid := gen_random_uuid();
  v_att_id uuid := gen_random_uuid();
  v_recipient_hash text := 'rh_' || substr(md5(random()::text),1,16);
  v_recipient_hash_b text := 'rh_' || substr(md5(random()::text),1,16);
  v_ret jsonb;
  v_err text;
BEGIN
  v_scope_a := public.comm_hub_dry_run_scope_hash(v_actor,'BN','TEST_EVENT','email',v_snap,v_recipient_hash);
  v_scope_b := public.comm_hub_dry_run_scope_hash(v_actor,'BN','TEST_EVENT','email',v_snap,v_recipient_hash_b);

  BEGIN
    IF v_scope_a IS NOT NULL AND v_scope_a <> v_scope_b THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','scope_hash_deterministic_and_sensitive','passed',true);
    ELSE
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','scope_hash_deterministic_and_sensitive','passed',false);
    END IF;

    INSERT INTO public.communication_dry_run_execution(
      execution_no, idempotency_key, scope_hash, requested_by, module_code, event_code, channel,
      preview_snapshot_id, recipient_set_hash, original_decision_id, state)
    VALUES ('T-'||substr(md5(random()::text),1,10), 'idem-1', v_scope_a, v_actor, 'BN','TEST_EVENT','email',
      v_snap, v_recipient_hash, gen_random_uuid(), 'STARTED')
    RETURNING id INTO v_exec_id;

    PERFORM 1 FROM public.communication_dry_run_execution WHERE id = v_exec_id AND state = 'STARTED';
    IF FOUND THEN v_pass := v_pass + 1; v_results := v_results || jsonb_build_object('name','initial_state_started','passed',true);
    ELSE v_fail_count := v_fail_count + 1; v_results := v_results || jsonb_build_object('name','initial_state_started','passed',false); END IF;

    UPDATE public.communication_dry_run_execution
       SET state='REQUEST_CREATED', request_id=v_req_id, message_id=v_msg_id
     WHERE id=v_exec_id;
    v_pass := v_pass + 1;
    v_results := v_results || jsonb_build_object('name','transition_started_to_request_created','passed',true);

    BEGIN
      UPDATE public.communication_dry_run_execution SET module_code='LEG' WHERE id=v_exec_id;
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','identity_module_code_immutable','passed',false,'note','update was permitted');
    EXCEPTION WHEN OTHERS THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','identity_module_code_immutable','passed',true,'errcode',SQLSTATE);
    END;

    BEGIN
      UPDATE public.communication_dry_run_execution SET scope_hash=v_scope_b WHERE id=v_exec_id;
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','scope_hash_immutable','passed',false);
    EXCEPTION WHEN OTHERS THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','scope_hash_immutable','passed',true);
    END;

    BEGIN
      UPDATE public.communication_dry_run_execution SET request_id=gen_random_uuid() WHERE id=v_exec_id;
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','request_id_write_once','passed',false);
    EXCEPTION WHEN OTHERS THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','request_id_write_once','passed',true);
    END;

    BEGIN
      UPDATE public.communication_dry_run_execution SET message_id=gen_random_uuid() WHERE id=v_exec_id;
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','message_id_write_once','passed',false);
    EXCEPTION WHEN OTHERS THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','message_id_write_once','passed',true);
    END;

    BEGIN
      UPDATE public.communication_dry_run_execution SET state='CERTIFIED' WHERE id=v_exec_id;
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','invalid_skip_to_certified_rejected','passed',false);
    EXCEPTION WHEN OTHERS THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','invalid_skip_to_certified_rejected','passed',true);
    END;

    UPDATE public.communication_dry_run_execution SET state='DISPATCHING' WHERE id=v_exec_id;
    UPDATE public.communication_dry_run_execution
       SET state='PROCESSED', delivery_attempt_id=v_att_id, dispatcher_revalidation_decision_id=gen_random_uuid()
     WHERE id=v_exec_id;
    v_pass := v_pass + 1;
    v_results := v_results || jsonb_build_object('name','transition_request_created_to_processed','passed',true);

    BEGIN
      UPDATE public.communication_dry_run_execution SET delivery_attempt_id=gen_random_uuid() WHERE id=v_exec_id;
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','delivery_attempt_id_write_once','passed',false);
    EXCEPTION WHEN OTHERS THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','delivery_attempt_id_write_once','passed',true);
    END;

    UPDATE public.communication_dry_run_execution SET state='CERTIFIED', certification_id=gen_random_uuid() WHERE id=v_exec_id;
    v_pass := v_pass + 1;
    v_results := v_results || jsonb_build_object('name','transition_processed_to_certified','passed',true);

    BEGIN
      UPDATE public.communication_dry_run_execution SET state='PROCESSED' WHERE id=v_exec_id;
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','certified_is_terminal','passed',false);
    EXCEPTION WHEN OTHERS THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','certified_is_terminal','passed',true);
    END;

    BEGIN
      UPDATE public.communication_dry_run_execution SET certification_id=gen_random_uuid() WHERE id=v_exec_id;
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','certification_id_write_once','passed',false);
    EXCEPTION WHEN OTHERS THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','certification_id_write_once','passed',true);
    END;

    BEGIN
      INSERT INTO public.communication_dry_run_execution(
        execution_no, idempotency_key, scope_hash, requested_by, module_code, event_code, channel,
        preview_snapshot_id, recipient_set_hash, state)
      VALUES ('T-'||substr(md5(random()::text),1,10),'idem-1', v_scope_a, v_actor, 'BN','TEST_EVENT','email',
        v_snap, v_recipient_hash, 'STARTED');
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','idempotency_key_scope_unique','passed',false);
    EXCEPTION WHEN unique_violation THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','idempotency_key_scope_unique','passed',true);
    END;

    INSERT INTO public.communication_dry_run_execution(
      execution_no, idempotency_key, scope_hash, requested_by, module_code, event_code, channel,
      preview_snapshot_id, recipient_set_hash, state)
    VALUES ('T-'||substr(md5(random()::text),1,10),'idem-1', v_scope_b, v_actor, 'BN','TEST_EVENT','email',
      v_snap, v_recipient_hash_b, 'STARTED')
    RETURNING id INTO v_exec_id2;
    v_pass := v_pass + 1;
    v_results := v_results || jsonb_build_object('name','same_key_different_scope_allowed','passed',true);

    v_ret := public.fail_comm_hub_dry_run(v_exec_id2, 'CERTIFIED', 'BEGIN', '[]'::jsonb, '[]'::jsonb, NULL);
    IF (v_ret->>'code') = 'invalid_terminal_state' THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','fail_rpc_rejects_invalid_state','passed',true);
    ELSE
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','fail_rpc_rejects_invalid_state','passed',false,'result',v_ret);
    END IF;

    v_ret := public.fail_comm_hub_dry_run(v_exec_id2, 'FAILED', 'SOMETHING_ELSE', '[]'::jsonb, '[]'::jsonb, NULL);
    IF (v_ret->>'code') = 'invalid_failure_stage' THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','fail_rpc_rejects_invalid_stage','passed',true);
    ELSE
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','fail_rpc_rejects_invalid_stage','passed',false);
    END IF;

    v_ret := public.fail_comm_hub_dry_run(v_exec_id2, 'FAILED', 'DISPATCH_RESPONSE_VALIDATION',
      jsonb_build_array(jsonb_build_object('code','provider_call_attempted_true')),
      '[]'::jsonb, 'dispatcher lied');
    PERFORM 1 FROM public.communication_dry_run_execution
     WHERE id=v_exec_id2 AND state='FAILED' AND failure_stage='DISPATCH_RESPONSE_VALIDATION' AND completed_at IS NOT NULL;
    IF FOUND THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','fail_rpc_moves_to_failed','passed',true);
    ELSE
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','fail_rpc_moves_to_failed','passed',false);
    END IF;

    v_ret := public.fail_comm_hub_dry_run(v_exec_id2, 'FAILED', 'FINALIZE', '[]'::jsonb, '[]'::jsonb, NULL);
    IF (v_ret->>'code') = 'already_terminal' THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','fail_rpc_idempotent_on_terminal','passed',true);
    ELSE
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','fail_rpc_idempotent_on_terminal','passed',false);
    END IF;

    BEGIN
      UPDATE public.communication_dry_run_execution SET state='STARTED' WHERE id=v_exec_id2;
      v_fail_count := v_fail_count + 1;
      v_results := v_results || jsonb_build_object('name','failed_is_terminal','passed',false);
    EXCEPTION WHEN OTHERS THEN
      v_pass := v_pass + 1;
      v_results := v_results || jsonb_build_object('name','failed_is_terminal','passed',true);
    END;

    RAISE EXCEPTION 'CH_P3D_B2C_HARNESS_ROLLBACK';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'CH_P3D_B2C_HARNESS_ROLLBACK' THEN
      v_err := SQLERRM;
      v_results := v_results || jsonb_build_object('name','harness_uncaught_exception','passed',false,'error',v_err);
      v_fail_count := v_fail_count + 1;
    END IF;
  END;

  RETURN jsonb_build_object(
    'suite','CH-SIMPLE-P3D-B.2.c',
    'total', v_pass + v_fail_count,
    'passed', v_pass,
    'failed', v_fail_count,
    'results', v_results
  );
END; $$;

REVOKE ALL ON FUNCTION public.run_ch_p3d_b2c_runtime_tests() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_ch_p3d_b2c_runtime_tests() TO service_role;
