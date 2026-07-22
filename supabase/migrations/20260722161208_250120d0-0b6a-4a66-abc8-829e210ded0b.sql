
DO $$ BEGIN
  CREATE TYPE public.comm_hub_governance_entity_type AS ENUM (
    'TEMPLATE_VERSION','TEMPLATE_VARIABLE_CONTRACT','EVENT_PAYLOAD_SCHEMA',
    'EVENT_TEMPLATE_MAPPING','TEST_SCENARIO','SENDER_CONFIGURATION',
    'EVENT_RELEASE_CERTIFICATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.comm_hub_template_lifecycle AS ENUM (
  'DRAFT','DISCOVERED','VALIDATED','CERTIFIED','ACTIVE','RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.comm_hub_contract_lifecycle AS ENUM (
  'DRAFT','DISCOVERED','VALIDATED','ENFORCED','RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.comm_hub_schema_lifecycle AS ENUM (
  'DRAFT','DISCOVERED','VALIDATED','ENFORCED','RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.comm_hub_mapping_lifecycle AS ENUM (
  'DRAFT','VALIDATED','CERTIFIED','ACTIVE','RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.comm_hub_scenario_lifecycle AS ENUM (
  'DRAFT','SCHEMA_VALID','TEMPLATE_COMPATIBLE','FULLY_RENDERABLE','ACTIVE','RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.comm_hub_release_lifecycle AS ENUM (
  'NOT_CERTIFIED','CONTROLLED_STUB_CERTIFIED','MANUAL_PRODUCTION_CERTIFIED',
  'AUTOMATED_PRODUCTION_CERTIFIED','STALE','SUSPENDED','RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.comm_hub_sender_readiness_state AS ENUM (
  'BLOCKED','TEST_READY','REAL_EMAIL_READY','STALE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.comm_hub_governance_action AS ENUM (
  'VALIDATE','CERTIFY','ACTIVATE','ENFORCE','RETIRE','RECERTIFY',
  'MARK_STALE','SUSPEND','RESUME','CORRECTION_TO_DRAFT','CORRECTION_TO_VALIDATED',
  'BACKFILL_DISCOVER','READINESS_UPDATE','ASSESS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.comm_hub_governance_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.comm_hub_governance_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  entity_version text NOT NULL DEFAULT '1',
  governance_status text NOT NULL,
  governance_version bigint NOT NULL DEFAULT 1,
  validation_status text, certification_status text, enforcement_status text,
  dependency_hash text, dependency_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_stale boolean NOT NULL DEFAULT false, stale_reason text, stale_detected_at timestamptz,
  last_validated_at timestamptz, last_certified_at timestamptz,
  validated_by uuid, certified_by uuid, activated_by uuid, retired_by uuid,
  reason text, classification text, correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid,
  CONSTRAINT comm_hub_governance_record_unique_entity UNIQUE (entity_type, entity_id, entity_version)
);
CREATE INDEX IF NOT EXISTS idx_chg_record_entity ON public.comm_hub_governance_record (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_chg_record_status ON public.comm_hub_governance_record (entity_type, governance_status);
CREATE INDEX IF NOT EXISTS idx_chg_record_stale  ON public.comm_hub_governance_record (is_stale) WHERE is_stale IS TRUE;
GRANT SELECT ON public.comm_hub_governance_record TO authenticated;
GRANT ALL ON public.comm_hub_governance_record TO service_role;
ALTER TABLE public.comm_hub_governance_record ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chg_record_admin_read ON public.comm_hub_governance_record;
CREATE POLICY chg_record_admin_read ON public.comm_hub_governance_record FOR SELECT TO authenticated
  USING (public.is_comm_hub_operator_admin(auth.uid())
         OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='Admin'));

CREATE OR REPLACE FUNCTION public.comm_hub_governance_status_is_valid(
  p_entity_type public.comm_hub_governance_entity_type, p_status text
) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_ok boolean := false;
BEGIN
  IF p_status IS NULL THEN RETURN false; END IF;
  BEGIN
    CASE p_entity_type
      WHEN 'TEMPLATE_VERSION'            THEN PERFORM p_status::public.comm_hub_template_lifecycle;
      WHEN 'TEMPLATE_VARIABLE_CONTRACT'  THEN PERFORM p_status::public.comm_hub_contract_lifecycle;
      WHEN 'EVENT_PAYLOAD_SCHEMA'        THEN PERFORM p_status::public.comm_hub_schema_lifecycle;
      WHEN 'EVENT_TEMPLATE_MAPPING'      THEN PERFORM p_status::public.comm_hub_mapping_lifecycle;
      WHEN 'TEST_SCENARIO'               THEN PERFORM p_status::public.comm_hub_scenario_lifecycle;
      WHEN 'SENDER_CONFIGURATION'        THEN PERFORM p_status::public.comm_hub_sender_readiness_state;
      WHEN 'EVENT_RELEASE_CERTIFICATION' THEN PERFORM p_status::public.comm_hub_release_lifecycle;
    END CASE;
    v_ok := true;
  EXCEPTION WHEN OTHERS THEN v_ok := false;
  END;
  RETURN v_ok;
