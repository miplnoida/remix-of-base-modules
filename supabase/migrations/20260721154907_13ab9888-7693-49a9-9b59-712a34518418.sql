
-- =========================================================
-- CH-SIMPLE-P3F-VAR.P1
-- Template Contracts, Event Payload Schemas, Variable Mappings
-- =========================================================

CREATE TABLE IF NOT EXISTS public.communication_hub_variable_source_registry (
  source_type        text PRIMARY KEY,
  description        text NOT NULL,
  is_protected       boolean NOT NULL DEFAULT false,
  owner              text NOT NULL DEFAULT 'platform',
  overridable_in_test boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_hub_variable_source_registry TO authenticated;
GRANT ALL ON public.communication_hub_variable_source_registry TO service_role;

INSERT INTO public.communication_hub_variable_source_registry
  (source_type, description, is_protected, owner, overridable_in_test) VALUES
  ('system',    'System-minted values (module_code, event_code, generated_at, correlation ids).', true,  'platform', false),
  ('request',   'Communication request context (request_no, request_id, requested_at, requester).', true,  'platform', false),
  ('recipient', 'Recipient identity + display context resolved from recipient policy.',            true,  'platform', false),
  ('event',     'Business event payload emitted by the source module.',                            false, 'module',   true),
  ('derived',   'Computed values derived from other sources during resolution.',                   true,  'platform', false)
ON CONFLICT (source_type) DO UPDATE
  SET description = EXCLUDED.description,
      is_protected = EXCLUDED.is_protected,
      owner = EXCLUDED.owner,
      overridable_in_test = EXCLUDED.overridable_in_test,
      updated_at = now();

CREATE TABLE IF NOT EXISTS public.communication_hub_event_payload_schema (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code      text NOT NULL,
  event_code       text NOT NULL,
  schema_version   integer NOT NULL DEFAULT 1,
  status           text NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','DISCOVERED','VALIDATED','ENFORCED','RETIRED')),
  description      text,
  json_schema      jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes            text,
  discovered_at    timestamptz,
  validated_at     timestamptz,
  validated_by     uuid,
  enforced_at      timestamptz,
  enforced_by      uuid,
  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_code, event_code, schema_version)
);
CREATE INDEX IF NOT EXISTS idx_comm_hub_event_schema_module_event
  ON public.communication_hub_event_payload_schema (module_code, event_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_hub_event_payload_schema TO authenticated;
GRANT ALL ON public.communication_hub_event_payload_schema TO service_role;

CREATE TABLE IF NOT EXISTS public.communication_hub_event_payload_field (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id          uuid NOT NULL REFERENCES public.communication_hub_event_payload_schema(id) ON DELETE CASCADE,
  canonical_path     text NOT NULL,
  data_type          text NOT NULL DEFAULT 'string'
                       CHECK (data_type IN ('string','number','integer','boolean','date','datetime','uuid','json')),
  is_required        boolean NOT NULL DEFAULT true,
  is_protected       boolean NOT NULL DEFAULT false,
  description        text,
  example_value      text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schema_id, canonical_path)
);
CREATE INDEX IF NOT EXISTS idx_comm_hub_event_field_schema
  ON public.communication_hub_event_payload_field (schema_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_hub_event_payload_field TO authenticated;
GRANT ALL ON public.communication_hub_event_payload_field TO service_role;

CREATE TABLE IF NOT EXISTS public.communication_hub_template_variable_contract (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          uuid,
  template_version_id  uuid,
  template_code        text,
  module_code          text NOT NULL,
  event_code           text NOT NULL,
  variable_name        text NOT NULL,
  source_type          text NOT NULL REFERENCES public.communication_hub_variable_source_registry(source_type),
  canonical_path       text NOT NULL,
  is_required          boolean NOT NULL DEFAULT true,
  default_value        text,
  description          text,
  contract_status      text NOT NULL DEFAULT 'DRAFT'
                        CHECK (contract_status IN ('DRAFT','DISCOVERED','VALIDATED','ENFORCED','RETIRED')),
  discovered_at        timestamptz,
  validated_at         timestamptz,
  validated_by         uuid,
  enforced_at          timestamptz,
  enforced_by          uuid,
  notes                text,
  created_by           uuid,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_hub_tvc_version_variable
  ON public.communication_hub_template_variable_contract (template_version_id, variable_name)
  WHERE template_version_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_hub_tvc_code_variable_no_version
  ON public.communication_hub_template_variable_contract (template_code, variable_name)
  WHERE template_version_id IS NULL AND template_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comm_hub_tvc_module_event
  ON public.communication_hub_template_variable_contract (module_code, event_code);
CREATE INDEX IF NOT EXISTS idx_comm_hub_tvc_status
  ON public.communication_hub_template_variable_contract (contract_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_hub_template_variable_contract TO authenticated;
GRANT ALL ON public.communication_hub_template_variable_contract TO service_role;

CREATE OR REPLACE FUNCTION public.tg_comm_hub_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_comm_hub_src_registry_touch ON public.communication_hub_variable_source_registry;
CREATE TRIGGER trg_comm_hub_src_registry_touch BEFORE UPDATE ON public.communication_hub_variable_source_registry
  FOR EACH ROW EXECUTE FUNCTION public.tg_comm_hub_touch_updated_at();
DROP TRIGGER IF EXISTS trg_comm_hub_event_schema_touch ON public.communication_hub_event_payload_schema;
CREATE TRIGGER trg_comm_hub_event_schema_touch BEFORE UPDATE ON public.communication_hub_event_payload_schema
  FOR EACH ROW EXECUTE FUNCTION public.tg_comm_hub_touch_updated_at();
DROP TRIGGER IF EXISTS trg_comm_hub_event_field_touch ON public.communication_hub_event_payload_field;
CREATE TRIGGER trg_comm_hub_event_field_touch BEFORE UPDATE ON public.communication_hub_event_payload_field
  FOR EACH ROW EXECUTE FUNCTION public.tg_comm_hub_touch_updated_at();
DROP TRIGGER IF EXISTS trg_comm_hub_tvc_touch ON public.communication_hub_template_variable_contract;
CREATE TRIGGER trg_comm_hub_tvc_touch BEFORE UPDATE ON public.communication_hub_template_variable_contract
  FOR EACH ROW EXECUTE FUNCTION public.tg_comm_hub_touch_updated_at();

CREATE OR REPLACE FUNCTION public.validate_comm_hub_template_contract(
  p_template_version_id uuid DEFAULT NULL,
  p_template_code       text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_findings jsonb := '[]'::jsonb;
  r          record;
  v_schema_id uuid;
  v_has_path boolean;
  v_reserved_system    text[] := ARRAY['module_code','event_code','generated_at','correlation_id'];
  v_reserved_request   text[] := ARRAY['request_no','request_id','requested_at','requested_by'];
  v_reserved_recipient text[] := ARRAY['display_name','email','phone','locale','recipient_id','identity_kind'];
BEGIN
  FOR r IN
    SELECT c.* FROM public.communication_hub_template_variable_contract c
    WHERE (p_template_version_id IS NOT NULL AND c.template_version_id = p_template_version_id)
       OR (p_template_version_id IS NULL AND p_template_code IS NOT NULL AND c.template_code = p_template_code)
  LOOP
    IF r.source_type = 'system' AND NOT (r.canonical_path = ANY(v_reserved_system)) THEN
      v_findings := v_findings || jsonb_build_object('severity','WARN','code','SYSTEM_PATH_NOT_RESERVED','variable',r.variable_name,'canonical_path',r.canonical_path);
    ELSIF r.source_type = 'request' AND NOT (r.canonical_path = ANY(v_reserved_request)) THEN
      v_findings := v_findings || jsonb_build_object('severity','WARN','code','REQUEST_PATH_NOT_RESERVED','variable',r.variable_name,'canonical_path',r.canonical_path);
    ELSIF r.source_type = 'recipient' AND NOT (r.canonical_path = ANY(v_reserved_recipient)) THEN
      v_findings := v_findings || jsonb_build_object('severity','WARN','code','RECIPIENT_PATH_NOT_RESERVED','variable',r.variable_name,'canonical_path',r.canonical_path);
    END IF;

    IF r.source_type = 'event' AND (r.canonical_path ~ '(^|\.)(bn_|au_|cl_|cn_|ip_|ce_|c3_)' OR r.canonical_path ILIKE '%\_id' ESCAPE '\') THEN
      v_findings := v_findings || jsonb_build_object('severity','ERROR','code','PHYSICAL_COLUMN_LEAK','variable',r.variable_name,'canonical_path',r.canonical_path,'hint','event canonical paths must be business paths');
    END IF;

    IF r.source_type = 'event' THEN
      SELECT s.id INTO v_schema_id FROM public.communication_hub_event_payload_schema s
      WHERE s.module_code = r.module_code AND s.event_code = r.event_code AND s.status <> 'RETIRED'
      ORDER BY s.schema_version DESC LIMIT 1;
      IF v_schema_id IS NULL THEN
        v_findings := v_findings || jsonb_build_object('severity','ERROR','code','EVENT_SCHEMA_MISSING','module_code',r.module_code,'event_code',r.event_code,'variable',r.variable_name);
      ELSE
        SELECT EXISTS(SELECT 1 FROM public.communication_hub_event_payload_field f
          WHERE f.schema_id = v_schema_id AND f.canonical_path = r.canonical_path) INTO v_has_path;
        IF NOT v_has_path THEN
          v_findings := v_findings || jsonb_build_object('severity','ERROR','code','EVENT_PATH_NOT_IN_SCHEMA','module_code',r.module_code,'event_code',r.event_code,'variable',r.variable_name,'canonical_path',r.canonical_path);
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'template_version_id', p_template_version_id,
    'template_code', p_template_code,
    'findings', v_findings,
    'error_count', (SELECT count(*) FROM jsonb_array_elements(v_findings) x WHERE x->>'severity'='ERROR'),
    'warn_count',  (SELECT count(*) FROM jsonb_array_elements(v_findings) x WHERE x->>'severity'='WARN'),
    'checked_at', now()
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.validate_comm_hub_template_contract(uuid, text) TO authenticated, service_role;

-- Seed Fixture A
DO $$
DECLARE v_schema_a uuid; v_row record;
BEGIN
  INSERT INTO public.communication_hub_event_payload_schema
    (module_code, event_code, schema_version, status, description, json_schema, discovered_at)
  VALUES ('COMM_HUB','OPERATOR_REHEARSAL_RESULT_NOTICE',1,'DISCOVERED',
    'Operator rehearsal result notice — canonical event payload.',
    '{"type":"object","properties":{"rehearsal_reference":{"type":"string"},"result_status":{"type":"string"}},"required":["rehearsal_reference","result_status"]}'::jsonb,
    now())
  ON CONFLICT (module_code, event_code, schema_version) DO UPDATE
    SET status='DISCOVERED', description=EXCLUDED.description, json_schema=EXCLUDED.json_schema
  RETURNING id INTO v_schema_a;

  INSERT INTO public.communication_hub_event_payload_field
    (schema_id, canonical_path, data_type, is_required, is_protected, description, example_value) VALUES
    (v_schema_a,'rehearsal_reference','string', true, false, 'Human-readable rehearsal reference.', 'REH-2026-0001'),
    (v_schema_a,'result_status',      'string', true, false, 'Outcome of the rehearsal run.',       'SUCCEEDED')
  ON CONFLICT (schema_id, canonical_path) DO NOTHING;

  FOR v_row IN SELECT * FROM (VALUES
    ('module_code','system','module_code','System-minted module code.'),
    ('event_code','system','event_code','System-minted event code.'),
    ('generated_at','system','generated_at','Preview generation timestamp.'),
    ('recipient_name','recipient','display_name','Recipient display name.'),
    ('rehearsal_reference','event','rehearsal_reference','Rehearsal reference (event).'),
    ('request_no','request','request_no','Communication request number.'),
    ('result_status','event','result_status','Rehearsal result status (event).')
  ) AS t(vn,st,cp,ds) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.communication_hub_template_variable_contract
      WHERE template_version_id IS NULL AND template_code IS NULL
        AND module_code='COMM_HUB' AND event_code='OPERATOR_REHEARSAL_RESULT_NOTICE'
        AND variable_name = v_row.vn
    ) THEN
      INSERT INTO public.communication_hub_template_variable_contract
        (module_code, event_code, variable_name, source_type, canonical_path, is_required, description, contract_status, discovered_at)
        VALUES ('COMM_HUB','OPERATOR_REHEARSAL_RESULT_NOTICE', v_row.vn, v_row.st, v_row.cp, true, v_row.ds, 'DISCOVERED', now());
    END IF;
  END LOOP;
END $$;

-- Seed Fixture B
DO $$
DECLARE
  v_schema_b uuid;
  v_tpl_ver  uuid := '8d1fd9cb-2248-4ff4-86a4-bc42a4995f87'::uuid;
  v_tpl_code text := 'APPEALS_APPEAL_RECEIVED_EMAIL';
BEGIN
  INSERT INTO public.communication_hub_event_payload_schema
    (module_code, event_code, schema_version, status, description, json_schema, discovered_at)
  VALUES ('APPEALS','APPEAL_RECEIVED_NOTICE',1,'DISCOVERED',
    'Appeal received notice — canonical event payload (business paths only).',
    '{"type":"object","properties":{"appeal":{"type":"object","properties":{"reference":{"type":"string"},"case_reference":{"type":"string"},"submitted_at":{"type":"string","format":"date-time"}},"required":["reference","case_reference","submitted_at"]}},"required":["appeal"]}'::jsonb,
    now())
  ON CONFLICT (module_code, event_code, schema_version) DO UPDATE
    SET status='DISCOVERED', description=EXCLUDED.description, json_schema=EXCLUDED.json_schema
  RETURNING id INTO v_schema_b;

  INSERT INTO public.communication_hub_event_payload_field
    (schema_id, canonical_path, data_type, is_required, is_protected, description, example_value) VALUES
    (v_schema_b,'appeal.reference',      'string',   true, false, 'Business reference for the appeal.', 'AP-2026-0001'),
    (v_schema_b,'appeal.case_reference', 'string',   true, false, 'Business reference of the source case.', 'CL-2026-0057'),
    (v_schema_b,'appeal.submitted_at',   'datetime', true, false, 'Timestamp the appeal was submitted.', '2026-04-01T10:15:00Z')
  ON CONFLICT (schema_id, canonical_path) DO NOTHING;

  INSERT INTO public.communication_hub_template_variable_contract
    (template_version_id, template_code, module_code, event_code, variable_name, source_type, canonical_path, is_required, description, contract_status, discovered_at)
  SELECT v_tpl_ver, v_tpl_code, 'APPEALS','APPEAL_RECEIVED_NOTICE', vn, st, cp, true, ds, 'DISCOVERED', now()
  FROM (VALUES
    ('recipient_name','recipient','display_name','Recipient display name.'),
    ('appeal_reference','event','appeal.reference','Business reference for the appeal.'),
    ('case_reference','event','appeal.case_reference','Business reference of the source case.'),
    ('submitted_at','event','appeal.submitted_at','Timestamp the appeal was submitted.'),
    ('request_no','request','request_no','Communication request number.'),
    ('generated_at','system','generated_at','Preview generation timestamp.')
  ) AS t(vn,st,cp,ds)
  ON CONFLICT (template_version_id, variable_name) WHERE template_version_id IS NOT NULL DO NOTHING;
END $$;
