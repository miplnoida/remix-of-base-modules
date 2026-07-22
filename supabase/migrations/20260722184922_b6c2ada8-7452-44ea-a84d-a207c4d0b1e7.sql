
ALTER TABLE public.communication_preview_snapshot
  ADD COLUMN IF NOT EXISTS governance_certification_id uuid
    REFERENCES public.comm_hub_certification(id),
  ADD COLUMN IF NOT EXISTS governance_record_id uuid
    REFERENCES public.comm_hub_governance_record(id),
  ADD COLUMN IF NOT EXISTS certified_dependency_hash text,
  ADD COLUMN IF NOT EXISTS current_dependency_hash text,
  ADD COLUMN IF NOT EXISTS governance_freshness_status text,
  ADD COLUMN IF NOT EXISTS changed_dependency_categories text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS canonical_renderer_version text,
  ADD COLUMN IF NOT EXISTS manifest_schema_version text,
  ADD COLUMN IF NOT EXISTS event_template_map_id uuid
    REFERENCES public.communication_hub_event_template_map(id),
  ADD COLUMN IF NOT EXISTS governance_evidence jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS communication_preview_snapshot_gov_cert_idx
  ON public.communication_preview_snapshot (governance_certification_id);

CREATE OR REPLACE FUNCTION public.check_comm_hub_runtime_governance(
  p_module_code text,
  p_event_code text,
  p_channel text DEFAULT 'email',
  p_target_stage text DEFAULT 'PREVIEW_TEST',
  p_preview_snapshot_id uuid DEFAULT NULL,
  p_preview_approval_id uuid DEFAULT NULL,
  p_dry_run_certification_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel        text := COALESCE(p_channel, 'email');
  v_target_stage   text := COALESCE(p_target_stage, 'PREVIEW_TEST');
  v_mapping        record;
  v_template_id    uuid;
  v_version_id     uuid;
  v_version        record;
  v_gov            record;
  v_cert           record;
  v_fresh          record;
  v_current_hash   text;
  v_manifest       jsonb;
  v_blockers       jsonb := '[]'::jsonb;
  v_warnings       jsonb := '[]'::jsonb;
  v_actions        jsonb := '[]'::jsonb;
  v_ready          boolean := true;
  v_snapshot       record;
BEGIN
  IF v_target_stage NOT IN (
    'PREVIEW_TEST','PREVIEW_APPROVAL','DRY_RUN_TEST','CONTROLLED_STUB',
    'ONE_REAL_EMAIL','MANUAL_PRODUCTION','AUTOMATED_PRODUCTION'
  ) THEN
    RETURN jsonb_build_object(
      'ready', false,
      'target_stage', v_target_stage,
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','INVALID_TARGET_STAGE',
        'message','Unknown target stage: ' || v_target_stage,
        'severity','critical','stage',v_target_stage
      )),
      'evaluated_at', now()
    );
  END IF;

  SELECT * INTO v_mapping
    FROM public.communication_hub_event_template_map
   WHERE module_code = p_module_code
     AND event_code  = p_event_code
     AND channel     = v_channel
   LIMIT 1;

  IF v_mapping.id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code','EVENT_MAPPING_NOT_ACTIVE',
      'message','No active event-template mapping for '||p_module_code||'/'||p_event_code||'/'||v_channel,
      'severity','critical','stage',v_target_stage));
    v_ready := false;
  ELSIF NOT v_mapping.active THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code','EVENT_MAPPING_NOT_ACTIVE',
      'message','Event mapping exists but is not active',
      'severity','critical','stage',v_target_stage));
    v_ready := false;
  END IF;

  IF v_mapping.id IS NOT NULL THEN
    v_template_id := v_mapping.template_id;
    IF v_template_id IS NULL THEN
      SELECT id INTO v_template_id FROM public.core_template
       WHERE template_code = v_mapping.template_code LIMIT 1;
    END IF;

    IF v_template_id IS NOT NULL THEN
      SELECT * INTO v_version
        FROM public.core_template_version
       WHERE template_id = v_template_id
       ORDER BY (status = 'active') DESC, version_no DESC
       LIMIT 1;

      IF v_version.id IS NULL THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
          'code','TEMPLATE_VERSION_NOT_ACTIVE',
          'message','No template version found for template',
          'severity','critical','stage',v_target_stage));
        v_ready := false;
      ELSE
        v_version_id := v_version.id;
        IF LOWER(COALESCE(v_version.status,'')) NOT IN ('active','approved_internal','approved_external') THEN
          v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
            'code','TEMPLATE_VERSION_NOT_ACTIVE',
            'message','Template version status is ' || COALESCE(v_version.status,'null'),
            'severity','critical','stage',v_target_stage));
          v_ready := false;
        END IF;
      END IF;
    END IF;
  END IF;

  IF v_version_id IS NOT NULL THEN
    SELECT * INTO v_gov
      FROM public.comm_hub_governance_record
     WHERE entity_type = 'TEMPLATE_VERSION'::comm_hub_governance_entity_type
       AND entity_id   = v_version_id
     ORDER BY governance_version DESC
     LIMIT 1;

    IF v_gov.id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'code','GOVERNANCE_RECORD_MISSING',
        'message','No governance record exists for this template version',
        'severity','critical','stage',v_target_stage));
      v_ready := false;
    END IF;

    SELECT c.* INTO v_cert
      FROM public.comm_hub_certification c
     WHERE c.entity_type = 'TEMPLATE_VERSION'::comm_hub_governance_entity_type
       AND c.entity_id   = v_version_id
       AND c.result      = 'PASS'
       AND c.superseded_by IS NULL
     ORDER BY c.certified_at DESC
     LIMIT 1;

    IF v_cert.id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'code','TEMPLATE_VERSION_NOT_CERTIFIED',
        'message','No current PASS certification exists for this template version',
        'severity','critical','stage',v_target_stage));
      v_ready := false;
    ELSE
      BEGIN
        v_manifest := public.build_comm_hub_dependency_manifest(
          'TEMPLATE_VERSION', v_version_id, v_version_id
        );
      EXCEPTION WHEN others THEN
        v_manifest := NULL;
      END;
      IF v_manifest IS NOT NULL THEN
        v_current_hash := public.compute_comm_hub_dependency_hash(v_manifest);
      END IF;

      SELECT * INTO v_fresh
        FROM public.comm_hub_certification_freshness
       WHERE certification_id = v_cert.id;

      IF v_cert.is_stale
         OR (v_current_hash IS NOT NULL AND v_current_hash <> v_cert.dependency_hash)
         OR (v_fresh.freshness_status IS NOT NULL AND v_fresh.freshness_status IN ('STALE','SUPERSEDED')) THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
          'code',
            CASE WHEN v_fresh.freshness_status = 'SUPERSEDED'
                 THEN 'GOVERNANCE_CERTIFICATION_SUPERSEDED'
                 ELSE 'TEMPLATE_CERTIFICATION_STALE' END,
          'message','The template certification is stale. Recertify before continuing.',
          'severity','critical','stage',v_target_stage,
          'changed_categories', COALESCE(v_fresh.changed_dependency_categories, ARRAY[]::text[])
        ));
        v_ready := false;
      END IF;
    END IF;
  END IF;

  IF v_target_stage IN ('PREVIEW_APPROVAL','DRY_RUN_TEST','CONTROLLED_STUB') THEN
    IF p_preview_snapshot_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'code','PREVIEW_SNAPSHOT_REQUIRED',
        'message','This stage requires an existing Preview snapshot id',
        'severity','critical','stage',v_target_stage));
      v_ready := false;
    ELSE
      SELECT * INTO v_snapshot FROM public.communication_preview_snapshot
        WHERE id = p_preview_snapshot_id;
      IF v_snapshot.id IS NULL THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
          'code','PREVIEW_SNAPSHOT_NOT_FOUND',
          'message','Preview snapshot not found',
          'severity','critical','stage',v_target_stage));
        v_ready := false;
      ELSE
        IF v_cert.id IS NOT NULL
           AND v_snapshot.governance_certification_id IS NOT NULL
           AND v_snapshot.governance_certification_id <> v_cert.id THEN
          v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
            'code','GOVERNANCE_CERTIFICATION_SUPERSEDED',
            'message','A newer certification exists. Prepare and approve a new Preview.',
            'severity','critical','stage',v_target_stage));
          v_ready := false;
        END IF;
        IF v_current_hash IS NOT NULL
           AND v_snapshot.certified_dependency_hash IS NOT NULL
           AND v_snapshot.certified_dependency_hash <> v_current_hash THEN
          v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
            'code','DEPENDENCY_HASH_MISMATCH',
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
      'message','Release certification model for '||v_target_stage||' is delivered in later B3 slices.'
    ));
    IF NOT EXISTS (
      SELECT 1 FROM public.comm_hub_event_release_certification r
       WHERE r.module_code = p_module_code
         AND r.event_code  = p_event_code
         AND r.channel     = v_channel
         AND r.certification_kind = v_target_stage
    ) THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'code',
          CASE v_target_stage
            WHEN 'AUTOMATED_PRODUCTION' THEN 'AUTOMATION_GOVERNANCE_EVIDENCE_INCOMPLETE'
            ELSE 'GOVERNANCE_EVIDENCE_INCOMPLETE' END,
        'message','No release certification for stage '||v_target_stage,
        'severity','critical','stage',v_target_stage));
      v_ready := false;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ready', v_ready,
    'target_stage', v_target_stage,
    'module_code', p_module_code,
    'event_code',  p_event_code,
    'channel',     v_channel,
    'event_template_map_id', v_mapping.id,
    'mapping_active', COALESCE(v_mapping.active, false),
    'template_id', v_template_id,
    'template_version_id', v_version_id,
    'template_version_status', v_version.status,
    'governance_record_id', v_gov.id,
    'governance_status', v_gov.governance_status,
    'certification_id', v_cert.id,
    'certification_kind', v_cert.certification_kind,
    'certified_dependency_hash', v_cert.dependency_hash,
    'current_dependency_hash', v_current_hash,
    'certification_freshness',
      COALESCE(v_fresh.freshness_status,
               CASE WHEN v_cert.is_stale THEN 'STALE' ELSE 'CURRENT' END,
               'NOT_EVALUATED'),
    'changed_dependency_categories',
      COALESCE(v_fresh.changed_dependency_categories, ARRAY[]::text[]),
    'blockers', v_blockers,
    'warnings', v_warnings,
    'recommended_actions', v_actions,
    'source', 'check_comm_hub_runtime_governance',
    'evaluator_version', '4b3.slice1',
    'evaluated_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_comm_hub_runtime_governance(
  text,text,text,text,uuid,uuid,uuid
) TO authenticated;

NOTIFY pgrst, 'reload schema';