END $$;

ALTER TABLE public.comm_hub_governance_record DROP CONSTRAINT IF EXISTS chg_record_status_matches_entity;
ALTER TABLE public.comm_hub_governance_record ADD CONSTRAINT chg_record_status_matches_entity
  CHECK (public.comm_hub_governance_status_is_valid(entity_type, governance_status));

CREATE TABLE IF NOT EXISTS public.comm_hub_certification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  governance_record_id uuid NOT NULL REFERENCES public.comm_hub_governance_record(id),
  entity_type public.comm_hub_governance_entity_type NOT NULL,
  entity_id uuid NOT NULL, entity_version text NOT NULL,
  certification_kind text NOT NULL, result text NOT NULL,
  dependency_manifest jsonb NOT NULL, dependency_hash text NOT NULL,
  renderer_version text, template_purpose text, channel text, template_type text,
  validation_findings jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_count integer NOT NULL DEFAULT 0, warning_count integer NOT NULL DEFAULT 0,
  certified_by uuid, certified_at timestamptz NOT NULL DEFAULT now(),
  certification_reason text NOT NULL,
  is_stale boolean NOT NULL DEFAULT false, stale_reason text, stale_detected_at timestamptz,
  superseded_by uuid REFERENCES public.comm_hub_certification(id),
  correlation_id uuid
);
CREATE INDEX IF NOT EXISTS idx_chg_cert_entity ON public.comm_hub_certification (entity_type, entity_id, entity_version);
CREATE INDEX IF NOT EXISTS idx_chg_cert_gov    ON public.comm_hub_certification (governance_record_id);
CREATE INDEX IF NOT EXISTS idx_chg_cert_stale  ON public.comm_hub_certification (is_stale) WHERE is_stale IS TRUE;
GRANT SELECT ON public.comm_hub_certification TO authenticated;
GRANT ALL ON public.comm_hub_certification TO service_role;
ALTER TABLE public.comm_hub_certification ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chg_cert_admin_read ON public.comm_hub_certification;
CREATE POLICY chg_cert_admin_read ON public.comm_hub_certification FOR SELECT TO authenticated
  USING (public.is_comm_hub_operator_admin(auth.uid())
         OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='Admin'));

CREATE OR REPLACE FUNCTION public.trg_comm_hub_certification_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='COMM_HUB_CERTIFICATION_DELETE_FORBIDDEN';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.governance_record_id IS DISTINCT FROM OLD.governance_record_id
       OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
       OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
       OR NEW.entity_version IS DISTINCT FROM OLD.entity_version
       OR NEW.certification_kind IS DISTINCT FROM OLD.certification_kind
       OR NEW.result IS DISTINCT FROM OLD.result
       OR NEW.dependency_manifest::text IS DISTINCT FROM OLD.dependency_manifest::text
       OR NEW.dependency_hash IS DISTINCT FROM OLD.dependency_hash
       OR NEW.renderer_version IS DISTINCT FROM OLD.renderer_version
       OR NEW.template_purpose IS DISTINCT FROM OLD.template_purpose
       OR NEW.channel IS DISTINCT FROM OLD.channel
       OR NEW.template_type IS DISTINCT FROM OLD.template_type
       OR NEW.validation_findings::text IS DISTINCT FROM OLD.validation_findings::text
       OR NEW.error_count IS DISTINCT FROM OLD.error_count
       OR NEW.warning_count IS DISTINCT FROM OLD.warning_count
       OR NEW.certified_by IS DISTINCT FROM OLD.certified_by
       OR NEW.certified_at IS DISTINCT FROM OLD.certified_at
       OR NEW.certification_reason IS DISTINCT FROM OLD.certification_reason
       OR NEW.correlation_id IS DISTINCT FROM OLD.correlation_id THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='COMM_HUB_CERTIFICATION_IMMUTABLE';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_chg_certification_immutable ON public.comm_hub_certification;
