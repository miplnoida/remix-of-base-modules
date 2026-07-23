
-- Verification-only. Fails the migration (rolls back) if assertions do not hold.
DO $verify$
DECLARE
  v_runner jsonb;
  v_tc jsonb;
  v_blockers jsonb;
  v_has_missing boolean;
  v_writer jsonb;
  v_prev_id CONSTANT uuid := '5336ff82-4c3b-422b-8349-edc9493132b8';
  v_replay_id uuid;
  v_prior_count int;
  v_post_count int;
BEGIN
  -- 1) Runner assertion.
  v_runner := public.run_comm_hub_go_live_certification('APPEALS','APPEAL_RECEIVED_NOTICE','email','READINESS_ONLY',false);
  v_tc := v_runner->'template_certification';
  v_blockers := coalesce(v_runner->'blockers','[]'::jsonb);
  RAISE NOTICE 'RUNNER_TEMPLATE_CERT: %', v_tc;
  RAISE NOTICE 'RUNNER_BLOCKERS:      %', v_blockers;

  IF (v_tc->>'template_certification_found')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ASSERT_FAIL: runner did not find authoritative template certification. tc=%',v_tc;
  END IF;
  IF coalesce((v_tc->>'template_certification_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid) <> v_prev_id THEN
    RAISE EXCEPTION 'ASSERT_FAIL: runner returned unexpected template_certification_id=% (expected %)',
      v_tc->>'template_certification_id', v_prev_id;
  END IF;
  v_has_missing := EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_blockers) b
    WHERE b->>'code' = 'template_version_certification_missing'
  );
  IF v_has_missing THEN
    RAISE EXCEPTION 'ASSERT_FAIL: runner still emits template_version_certification_missing';
  END IF;

  -- 2) Idempotent replay assertion — count before/after must be unchanged for the target subject.
  SELECT count(*) INTO v_prior_count FROM public.comm_hub_certification
   WHERE entity_type='TEMPLATE_VERSION'
     AND entity_id='8d1fd9cb-2248-4ff4-86a4-bc42a4995f87'::uuid;

  v_writer := public.record_comm_hub_template_version_certification(
    '8d1fd9cb-2248-4ff4-86a4-bc42a4995f87'::uuid,
    'Sub-iter 2 verification: idempotent replay probe');
  RAISE NOTICE 'IDEMPOTENT_REPLAY_RESULT: %', v_writer;

  SELECT count(*) INTO v_post_count FROM public.comm_hub_certification
   WHERE entity_type='TEMPLATE_VERSION'
     AND entity_id='8d1fd9cb-2248-4ff4-86a4-bc42a4995f87'::uuid;

  IF v_post_count <> v_prior_count THEN
    RAISE EXCEPTION 'ASSERT_FAIL: writer inserted a new row on replay. prior=% post=%', v_prior_count, v_post_count;
  END IF;
  IF coalesce((v_writer->>'idempotent_replay')::boolean, false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ASSERT_FAIL: writer did not report idempotent_replay=true. result=%', v_writer;
  END IF;
  v_replay_id := (v_writer->>'certification_id')::uuid;
  IF v_replay_id <> v_prev_id THEN
    RAISE EXCEPTION 'ASSERT_FAIL: replay returned different id=% (expected %)', v_replay_id, v_prev_id;
  END IF;

  RAISE NOTICE 'ALL_SUBITER2_VERIFICATIONS_PASSED';
END $verify$;
