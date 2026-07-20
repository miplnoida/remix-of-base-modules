-- CH-SIMPLE-P2B — Canonical recipient-policy update RPC + tightened audit
-- ---------------------------------------------------------------
-- Adds the transactional writer that the frontend service will call.
-- Every change goes through this function so that:
--   * server-side validation is authoritative
--   * per-field audit rows are written in the same transaction
--   * policy_version and configuration_version increment atomically
--   * changed_by/changed_at/change_reason are always populated
--   * operating-mode fields are never touched
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_communication_recipient_policy(
  p_active_mode                       text        DEFAULT NULL,
  p_single_configured_address         text        DEFAULT NULL,
  p_clear_single_configured_address   boolean     DEFAULT false,
  p_approved_named_addresses          jsonb       DEFAULT NULL,
  p_approved_domains                  jsonb       DEFAULT NULL,
  p_max_recipients_per_request        integer     DEFAULT NULL,
  p_max_to_recipients                 integer     DEFAULT NULL,
  p_cc_allowed                        boolean     DEFAULT NULL,
  p_max_cc_recipients                 integer     DEFAULT NULL,
  p_bcc_allowed                       boolean     DEFAULT NULL,
  p_max_bcc_recipients                integer     DEFAULT NULL,
  p_external_addresses_permitted      boolean     DEFAULT NULL,
  p_subdomains_permitted              boolean     DEFAULT NULL,
  p_reason                            text        DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor       uuid;
  v_before      public.communication_hub_recipient_policy%ROWTYPE;
  v_after       public.communication_hub_recipient_policy%ROWTYPE;
  v_new_mode    text;
  v_new_single  text;
  v_named       jsonb;
  v_domains     jsonb;
  v_addr        text;
  v_dom         text;
  v_x           jsonb;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'Admin'::public.app_role) THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'change_reason_required';
  END IF;

  SELECT * INTO v_before
    FROM public.communication_hub_recipient_policy
    WHERE singleton_guard = 'primary'
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'recipient_policy_singleton_missing';
  END IF;

  v_new_mode := COALESCE(p_active_mode, v_before.active_mode::text);
  IF v_new_mode NOT IN (
    'DISABLED','SINGLE_CONFIGURED_RECIPIENT','APPROVED_NAMED_RECIPIENTS',
    'APPROVED_DOMAINS','CONTROLLED_EXTERNAL_RECIPIENTS'
  ) THEN
    RAISE EXCEPTION 'invalid_recipient_mode: %', v_new_mode;
  END IF;

  IF v_new_mode = 'CONTROLLED_EXTERNAL_RECIPIENTS' THEN
    RAISE EXCEPTION 'controlled_external_recipients_not_certified';
  END IF;

  -- Normalise single-configured address (case-insensitive, trimmed).
  IF p_clear_single_configured_address THEN
    v_new_single := NULL;
  ELSIF p_single_configured_address IS NOT NULL THEN
    v_new_single := lower(btrim(p_single_configured_address));
    IF v_new_single = '' OR v_new_single NOT LIKE '_%@_%._%' THEN
      RAISE EXCEPTION 'invalid_single_configured_address';
    END IF;
  ELSE
    v_new_single := v_before.single_configured_address;
  END IF;

  IF v_new_mode = 'SINGLE_CONFIGURED_RECIPIENT' AND v_new_single IS NULL THEN
    RAISE EXCEPTION 'single_configured_address_required_for_mode';
  END IF;

  -- Normalise named addresses (jsonb array of {address, active, note?}).
  IF p_approved_named_addresses IS NOT NULL THEN
    IF jsonb_typeof(p_approved_named_addresses) <> 'array' THEN
      RAISE EXCEPTION 'approved_named_addresses_must_be_array';
    END IF;
    v_named := '[]'::jsonb;
    FOR v_x IN SELECT jsonb_array_elements(p_approved_named_addresses) LOOP
      v_addr := lower(btrim(COALESCE(v_x->>'address','')));
      IF v_addr = '' OR v_addr NOT LIKE '_%@_%._%' THEN
        RAISE EXCEPTION 'invalid_named_address: %', v_x->>'address';
      END IF;
      v_named := v_named || jsonb_build_object(
        'address', v_addr,
        'active',  COALESCE((v_x->>'active')::boolean, true),
        'note',    COALESCE(v_x->>'note', NULL)
      );
    END LOOP;
  ELSE
    v_named := v_before.approved_named_addresses;
  END IF;

  -- Normalise domains (jsonb array of {domain, active, note?}).
  IF p_approved_domains IS NOT NULL THEN
    IF jsonb_typeof(p_approved_domains) <> 'array' THEN
      RAISE EXCEPTION 'approved_domains_must_be_array';
    END IF;
    v_domains := '[]'::jsonb;
    FOR v_x IN SELECT jsonb_array_elements(p_approved_domains) LOOP
      v_dom := lower(btrim(COALESCE(v_x->>'domain','')));
      IF v_dom LIKE '@%' THEN v_dom := substring(v_dom from 2); END IF;
      IF v_dom = '' OR v_dom !~ '^[a-z0-9.-]+\.[a-z]{2,}$' THEN
        RAISE EXCEPTION 'invalid_domain: %', v_x->>'domain';
      END IF;
      v_domains := v_domains || jsonb_build_object(
        'domain', v_dom,
        'active', COALESCE((v_x->>'active')::boolean, true),
        'note',   COALESCE(v_x->>'note', NULL)
      );
    END LOOP;
  ELSE
    v_domains := v_before.approved_domains;
  END IF;

  IF v_new_mode = 'APPROVED_NAMED_RECIPIENTS'
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_named) e
                      WHERE COALESCE((e->>'active')::boolean, true))
  THEN
    RAISE EXCEPTION 'no_active_named_addresses_for_mode';
  END IF;
  IF v_new_mode = 'APPROVED_DOMAINS'
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_domains) e
                      WHERE COALESCE((e->>'active')::boolean, true))
  THEN
    RAISE EXCEPTION 'no_active_domains_for_mode';
  END IF;

  -- Apply the update (bump versions here so recipient-policy audit reflects new versions).
  UPDATE public.communication_hub_recipient_policy
     SET active_mode                  = v_new_mode::communication_recipient_policy_mode,
         single_configured_address    = v_new_single,
         approved_named_addresses     = v_named,
         approved_domains             = v_domains,
         max_recipients_per_request   = COALESCE(p_max_recipients_per_request,  max_recipients_per_request),
         max_to_recipients            = COALESCE(p_max_to_recipients,           max_to_recipients),
         cc_allowed                   = COALESCE(p_cc_allowed,                  cc_allowed),
         max_cc_recipients            = COALESCE(p_max_cc_recipients,           max_cc_recipients),
         bcc_allowed                  = COALESCE(p_bcc_allowed,                 bcc_allowed),
         max_bcc_recipients           = COALESCE(p_max_bcc_recipients,          max_bcc_recipients),
         external_addresses_permitted = COALESCE(p_external_addresses_permitted, external_addresses_permitted),
         subdomains_permitted         = COALESCE(p_subdomains_permitted,        subdomains_permitted),
         policy_version               = policy_version + 1,
         configuration_version        = configuration_version + 1,
         change_reason                = btrim(p_reason),
         changed_by                   = v_actor,
         changed_at                   = now(),
         updated_at                   = now()
   WHERE singleton_guard = 'primary'
  RETURNING * INTO v_after;

  -- Per-field audit rows (only where value actually changed).
  IF v_before.active_mode IS DISTINCT FROM v_after.active_mode THEN
    INSERT INTO public.communication_hub_recipient_policy_audit
      (policy_id, changed_field, old_value, new_value, reason, changed_by,
       policy_version, configuration_version)
      VALUES (v_after.id, 'active_mode',
              to_jsonb(v_before.active_mode::text), to_jsonb(v_after.active_mode::text),
              btrim(p_reason), v_actor, v_after.policy_version, v_after.configuration_version);
  END IF;
  IF v_before.single_configured_address IS DISTINCT FROM v_after.single_configured_address THEN
    INSERT INTO public.communication_hub_recipient_policy_audit
      (policy_id, changed_field, old_value, new_value, reason, changed_by,
       policy_version, configuration_version)
      VALUES (v_after.id, 'single_configured_address',
              to_jsonb(v_before.single_configured_address), to_jsonb(v_after.single_configured_address),
              btrim(p_reason), v_actor, v_after.policy_version, v_after.configuration_version);
  END IF;
  IF v_before.approved_named_addresses IS DISTINCT FROM v_after.approved_named_addresses THEN
    INSERT INTO public.communication_hub_recipient_policy_audit
      (policy_id, changed_field, old_value, new_value, reason, changed_by,
       policy_version, configuration_version)
      VALUES (v_after.id, 'approved_named_addresses',
              v_before.approved_named_addresses, v_after.approved_named_addresses,
              btrim(p_reason), v_actor, v_after.policy_version, v_after.configuration_version);
  END IF;
  IF v_before.approved_domains IS DISTINCT FROM v_after.approved_domains THEN
    INSERT INTO public.communication_hub_recipient_policy_audit
      (policy_id, changed_field, old_value, new_value, reason, changed_by,
       policy_version, configuration_version)
      VALUES (v_after.id, 'approved_domains',
              v_before.approved_domains, v_after.approved_domains,
              btrim(p_reason), v_actor, v_after.policy_version, v_after.configuration_version);
  END IF;
  IF v_before.max_recipients_per_request IS DISTINCT FROM v_after.max_recipients_per_request THEN
    INSERT INTO public.communication_hub_recipient_policy_audit
      (policy_id, changed_field, old_value, new_value, reason, changed_by,
       policy_version, configuration_version)
      VALUES (v_after.id, 'max_recipients_per_request',
              to_jsonb(v_before.max_recipients_per_request), to_jsonb(v_after.max_recipients_per_request),
              btrim(p_reason), v_actor, v_after.policy_version, v_after.configuration_version);
  END IF;
  IF v_before.max_to_recipients IS DISTINCT FROM v_after.max_to_recipients THEN
    INSERT INTO public.communication_hub_recipient_policy_audit
      (policy_id, changed_field, old_value, new_value, reason, changed_by,
       policy_version, configuration_version)
      VALUES (v_after.id, 'max_to_recipients',
              to_jsonb(v_before.max_to_recipients), to_jsonb(v_after.max_to_recipients),
              btrim(p_reason), v_actor, v_after.policy_version, v_after.configuration_version);
  END IF;
  IF v_before.cc_allowed IS DISTINCT FROM v_after.cc_allowed THEN
    INSERT INTO public.communication_hub_recipient_policy_audit
      (policy_id, changed_field, old_value, new_value, reason, changed_by,
       policy_version, configuration_version)
      VALUES (v_after.id, 'cc_allowed',
              to_jsonb(v_before.cc_allowed), to_jsonb(v_after.cc_allowed),
              btrim(p_reason), v_actor, v_after.policy_version, v_after.configuration_version);
  END IF;
  IF v_before.max_cc_recipients IS DISTINCT FROM v_after.max_cc_recipients THEN
    INSERT INTO public.communication_hub_recipient_policy_audit
      (policy_id, changed_field, old_value, new_value, reason, changed_by,
       policy_version, configuration_version)
      VALUES (v_after.id, 'max_cc_recipients',
              to_jsonb(v_before.max_cc_recipients), to_jsonb(v_after.max_cc_recipients),
              btrim(p_reason), v_actor, v_after.policy_version, v_after.configuration_version);
  END IF;
  IF v_before.bcc_allowed IS DISTINCT FROM v_after.bcc_allowed THEN
    INSERT INTO public.communication_hub_recipient_policy_audit
      (policy_id, changed_field, old_value, new_value, reason, changed_by,
       policy_version, configuration_version)
      VALUES (v_after.id, 'bcc_allowed',
              to_jsonb(v_before.bcc_allowed), to_jsonb(v_after.bcc_allowed),
              btrim(p_reason), v_actor, v_after.policy_version, v_after.configuration_version);
  END IF;
  IF v_before.max_bcc_recipients IS DISTINCT FROM v_after.max_bcc_recipients THEN
    INSERT INTO public.communication_hub_recipient_policy_audit
      (policy_id, changed_field, old_value, new_value, reason, changed_by,
       policy_version, configuration_version)
      VALUES (v_after.id, 'max_bcc_recipients',
              to_jsonb(v_before.max_bcc_recipients), to_jsonb(v_after.max_bcc_recipients),
              btrim(p_reason), v_actor, v_after.policy_version, v_after.configuration_version);
  END IF;
  IF v_before.external_addresses_permitted IS DISTINCT FROM v_after.external_addresses_permitted THEN
    INSERT INTO public.communication_hub_recipient_policy_audit
      (policy_id, changed_field, old_value, new_value, reason, changed_by,
       policy_version, configuration_version)
      VALUES (v_after.id, 'external_addresses_permitted',
              to_jsonb(v_before.external_addresses_permitted), to_jsonb(v_after.external_addresses_permitted),
              btrim(p_reason), v_actor, v_after.policy_version, v_after.configuration_version);
  END IF;
  IF v_before.subdomains_permitted IS DISTINCT FROM v_after.subdomains_permitted THEN
    INSERT INTO public.communication_hub_recipient_policy_audit
      (policy_id, changed_field, old_value, new_value, reason, changed_by,
       policy_version, configuration_version)
      VALUES (v_after.id, 'subdomains_permitted',
              to_jsonb(v_before.subdomains_permitted), to_jsonb(v_after.subdomains_permitted),
              btrim(p_reason), v_actor, v_after.policy_version, v_after.configuration_version);
  END IF;

  RETURN jsonb_build_object(
    'id', v_after.id,
    'active_mode', v_after.active_mode::text,
    'single_configured_address', v_after.single_configured_address,
    'approved_named_addresses', v_after.approved_named_addresses,
    'approved_domains', v_after.approved_domains,
    'max_recipients_per_request', v_after.max_recipients_per_request,
    'max_to_recipients', v_after.max_to_recipients,
    'cc_allowed', v_after.cc_allowed,
    'max_cc_recipients', v_after.max_cc_recipients,
    'bcc_allowed', v_after.bcc_allowed,
    'max_bcc_recipients', v_after.max_bcc_recipients,
    'external_addresses_permitted', v_after.external_addresses_permitted,
    'subdomains_permitted', v_after.subdomains_permitted,
    'policy_version', v_after.policy_version,
    'configuration_version', v_after.configuration_version,
    'change_reason', v_after.change_reason,
    'changed_by', v_after.changed_by,
    'changed_at', v_after.changed_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_communication_recipient_policy(
  text, text, boolean, jsonb, jsonb, integer, integer, boolean, integer,
  boolean, integer, boolean, boolean, text
) FROM public;
GRANT EXECUTE ON FUNCTION public.set_communication_recipient_policy(
  text, text, boolean, jsonb, jsonb, integer, integer, boolean, integer,
  boolean, integer, boolean, boolean, text
) TO authenticated;

COMMENT ON FUNCTION public.set_communication_recipient_policy IS
  'CH-SIMPLE-P2B canonical transactional writer for communication_hub_recipient_policy. Admin-only. Writes per-field audit rows atomically. Never modifies operating-mode settings.';
