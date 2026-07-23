
-- ---------- 1. Keyword allowlist scanner (recursive CTE) --------------
CREATE OR REPLACE FUNCTION public.comm_hub_json_schema_subset_scan_keywords(p_schema jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  WITH RECURSIVE
  allow(kw) AS (
    VALUES ('type'),('required'),('properties'),('items'),('enum'),('const'),
           ('minimum'),('maximum'),('minLength'),('maxLength'),('pattern'),
           ('additionalProperties'),('format'),
           ('title'),('description'),('examples'),('$schema'),('$comment'),('default')
  ),
  walker(node, path) AS (
    SELECT p_schema, '#'::text
    UNION ALL
    SELECT sub.node, sub.path FROM walker w
    CROSS JOIN LATERAL (
      SELECT (e.value) AS node, w.path || '/properties/' || e.key AS path
      FROM jsonb_each(w.node -> 'properties') e
      WHERE jsonb_typeof(w.node)='object' AND jsonb_typeof(w.node -> 'properties')='object'
      UNION ALL
      SELECT w.node -> 'items', w.path || '/items'
      WHERE jsonb_typeof(w.node)='object' AND jsonb_typeof(w.node -> 'items')='object'
      UNION ALL
      SELECT w.node -> 'additionalProperties', w.path || '/additionalProperties'
      WHERE jsonb_typeof(w.node)='object' AND jsonb_typeof(w.node -> 'additionalProperties')='object'
    ) sub
  ),
  bad AS (
    SELECT k.key AS keyword, w.path AS schema_path FROM walker w
    JOIN LATERAL jsonb_object_keys(w.node) k(key) ON jsonb_typeof(w.node)='object'
    WHERE k.key NOT IN (SELECT kw FROM allow)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('keyword',keyword,'schema_path',schema_path)),'[]'::jsonb) FROM bad;
