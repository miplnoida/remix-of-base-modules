
CREATE OR REPLACE FUNCTION public._check_comm_hub_runtime_governance_impl(
  p_module_code text, p_event_code text, p_channel text DEFAULT 'email',
  p_target_stage text DEFAULT 'PREVIEW_TEST',
  p_preview_snapshot_id uuid DEFAULT NULL,
  p_preview_approval_id uuid DEFAULT NULL,
  p_dry_run_certification_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_channel text := COALESCE(p_channel,'email');
  v_target_stage text := COALESCE(p_target_stage,'PREVIEW_TEST');
  v_map_id uuid; v_map_active boolean; v_map_template_id uuid; v_map_template_code text;
  v_template_id uuid; v_version_id uuid; v_version_status text;
  v_gov_id uuid; v_gov_status text;
  v_cert_id uuid; v_cert_kind text; v_cert_hash text; v_cert_is_stale boolean;
  v_cert_layer text; v_cert_prov text;
  v_fresh_status text; v_fresh_changed text[];
  v_current_hash text; v_dep jsonb;
  v_blockers jsonb := '[]'::jsonb; v_warnings jsonb := '[]'::jsonb; v_actions jsonb := '[]'::jsonb;
  v_ready boolean := true;
  v_snap_id uuid; v_snap_cert uuid; v_snap_hash text;
BEGIN
  IF v_target_stage NOT IN ('PREVIEW_TEST','PREVIEW_APPROVAL','DRY_RUN_TEST','CONTROLLED_STUB',
                            'ONE_REAL_EMAIL','MANUAL_PRODUCTION','AUTOMATED_PRODUCTION') THEN
    RETURN jsonb_build_object('ready',false,'target_stage',v_target_stage,
      'blockers', jsonb_build_array(jsonb_build_object('code','INVALID_TARGET_STAGE',
        'message','Unknown target stage: '||v_target_stage,'severity','critical','stage',v_target_stage)),
      'evaluated_at', now());
  END IF;

  SELECT id,active,template_id,template_code INTO v_map_id,v_map_active,v_map_template_id,v_map_template_code
    FROM public.communication_hub_event_template_map
   WHERE module_code=p_module_code AND event_code=p_event_code AND channel=v_channel LIMIT 1;

  IF v_map_id IS NULL OR NOT COALESCE(v_map_active,false) THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','EVENT_MAPPING_NOT_ACTIVE',
      'message','Event mapping missing or inactive','severity','critical','stage',v_target_stage));
    v_ready := false;
  END IF;

  IF v_map_id IS NOT NULL THEN
    v_template_id := v_map_template_id;
    IF v_template_id IS NULL THEN
      SELECT id INTO v_template_id FROM public.core_template WHERE template_code=v_map_template_code LIMIT 1;
    END IF;
    IF v_template_id IS NOT NULL THEN
      SELECT id,status INTO v_version_id,v_version_status
        FROM public.core_template_version
       WHERE template_id=v_template_id
       ORDER BY (LOWER(status) IN ('active','published','approved_internal','approved_external')) DESC, version_no DESC
       LIMIT 1;
      IF v_version_id IS NULL THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','TEMPLATE_VERSION_NOT_ACTIVE',
          'message','No template version found for template','severity','critical','stage',v_target_stage));
        v_ready := false;
      ELSIF LOWER(COALESCE(v_version_status,'')) NOT IN ('active','published','approved_internal','approved_external') THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','TEMPLATE_VERSION_NOT_ACTIVE',
          'message','Template version status is '||COALESCE(v_version_status,'null'),
          'severity','critical','stage',v_target_stage));
        v_ready := false;
      END IF;
    END IF;
  END IF;

  IF v_version_id IS NOT NULL THEN
    SELECT id,governance_status INTO v_gov_id,v_gov_status
      FROM public.comm_hub_governance_record
     WHERE entity_type='TEMPLATE_VERSION'::comm_hub_governance_entity_type AND entity_id=v_version_id
     ORDER BY governance_version DESC LIMIT 1;
    IF v_gov_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','GOVERNANCE_RECORD_MISSING',
        'message','No governance record exists for this template version','severity','critical','stage',v_target_stage));
      v_ready := false;
    END IF;

    -- Authoritative-first lookup with canonical dependency-manifest comparison.
    SELECT id,certification_kind,dependency_hash,is_stale,certification_layer,provenance_state
      INTO v_cert_id,v_cert_kind,v_cert_hash,v_cert_is_stale,v_cert_layer,v_cert_prov
      FROM public.comm_hub_certification
     WHERE entity_type='TEMPLATE_VERSION'::comm_hub_governance_entity_type AND entity_id=v_version_id
       AND result='PASS' AND superseded_by IS NULL AND is_stale=false
       AND certification_layer='TEMPLATE_STRUCTURE_CERTIFICATION'
       AND provenance_state='AUTHORITATIVE'
     ORDER BY certified_at DESC LIMIT 1;

    IF v_cert_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','TEMPLATE_VERSION_NOT_CERTIFIED',
        'message','No current authoritative PASS certification exists for this template version',
        'severity','critical','stage',v_target_stage));
      v_ready := false;
    ELSE
      v_dep := public.build_comm_hub_template_dependency_manifest(v_version_id);
      IF (v_dep->>'build_status') = 'OK' THEN
        v_current_hash := public.comm_hub_evidence_hash(
          'comm-hub/template-dependency-manifest/v1', v_dep);
      END IF;

      SELECT freshness_status,changed_dependency_categories INTO v_fresh_status,v_fresh_changed
        FROM public.comm_hub_certification_freshness WHERE certification_id=v_cert_id;

      IF v_current_hash IS NOT NULL AND v_current_hash <> v_cert_hash THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
          'code','TEMPLATE_CERTIFICATION_STALE',
          'message','The template certification is stale. Recertify before continuing.',
          'severity','critical','stage',v_target_stage,
          'changed_categories', COALESCE(v_fresh_changed, ARRAY[]::text[])));
        v_ready := false;
      ELSIF v_fresh_status IS NOT NULL AND v_fresh_status IN ('STALE','SUPERSEDED') THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
          'code', CASE WHEN v_fresh_status='SUPERSEDED' THEN 'GOVERNANCE_CERTIFICATION_SUPERSEDED'
                       ELSE 'TEMPLATE_CERTIFICATION_STALE' END,
          'message','Freshness sidecar reports '||v_fresh_status,
          'severity','critical','stage',v_target_stage,
          'changed_categories', COALESCE(v_fresh_changed, ARRAY[]::text[])));
        v_ready := false;
      END IF;
    END IF;
  END IF;

  IF v_target_stage IN ('PREVIEW_APPROVAL','DRY_RUN_TEST','CONTROLLED_STUB') THEN
    IF p_preview_snapshot_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','PREVIEW_SNAPSHOT_REQUIRED',
        'message','This stage requires an existing Preview snapshot id','severity','critical','stage',v_target_stage));
      v_ready := false;
    ELSE
      SELECT id,governance_certification_id,certified_dependency_hash INTO v_snap_id,v_snap_cert,v_snap_hash
        FROM public.communication_preview_snapshot WHERE id=p_preview_snapshot_id;
      IF v_snap_id IS NULL THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_FOUND',
          'message','Preview snapshot not found','severity','critical','stage',v_target_stage));
        v_ready := false;
      ELSE
        IF v_cert_id IS NOT NULL AND v_snap_cert IS NOT NULL AND v_snap_cert<>v_cert_id THEN
          v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','GOVERNANCE_CERTIFICATION_SUPERSEDED',
            'message','A newer certification exists. Prepare and approve a new Preview.',
            'severity','critical','stage',v_target_stage));
          v_ready := false;
        END IF;
        IF v_current_hash IS NOT NULL AND v_snap_hash IS NOT NULL AND v_snap_hash<>v_current_hash THEN
          v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','DEPENDENCY_HASH_MISMATCH',
            'message','Snapshot dependency hash no longer matches current configuration',
            'severity','critical','stage',v_target_stage));
          v_ready := false;
        END IF;
      END IF;
    END IF;
  END IF;

  IF v_target_stage IN ('ONE_REAL_EMAIL','MANUAL_PRODUCTION','AUTOMATED_PRODUCTION') THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code','PHASE_4B3_PRODUCTION_GATE_PENDING',
      'message','Release certification model for '||v_target_stage||' is delivered in later B3 slices.'));
    IF NOT EXISTS (
      SELECT 1 FROM public.comm_hub_event_release_certification r
       WHERE r.module_code=p_module_code AND r.event_code=p_event_code AND r.channel=v_channel
         AND r.release_status::text = v_target_stage
    ) THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'code', CASE v_target_stage WHEN 'AUTOMATED_PRODUCTION' THEN 'AUTOMATION_GOVERNANCE_EVIDENCE_INCOMPLETE'
                                    ELSE 'GOVERNANCE_EVIDENCE_INCOMPLETE' END,
        'message','No release certification for stage '||v_target_stage,
        'severity','critical','stage',v_target_stage));
      v_ready := false;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ready', v_ready, 'target_stage', v_target_stage,
    'module_code', p_module_code, 'event_code', p_event_code, 'channel', v_channel,
    'event_template_map_id', v_map_id, 'mapping_active', COALESCE(v_map_active,false),
    'template_id', v_template_id, 'template_version_id', v_version_id,
    'template_version_status', v_version_status,
    'governance_record_id', v_gov_id, 'governance_status', v_gov_status,
    'certification_id', v_cert_id, 'certification_kind', v_cert_kind,
    'certification_layer', v_cert_layer, 'certification_provenance', v_cert_prov,
    'certified_dependency_hash', v_cert_hash, 'current_dependency_hash', v_current_hash,
    'certification_freshness', COALESCE(v_fresh_status, CASE WHEN v_current_hash = v_cert_hash THEN 'CURRENT' ELSE 'STALE' END, 'NOT_EVALUATED'),
    'changed_dependency_categories', COALESCE(v_fresh_changed, ARRAY[]::text[]),
    'blockers', v_blockers, 'warnings', v_warnings, 'recommended_actions', v_actions,
    'source', 'check_comm_hub_runtime_governance', 'evaluator_version', '4b3.subiter2',
    'evaluated_at', now()
  );
END $$;

-- Refresh sidecar for APPEALS canonical certification
DO $$
DECLARE v_id uuid; v jsonb;
BEGIN
  SELECT id INTO v_id FROM public.comm_hub_certification
    WHERE entity_id='8d1fd9cb-2248-4ff4-86a4-bc42a4995f87'
      AND certification_layer='TEMPLATE_STRUCTURE_CERTIFICATION'
      AND provenance_state='AUTHORITATIVE'
      AND is_stale=false AND superseded_by IS NULL
    ORDER BY certified_at DESC LIMIT 1;
  IF v_id IS NOT NULL THEN
    v := public.refresh_comm_hub_certification_freshness(v_id, 'sub-iter-2 impl update');
    RAISE NOTICE 'FRESHNESS %', v;
  END IF;
END $$;