CREATE TRIGGER trg_chg_certification_immutable
  BEFORE UPDATE OR DELETE ON public.comm_hub_certification
  FOR EACH ROW EXECUTE FUNCTION public.trg_comm_hub_certification_immutable();

CREATE TABLE IF NOT EXISTS public.comm_hub_governance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  governance_record_id uuid REFERENCES public.comm_hub_governance_record(id),
  certification_id uuid REFERENCES public.comm_hub_certification(id),
  entity_type public.comm_hub_governance_entity_type NOT NULL,
  entity_id uuid NOT NULL, entity_version text NOT NULL,
  action public.comm_hub_governance_action NOT NULL,
  previous_status text, new_status text, actor uuid, reason text,
  governance_version bigint, dependency_hash text, correlation_id uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  audited_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chg_audit_entity ON public.comm_hub_governance_audit (entity_type, entity_id, entity_version);
CREATE INDEX IF NOT EXISTS idx_chg_audit_correlation ON public.comm_hub_governance_audit (correlation_id);
GRANT SELECT ON public.comm_hub_governance_audit TO authenticated;
GRANT ALL ON public.comm_hub_governance_audit TO service_role;
ALTER TABLE public.comm_hub_governance_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chg_audit_admin_read ON public.comm_hub_governance_audit;
CREATE POLICY chg_audit_admin_read ON public.comm_hub_governance_audit FOR SELECT TO authenticated
  USING (public.is_comm_hub_operator_admin(auth.uid())
         OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='Admin'));

CREATE TABLE IF NOT EXISTS public.comm_hub_sender_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id uuid NOT NULL, sender_version text NOT NULL DEFAULT '1',
  readiness_state public.comm_hub_sender_readiness_state NOT NULL,
  readiness_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  is_stale boolean NOT NULL DEFAULT false, stale_reason text,
  UNIQUE (sender_profile_id, sender_version)
);
GRANT SELECT ON public.comm_hub_sender_readiness TO authenticated;
GRANT ALL ON public.comm_hub_sender_readiness TO service_role;
ALTER TABLE public.comm_hub_sender_readiness ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chg_sender_admin_read ON public.comm_hub_sender_readiness;
CREATE POLICY chg_sender_admin_read ON public.comm_hub_sender_readiness FOR SELECT TO authenticated
  USING (public.is_comm_hub_operator_admin(auth.uid())
         OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='Admin'));

CREATE TABLE IF NOT EXISTS public.comm_hub_event_release_certification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL, event_code text NOT NULL, channel text NOT NULL,
  release_status public.comm_hub_release_lifecycle NOT NULL DEFAULT 'NOT_CERTIFIED',
  latest_certification_id uuid REFERENCES public.comm_hub_certification(id),
  latest_dependency_hash text,
  is_stale boolean NOT NULL DEFAULT false, stale_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
  UNIQUE (module_code, event_code, channel)
);
GRANT SELECT ON public.comm_hub_event_release_certification TO authenticated;
GRANT ALL ON public.comm_hub_event_release_certification TO service_role;
ALTER TABLE public.comm_hub_event_release_certification ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chg_release_admin_read ON public.comm_hub_event_release_certification;
CREATE POLICY chg_release_admin_read ON public.comm_hub_event_release_certification FOR SELECT TO authenticated
  USING (public.is_comm_hub_operator_admin(auth.uid())
         OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='Admin'));

