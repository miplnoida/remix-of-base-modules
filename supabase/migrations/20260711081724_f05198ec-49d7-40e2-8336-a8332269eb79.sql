
CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_review_policy(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module text := p_payload->>'module_code';
  v_event  text := p_payload->>'event_code';
  v_channel text := coalesce(p_payload->>'channel','email');
  v_tpl_ver uuid := nullif(p_payload->>'template_version_id','')::uuid;
  v_test_mode boolean := coalesce((p_payload->>'test_mode')::boolean, false);
  v_send_mode text := coalesce(p_payload->>'send_mode','live'); -- 'dry_run'|'live'|'auto_live_internal'
  v_preview_confirmed boolean := coalesce((p_payload->>'preview_confirmed')::boolean, false);
  v_subject text := coalesce(p_payload->>'rendered_subject','');
  v_body    text := coalesce(p_payload->>'rendered_body','');
  v_unresolved jsonb := coalesce(p_payload->'unresolved_tokens','[]'::jsonb);
  v_policy communication_hub_event_review_policy%ROWTYPE;
  v_blockers text[] := ARRAY[]::text[];
  v_warnings text[] := ARRAY[]::text[];
  v_composite text;
  v_required_action text := null;
BEGIN
  IF v_module IS NULL OR v_event IS NULL THEN
    RETURN jsonb_build_object('allowed', false,
      'blockers', jsonb_build_array('missing_module_or_event'),
      'warnings','[]'::jsonb,'review_policy',null,'required_action',null);
  END IF;

  SELECT * INTO v_policy
    FROM communication_hub_event_review_policy
   WHERE module_code = v_module AND event_code = v_event AND channel = v_channel
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'blockers', jsonb_build_array('review_policy_missing'),
      'warnings','[]'::jsonb,
      'review_policy', null,
      'required_action','configure_review_policy');
  END IF;

  IF v_policy.preview_required AND v_send_mode = 'live' AND NOT v_preview_confirmed THEN
    v_blockers := array_append(v_blockers,'preview_required');
    v_required_action := coalesce(v_required_action,'operator_must_confirm_preview');
  END IF;

  IF v_policy.require_template_approval THEN
    IF v_policy.approval_status NOT IN ('approved_internal','approved_external') THEN
      v_blockers := array_append(v_blockers,'template_not_approved_for_internal');
      v_required_action := coalesce(v_required_action,'approve_template');
    END IF;
    IF v_policy.approved_template_version_id IS NOT NULL
       AND v_tpl_ver IS NOT NULL
       AND v_policy.approved_template_version_id <> v_tpl_ver THEN
      v_blockers := array_append(v_blockers,'template_version_not_approved');
    END IF;
  END IF;

  IF v_policy.require_legal_approval AND v_policy.approval_status NOT IN ('approved_external','approved_internal') THEN
    v_blockers := array_append(v_blockers,'legal_approval_required');
  END IF;

  IF jsonb_typeof(v_unresolved) = 'array' AND jsonb_array_length(v_unresolved) > 0 THEN
    v_blockers := array_append(v_blockers,'unresolved_tokens_present');
  END IF;

  v_composite := lower(coalesce(v_subject,'') || ' ' || coalesce(v_body,''));
  IF v_composite ~ '\{\{[^}]+\}\}' OR v_composite ~ '\ydummy\y' OR v_composite ~ '\yplaceholder\y' THEN
    IF v_send_mode = 'live' THEN
      v_blockers := array_append(v_blockers,'dummy_template_wording_detected');
    ELSE
      v_warnings := array_append(v_warnings,'dummy_template_wording_detected');
    END IF;
  END IF;

  -- Dry-run relaxation: keep only review_policy_missing as blocker
  IF v_send_mode = 'dry_run' OR v_test_mode THEN
    v_warnings := array_cat(v_warnings, v_blockers);
    v_blockers := ARRAY[]::text[];
  END IF;

  RETURN jsonb_build_object(
    'allowed', (array_length(v_blockers,1) IS NULL),
    'blockers', to_jsonb(v_blockers),
    'warnings', to_jsonb(v_warnings),
    'review_policy', to_jsonb(v_policy),
    'required_action', v_required_action
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_comm_hub_review_policy(jsonb) TO authenticated, service_role;
