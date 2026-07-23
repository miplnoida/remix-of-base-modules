
-- CANONICAL STAGE NORMALISER
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
    WHEN 'CONTROLLED_LIVE'            THEN 'ONE_REAL_EMAIL_READY'  -- default alias; RUN_CONTROLLED_STUB action must map to CONTROLLED_STUB_READY at call site
    WHEN 'MANUAL_PRODUCTION'          THEN 'MANUAL_PRODUCTION_READY'
    WHEN 'MANUAL_PRODUCTION_READY'    THEN 'MANUAL_PRODUCTION_READY'
    WHEN 'AUTOMATED_PRODUCTION'       THEN 'AUTOMATED_PRODUCTION_READY'
    WHEN 'AUTOMATED_PRODUCTION_READY' THEN 'AUTOMATED_PRODUCTION_READY'
    ELSE NULL
  END;
END;
$$;
-- Strict variant (raises)
CREATE OR REPLACE FUNCTION public.normalize_comm_hub_go_live_stage_strict(p_stage text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $$
DECLARE v text := public.normalize_comm_hub_go_live_stage(p_stage);
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'GO_LIVE_STAGE_UNSUPPORTED: %', p_stage; END IF;
  RETURN v;
END;$$;

GRANT EXECUTE ON FUNCTION public.normalize_comm_hub_go_live_stage(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_comm_hub_go_live_stage_strict(text) TO authenticated, service_role;

-- STAGE REQUIREMENTS MATRIX
CREATE OR REPLACE FUNCTION public.get_comm_hub_stage_requirements(p_stage text)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $$
DECLARE s text := public.normalize_comm_hub_go_live_stage_strict(p_stage);
BEGIN
  RETURN CASE s
  WHEN 'READINESS_ONLY' THEN jsonb_build_object(
    'stage',s,
    'event_registration_required',true,
    'event_template_map_required',true,
    'template_version_required',true,
    'event_schema_required',true,   'event_schema_enforcement_required',false,
    'variable_contract_required',true,'variable_contract_enforcement_required',false,
    'fixture_compatibility_required',false,
    'template_structure_certification_required',false,
    'recipient_policy_required',false,
    'sender_test_ready_required',false,
    'sender_real_email_ready_required',false,
    'preview_snapshot_required',false,'preview_approval_required',false,
    'dry_run_certification_required',false,
    'controlled_stub_capability_required',false,
    'live_provider_capability_required',false,
    'release_certification_required',false,
    'automation_arm_required',false)
  WHEN 'PREVIEW_READY' THEN jsonb_build_object(
    'stage',s,
    'event_registration_required',true,'event_template_map_required',true,'template_version_required',true,
    'event_schema_required',true,'event_schema_enforcement_required',true,
    'variable_contract_required',true,'variable_contract_enforcement_required',true,
    'fixture_compatibility_required',true,
    'template_structure_certification_required',true,
    'recipient_policy_required',false,
    'sender_test_ready_required',false,
    'sender_real_email_ready_required',false,
    'preview_snapshot_required',false,'preview_approval_required',false,
    'dry_run_certification_required',false,
    'controlled_stub_capability_required',false,
    'live_provider_capability_required',false,
    'release_certification_required',false,'automation_arm_required',false)
  WHEN 'APPROVAL_READY' THEN jsonb_build_object(
    'stage',s,
    'event_registration_required',true,'event_template_map_required',true,'template_version_required',true,
    'event_schema_required',true,'event_schema_enforcement_required',true,
    'variable_contract_required',true,'variable_contract_enforcement_required',true,
    'fixture_compatibility_required',true,'template_structure_certification_required',true,
    'recipient_policy_required',true,
    'sender_test_ready_required',false,'sender_real_email_ready_required',false,
    'preview_snapshot_required',false,'preview_approval_required',false,
    'dry_run_certification_required',false,'controlled_stub_capability_required',false,
    'live_provider_capability_required',false,
    'release_certification_required',false,'automation_arm_required',false)
  WHEN 'DRY_RUN_READY' THEN jsonb_build_object(
    'stage',s,
    'event_registration_required',true,'event_template_map_required',true,'template_version_required',true,
    'event_schema_required',true,'event_schema_enforcement_required',true,
    'variable_contract_required',true,'variable_contract_enforcement_required',true,
    'fixture_compatibility_required',true,'template_structure_certification_required',true,
    'recipient_policy_required',true,
    'sender_test_ready_required',true,'sender_real_email_ready_required',false,
    'preview_snapshot_required',false,'preview_approval_required',false,
    'dry_run_certification_required',false,'controlled_stub_capability_required',false,
    'live_provider_capability_required',false,
    'release_certification_required',false,'automation_arm_required',false)
  WHEN 'CONTROLLED_STUB_READY' THEN jsonb_build_object(
    'stage',s,
    'event_registration_required',true,'event_template_map_required',true,'template_version_required',true,
    'event_schema_required',true,'event_schema_enforcement_required',true,
    'variable_contract_required',true,'variable_contract_enforcement_required',true,
    'fixture_compatibility_required',true,'template_structure_certification_required',true,
    'recipient_policy_required',true,
    'sender_test_ready_required',true,'sender_real_email_ready_required',false,
    'preview_snapshot_required',false,'preview_approval_required',false,
    'dry_run_certification_required',false,
    'controlled_stub_capability_required',true,
    'live_provider_capability_required',false,
    'release_certification_required',false,'automation_arm_required',false)
  WHEN 'ONE_REAL_EMAIL_READY' THEN jsonb_build_object(
    'stage',s,
    'event_registration_required',true,'event_template_map_required',true,'template_version_required',true,
    'event_schema_required',true,'event_schema_enforcement_required',true,
    'variable_contract_required',true,'variable_contract_enforcement_required',true,
    'fixture_compatibility_required',true,'template_structure_certification_required',true,
    'recipient_policy_required',true,
    'sender_test_ready_required',true,'sender_real_email_ready_required',true,
    'preview_snapshot_required',false,'preview_approval_required',false,
    'dry_run_certification_required',false,
    'controlled_stub_capability_required',true,
    'live_provider_capability_required',true,
    'release_certification_required',true,'automation_arm_required',false)
  WHEN 'MANUAL_PRODUCTION_READY' THEN jsonb_build_object(
    'stage',s,
    'event_registration_required',true,'event_template_map_required',true,'template_version_required',true,
    'event_schema_required',true,'event_schema_enforcement_required',true,
    'variable_contract_required',true,'variable_contract_enforcement_required',true,
    'fixture_compatibility_required',true,'template_structure_certification_required',true,
    'recipient_policy_required',true,
    'sender_test_ready_required',true,'sender_real_email_ready_required',true,
    'preview_snapshot_required',false,'preview_approval_required',false,
    'dry_run_certification_required',true,
    'controlled_stub_capability_required',true,'live_provider_capability_required',true,
    'release_certification_required',true,'automation_arm_required',false)
  WHEN 'AUTOMATED_PRODUCTION_READY' THEN jsonb_build_object(
    'stage',s,
    'event_registration_required',true,'event_template_map_required',true,'template_version_required',true,
    'event_schema_required',true,'event_schema_enforcement_required',true,
    'variable_contract_required',true,'variable_contract_enforcement_required',true,
    'fixture_compatibility_required',true,'template_structure_certification_required',true,
    'recipient_policy_required',true,
    'sender_test_ready_required',true,'sender_real_email_ready_required',true,
    'preview_snapshot_required',false,'preview_approval_required',false,
    'dry_run_certification_required',true,
    'controlled_stub_capability_required',true,'live_provider_capability_required',true,
    'release_certification_required',true,'automation_arm_required',true)
  END;
END;$$;

GRANT EXECUTE ON FUNCTION public.get_comm_hub_stage_requirements(text) TO authenticated, service_role;
