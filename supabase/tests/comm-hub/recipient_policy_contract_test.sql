-- CH-SIMPLE-P3F-UX.6B — Runtime contract test between the recipient-policy
-- evaluator and the canonical send-decision core.
--
-- Purpose:
--   Proves that both functions agree on the recipient outcome for a given
--   payload, regardless of which key names either side happens to use
--   internally. This is the exact regression that caused UX.6A/UX.6B.
--
-- How to run (Cloud SQL runner or psql):
--   \i supabase/tests/comm-hub/recipient_policy_contract_test.sql
--
-- The script raises an exception (aborts the transaction) on any mismatch,
-- so any orchestration tool that treats a non-zero exit code as a failure
-- will detect a regression.

DO $$
DECLARE
  v_addr       text;
  v_recip_out  jsonb;
  v_send_out   jsonb;
  v_recip_ok   boolean;
  v_send_ok    boolean;
  v_send_denied_by_recipient boolean;
BEGIN
  -- Resolve the currently-approved recipient for the singleton policy.
  SELECT single_configured_address INTO v_addr
  FROM public.communication_hub_recipient_policy
  WHERE singleton_guard = 'primary';

  IF v_addr IS NULL OR v_addr = '' THEN
    RAISE NOTICE 'skip: no single_configured_address on primary recipient policy';
    RETURN;
  END IF;

  -- ---- Case 1: matching recipient must be allowed by BOTH sides. ----
  v_recip_out := public.evaluate_comm_hub_recipient_policy(
    jsonb_build_object('to', jsonb_build_array(v_addr))
  );
  v_send_out := public._evaluate_comm_hub_send_decision_core(
    jsonb_build_object(
      'module_code','APPEALS',
      'event_code','APPEAL_RECEIVED_NOTICE',
      'channel','email',
      'send_context','preview',
      'to_recipients', jsonb_build_array(v_addr)
    )
  );
  v_recip_ok := coalesce((v_recip_out->>'allowed')::boolean, false);
  v_send_ok  := coalesce((v_send_out->>'allowed')::boolean, false);

  IF NOT v_recip_ok THEN
    RAISE EXCEPTION 'CONTRACT FAIL: policy evaluator denied the approved address % : %', v_addr, v_recip_out;
  END IF;
  IF NOT v_send_ok THEN
    RAISE EXCEPTION 'CONTRACT FAIL: send-decision blocked the approved address % : %', v_addr, v_send_out->'blockers';
  END IF;

  -- ---- Case 2: mismatched recipient must be denied by BOTH sides. ----
  v_recip_out := public.evaluate_comm_hub_recipient_policy(
    jsonb_build_object('to', jsonb_build_array('mismatch-' || v_addr))
  );
  v_send_out := public._evaluate_comm_hub_send_decision_core(
    jsonb_build_object(
      'module_code','APPEALS',
      'event_code','APPEAL_RECEIVED_NOTICE',
      'channel','email',
      'send_context','preview',
      'to_recipients', jsonb_build_array('mismatch-' || v_addr)
    )
  );
  v_recip_ok := coalesce((v_recip_out->>'allowed')::boolean, false);
  v_send_ok  := coalesce((v_send_out->>'allowed')::boolean, false);

  IF v_recip_ok THEN
    RAISE EXCEPTION 'CONTRACT FAIL: policy evaluator allowed a mismatched address';
  END IF;
  IF v_send_ok THEN
    RAISE EXCEPTION 'CONTRACT FAIL: send-decision allowed a mismatched address (recipient key not enforced)';
  END IF;

  -- Case 2b: send-decision must include recipient_policy_denied blocker.
  v_send_denied_by_recipient := EXISTS (
    SELECT 1
    FROM jsonb_array_elements(coalesce(v_send_out->'blockers','[]'::jsonb)) b
    WHERE b->>'code' = 'recipient_policy_denied'
  );
  IF NOT v_send_denied_by_recipient THEN
    RAISE EXCEPTION 'CONTRACT FAIL: send-decision blocked but recipient_policy_denied code was missing: %', v_send_out->'blockers';
  END IF;

  RAISE NOTICE 'ok: recipient policy contract holds for %', v_addr;
END $$;