CREATE OR REPLACE FUNCTION public.comm_hub_governance_is_valid_transition(
  p_entity_type public.comm_hub_governance_entity_type, p_from text, p_to text
) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_forward jsonb; v_correction jsonb;
BEGIN
  IF p_from IS NULL OR p_to IS NULL THEN RETURN false; END IF;
  IF p_from = p_to THEN RETURN false; END IF;
  v_forward := CASE p_entity_type
    WHEN 'TEMPLATE_VERSION' THEN jsonb_build_object(
      'DRAFT',ARRAY['DISCOVERED'],'DISCOVERED',ARRAY['VALIDATED'],
      'VALIDATED',ARRAY['CERTIFIED'],'CERTIFIED',ARRAY['ACTIVE'],'ACTIVE',ARRAY['RETIRED'])
    WHEN 'TEMPLATE_VARIABLE_CONTRACT' THEN jsonb_build_object(
      'DRAFT',ARRAY['DISCOVERED'],'DISCOVERED',ARRAY['VALIDATED'],
      'VALIDATED',ARRAY['ENFORCED'],'ENFORCED',ARRAY['RETIRED'])
    WHEN 'EVENT_PAYLOAD_SCHEMA' THEN jsonb_build_object(
      'DRAFT',ARRAY['DISCOVERED'],'DISCOVERED',ARRAY['VALIDATED'],
      'VALIDATED',ARRAY['ENFORCED'],'ENFORCED',ARRAY['RETIRED'])
    WHEN 'EVENT_TEMPLATE_MAPPING' THEN jsonb_build_object(
      'DRAFT',ARRAY['VALIDATED'],'VALIDATED',ARRAY['CERTIFIED'],
      'CERTIFIED',ARRAY['ACTIVE'],'ACTIVE',ARRAY['RETIRED'])
    WHEN 'TEST_SCENARIO' THEN jsonb_build_object(
      'DRAFT',ARRAY['SCHEMA_VALID'],'SCHEMA_VALID',ARRAY['TEMPLATE_COMPATIBLE'],
      'TEMPLATE_COMPATIBLE',ARRAY['FULLY_RENDERABLE'],
      'FULLY_RENDERABLE',ARRAY['ACTIVE'],'ACTIVE',ARRAY['RETIRED'])
    WHEN 'SENDER_CONFIGURATION' THEN jsonb_build_object(
      'BLOCKED',ARRAY['TEST_READY','STALE'],
      'TEST_READY',ARRAY['REAL_EMAIL_READY','STALE','BLOCKED'],
      'REAL_EMAIL_READY',ARRAY['STALE','BLOCKED','TEST_READY'],
      'STALE',ARRAY['BLOCKED','TEST_READY','REAL_EMAIL_READY'])
    WHEN 'EVENT_RELEASE_CERTIFICATION' THEN jsonb_build_object(
      'NOT_CERTIFIED',ARRAY['CONTROLLED_STUB_CERTIFIED'],
      'CONTROLLED_STUB_CERTIFIED',ARRAY['MANUAL_PRODUCTION_CERTIFIED','STALE','SUSPENDED','RETIRED'],
      'MANUAL_PRODUCTION_CERTIFIED',ARRAY['AUTOMATED_PRODUCTION_CERTIFIED','STALE','SUSPENDED','RETIRED'],
      'AUTOMATED_PRODUCTION_CERTIFIED',ARRAY['STALE','SUSPENDED','RETIRED'],
      'STALE',ARRAY['CONTROLLED_STUB_CERTIFIED','SUSPENDED','RETIRED'],
      'SUSPENDED',ARRAY['CONTROLLED_STUB_CERTIFIED','RETIRED'])
  END;
  v_correction := CASE p_entity_type
    WHEN 'TEMPLATE_VERSION' THEN jsonb_build_object(
      'DISCOVERED',ARRAY['DRAFT'],'VALIDATED',ARRAY['DRAFT'],'CERTIFIED',ARRAY['VALIDATED'])
    WHEN 'TEMPLATE_VARIABLE_CONTRACT' THEN jsonb_build_object('DISCOVERED',ARRAY['DRAFT'],'VALIDATED',ARRAY['DRAFT'])
    WHEN 'EVENT_PAYLOAD_SCHEMA' THEN jsonb_build_object('DISCOVERED',ARRAY['DRAFT'],'VALIDATED',ARRAY['DRAFT'])
    WHEN 'EVENT_TEMPLATE_MAPPING' THEN jsonb_build_object('VALIDATED',ARRAY['DRAFT'],'CERTIFIED',ARRAY['VALIDATED'])
    WHEN 'TEST_SCENARIO' THEN jsonb_build_object(
      'SCHEMA_VALID',ARRAY['DRAFT'],'TEMPLATE_COMPATIBLE',ARRAY['SCHEMA_VALID'],
      'FULLY_RENDERABLE',ARRAY['TEMPLATE_COMPATIBLE'])
    ELSE '{}'::jsonb
  END;
  IF v_forward ? p_from AND (v_forward->p_from) @> to_jsonb(p_to) THEN RETURN true; END IF;
  IF v_correction ? p_from AND (v_correction->p_from) @> to_jsonb(p_to) THEN RETURN true; END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.trg_comm_hub_governance_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_via_core text := current_setting('comm_hub.governance_transition', true);
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='COMM_HUB_GOVERNANCE_DELETE_FORBIDDEN';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.governance_status NOT IN ('DRAFT','DISCOVERED','NOT_CERTIFIED','BLOCKED')
       AND COALESCE(v_via_core,'') <> 'on' THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='COMM_HUB_GOVERNANCE_INSERT_MUST_START_LOW';
    END IF;
    RETURN NEW;
  END IF;
  IF COALESCE(v_via_core,'') <> 'on' THEN
    IF OLD.governance_status IN ('ACTIVE','ENFORCED','RETIRED') THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='COMM_HUB_GOVERNANCE_ACTIVE_LOCKED';
    END IF;
    IF NEW.governance_status IS DISTINCT FROM OLD.governance_status
       OR NEW.governance_version IS DISTINCT FROM OLD.governance_version THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='COMM_HUB_GOVERNANCE_DIRECT_LIFECYCLE_WRITE_FORBIDDEN';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_chg_record_immutable ON public.comm_hub_governance_record;
