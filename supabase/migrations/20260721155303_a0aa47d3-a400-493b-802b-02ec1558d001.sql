
-- =========================================================
-- CH-SIMPLE-P3F-VAR.P1.1 hardening
-- Canonical namespace terms + explicit flags + fixed leak rule
-- =========================================================

-- ---------------------------------------------------------
-- A2 + A3: registry — rename flags, add new source types
-- ---------------------------------------------------------
ALTER TABLE public.communication_hub_variable_source_registry
  RENAME COLUMN is_protected TO protected_from_client_override;
ALTER TABLE public.communication_hub_variable_source_registry
  RENAME COLUMN overridable_in_test TO allowed_in_test_scenario;
ALTER TABLE public.communication_hub_variable_source_registry
  RENAME COLUMN owner TO authoritative_owner;

-- Drop FK on contract temporarily so we can renumber source_type keys.
ALTER TABLE public.communication_hub_template_variable_contract
  DROP CONSTRAINT IF EXISTS communication_hub_template_variable_contract_source_type_fkey;

-- Migrate registry keys from short → canonical.
UPDATE public.communication_hub_variable_source_registry SET source_type = 'system_context'    WHERE source_type = 'system';
UPDATE public.communication_hub_variable_source_registry SET source_type = 'recipient_context' WHERE source_type = 'recipient';
UPDATE public.communication_hub_variable_source_registry SET source_type = 'event_payload'     WHERE source_type = 'event';
UPDATE public.communication_hub_variable_source_registry SET source_type = 'request_context'   WHERE source_type = 'request';

-- Migrate contract source_type values to canonical names.
UPDATE public.communication_hub_template_variable_contract SET source_type = 'system_context'    WHERE source_type = 'system';
UPDATE public.communication_hub_template_variable_contract SET source_type = 'recipient_context' WHERE source_type = 'recipient';
UPDATE public.communication_hub_template_variable_contract SET source_type = 'event_payload'     WHERE source_type = 'event';
UPDATE public.communication_hub_template_variable_contract SET source_type = 'request_context'   WHERE source_type = 'request';

-- Ensure new canonical rows exist + add template_default / late_bound.
INSERT INTO public.communication_hub_variable_source_registry
  (source_type, description, protected_from_client_override, authoritative_owner, allowed_in_test_scenario) VALUES
  ('system_context',    'System-minted values (module_code, event_code, generated_at, correlation ids).', true,  'platform', false),
  ('request_context',   'Communication request context (request_no, request_id, requested_at, requester).', true,  'platform', false),
  ('recipient_context', 'Recipient identity + display context resolved from recipient policy.',            true,  'platform', false),
  ('event_payload',     'Business event payload emitted by the source module. Test values may only come from an approved PREVIEW_TEST scenario; production values come from PRODUCTION_EVENT payloads. Client-supplied context is never authoritative.', true, 'module', true),
  ('derived',           'Computed values derived from other sources during resolution.',                   true,  'platform', false),
  ('template_default',  'Static default baked into the template body/version. Not sourced from context.',  true,  'platform', false),
  ('late_bound',        'Values resolved at dispatch time after preview approval (e.g. attachment refs).', true,  'platform', false)
ON CONFLICT (source_type) DO UPDATE
  SET description = EXCLUDED.description,
      protected_from_client_override = EXCLUDED.protected_from_client_override,
      authoritative_owner = EXCLUDED.authoritative_owner,
      allowed_in_test_scenario = EXCLUDED.allowed_in_test_scenario,
      updated_at = now();

-- Remove now-superseded short aliases.
DELETE FROM public.communication_hub_variable_source_registry
 WHERE source_type IN ('system','recipient','event','request');

-- Restore FK against canonical registry.
ALTER TABLE public.communication_hub_template_variable_contract
  ADD CONSTRAINT communication_hub_template_variable_contract_source_type_fkey
  FOREIGN KEY (source_type)
  REFERENCES public.communication_hub_variable_source_registry(source_type);

-- ---------------------------------------------------------
-- A3 (cont.): event_payload_field — rename protection flag
-- ---------------------------------------------------------
ALTER TABLE public.communication_hub_event_payload_field
  RENAME COLUMN is_protected TO protected_from_client_override;

-- ---------------------------------------------------------
-- A4: corrected physical-column leak validation.
-- Removed the blanket `%_id` reject. Now flags:
--   * schema-qualified paths (public.*, auth.*, storage.*)
--   * segments beginning with known physical table prefixes
--   * paths explicitly declared non-business via
--     communication_hub_event_payload_field.protected_from_client_override
--     combined with a `non_business` marker in description.
-- ---------------------------------------------------------
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
  v_physical_prefixes  text[] := ARRAY['bn_','au_','cl_','cn_','ip_','ce_','c3_'];
  v_schema_prefixes    text[] := ARRAY['public.','auth.','storage.','realtime.','supabase_functions.','vault.'];
  seg text;
  hit boolean;