$$;
REVOKE ALL ON FUNCTION public.comm_hub_json_schema_subset_scan_keywords(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.comm_hub_json_schema_subset_scan_keywords(jsonb) TO service_role;

-- ---------- 2. type + format helpers ---------------------------------
CREATE OR REPLACE FUNCTION public._comm_hub_jval_type(p_val jsonb)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE jsonb_typeof(p_val)
    WHEN 'string' THEN 'string'
    WHEN 'number' THEN CASE WHEN (p_val::text ~ '^-?\d+$') THEN 'integer' ELSE 'number' END
    WHEN 'boolean' THEN 'boolean' WHEN 'object' THEN 'object'
    WHEN 'array' THEN 'array' WHEN 'null' THEN 'null' END
$$;

CREATE OR REPLACE FUNCTION public._comm_hub_jval_format(p_format text, p_value text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_format
    WHEN 'date' THEN p_value ~ '^\d{4}-\d{2}-\d{2}$'
    WHEN 'date-time' THEN p_value ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
    WHEN 'email' THEN p_value ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    WHEN 'uuid'  THEN p_value ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    ELSE NULL END
$$;

-- ---------- 3. Recursive validator ----------------------------------
CREATE OR REPLACE FUNCTION public._comm_hub_jval_walk(
  p_sch jsonb, p_val jsonb, p_ipath text, p_spath text
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE
  v_errors jsonb := '[]'::jsonb;
  v_actual text; v_types text[]; v_type_text text; v_type_ok boolean;
  v_r text; v_prop_key text; v_prop_schema jsonb;
  v_addl jsonb; v_extra_key text;
  v_num numeric; v_i int; v_sub jsonb;
BEGIN
  v_actual := public._comm_hub_jval_type(p_val);
  IF p_sch ? 'type' THEN
    IF jsonb_typeof(p_sch->'type')='string' THEN v_types := ARRAY[p_sch->>'type'];
    ELSE SELECT array_agg(x#>>'{}') INTO v_types FROM jsonb_array_elements(p_sch->'type') x; END IF;
    v_type_ok := FALSE;
    FOREACH v_type_text IN ARRAY v_types LOOP
      IF v_type_text=v_actual OR (v_type_text='number' AND v_actual='integer') THEN v_type_ok:=TRUE; EXIT; END IF;
    END LOOP;
    IF NOT v_type_ok THEN
      RETURN jsonb_build_array(jsonb_build_object(
        'code','type_mismatch','instance_path',p_ipath,'schema_path',p_spath||'/type',
        'keyword','type','expected',array_to_string(v_types,'|'),'actual_type',v_actual,
        'message','value does not match declared type'));
    END IF;
  END IF;
  IF v_actual='null' THEN RETURN v_errors; END IF;
  IF p_sch ? 'const' AND p_val <> p_sch->'const' THEN
    v_errors := v_errors || jsonb_build_object('code','const_mismatch','instance_path',p_ipath,
      'schema_path',p_spath||'/const','keyword','const','expected',p_sch->>'const','actual_type',v_actual);
  END IF;
  IF p_sch ? 'enum' THEN
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_sch->'enum') e WHERE e=p_val) THEN
      v_errors := v_errors || jsonb_build_object('code','enum_mismatch','instance_path',p_ipath,
        'schema_path',p_spath||'/enum','keyword','enum','expected',(p_sch->'enum')::text,'actual_type',v_actual);
    END IF;
  END IF;
  IF v_actual='object' THEN
    IF p_sch ? 'required' THEN
      FOR v_r IN SELECT jsonb_array_elements_text(p_sch->'required') LOOP
        IF NOT (p_val ? v_r) THEN
          v_errors := v_errors || jsonb_build_object('code','required_missing','instance_path',p_ipath||'/'||v_r,
            'schema_path',p_spath||'/required','keyword','required','expected',v_r,'actual_type','missing',
            'message','required field missing');
        END IF;
      END LOOP;
    END IF;
    IF p_sch ? 'properties' THEN
      FOR v_prop_key, v_prop_schema IN SELECT * FROM jsonb_each(p_sch->'properties') LOOP
        IF p_val ? v_prop_key THEN
          v_sub := public._comm_hub_jval_walk(v_prop_schema, p_val->v_prop_key,
            p_ipath||'/'||v_prop_key, p_spath||'/properties/'||v_prop_key);
          v_errors := v_errors || v_sub;
        END IF;
      END LOOP;
    END IF;
    IF p_sch ? 'additionalProperties' THEN
      v_addl := p_sch->'additionalProperties';
      FOR v_extra_key IN SELECT k FROM jsonb_object_keys(p_val) k LOOP
        IF NOT (COALESCE(p_sch->'properties','{}'::jsonb) ? v_extra_key) THEN
          IF jsonb_typeof(v_addl)='boolean' AND (v_addl#>>'{}')::boolean=FALSE THEN
            v_errors := v_errors || jsonb_build_object('code','additional_property_not_allowed',
              'instance_path',p_ipath||'/'||v_extra_key,'schema_path',p_spath||'/additionalProperties',
              'keyword','additionalProperties','expected','false','actual_type','present');
          ELSIF jsonb_typeof(v_addl)='object' THEN
            v_sub := public._comm_hub_jval_walk(v_addl, p_val->v_extra_key,
              p_ipath||'/'||v_extra_key, p_spath||'/additionalProperties');
            v_errors := v_errors || v_sub;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END IF;
  IF v_actual='array' AND p_sch ? 'items' AND jsonb_typeof(p_sch->'items')='object' THEN
    FOR v_i IN 0 .. jsonb_array_length(p_val)-1 LOOP
      v_sub := public._comm_hub_jval_walk(p_sch->'items', p_val->v_i, p_ipath||'/'||v_i::text, p_spath||'/items');
      v_errors := v_errors || v_sub;
    END LOOP;
  END IF;
  IF v_actual='string' THEN
    IF p_sch ? 'minLength' AND char_length(p_val#>>'{}') < (p_sch->>'minLength')::int THEN
      v_errors := v_errors || jsonb_build_object('code','min_length','instance_path',p_ipath,
        'schema_path',p_spath||'/minLength','keyword','minLength','expected',p_sch->>'minLength',
        'actual_type',char_length(p_val#>>'{}')::text);
    END IF;
    IF p_sch ? 'maxLength' AND char_length(p_val#>>'{}') > (p_sch->>'maxLength')::int THEN
      v_errors := v_errors || jsonb_build_object('code','max_length','instance_path',p_ipath,
        'schema_path',p_spath||'/maxLength','keyword','maxLength','expected',p_sch->>'maxLength',
        'actual_type',char_length(p_val#>>'{}')::text);
    END IF;
    IF p_sch ? 'pattern' AND NOT (p_val#>>'{}') ~ (p_sch->>'pattern') THEN
      v_errors := v_errors || jsonb_build_object('code','pattern_mismatch','instance_path',p_ipath,
        'schema_path',p_spath||'/pattern','keyword','pattern','expected',p_sch->>'pattern','actual_type','string');
    END IF;
    IF p_sch ? 'format' AND NOT public._comm_hub_jval_format(p_sch->>'format', p_val#>>'{}') THEN
      v_errors := v_errors || jsonb_build_object('code','format_mismatch','instance_path',p_ipath,
        'schema_path',p_spath||'/format','keyword','format','expected',p_sch->>'format','actual_type','string');
    END IF;
  END IF;
  IF v_actual IN ('number','integer') THEN
    v_num := (p_val#>>'{}')::numeric;
    IF p_sch ? 'minimum' AND v_num < (p_sch->>'minimum')::numeric THEN
      v_errors := v_errors || jsonb_build_object('code','minimum','instance_path',p_ipath,
        'schema_path',p_spath||'/minimum','keyword','minimum','expected',p_sch->>'minimum','actual_type',v_num::text);
    END IF;
    IF p_sch ? 'maximum' AND v_num > (p_sch->>'maximum')::numeric THEN
      v_errors := v_errors || jsonb_build_object('code','maximum','instance_path',p_ipath,
        'schema_path',p_spath||'/maximum','keyword','maximum','expected',p_sch->>'maximum','actual_type',v_num::text);
    END IF;
  END IF;
  RETURN v_errors;
END; $$;
REVOKE ALL ON FUNCTION public._comm_hub_jval_walk(jsonb,jsonb,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._comm_hub_jval_walk(jsonb,jsonb,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.validate_comm_hub_event_payload_pure(p_schema jsonb, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE v_un jsonb; v_errors jsonb;
BEGIN
  v_un := public.comm_hub_json_schema_subset_scan_keywords(p_schema);
  IF jsonb_array_length(v_un) > 0 THEN
    RETURN jsonb_build_object('valid',false,
      'validator_name','comm-hub-json-schema-subset','validator_version','v1',
      'unsupported_keywords', v_un,
      'errors', jsonb_build_array(jsonb_build_object('code','JSON_SCHEMA_KEYWORD_UNSUPPORTED',
        'validator_version','v1','unsupported', v_un)));
  END IF;
  v_errors := public._comm_hub_jval_walk(p_schema, p_payload, '', '#');
  RETURN jsonb_build_object('valid',(jsonb_array_length(v_errors)=0),
    'validator_name','comm-hub-json-schema-subset','validator_version','v1',
    'unsupported_keywords','[]'::jsonb,'errors',v_errors);
END; $$;
REVOKE ALL ON FUNCTION public.validate_comm_hub_event_payload_pure(jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_comm_hub_event_payload_pure(jsonb,jsonb) TO service_role;

-- ---------- 4. Public wrapper ----------------------------------------
CREATE OR REPLACE FUNCTION public.validate_comm_hub_event_payload(
  p_module_code text, p_event_code text,
  p_payload_schema_version integer DEFAULT NULL,
  p_event_payload jsonb DEFAULT '{}'::jsonb,
  p_require_enforced boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_module text := upper(coalesce(p_module_code,''));
        v_event text := upper(coalesce(p_event_code,''));
        v_row communication_hub_event_payload_schema%ROWTYPE; v_res jsonb; v_hash text;
BEGIN
  IF NOT (pg_has_role('service_role','USAGE') OR has_role(auth.uid(),'Admin'::app_role)) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_row FROM communication_hub_event_payload_schema
    WHERE module_code=v_module AND event_code=v_event
      AND (p_payload_schema_version IS NULL OR schema_version=p_payload_schema_version)
      AND (NOT p_require_enforced OR status='ENFORCED')
    ORDER BY schema_version DESC LIMIT 1;
  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('valid',false,
      'validator_name','comm-hub-json-schema-subset','validator_version','v1',
      'module_code',v_module,'event_code',v_event,
      'errors', jsonb_build_array(jsonb_build_object('code','SCHEMA_NOT_FOUND_OR_NOT_ENFORCED',
        'schema_version_requested',p_payload_schema_version)));
  END IF;
  v_hash := encode(extensions.digest(p_event_payload::text,'sha256'),'hex');
  v_res := public.validate_comm_hub_event_payload_pure(v_row.json_schema, p_event_payload);
  RETURN v_res || jsonb_build_object('module_code',v_module,'event_code',v_event,
    'schema_id',v_row.id,'schema_version',v_row.schema_version,'schema_status',v_row.status,
    'validated_payload_hash',v_hash,'evaluated_at',now());
END; $$;
REVOKE ALL ON FUNCTION public.validate_comm_hub_event_payload(text,text,integer,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_comm_hub_event_payload(text,text,integer,jsonb,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_comm_hub_event_payload(text,text,integer,jsonb,boolean) TO service_role;

-- ---------- 5. Platform test context ---------------------------------
CREATE TABLE IF NOT EXISTS public.comm_hub_platform_test_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context_code text NOT NULL, version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUPERSEDED','RETIRED')),
  recipient_context jsonb NOT NULL, request_context jsonb NOT NULL,
  system_context jsonb NOT NULL, sender_context jsonb NOT NULL,
  context_hash text NOT NULL,
  ownership_contract_version text NOT NULL DEFAULT 'source-ownership/v1',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (context_code, version)
);
GRANT SELECT ON public.comm_hub_platform_test_context TO authenticated;
GRANT ALL ON public.comm_hub_platform_test_context TO service_role;
ALTER TABLE public.comm_hub_platform_test_context ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_test_context_admin_read" ON public.comm_hub_platform_test_context;
CREATE POLICY "platform_test_context_admin_read" ON public.comm_hub_platform_test_context
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'Admin'::app_role));

INSERT INTO public.comm_hub_platform_test_context(
  context_code, version, recipient_context, request_context, system_context, sender_context, context_hash, description
) VALUES (
  'DEFAULT_PLATFORM_TEST_CONTEXT',1,
  jsonb_build_object('display_name','Governed Test Recipient',
    'email','platform-test-recipient@secureserve.internal',
    'recipient_reference','TEST-RECIPIENT-0001',
    'policy_evidence_ref','GOVERNED_TEST_RECIPIENT_POLICY_v1'),
  jsonb_build_object('request_no','REQ-TEST-000001',
    'request_id','00000000-0000-4000-8000-000000000001',
    'correlation_id','00000000-0000-4000-8000-000000000002',
    'requested_at','2026-01-01T00:00:00Z'),
  jsonb_build_object('generated_at','2026-01-01T00:00:00Z','platform_version','platform-test-context/v1'),
  jsonb_build_object('sender_profile_ref','GOVERNED_TEST_SENDER_v1',
    'from_email','platform-test-sender@secureserve.internal',
    'display_name','Governed Test Sender',
    'reply_to','platform-test-noreply@secureserve.internal'),
  encode(extensions.digest('comm-hub/platform-test-context/v1:DEFAULT_PLATFORM_TEST_CONTEXT:1','sha256'),'hex'),
  'Governed deterministic platform test context v1 — synthetic, non-production.'
) ON CONFLICT (context_code,version) DO NOTHING;

-- ---------- 6. Scenario governance -----------------------------------
ALTER TABLE public.communication_hub_event_test_scenario
  ADD COLUMN IF NOT EXISTS scenario_version integer,
  ADD COLUMN IF NOT EXISTS scenario_hash text,
  ADD COLUMN IF NOT EXISTS scenario_status text NOT NULL DEFAULT 'DRAFT'
    CHECK (scenario_status IN ('DRAFT','GOVERNED','SUPERSEDED','RETIRED')),
  ADD COLUMN IF NOT EXISTS supersedes_scenario_id uuid REFERENCES public.communication_hub_event_test_scenario(id);

CREATE OR REPLACE FUNCTION public.comm_hub_compute_scenario_hash(p_scenario_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_row communication_hub_event_test_scenario%ROWTYPE; v_sv integer; v_canonical text;
BEGIN
  SELECT * INTO v_row FROM communication_hub_event_test_scenario WHERE id=p_scenario_id;
  IF v_row.id IS NULL THEN RETURN NULL; END IF;
  SELECT schema_version INTO v_sv FROM communication_hub_event_payload_schema
    WHERE module_code=v_row.module_code AND event_code=v_row.event_code AND status='ENFORCED'
    ORDER BY schema_version DESC LIMIT 1;
  v_canonical := 'comm-hub/scenario/v1|'||upper(v_row.module_code)||'|'||upper(v_row.event_code)
    ||'|'||v_row.channel||'|'||v_row.scenario_key
    ||'|schema_version='||COALESCE(v_sv::text,'null')
    ||'|payload='||COALESCE(v_row.tokens::text,'{}');
  RETURN encode(extensions.digest(v_canonical,'sha256'),'hex');
END; $$;
REVOKE ALL ON FUNCTION public.comm_hub_compute_scenario_hash(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.comm_hub_compute_scenario_hash(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.comm_hub_compute_scenario_hash(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.tg_comm_hub_scenario_govern() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_new text;
BEGIN
  v_new := public.comm_hub_compute_scenario_hash(NEW.id);
  NEW.scenario_hash := v_new;
  IF NEW.scenario_version IS NULL THEN NEW.scenario_version := 1; END IF;
  IF TG_OP='UPDATE' AND OLD.scenario_hash IS DISTINCT FROM v_new THEN
    NEW.scenario_version := COALESCE(OLD.scenario_version,1)+1;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_comm_hub_scenario_govern ON public.communication_hub_event_test_scenario;
CREATE TRIGGER trg_comm_hub_scenario_govern BEFORE INSERT OR UPDATE
  ON public.communication_hub_event_test_scenario
  FOR EACH ROW EXECUTE FUNCTION public.tg_comm_hub_scenario_govern();

UPDATE public.communication_hub_event_test_scenario
   SET scenario_hash = public.comm_hub_compute_scenario_hash(id),
       scenario_version = COALESCE(scenario_version,1),
       scenario_status = CASE WHEN is_active THEN 'GOVERNED' ELSE scenario_status END
 WHERE scenario_hash IS NULL;

-- ---------- 7. Fixture compatibility evidence ------------------------
CREATE TABLE IF NOT EXISTS public.comm_hub_fixture_compatibility_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL, event_code text NOT NULL, channel text NOT NULL,
  template_version_id uuid NOT NULL, scenario_id uuid NOT NULL,
  platform_test_context_id uuid NOT NULL REFERENCES public.comm_hub_platform_test_context(id),
  schema_id uuid, schema_version integer,
  validator_name text NOT NULL DEFAULT 'comm-hub-json-schema-subset',
  validator_version text NOT NULL DEFAULT 'v1',
  compatibility_hash text NOT NULL, manifest jsonb NOT NULL,
  status text NOT NULL DEFAULT 'CURRENT' CHECK (status IN ('CURRENT','STALE','NOT_CHECKED','BLOCKED','SUPERSEDED')),
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb, warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(), computed_by uuid,
  UNIQUE (module_code,event_code,channel,template_version_id,scenario_id,compatibility_hash)
);
CREATE INDEX IF NOT EXISTS idx_comm_hub_fce_lookup ON public.comm_hub_fixture_compatibility_evidence(module_code,event_code,channel,status);
GRANT SELECT ON public.comm_hub_fixture_compatibility_evidence TO authenticated;
GRANT ALL ON public.comm_hub_fixture_compatibility_evidence TO service_role;
ALTER TABLE public.comm_hub_fixture_compatibility_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fce_admin_read" ON public.comm_hub_fixture_compatibility_evidence;
CREATE POLICY "fce_admin_read" ON public.comm_hub_fixture_compatibility_evidence
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'Admin'::app_role));

-- ---------- 8. v2 fixture compatibility checker ----------------------
CREATE OR REPLACE FUNCTION public.check_comm_hub_event_fixture_compatibility_v2(
  p_module_code text, p_event_code text,
  p_channel text DEFAULT 'email',
  p_template_version_id uuid DEFAULT NULL,
  p_scenario_id uuid DEFAULT NULL,
  p_platform_test_context_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_module text := upper(coalesce(p_module_code,''));
  v_event text := upper(coalesce(p_event_code,''));
  v_channel text := lower(coalesce(p_channel,'email'));
  v_map communication_hub_event_template_map%ROWTYPE;
  v_tv_id uuid := p_template_version_id;
  v_tv core_template_version%ROWTYPE;
  v_scen communication_hub_event_test_scenario%ROWTYPE;
  v_ctx comm_hub_platform_test_context%ROWTYPE;
  v_schema communication_hub_event_payload_schema%ROWTYPE;
  v_reserved text[] := ARRAY['recipient_name','recipient_email','request_no','request_id',
    'generated_at','module_code','event_code','sender_email','sender_display_name',
    'reply_to','template_id','template_version_id'];
  v_reserved_hits jsonb := '[]'::jsonb; v_r text;
  v_schema_result jsonb; v_variables jsonb := '[]'::jsonb; v_var record;
  v_source_json jsonb; v_segments text[]; v_seg text; v_ptr jsonb; v_resolved boolean;
  v_missing_required int := 0;
  v_blockers jsonb := '[]'::jsonb; v_warnings jsonb := '[]'::jsonb;
  v_alias jsonb := '{}'::jsonb;
  v_rendered_subject jsonb; v_rendered_body jsonb;
  v_raw_tokens int := 0; v_manifest jsonb; v_compat_hash text;
BEGIN
  IF NOT (pg_has_role('service_role','USAGE') OR has_role(auth.uid(),'Admin'::app_role)) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_map FROM communication_hub_event_template_map
    WHERE module_code=v_module AND event_code=v_event AND channel=v_channel AND active=true LIMIT 1;
  IF v_map.id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'schema_version','event-fixture-compatibility/v1','is_compatible',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','MAPPING_NOT_FOUND','channel',v_channel)));
  END IF;
  IF v_tv_id IS NULL THEN
    SELECT tv.id INTO v_tv_id FROM core_template_version tv
      WHERE tv.template_id = v_map.template_id ORDER BY tv.version_no DESC LIMIT 1;
  END IF;
  SELECT * INTO v_tv FROM core_template_version WHERE id=v_tv_id;
  IF v_tv.id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'is_compatible',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','TEMPLATE_VERSION_NOT_FOUND','template_version_id',v_tv_id)));
  END IF;
  SELECT * INTO v_schema FROM communication_hub_event_payload_schema
    WHERE module_code=v_module AND event_code=v_event AND status='ENFORCED'
    ORDER BY schema_version DESC LIMIT 1;
  IF v_schema.id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','ENFORCED_SCHEMA_MISSING');
  END IF;
  IF p_scenario_id IS NOT NULL THEN
    SELECT * INTO v_scen FROM communication_hub_event_test_scenario WHERE id=p_scenario_id;
  ELSE
    SELECT * INTO v_scen FROM communication_hub_event_test_scenario
      WHERE module_code=v_module AND event_code=v_event AND channel=v_channel AND is_active=true
      ORDER BY (scenario_key='default') DESC, updated_at DESC LIMIT 1;
  END IF;
  IF v_scen.id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','GOVERNED_SCENARIO_MISSING');
  END IF;
  IF p_platform_test_context_id IS NOT NULL THEN
    SELECT * INTO v_ctx FROM comm_hub_platform_test_context WHERE id=p_platform_test_context_id AND status='ACTIVE';
  ELSE
    SELECT * INTO v_ctx FROM comm_hub_platform_test_context
      WHERE context_code='DEFAULT_PLATFORM_TEST_CONTEXT' AND status='ACTIVE'
      ORDER BY version DESC LIMIT 1;
  END IF;
  IF v_ctx.id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','PLATFORM_TEST_CONTEXT_MISSING');
  END IF;

  IF v_scen.id IS NOT NULL AND v_schema.id IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM jsonb_object_keys(v_scen.tokens) k
        JOIN jsonb_object_keys(v_schema.json_schema->'properties') p ON k=p)=0 THEN
      v_blockers := v_blockers || jsonb_build_object('code','LEGACY_FLAT_TEMPLATE_TOKENS',
        'message','Scenario stores flat template aliases; canonical eventPayload required.');
    END IF;
  END IF;

  IF v_scen.id IS NOT NULL THEN
    FOREACH v_r IN ARRAY v_reserved LOOP
      IF v_scen.tokens ? v_r THEN
        v_reserved_hits := v_reserved_hits || jsonb_build_object('field',v_r,'path',v_r);
      END IF;
    END LOOP;
    IF jsonb_array_length(v_reserved_hits) > 0 THEN
      v_blockers := v_blockers || jsonb_build_object('code','PLATFORM_OWNED_FIELD_SUPPLIED_BY_EVENT','fields',v_reserved_hits);
    END IF;
  END IF;

  IF v_schema.id IS NOT NULL AND v_scen.id IS NOT NULL THEN
    v_schema_result := public.validate_comm_hub_event_payload_pure(v_schema.json_schema, v_scen.tokens);
    IF NOT COALESCE((v_schema_result->>'valid')::boolean,false) THEN
      v_blockers := v_blockers || jsonb_build_object('code','SCHEMA_VALIDATION_FAILED','detail',v_schema_result);
    END IF;
  END IF;

  FOR v_var IN
    SELECT variable_name, canonical_path, source_type, is_required
      FROM communication_hub_template_variable_contract
     WHERE template_version_id = v_tv_id AND contract_status='ENFORCED'
  LOOP
    v_source_json := CASE v_var.source_type
      WHEN 'event_payload'     THEN COALESCE(v_scen.tokens,'{}'::jsonb)
      WHEN 'recipient_context' THEN v_ctx.recipient_context
      WHEN 'request_context'   THEN v_ctx.request_context
      WHEN 'system_context'    THEN v_ctx.system_context
      WHEN 'sender_context'    THEN v_ctx.sender_context
      ELSE NULL END;
    v_ptr := v_source_json;
    v_resolved := v_ptr IS NOT NULL;
    IF v_resolved AND coalesce(v_var.canonical_path,'')<>'' THEN
      v_segments := string_to_array(v_var.canonical_path,'.');
      FOREACH v_seg IN ARRAY v_segments LOOP
        IF v_ptr IS NULL OR jsonb_typeof(v_ptr)<>'object' OR NOT (v_ptr ? v_seg) THEN
          v_resolved := false; v_ptr := NULL; EXIT;
        END IF;
        v_ptr := v_ptr -> v_seg;
      END LOOP;
    END IF;
    v_variables := v_variables || jsonb_build_object(
      'variable_name',v_var.variable_name,'source_type',v_var.source_type,
      'canonical_path',v_var.canonical_path,'required',v_var.is_required,
      'resolution_status', CASE
        WHEN v_resolved AND v_var.source_type='event_payload'     THEN 'FIXTURE_RESOLVED'
        WHEN v_resolved AND v_var.source_type='recipient_context' THEN 'RECIPIENT_CONTEXT_RESOLVED'
        WHEN v_resolved AND v_var.source_type='request_context'   THEN 'REQUEST_CONTEXT_RESOLVED'
        WHEN v_resolved AND v_var.source_type='system_context'    THEN 'SYSTEM_CONTEXT_RESOLVED'
        WHEN v_resolved AND v_var.source_type='sender_context'    THEN 'SENDER_CONTEXT_RESOLVED'
        WHEN v_resolved AND v_var.source_type='derived'           THEN 'DERIVED'
        WHEN v_resolved AND v_var.source_type='template_default'  THEN 'DEFAULTED'
        WHEN v_resolved AND v_var.source_type='late_bound'        THEN 'LATE_BOUND'
        WHEN (NOT v_resolved) AND v_var.is_required THEN 'REQUIRED_MISSING'
        ELSE 'OPTIONAL_MISSING' END,
      'resolved_value_type', jsonb_typeof(v_ptr),
      'value_present', v_resolved);
    IF v_resolved THEN
      v_alias := v_alias || jsonb_build_object(v_var.variable_name,
        CASE jsonb_typeof(v_ptr) WHEN 'string' THEN to_jsonb(v_ptr#>>'{}') ELSE v_ptr END);
    ELSIF v_var.is_required THEN
      v_missing_required := v_missing_required + 1;
    END IF;
  END LOOP;
  IF v_missing_required > 0 THEN
    v_blockers := v_blockers || jsonb_build_object('code','REQUIRED_VARIABLES_MISSING','count',v_missing_required);
  END IF;

  IF jsonb_array_length(v_blockers)=0 THEN
    v_rendered_subject := public.render_comm_hub_content(v_tv.subject, v_alias, 'text');
    v_rendered_body    := public.render_comm_hub_content(COALESCE(v_tv.body_html, v_tv.body_text, ''), v_alias, 'html');
    v_raw_tokens := COALESCE((v_rendered_subject->>'unresolved_count')::int,0)
                  + COALESCE((v_rendered_body->>'unresolved_count')::int,0);
    IF v_raw_tokens > 0 THEN
      v_blockers := v_blockers || jsonb_build_object('code','RAW_TOKENS_REMAINING','count',v_raw_tokens);
    END IF;
  END IF;

  v_manifest := jsonb_build_object(
    'module_code',v_module,'event_code',v_event,'channel',v_channel,
    'mapping_id',v_map.id,'template_version_id',v_tv_id,'template_version_no',v_tv.version_no,
    'schema_id',v_schema.id,'schema_version',v_schema.schema_version,
    'scenario_id',v_scen.id,'scenario_version',v_scen.scenario_version,'scenario_hash',v_scen.scenario_hash,
    'platform_test_context_id',v_ctx.id,'platform_test_context_version',v_ctx.version,
    'platform_test_context_hash',v_ctx.context_hash,
    'validator_name','comm-hub-json-schema-subset','validator_version','v1',
    'resolver_version','resolve_comm_hub_template_variables/1',
    'renderer_version','render_comm_hub_content/1',
    'source_ownership_policy_version','source-ownership/v1',
    'event_payload_hash', encode(extensions.digest(COALESCE(v_scen.tokens,'{}'::jsonb)::text,'sha256'),'hex'),
    'subject_hash', encode(extensions.digest(COALESCE(v_rendered_subject->>'rendered',''),'sha256'),'hex'),
    'body_hash',    encode(extensions.digest(COALESCE(v_rendered_body->>'rendered',''),'sha256'),'hex'));
  v_compat_hash := encode(extensions.digest('comm-hub/event-fixture-compatibility/v1|'||v_manifest::text,'sha256'),'hex');
  RETURN jsonb_build_object(
    'ok',(jsonb_array_length(v_blockers)=0),'schema_version','event-fixture-compatibility/v1',
    'is_compatible',(jsonb_array_length(v_blockers)=0),
    'schema_valid', COALESCE((v_schema_result->>'valid')::boolean,false),
    'schema_errors', COALESCE(v_schema_result->'errors','[]'::jsonb),
    'variables', v_variables,
    'source_ownership_violations', v_reserved_hits,
    'renderable',(jsonb_array_length(v_blockers)=0),
    'raw_tokens_count', v_raw_tokens,
    'blockers',v_blockers,'warnings',v_warnings,
    'manifest',v_manifest,'compatibility_hash',v_compat_hash);
END; $$;
REVOKE ALL ON FUNCTION public.check_comm_hub_event_fixture_compatibility_v2(text,text,text,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_event_fixture_compatibility_v2(text,text,text,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_event_fixture_compatibility_v2(text,text,text,uuid,uuid,uuid) TO service_role;

-- ---------- 9. Governed evidence writer ------------------------------
CREATE OR REPLACE FUNCTION public.record_comm_hub_fixture_compatibility_evidence(
  p_module_code text, p_event_code text, p_channel text DEFAULT 'email',
  p_template_version_id uuid DEFAULT NULL, p_scenario_id uuid DEFAULT NULL,
  p_platform_test_context_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_result jsonb; v_id uuid; v_status text; v_m jsonb;
BEGIN
  IF NOT (pg_has_role('service_role','USAGE') OR has_role(auth.uid(),'Admin'::app_role)) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501';
  END IF;
  v_result := public.check_comm_hub_event_fixture_compatibility_v2(
    p_module_code,p_event_code,p_channel,p_template_version_id,p_scenario_id,p_platform_test_context_id);
  v_m := v_result->'manifest';
  v_status := CASE WHEN COALESCE((v_result->>'is_compatible')::boolean,false) THEN 'CURRENT' ELSE 'BLOCKED' END;
  IF v_m ? 'template_version_id' AND v_m ? 'scenario_id' AND (v_m->>'template_version_id') IS NOT NULL AND (v_m->>'scenario_id') IS NOT NULL THEN
    UPDATE public.comm_hub_fixture_compatibility_evidence SET status='SUPERSEDED'
     WHERE module_code=upper(p_module_code) AND event_code=upper(p_event_code) AND channel=lower(p_channel)
       AND template_version_id=(v_m->>'template_version_id')::uuid
       AND scenario_id=(v_m->>'scenario_id')::uuid AND status='CURRENT';
    INSERT INTO public.comm_hub_fixture_compatibility_evidence(
      module_code,event_code,channel,template_version_id,scenario_id,
      platform_test_context_id,schema_id,schema_version,
      compatibility_hash,manifest,status,blockers,warnings,computed_by)
    VALUES (upper(p_module_code),upper(p_event_code),lower(p_channel),
      (v_m->>'template_version_id')::uuid,(v_m->>'scenario_id')::uuid,
      (v_m->>'platform_test_context_id')::uuid,
      NULLIF(v_m->>'schema_id','')::uuid, NULLIF(v_m->>'schema_version','')::int,
      v_result->>'compatibility_hash', v_m, v_status,
      COALESCE(v_result->'blockers','[]'::jsonb),
      COALESCE(v_result->'warnings','[]'::jsonb), auth.uid())
    ON CONFLICT (module_code,event_code,channel,template_version_id,scenario_id,compatibility_hash)
      DO UPDATE SET status=EXCLUDED.status, computed_at=now(), blockers=EXCLUDED.blockers
    RETURNING id INTO v_id;
  END IF;
  RETURN jsonb_build_object('evidence_id',v_id,'status',v_status,'result',v_result);
END; $$;
REVOKE ALL ON FUNCTION public.record_comm_hub_fixture_compatibility_evidence(text,text,text,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_comm_hub_fixture_compatibility_evidence(text,text,text,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_comm_hub_fixture_compatibility_evidence(text,text,text,uuid,uuid,uuid) TO service_role;

-- ---------- 10. Rebind evaluate_comm_hub_stage_readiness -------------
CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_stage_readiness(
  p_module_code text, p_event_code text,
  p_target_stage text DEFAULT 'PREVIEW_READY',
  p_channel text DEFAULT 'email',
  p_auto_compute_sender_readiness boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_stage text := public.normalize_comm_hub_go_live_stage_strict(p_target_stage);
  v_module text := upper(coalesce(p_module_code,''));
  v_event  text := upper(coalesce(p_event_code,''));
  v_reqs jsonb := public.get_comm_hub_stage_requirements(v_stage);
  v_map communication_hub_event_template_map%ROWTYPE;
  v_tv_id uuid;
  v_fixture jsonb; v_sender_id uuid; v_sender_result jsonb;
  v_runner jsonb; v_blockers jsonb; v_warnings jsonb; v_ready boolean;
  v_runner_stage text := CASE
    WHEN v_stage IN ('READINESS_ONLY','PREVIEW_READY','DRY_RUN_READY','CONTROLLED_STUB_READY') THEN v_stage
    ELSE 'CONTROLLED_STUB_READY' END;
BEGIN
  v_runner := public.run_comm_hub_go_live_certification(v_module, v_event, p_channel, v_runner_stage, false);
  v_blockers := COALESCE(v_runner->'blockers','[]'::jsonb);
  v_warnings := COALESCE(v_runner->'warnings','[]'::jsonb);
  SELECT * INTO v_map FROM communication_hub_event_template_map
    WHERE module_code=v_module AND event_code=v_event AND channel=p_channel AND active=true LIMIT 1;
  IF v_map.id IS NOT NULL THEN
    SELECT tv.id INTO v_tv_id FROM core_template_version tv
      WHERE tv.template_id = v_map.template_id ORDER BY tv.version_no DESC LIMIT 1;
  END IF;
  IF (v_reqs->>'fixture_compatibility_required')::boolean THEN
    v_fixture := public.check_comm_hub_event_fixture_compatibility_v2(v_module,v_event,p_channel,v_tv_id,NULL,NULL);
    IF NOT COALESCE((v_fixture->>'is_compatible')::boolean,false) THEN
      v_blockers := v_blockers || jsonb_build_object('code','fixture_incompatible_with_contract_v2',
        'severity','BLOCKER','stage',v_stage,'detail',v_fixture);
    END IF;
  END IF;
  IF (v_reqs->>'sender_test_ready_required')::boolean OR (v_reqs->>'sender_real_email_ready_required')::boolean THEN
    SELECT sp.id INTO v_sender_id FROM communication_hub_sender_profile sp
      WHERE sp.is_enabled=true
      ORDER BY (sp.profile_code='SENDER_'||v_module) DESC,(sp.profile_code='SENDER_LEGAL') DESC, sp.updated_at DESC LIMIT 1;
    IF v_sender_id IS NOT NULL AND p_auto_compute_sender_readiness THEN
      v_sender_result := public.compute_comm_hub_sender_readiness(v_sender_id,
        CASE WHEN (v_reqs->>'sender_real_email_ready_required')::boolean THEN 'REAL_EMAIL_READY' ELSE 'TEST_READY' END);
    END IF;
  END IF;
  v_ready := (jsonb_array_length(v_blockers)=0);
  RETURN jsonb_build_object(
    'ok',v_ready,'schema_version','stage-readiness/2',
    'module_code',v_module,'event_code',v_event,'channel',p_channel,
    'requested_stage',v_stage,'ready_for_requested_stage',v_ready,
    'requirements',v_reqs,'blockers',v_blockers,'warnings',v_warnings,'advisories','[]'::jsonb,
    'runner_result',v_runner,'fixture_result',v_fixture,
    'sender_result',v_sender_result,'sender_profile_id',v_sender_id,
    'resolved_template_version_id',v_tv_id,'evaluated_at',now());
END; $$;