CREATE TRIGGER trg_chg_record_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON public.comm_hub_governance_record
  FOR EACH ROW EXECUTE FUNCTION public.trg_comm_hub_governance_immutable();

CREATE OR REPLACE FUNCTION public._comm_hub_governance_transition_core(
  p_entity_type public.comm_hub_governance_entity_type,
  p_entity_id uuid, p_entity_version text, p_target_status text,
  p_expected_version bigint, p_reason text, p_actor uuid,
  p_action public.comm_hub_governance_action, p_source text DEFAULT 'transition_core'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_row public.comm_hub_governance_record%ROWTYPE;
  v_reason text := NULLIF(btrim(COALESCE(p_reason,'')), '');
  v_now timestamptz := now(); v_new_ver bigint;
  v_correlation uuid := gen_random_uuid();
BEGIN
  IF v_reason IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='GOVERNANCE_REASON_REQUIRED';
  END IF;
  IF char_length(v_reason) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='GOVERNANCE_REASON_TOO_LONG';
  END IF;
  SELECT * INTO v_row FROM public.comm_hub_governance_record
   WHERE entity_type=p_entity_type AND entity_id=p_entity_id AND entity_version=p_entity_version
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='GOVERNANCE_RECORD_NOT_FOUND';
  END IF;
  IF p_expected_version IS NOT NULL AND p_expected_version <> v_row.governance_version THEN
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='GOVERNANCE_VERSION_CONFLICT';
  END IF;
  IF NOT public.comm_hub_governance_is_valid_transition(p_entity_type, v_row.governance_status, p_target_status) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='GOVERNANCE_TRANSITION_NOT_ALLOWED';
  END IF;
  v_new_ver := v_row.governance_version + 1;
  PERFORM set_config('comm_hub.governance_transition','on', true);
  UPDATE public.comm_hub_governance_record
     SET governance_status = p_target_status, governance_version = v_new_ver,
         reason = v_reason, correlation_id = v_correlation,
         validated_by = CASE WHEN p_target_status IN ('VALIDATED','SCHEMA_VALID') THEN p_actor ELSE validated_by END,
         last_validated_at = CASE WHEN p_target_status IN ('VALIDATED','SCHEMA_VALID') THEN v_now ELSE last_validated_at END,
         validation_status = CASE WHEN p_target_status IN ('VALIDATED','SCHEMA_VALID','TEMPLATE_COMPATIBLE','FULLY_RENDERABLE') THEN 'VALIDATED' ELSE validation_status END,
         certified_by = CASE WHEN p_target_status IN ('CERTIFIED','FULLY_RENDERABLE') THEN p_actor ELSE certified_by END,
         last_certified_at = CASE WHEN p_target_status IN ('CERTIFIED','FULLY_RENDERABLE') THEN v_now ELSE last_certified_at END,
         certification_status = CASE WHEN p_target_status IN ('CERTIFIED','ACTIVE','ENFORCED') THEN 'CERTIFIED' ELSE certification_status END,
         enforcement_status = CASE WHEN p_target_status IN ('ENFORCED','ACTIVE') THEN 'ENFORCED' ELSE enforcement_status END,
         activated_by = CASE WHEN p_target_status IN ('ACTIVE','ENFORCED') THEN p_actor ELSE activated_by END,
         retired_by = CASE WHEN p_target_status='RETIRED' THEN p_actor ELSE retired_by END,
         is_stale = false, stale_reason = NULL, stale_detected_at = NULL, updated_by = p_actor
   WHERE id = v_row.id;
  PERFORM set_config('comm_hub.governance_transition','', true);
  INSERT INTO public.comm_hub_governance_audit (
    governance_record_id, entity_type, entity_id, entity_version,
    action, previous_status, new_status, actor, reason,
    governance_version, dependency_hash, correlation_id, detail
  ) VALUES (
    v_row.id, p_entity_type, p_entity_id, p_entity_version, p_action,
    v_row.governance_status, p_target_status, p_actor, v_reason,
    v_new_ver, v_row.dependency_hash, v_correlation,
    jsonb_build_object('source', p_source));
  RETURN jsonb_build_object('ok', true, 'previous_status', v_row.governance_status,
    'new_status', p_target_status, 'governance_version', v_new_ver, 'correlation_id', v_correlation);
END $$;

REVOKE EXECUTE ON FUNCTION public._comm_hub_governance_transition_core(
  public.comm_hub_governance_entity_type, uuid, text, text, bigint, text, uuid,
  public.comm_hub_governance_action, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._comm_hub_governance_transition_core(
  public.comm_hub_governance_entity_type, uuid, text, text, bigint, text, uuid,
  public.comm_hub_governance_action, text) TO service_role;

CREATE OR REPLACE FUNCTION public.comm_hub_governance_transition(
  p_entity_type text, p_entity_id uuid, p_entity_version text,
  p_target_status text, p_reason text,
  p_expected_version bigint DEFAULT NULL, p_action text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_uid uuid := auth.uid(); v_is_admin boolean := false;
  v_et public.comm_hub_governance_entity_type;
  v_act public.comm_hub_governance_action;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='authentication_required'; END IF;
  BEGIN v_is_admin := public.is_comm_hub_operator_admin(v_uid);
  EXCEPTION WHEN undefined_function THEN
    SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_uid AND role='Admin') INTO v_is_admin;
  END;
  IF NOT v_is_admin THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorised'; END IF;
  BEGIN v_et := p_entity_type::public.comm_hub_governance_entity_type;
  EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='unknown_entity_type'; END;
  BEGIN v_act := COALESCE(p_action,'VALIDATE')::public.comm_hub_governance_action;
  EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='unknown_governance_action'; END;
  RETURN public._comm_hub_governance_transition_core(
    v_et, p_entity_id, p_entity_version, p_target_status,
    p_expected_version, p_reason, v_uid, v_act, 'comm_hub_governance_transition');
END $$;

REVOKE EXECUTE ON FUNCTION public.comm_hub_governance_transition(text,uuid,text,text,text,bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.comm_hub_governance_transition(text,uuid,text,text,text,bigint,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.comm_hub_backfill_governance_assessment()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_uid uuid := auth.uid(); v_is_admin boolean := false;
  v_now timestamptz := now(); v_correlation uuid := gen_random_uuid();
  v_total int := 0; v_inserted int := 0; v_skipped int := 0;
  v_by_class jsonb := '{}'::jsonb; v_by_purpose jsonb := '{}'::jsonb;
BEGIN
  IF v_uid IS NOT NULL THEN
    BEGIN v_is_admin := public.is_comm_hub_operator_admin(v_uid);
    EXCEPTION WHEN OTHERS THEN
      SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_uid AND role='Admin') INTO v_is_admin;
    END;
    IF NOT v_is_admin THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorised'; END IF;
  END IF;
  WITH src AS (
    SELECT ctv.id AS version_id, COALESCE(ctv.version_no::text,'1') AS version_no,
           upper(ctv.status) AS pub_status,
           COALESCE(public.comm_hub_classify_template_purpose(ct.id), 'UNCLASSIFIED') AS purpose,
           EXISTS (SELECT 1 FROM public.communication_hub_event_template_map m
                    WHERE m.template_id = ct.id AND m.active IS TRUE) AS has_active_mapping
      FROM public.core_template_version ctv
      JOIN public.core_template ct ON ct.id = ctv.template_id
     WHERE upper(ctv.status) IN ('PUBLISHED','ACTIVE')
  ),
  classified AS (
    SELECT s.*,
           CASE
             WHEN s.purpose = 'EVENT_COMMUNICATION' AND NOT s.has_active_mapping THEN 'BLOCKED_CONFIGURATION'
             WHEN s.purpose = 'UNCLASSIFIED' THEN 'LEGACY_REVIEW_REQUIRED'
             WHEN s.purpose IN ('MANUAL_CORRESPONDENCE','DOCUMENT_GENERATION','FORM_OUTPUT') THEN 'NOT_APPLICABLE_TO_EVENT_MAPPING'
             ELSE 'LEGACY_ASSESSED_CERTIFIABLE'
           END AS classification
      FROM src s
  ),
  ins AS (
    INSERT INTO public.comm_hub_governance_record (
      entity_type, entity_id, entity_version, governance_status, governance_version,
      validation_status, certification_status, enforcement_status,
      dependency_manifest, is_stale, classification, reason,
      correlation_id, created_by, updated_by, created_at, updated_at)
    SELECT 'TEMPLATE_VERSION', c.version_id, c.version_no,
           'DISCOVERED', 1, 'PENDING','PENDING','PENDING',
           jsonb_build_object('legacy_backfill', true, 'template_purpose', c.purpose,
             'publishing_status', c.pub_status, 'has_active_mapping', c.has_active_mapping),
           false, c.classification,
           'Phase 4B Turn B1 legacy backfill from Phase 3 assessment',
           v_correlation, v_uid, v_uid, v_now, v_now
      FROM classified c
    ON CONFLICT (entity_type, entity_id, entity_version) DO NOTHING
    RETURNING id
  )
  SELECT (SELECT count(*) FROM classified), (SELECT count(*) FROM ins),
         (SELECT jsonb_object_agg(classification, cnt) FROM (SELECT classification, count(*)::int AS cnt FROM classified GROUP BY 1) t),
         (SELECT jsonb_object_agg(purpose, cnt)        FROM (SELECT purpose,        count(*)::int AS cnt FROM classified GROUP BY 1) t)
  INTO v_total, v_inserted, v_by_class, v_by_purpose;
  v_skipped := v_total - v_inserted;
  INSERT INTO public.comm_hub_governance_audit (
    entity_type, entity_id, entity_version, action, previous_status, new_status,
    actor, reason, correlation_id, detail
  ) VALUES (
    'TEMPLATE_VERSION', '00000000-0000-0000-0000-000000000000'::uuid, 'BULK',
    'BACKFILL_DISCOVER', NULL, 'DISCOVERED', v_uid,
    'Phase 4B Turn B1 legacy backfill', v_correlation,
    jsonb_build_object('total_candidates', v_total, 'inserted', v_inserted,
      'skipped_existing', v_skipped,
      'by_classification', COALESCE(v_by_class,'{}'::jsonb),
      'by_template_purpose', COALESCE(v_by_purpose,'{}'::jsonb)));
  RETURN jsonb_build_object('ok', true, 'total_candidates', v_total, 'inserted', v_inserted,
    'skipped_existing', v_skipped, 'by_classification', COALESCE(v_by_class,'{}'::jsonb),
    'by_template_purpose', COALESCE(v_by_purpose,'{}'::jsonb), 'correlation_id', v_correlation);
END $$;

REVOKE EXECUTE ON FUNCTION public.comm_hub_backfill_governance_assessment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.comm_hub_backfill_governance_assessment() TO authenticated, service_role;

SELECT public.comm_hub_backfill_governance_assessment();

-- Deterministic tests. Reset the GUC between phases.
DO $$
DECLARE
  v_test_id uuid := gen_random_uuid(); v_result jsonb; v_before bigint;
  v_test_id_2 uuid := gen_random_uuid();
BEGIN
  -- Seed DRAFT
  INSERT INTO public.comm_hub_governance_record (entity_type, entity_id, entity_version, governance_status, governance_version, reason)
  VALUES ('TEMPLATE_VERSION', v_test_id, 'test', 'DRAFT', 1, 'test seed');

  -- Forward
  v_result := public._comm_hub_governance_transition_core('TEMPLATE_VERSION', v_test_id, 'test', 'DISCOVERED', 1, 'test discover', NULL, 'VALIDATE', 'test');
  IF (v_result->>'new_status') <> 'DISCOVERED' THEN RAISE EXCEPTION 'TEST FAIL: forward'; END IF;

  SELECT governance_version INTO v_before FROM public.comm_hub_governance_record
   WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_test_id AND entity_version='test';

  -- Illegal transition
  BEGIN
    PERFORM public._comm_hub_governance_transition_core('TEMPLATE_VERSION', v_test_id, 'test', 'ACTIVE', v_before, 'illegal', NULL, 'ACTIVATE', 'test');
    RAISE EXCEPTION 'TEST FAIL: illegal transition';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'GOVERNANCE_TRANSITION_NOT_ALLOWED' THEN RAISE EXCEPTION 'TEST FAIL: expected NOT_ALLOWED got %', SQLERRM; END IF;
  END;

  -- Empty reason
  BEGIN
    PERFORM public._comm_hub_governance_transition_core('TEMPLATE_VERSION', v_test_id, 'test', 'VALIDATED', v_before, '   ', NULL, 'VALIDATE', 'test');
    RAISE EXCEPTION 'TEST FAIL: empty reason';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'GOVERNANCE_REASON_REQUIRED' THEN RAISE EXCEPTION 'TEST FAIL: expected REASON got %', SQLERRM; END IF;
  END;

  -- Version conflict
  BEGIN
    PERFORM public._comm_hub_governance_transition_core('TEMPLATE_VERSION', v_test_id, 'test', 'VALIDATED', v_before + 99, 'ver', NULL, 'VALIDATE', 'test');
    RAISE EXCEPTION 'TEST FAIL: version conflict';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'GOVERNANCE_VERSION_CONFLICT' THEN RAISE EXCEPTION 'TEST FAIL: expected VERSION_CONFLICT got %', SQLERRM; END IF;
  END;

  -- Happy path DISCOVERED -> VALIDATED -> CERTIFIED -> ACTIVE
  v_result := public._comm_hub_governance_transition_core('TEMPLATE_VERSION', v_test_id, 'test', 'VALIDATED', v_before, 'v', NULL, 'VALIDATE', 't');
  v_result := public._comm_hub_governance_transition_core('TEMPLATE_VERSION', v_test_id, 'test', 'CERTIFIED', (v_result->>'governance_version')::bigint, 'c', NULL, 'CERTIFY', 't');
  v_result := public._comm_hub_governance_transition_core('TEMPLATE_VERSION', v_test_id, 'test', 'ACTIVE', (v_result->>'governance_version')::bigint, 'a', NULL, 'ACTIVATE', 't');
  IF (v_result->>'new_status') <> 'ACTIVE' THEN RAISE EXCEPTION 'TEST FAIL: happy path'; END IF;

  -- Explicitly clear the GUC left by the last core call
  PERFORM set_config('comm_hub.governance_transition','', true);

  -- Direct update on ACTIVE row must fail
  BEGIN
    UPDATE public.comm_hub_governance_record SET governance_status='RETIRED', governance_version=governance_version+1
     WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_test_id AND entity_version='test';
    RAISE EXCEPTION 'TEST FAIL: direct update on ACTIVE not blocked';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT IN ('COMM_HUB_GOVERNANCE_ACTIVE_LOCKED','COMM_HUB_GOVERNANCE_DIRECT_LIFECYCLE_WRITE_FORBIDDEN') THEN
      RAISE EXCEPTION 'TEST FAIL: expected LOCKED got %', SQLERRM; END IF;
  END;

  -- Delete must fail
  BEGIN
    DELETE FROM public.comm_hub_governance_record
     WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_test_id AND entity_version='test';
    RAISE EXCEPTION 'TEST FAIL: delete not blocked';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'COMM_HUB_GOVERNANCE_DELETE_FORBIDDEN' THEN
      RAISE EXCEPTION 'TEST FAIL: expected DELETE_FORBIDDEN got %', SQLERRM; END IF;
  END;

  -- Direct INSERT of high-status row must fail
  BEGIN
    INSERT INTO public.comm_hub_governance_record (entity_type, entity_id, entity_version, governance_status, governance_version, reason)
    VALUES ('TEMPLATE_VERSION', v_test_id_2, 'test2', 'ACTIVE', 1, 'illegal seed');
    RAISE EXCEPTION 'TEST FAIL: direct INSERT of ACTIVE not blocked';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'COMM_HUB_GOVERNANCE_INSERT_MUST_START_LOW' THEN
      RAISE EXCEPTION 'TEST FAIL: expected INSERT_MUST_START_LOW got %', SQLERRM; END IF;
  END;

  -- Certification immutability
  INSERT INTO public.comm_hub_certification (
    governance_record_id, entity_type, entity_id, entity_version, certification_kind,
    result, dependency_manifest, dependency_hash, certified_by, certification_reason)
  SELECT id, entity_type, entity_id, entity_version, 'STANDARD','PASS',
         '{"phase":"4b_test"}'::jsonb, md5('phase-4b-test'), NULL, 'test certification'
    FROM public.comm_hub_governance_record
   WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_test_id AND entity_version='test';

  BEGIN
    UPDATE public.comm_hub_certification SET dependency_hash='changed' WHERE entity_id=v_test_id;
    RAISE EXCEPTION 'TEST FAIL: certification mutation not blocked';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'COMM_HUB_CERTIFICATION_IMMUTABLE' THEN
      RAISE EXCEPTION 'TEST FAIL: expected CERTIFICATION_IMMUTABLE got %', SQLERRM; END IF;
  END;

  UPDATE public.comm_hub_certification
     SET is_stale=true, stale_reason='test stale', stale_detected_at=now()
   WHERE entity_id=v_test_id;
END $$;

NOTIFY pgrst, 'reload schema';
