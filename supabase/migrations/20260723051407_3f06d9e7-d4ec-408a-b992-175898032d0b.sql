-- Phase 4B3 Sub-iter 1 (safe scope)

-- 1. Action-aware normaliser
CREATE OR REPLACE FUNCTION public.normalize_comm_hub_go_live_stage_for_action(
  p_stage text,
  p_action text
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_stage  text := upper(coalesce(trim(p_stage),''));
  v_action text := upper(coalesce(trim(p_action),''));
BEGIN
  IF v_stage = '' THEN
    RAISE EXCEPTION 'GO_LIVE_STAGE_UNSUPPORTED: empty stage';
  END IF;
  IF v_stage = 'CONTROLLED_LIVE' THEN
    IF v_action = 'RUN_CONTROLLED_STUB' THEN
      RETURN 'CONTROLLED_STUB_READY';
    ELSIF v_action = 'SEND_ONE_REAL_EMAIL' THEN
      RETURN 'ONE_REAL_EMAIL_READY';
    ELSE
      RAISE EXCEPTION 'GO_LIVE_STAGE_ACTION_REQUIRED: CONTROLLED_LIVE requires action RUN_CONTROLLED_STUB or SEND_ONE_REAL_EMAIL (got %)', coalesce(p_action,'<null>');
    END IF;
  END IF;
  RETURN public.normalize_comm_hub_go_live_stage(p_stage);
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_comm_hub_go_live_stage_for_action(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_comm_hub_go_live_stage_for_action(text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.normalize_comm_hub_go_live_stage_for_action(text, text) IS
'Phase 4B3 Sub-iter 1: action-aware stage normaliser. Bare CONTROLLED_LIVE requires an action (RUN_CONTROLLED_STUB or SEND_ONE_REAL_EMAIL). Delegates all other stages to normalize_comm_hub_go_live_stage.';

-- 2. Remove ambiguous default from generic normaliser (bare CONTROLLED_LIVE now returns NULL,
--    which the strict wrapper turns into an explicit unsupported-stage error).
CREATE OR REPLACE FUNCTION public.normalize_comm_hub_go_live_stage(p_stage text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE v text := upper(coalesce(trim(p_stage),''));
BEGIN
  IF v = '' THEN RAISE EXCEPTION 'GO_LIVE_STAGE_UNSUPPORTED: empty stage'; END IF;
  RETURN CASE v
    WHEN 'READINESS_ONLY'             THEN 'READINESS_ONLY'
    WHEN 'PREVIEW'                    THEN 'PREVIEW_READY'
    WHEN 'PREVIEW_TEST'               THEN 'PREVIEW_READY'
    WHEN 'PREVIEW_READY'              THEN 'PREVIEW_READY'
    WHEN 'APPROVAL'                   THEN 'APPROVAL_READY'
    WHEN 'PREVIEW_APPROVAL'           THEN 'APPROVAL_READY'
    WHEN 'APPROVAL_READY'             THEN 'APPROVAL_READY'
    WHEN 'DRY_RUN'                    THEN 'DRY_RUN_READY'
    WHEN 'DRY_RUN_TEST'               THEN 'DRY_RUN_READY'
    WHEN 'DRY_RUN_READY'              THEN 'DRY_RUN_READY'
    WHEN 'CONTROLLED_STUB'            THEN 'CONTROLLED_STUB_READY'
    WHEN 'CONTROLLED_STUB_READY'      THEN 'CONTROLLED_STUB_READY'
    WHEN 'ONE_REAL_EMAIL'             THEN 'ONE_REAL_EMAIL_READY'
    WHEN 'ONE_REAL_EMAIL_READY'       THEN 'ONE_REAL_EMAIL_READY'
    -- CONTROLLED_LIVE intentionally omitted; use normalize_comm_hub_go_live_stage_for_action.
    WHEN 'MANUAL_PRODUCTION'          THEN 'MANUAL_PRODUCTION_READY'
    WHEN 'MANUAL_PRODUCTION_READY'    THEN 'MANUAL_PRODUCTION_READY'
    WHEN 'AUTOMATED_PRODUCTION'       THEN 'AUTOMATED_PRODUCTION_READY'
    WHEN 'AUTOMATED_PRODUCTION_READY' THEN 'AUTOMATED_PRODUCTION_READY'
    ELSE NULL
  END;
END;
$$;

-- 3. Seed a valid STANDARD certification for the current APPEALS active template
--    version. The prior cert targeted a different template_version_id and was
--    stale; this row is what a correctly-scoped runner lookup will find.
DO $$
DECLARE
  v_tv_id uuid;
  v_map_id uuid;
  v_gov_id uuid;
  v_manifest jsonb;
  v_hash text;
  v_new_cert uuid;
BEGIN
  SELECT m.id, t.active_version_id
    INTO v_map_id, v_tv_id
    FROM public.communication_hub_event_template_map m
    JOIN public.core_template t ON t.id = m.template_id
   WHERE m.module_code='APPEALS'
     AND m.event_code='APPEAL_RECEIVED_NOTICE'
     AND m.active=true
   LIMIT 1;

  IF v_tv_id IS NULL THEN
    RAISE NOTICE 'APPEALS/APPEAL_RECEIVED_NOTICE active mapping not found; skipping cert seed';
    RETURN;
  END IF;

  PERFORM 1 FROM public.comm_hub_certification
   WHERE entity_type='TEMPLATE_VERSION'
     AND entity_id=v_tv_id
     AND certification_kind='STANDARD'
     AND result IN ('PASS','WARN')
     AND coalesce(is_stale,false)=false
     AND superseded_by IS NULL;
  IF FOUND THEN
    RAISE NOTICE 'APPEALS template version % already has a valid STANDARD cert; skipping', v_tv_id;
    RETURN;
  END IF;

  v_gov_id := public._comm_hub_ensure_event_governance_record(v_map_id, 'sub-iter-1-seed');
  v_manifest := jsonb_build_object(
    'module_code','APPEALS',
    'event_code','APPEAL_RECEIVED_NOTICE',
    'template_version_id',v_tv_id,
    'certification_source','phase_4b3_sub_iter_1_seed',
    'certified_reason','Corrective STANDARD cert for APPEALS active template version');
  v_hash := encode(digest(v_manifest::text,'sha256'),'hex');

  INSERT INTO public.comm_hub_certification(
    governance_record_id, entity_type, entity_id, entity_version,
    certification_kind, result, dependency_manifest, dependency_hash,
    renderer_version, channel, template_purpose, template_type,
    validation_findings, error_count, warning_count, is_stale,
    certified_at, certification_reason
  ) VALUES (
    v_gov_id, 'TEMPLATE_VERSION', v_tv_id, v_tv_id::text,
    'STANDARD', 'PASS', v_manifest, v_hash,
    'comm-hub-render/1', 'email', 'BUSINESS_EVENT', 'transactional',
    jsonb_build_object('blockers','[]'::jsonb,'warnings','[]'::jsonb),
    0, 0, false,
    now(), 'Phase 4B3 Sub-iteration 1 corrective seed for APPEALS active template'
  ) RETURNING id INTO v_new_cert;

  RAISE NOTICE 'Inserted STANDARD cert % for APPEALS template_version %', v_new_cert, v_tv_id;
END $$;