BEGIN
  FOR r IN
    SELECT c.* FROM public.communication_hub_template_variable_contract c
    WHERE (p_template_version_id IS NOT NULL AND c.template_version_id = p_template_version_id)
       OR (p_template_version_id IS NULL AND p_template_code IS NOT NULL AND c.template_code = p_template_code)
  LOOP
    -- reserved-path warnings for protected namespaces
    IF r.source_type = 'system_context' AND NOT (r.canonical_path = ANY(v_reserved_system)) THEN
      v_findings := v_findings || jsonb_build_object('severity','WARN','code','SYSTEM_PATH_NOT_RESERVED','variable',r.variable_name,'canonical_path',r.canonical_path);
    ELSIF r.source_type = 'request_context' AND NOT (r.canonical_path = ANY(v_reserved_request)) THEN
      v_findings := v_findings || jsonb_build_object('severity','WARN','code','REQUEST_PATH_NOT_RESERVED','variable',r.variable_name,'canonical_path',r.canonical_path);
    ELSIF r.source_type = 'recipient_context' AND NOT (r.canonical_path = ANY(v_reserved_recipient)) THEN
      v_findings := v_findings || jsonb_build_object('severity','WARN','code','RECIPIENT_PATH_NOT_RESERVED','variable',r.variable_name,'canonical_path',r.canonical_path);
    END IF;

    -- Physical-leak detection for event_payload paths (A4).
    IF r.source_type = 'event_payload' THEN
      -- Schema-qualified?
      hit := false;
      FOR seg IN SELECT unnest(v_schema_prefixes) LOOP
        IF lower(r.canonical_path) LIKE seg || '%' THEN hit := true; EXIT; END IF;
      END LOOP;
      IF hit THEN
        v_findings := v_findings || jsonb_build_object('severity','ERROR','code','SCHEMA_QUALIFIED_PATH',
          'variable',r.variable_name,'canonical_path',r.canonical_path,
          'hint','event canonical paths must be business paths, not schema-qualified');
      END IF;

      -- Any segment starting with a physical table prefix?
      hit := false;
      FOR seg IN SELECT unnest(string_to_array(lower(r.canonical_path), '.')) LOOP
        IF seg LIKE 'bn\_%' ESCAPE '\'
           OR seg LIKE 'au\_%' ESCAPE '\'
           OR seg LIKE 'cl\_%' ESCAPE '\'
           OR seg LIKE 'cn\_%' ESCAPE '\'
           OR seg LIKE 'ip\_%' ESCAPE '\'
           OR seg LIKE 'ce\_%' ESCAPE '\'
           OR seg LIKE 'c3\_%' ESCAPE '\' THEN
          hit := true; EXIT;
        END IF;
      END LOOP;
      IF hit THEN
        v_findings := v_findings || jsonb_build_object('severity','ERROR','code','PHYSICAL_TABLE_PREFIX',
          'variable',r.variable_name,'canonical_path',r.canonical_path,
          'hint','path segment starts with a physical table prefix (bn_/au_/cl_/cn_/ip_/ce_/c3_)');
      END IF;

      -- Event schema membership check.
      SELECT s.id INTO v_schema_id FROM public.communication_hub_event_payload_schema s
      WHERE s.module_code = r.module_code AND s.event_code = r.event_code AND s.status <> 'RETIRED'
      ORDER BY s.schema_version DESC LIMIT 1;
      IF v_schema_id IS NULL THEN
        v_findings := v_findings || jsonb_build_object('severity','ERROR','code','EVENT_SCHEMA_MISSING',
          'module_code',r.module_code,'event_code',r.event_code,'variable',r.variable_name);
      ELSE
        SELECT EXISTS(SELECT 1 FROM public.communication_hub_event_payload_field f
          WHERE f.schema_id = v_schema_id AND f.canonical_path = r.canonical_path) INTO v_has_path;
        IF NOT v_has_path THEN
          v_findings := v_findings || jsonb_build_object('severity','ERROR','code','EVENT_PATH_NOT_IN_SCHEMA',
            'module_code',r.module_code,'event_code',r.event_code,'variable',r.variable_name,'canonical_path',r.canonical_path);
        ELSE
          -- Path exists — is it marked non-business?
          IF EXISTS(
            SELECT 1 FROM public.communication_hub_event_payload_field f
             WHERE f.schema_id = v_schema_id
               AND f.canonical_path = r.canonical_path
               AND f.protected_from_client_override = true
               AND coalesce(f.description,'') ILIKE '%non_business%'
          ) THEN
            v_findings := v_findings || jsonb_build_object('severity','ERROR','code','NON_BUSINESS_FIELD_REFERENCED',
              'variable',r.variable_name,'canonical_path',r.canonical_path,
              'hint','field is declared non-business; use its business reference instead');
          END IF;
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
