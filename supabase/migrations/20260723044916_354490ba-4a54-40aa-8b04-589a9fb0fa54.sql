
-- 1) Certify APPEALS template version via canonical function
SELECT public.certify_comm_hub_template_version('8d1fd9cb-2248-4ff4-86a4-bc42a4995f87'::uuid);

-- 2) Runtime governance: preserve existing impl body under a new name then wrap
DO $$
DECLARE v_src text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='_check_comm_hub_runtime_governance_impl'
  ) THEN
    SELECT pg_get_functiondef(p.oid) INTO v_src
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='check_comm_hub_runtime_governance'
     LIMIT 1;
    v_src := replace(v_src,'public.check_comm_hub_runtime_governance(','public._check_comm_hub_runtime_governance_impl(');
    v_src := replace(v_src,'FUNCTION public.check_comm_hub_runtime_governance(','FUNCTION public._check_comm_hub_runtime_governance_impl(');
    EXECUTE v_src;
  END IF;
END $$;

-- 3) Public wrapper normalises stage vocabulary
CREATE OR REPLACE FUNCTION public.check_comm_hub_runtime_governance(
  p_module_code text, p_event_code text, p_channel text DEFAULT 'email'::text,
  p_target_stage text DEFAULT 'PREVIEW_READY'::text,
  p_preview_snapshot_id uuid DEFAULT NULL, p_preview_approval_id uuid DEFAULT NULL,
  p_dry_run_certification_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $wrap$
DECLARE
  v_canonical text := public.normalize_comm_hub_go_live_stage_strict(p_target_stage);
  -- Map canonical stages back to legacy vocabulary the impl understands
  v_legacy text := CASE v_canonical
    WHEN 'READINESS_ONLY' THEN 'READINESS_ONLY'
    WHEN 'PREVIEW_READY' THEN 'PREVIEW_TEST'
    WHEN 'APPROVAL_READY' THEN 'PREVIEW_APPROVAL'
    WHEN 'DRY_RUN_READY' THEN 'DRY_RUN'
    WHEN 'CONTROLLED_STUB_READY' THEN 'CONTROLLED_STUB'
    WHEN 'ONE_REAL_EMAIL_READY' THEN 'CONTROLLED_LIVE'
    WHEN 'MANUAL_PRODUCTION_READY' THEN 'CONTROLLED_LIVE'
    WHEN 'AUTOMATED_PRODUCTION_READY' THEN 'CONTROLLED_LIVE'
    ELSE 'PREVIEW_TEST'
  END;
  v_result jsonb;
BEGIN
  v_result := public._check_comm_hub_runtime_governance_impl(
    p_module_code, p_event_code, p_channel, v_legacy,
    p_preview_snapshot_id, p_preview_approval_id, p_dry_run_certification_id);
  RETURN v_result
    || jsonb_build_object('requested_stage_canonical', v_canonical,
                          'requested_stage_legacy', v_legacy,
                          'schema_version','runtime-governance-wrap/1');
END;$wrap$;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_runtime_governance(text,text,text,text,uuid,uuid,uuid)
  TO authenticated, service_role;

-- 4) Canonical stage readiness evaluator
CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_stage_readiness(
  p_module_code text, p_event_code text,
  p_target_stage text DEFAULT 'PREVIEW_READY',
  p_channel text DEFAULT 'email',
  p_auto_compute_sender_readiness boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_stage text := public.normalize_comm_hub_go_live_stage_strict(p_target_stage);
  v_module text := upper(coalesce(p_module_code,''));
  v_event  text := upper(coalesce(p_event_code,''));
  v_reqs jsonb := public.get_comm_hub_stage_requirements(v_stage);
  v_fixture jsonb;
  v_sender_id uuid; v_sender_result jsonb;
  v_runner jsonb;
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_advisories jsonb := '[]'::jsonb;
  v_ready boolean;
  v_runner_stage text := CASE
    WHEN v_stage IN ('READINESS_ONLY','PREVIEW_READY','DRY_RUN_READY','CONTROLLED_STUB_READY') THEN v_stage
    ELSE 'CONTROLLED_STUB_READY'
  END;
BEGIN
  v_runner := public.run_comm_hub_go_live_certification(v_module, v_event, p_channel, v_runner_stage, false);
  v_blockers := COALESCE(v_runner->'blockers','[]'::jsonb);
  v_warnings := COALESCE(v_runner->'warnings','[]'::jsonb);

  IF (v_reqs->>'fixture_compatibility_required')::boolean THEN
    v_fixture := public.check_comm_hub_event_fixture_compatibility(v_module, v_event);
    IF NOT COALESCE((v_fixture->>'is_compatible')::boolean,false) THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','fixture_incompatible_with_contract',
        'severity','BLOCKER','stage',v_stage,'detail', v_fixture);
    END IF;
  END IF;

  IF (v_reqs->>'sender_test_ready_required')::boolean
     OR (v_reqs->>'sender_real_email_ready_required')::boolean THEN
    SELECT r.sender_profile_id INTO v_sender_id
      FROM communication_hub_event_send_policy r
     WHERE r.module_code=v_module AND r.event_code=v_event
     ORDER BY r.updated_at DESC NULLS LAST LIMIT 1;
    IF v_sender_id IS NULL THEN
      SELECT sp.id INTO v_sender_id
        FROM communication_hub_sender_profile sp
       WHERE sp.is_enabled = true
       ORDER BY (sp.profile_code = 'SENDER_'||v_module) DESC, sp.is_default DESC, sp.updated_at DESC
       LIMIT 1;
    END IF;
    IF v_sender_id IS NOT NULL AND p_auto_compute_sender_readiness THEN
      IF (v_reqs->>'sender_real_email_ready_required')::boolean THEN
        v_sender_result := public.compute_comm_hub_sender_readiness(v_sender_id,'REAL_EMAIL_READY');
        IF (v_sender_result->>'status') <> 'REAL_EMAIL_READY' THEN
          v_blockers := v_blockers || jsonb_build_object(
            'code','sender_not_real_email_ready','severity','BLOCKER','stage',v_stage,
            'detail', v_sender_result);
        END IF;
      ELSIF (v_reqs->>'sender_test_ready_required')::boolean THEN
        v_sender_result := public.compute_comm_hub_sender_readiness(v_sender_id,'TEST_READY');
        IF (v_sender_result->>'status') NOT IN ('TEST_READY','REAL_EMAIL_READY') THEN
          v_blockers := v_blockers || jsonb_build_object(
            'code','sender_not_test_ready','severity','BLOCKER','stage',v_stage,
            'detail', v_sender_result);
        END IF;
      END IF;
    ELSIF v_sender_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','sender_profile_missing','severity','BLOCKER','stage',v_stage);
    END IF;
  END IF;

  -- Stage-aware demotion (runner blocker codes that don't apply at this stage become advisories)
  IF NOT (v_reqs->>'preview_snapshot_required')::boolean THEN
    v_advisories := v_advisories || COALESCE((SELECT jsonb_agg(x) FROM jsonb_array_elements(v_blockers) x
                                               WHERE x->>'code' = 'PREVIEW_SNAPSHOT_REQUIRED'),'[]'::jsonb);
    v_blockers := COALESCE((SELECT jsonb_agg(x) FROM jsonb_array_elements(v_blockers) x
                             WHERE x->>'code' <> 'PREVIEW_SNAPSHOT_REQUIRED'),'[]'::jsonb);
  END IF;

  v_ready := (jsonb_array_length(v_blockers) = 0);

  RETURN jsonb_build_object(
    'ok', true, 'schema_version','stage-readiness/1',
    'module_code', v_module, 'event_code', v_event, 'channel', p_channel,
    'requested_stage', v_stage,
    'ready_for_requested_stage', v_ready,
    'requirements', v_reqs,
    'blockers', v_blockers, 'warnings', v_warnings, 'advisories', v_advisories,
    'runner_result', v_runner,
    'fixture_result', v_fixture,
    'sender_result', v_sender_result,
    'sender_profile_id', v_sender_id,
    'evaluated_at', now());
END;$$;
GRANT EXECUTE ON FUNCTION public.evaluate_comm_hub_stage_readiness(text,text,text,text,boolean)
  TO authenticated, service_role;
