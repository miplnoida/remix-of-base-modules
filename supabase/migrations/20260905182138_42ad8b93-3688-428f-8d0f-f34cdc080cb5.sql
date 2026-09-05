-- Phase 4: Internal Audit Template Library — governed programme template lifecycle (additive only)

ALTER TABLE public.ia_audit_programs
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cloned_from_id uuid,
  ADD COLUMN IF NOT EXISTS source_engagement_id uuid,
  ADD COLUMN IF NOT EXISTS category text;

CREATE INDEX IF NOT EXISTS ia_audit_programs_lineage_idx ON public.ia_audit_programs (parent_program_id);
CREATE INDEX IF NOT EXISTS ia_audit_programs_area_idx ON public.ia_audit_programs (audit_area);

-- Allow governed default flag / lineage bookkeeping on frozen versions
CREATE OR REPLACE FUNCTION public.ia_guard_program_master_immutability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_old jsonb; v_new jsonb; v_k text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF COALESCE(OLD.status,'Draft') <> 'Draft' THEN
      RAISE EXCEPTION 'IA_PROGRAMME_FROZEN: programme % is % and cannot be deleted', OLD.id, OLD.status;
    END IF;
    RETURN OLD;
  END IF;
  IF COALESCE(OLD.status,'Draft') IN ('Approved','Published','Retired','Superseded') THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
    FOR v_k IN SELECT jsonb_object_keys(v_old) LOOP
      IF v_k NOT IN ('status','retired_at','published_at','approved_at','approved_by','is_active',
                     'updated_at','updated_by','version_notes','is_default')
         AND v_old->v_k IS DISTINCT FROM v_new->v_k THEN
        RAISE EXCEPTION 'IA_PROGRAMME_FROZEN: programme % is % — field "%" cannot be changed. Create a new version instead.', OLD.id, OLD.status, v_k;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END; $function$;

-- Capability helper: template/methodology administration
CREATE OR REPLACE FUNCTION public.ia_can_manage_templates(_action text DEFAULT 'edit')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
       public.ia_actor_can('audit_template_library', _action)
    OR public.ia_actor_can('audit_configuration', 'configure')
    OR public.has_role(auth.uid(), 'Admin'::app_role)
  );
$function$;

-- Lineage root helper
CREATE OR REPLACE FUNCTION public.ia_programme_root(p_program_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
  SELECT COALESCE(p.parent_program_id, p.id) FROM public.ia_audit_programs p WHERE p.id = p_program_id;
$function$;

-- Copy procedures from one programme to another (methodology only)
CREATE OR REPLACE FUNCTION public.ia_copy_programme_procedures(p_from uuid, p_to uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_count int;
BEGIN
  INSERT INTO public.ia_audit_procedures (
    audit_program_id, procedure_no, title, description, expected_result, evidence_required,
    test_type, sort_order, is_active, rcm_control_id, rcm_risk_id, rcm_test_id, objective,
    criteria, sampling_method, planned_sample_size, is_key, na_rationale_requirement)
  SELECT p_to, pr.procedure_no, pr.title, pr.description, pr.expected_result, pr.evidence_required,
         pr.test_type, pr.sort_order, true, pr.rcm_control_id, pr.rcm_risk_id, pr.rcm_test_id, pr.objective,
         pr.criteria, pr.sampling_method, pr.planned_sample_size, COALESCE(pr.is_key,false),
         COALESCE(pr.na_rationale_requirement,'Not Required')
    FROM public.ia_audit_procedures pr
   WHERE pr.audit_program_id = p_from AND COALESCE(pr.is_active,true);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $function$;

-- Create a new draft version of an existing programme template
CREATE OR REPLACE FUNCTION public.ia_create_programme_version(p_program_id uuid, p_change_summary text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_actor text := public.ia_actor_label(); v_src record; v_root uuid; v_next int; v_id uuid; v_steps int;
BEGIN
  IF NOT public.ia_can_manage_templates('create_version') THEN
    RETURN jsonb_build_object('success', false, 'code','IA_FORBIDDEN','error','You do not have permission to create a new template version');
  END IF;
  SELECT * INTO v_src FROM public.ia_audit_programs WHERE id = p_program_id;
  IF v_src IS NULL THEN RETURN jsonb_build_object('success', false, 'code','IA_NOT_FOUND','error','Programme template not found'); END IF;
  v_root := COALESCE(v_src.parent_program_id, v_src.id);
  IF EXISTS (SELECT 1 FROM public.ia_audit_programs WHERE COALESCE(parent_program_id,id) = v_root AND COALESCE(status,'Draft') = 'Draft') THEN
    RETURN jsonb_build_object('success', false, 'code','IA_DRAFT_VERSION_EXISTS','error','A draft version of this programme already exists');
  END IF;
  SELECT COALESCE(MAX(version),0) + 1 INTO v_next FROM public.ia_audit_programs WHERE COALESCE(parent_program_id,id) = v_root;

  INSERT INTO public.ia_audit_programs (
    program_name, program_code, audit_area, category, objective, scope, methodology,
    procedure_steps_json, expected_evidence_json, linked_risks_json, linked_controls_json,
    status, version, is_active, parent_program_id, version_notes, created_by, updated_by)
  VALUES (v_src.program_name, v_src.program_code, v_src.audit_area, v_src.category, v_src.objective, v_src.scope, v_src.methodology,
    v_src.procedure_steps_json, v_src.expected_evidence_json, v_src.linked_risks_json, v_src.linked_controls_json,
    'Draft', v_next, true, v_root, p_change_summary, v_actor, v_actor)
  RETURNING id INTO v_id;

  v_steps := public.ia_copy_programme_procedures(p_program_id, v_id);
  PERFORM public.ia_log_event('IA.PROGRAMME_TEMPLATE.VERSION_CREATED','audit_program', v_id, NULL, NULL, NULL,
    jsonb_build_object('source_program_id', p_program_id, 'version', v_next, 'procedures', v_steps), p_change_summary, NULL, 'ia_create_programme_version');
  RETURN jsonb_build_object('success', true, 'program_id', v_id, 'version', v_next, 'procedures', v_steps);
END; $function$;

-- Clone a programme template into a brand new draft lineage
CREATE OR REPLACE FUNCTION public.ia_clone_programme(p_program_id uuid, p_new_name text, p_new_code text, p_audit_area text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_actor text := public.ia_actor_label(); v_src record; v_id uuid; v_steps int;
BEGIN
  IF NOT public.ia_can_manage_templates('clone') THEN
    RETURN jsonb_build_object('success', false, 'code','IA_FORBIDDEN','error','You do not have permission to clone templates');
  END IF;
  IF COALESCE(btrim(p_new_name),'') = '' OR COALESCE(btrim(p_new_code),'') = '' THEN
    RETURN jsonb_build_object('success', false, 'code','IA_INVALID','error','A name and code are required for the cloned template');
  END IF;
  SELECT * INTO v_src FROM public.ia_audit_programs WHERE id = p_program_id;
  IF v_src IS NULL THEN RETURN jsonb_build_object('success', false, 'code','IA_NOT_FOUND','error','Programme template not found'); END IF;

  INSERT INTO public.ia_audit_programs (
    program_name, program_code, audit_area, category, objective, scope, methodology,
    procedure_steps_json, expected_evidence_json, linked_risks_json, linked_controls_json,
    status, version, is_active, cloned_from_id, version_notes, created_by, updated_by)
  VALUES (btrim(p_new_name), btrim(p_new_code), COALESCE(p_audit_area, v_src.audit_area), v_src.category,
    v_src.objective, v_src.scope, v_src.methodology,
    v_src.procedure_steps_json, v_src.expected_evidence_json, v_src.linked_risks_json, v_src.linked_controls_json,
    'Draft', 1, true, p_program_id,
    'Cloned from ' || v_src.program_name || ' V' || COALESCE(v_src.version,1), v_actor, v_actor)
  RETURNING id INTO v_id;

  v_steps := public.ia_copy_programme_procedures(p_program_id, v_id);
  PERFORM public.ia_log_event('IA.PROGRAMME_TEMPLATE.CLONED','audit_program', v_id, NULL, NULL, NULL,
    jsonb_build_object('source_program_id', p_program_id, 'procedures', v_steps), NULL, NULL, 'ia_clone_programme');
  RETURN jsonb_build_object('success', true, 'program_id', v_id, 'procedures', v_steps);
END; $function$;

-- Approve / activate a draft version; supersede the previous approved version in the same lineage
CREATE OR REPLACE FUNCTION public.ia_approve_programme(p_program_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_actor text := public.ia_actor_label(); v_src record; v_root uuid; v_superseded int := 0; v_procs int;
BEGIN
  IF NOT public.ia_can_manage_templates('approve') THEN
    RETURN jsonb_build_object('success', false, 'code','IA_FORBIDDEN','error','You do not have permission to approve templates');
  END IF;
  SELECT * INTO v_src FROM public.ia_audit_programs WHERE id = p_program_id;
  IF v_src IS NULL THEN RETURN jsonb_build_object('success', false, 'code','IA_NOT_FOUND','error','Programme template not found'); END IF;
  IF COALESCE(v_src.status,'Draft') <> 'Draft' THEN
    RETURN jsonb_build_object('success', false, 'code','IA_NOT_DRAFT','error','Only a draft version can be approved');
  END IF;
  SELECT count(*) INTO v_procs FROM public.ia_audit_procedures WHERE audit_program_id = p_program_id AND COALESCE(is_active,true);
  IF v_procs = 0 THEN
    RETURN jsonb_build_object('success', false, 'code','IA_NO_PROCEDURES','error','A programme must contain at least one procedure before approval');
  END IF;
  v_root := COALESCE(v_src.parent_program_id, v_src.id);

  UPDATE public.ia_audit_programs
     SET status = 'Superseded', updated_at = now(), updated_by = v_actor
   WHERE COALESCE(parent_program_id,id) = v_root AND id <> p_program_id AND COALESCE(status,'Draft') IN ('Approved','Published');
  GET DIAGNOSTICS v_superseded = ROW_COUNT;

  UPDATE public.ia_audit_programs
     SET status = 'Approved', approved_by = v_actor, approved_at = now(), is_active = true,
         updated_at = now(), updated_by = v_actor
   WHERE id = p_program_id;

  PERFORM public.ia_log_event('IA.PROGRAMME_TEMPLATE.APPROVED','audit_program', p_program_id, NULL, NULL, NULL,
    jsonb_build_object('version', v_src.version, 'superseded_versions', v_superseded), NULL, NULL, 'ia_approve_programme');
  RETURN jsonb_build_object('success', true, 'program_id', p_program_id, 'superseded', v_superseded);
END; $function$;

-- Retire a programme version (history preserved, no longer selectable)
CREATE OR REPLACE FUNCTION public.ia_retire_programme(p_program_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_actor text := public.ia_actor_label(); v_src record;
BEGIN
  IF NOT public.ia_can_manage_templates('retire') THEN
    RETURN jsonb_build_object('success', false, 'code','IA_FORBIDDEN','error','You do not have permission to retire templates');
  END IF;
  SELECT * INTO v_src FROM public.ia_audit_programs WHERE id = p_program_id;
  IF v_src IS NULL THEN RETURN jsonb_build_object('success', false, 'code','IA_NOT_FOUND','error','Programme template not found'); END IF;
  IF COALESCE(v_src.status,'Draft') = 'Retired' THEN
    RETURN jsonb_build_object('success', true, 'program_id', p_program_id, 'already_retired', true);
  END IF;
  UPDATE public.ia_audit_programs
     SET status = 'Retired', retired_at = now(), is_active = false, is_default = false,
         version_notes = COALESCE(p_reason, version_notes), updated_at = now(), updated_by = v_actor
   WHERE id = p_program_id;
  PERFORM public.ia_log_event('IA.PROGRAMME_TEMPLATE.RETIRED','audit_program', p_program_id, NULL, NULL, NULL,
    jsonb_build_object('version', v_src.version), p_reason, NULL, 'ia_retire_programme');
  RETURN jsonb_build_object('success', true, 'program_id', p_program_id);
END; $function$;

-- Recommended default programme per audit area
CREATE OR REPLACE FUNCTION public.ia_set_default_programme(p_program_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_actor text := public.ia_actor_label(); v_src record;
BEGIN
  IF NOT public.ia_can_manage_templates('set_default') THEN
    RETURN jsonb_build_object('success', false, 'code','IA_FORBIDDEN','error','You do not have permission to set a default template');
  END IF;
  SELECT * INTO v_src FROM public.ia_audit_programs WHERE id = p_program_id;
  IF v_src IS NULL THEN RETURN jsonb_build_object('success', false, 'code','IA_NOT_FOUND','error','Programme template not found'); END IF;
  IF COALESCE(v_src.status,'Draft') NOT IN ('Approved','Published') THEN
    RETURN jsonb_build_object('success', false, 'code','IA_NOT_APPROVED','error','Only an approved version can be the recommended default');
  END IF;
  UPDATE public.ia_audit_programs SET is_default = false, updated_at = now(), updated_by = v_actor
   WHERE COALESCE(audit_area,'') = COALESCE(v_src.audit_area,'') AND is_default AND id <> p_program_id;
  UPDATE public.ia_audit_programs SET is_default = true, updated_at = now(), updated_by = v_actor WHERE id = p_program_id;
  PERFORM public.ia_log_event('IA.PROGRAMME_TEMPLATE.DEFAULT_SET','audit_program', p_program_id, NULL, NULL, NULL,
    jsonb_build_object('audit_area', v_src.audit_area, 'version', v_src.version), NULL, NULL, 'ia_set_default_programme');
  RETURN jsonb_build_object('success', true, 'program_id', p_program_id);
END; $function$;

-- Delete an unused draft only
CREATE OR REPLACE FUNCTION public.ia_delete_programme_draft(p_program_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_src record; v_used int;
BEGIN
  IF NOT public.ia_can_manage_templates('delete') THEN
    RETURN jsonb_build_object('success', false, 'code','IA_FORBIDDEN','error','You do not have permission to delete templates');
  END IF;
  SELECT * INTO v_src FROM public.ia_audit_programs WHERE id = p_program_id;
  IF v_src IS NULL THEN RETURN jsonb_build_object('success', false, 'code','IA_NOT_FOUND','error','Programme template not found'); END IF;
  IF COALESCE(v_src.status,'Draft') <> 'Draft' THEN
    RETURN jsonb_build_object('success', false, 'code','IA_NOT_DRAFT','error','Only an unused draft can be deleted; retire the version instead');
  END IF;
  SELECT count(*) INTO v_used FROM public.ia_engagement_programmes WHERE source_program_id = p_program_id;
  IF v_used > 0 THEN
    RETURN jsonb_build_object('success', false, 'code','IA_TEMPLATE_IN_USE','error','This template is referenced by an audit and cannot be deleted');
  END IF;
  DELETE FROM public.ia_audit_procedures WHERE audit_program_id = p_program_id;
  DELETE FROM public.ia_audit_programs WHERE id = p_program_id;
  RETURN jsonb_build_object('success', true);
END; $function$;

-- Where used
CREATE OR REPLACE FUNCTION public.ia_programme_usage(p_program_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_rows jsonb;
BEGIN
  IF NOT public.ia_is_ia_user() THEN
    RETURN jsonb_build_object('success', false, 'code','IA_FORBIDDEN','error','Internal Audit access required');
  END IF;
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'bound_at' DESC), '[]'::jsonb) INTO v_rows FROM (
    SELECT jsonb_build_object(
      'engagement_id', e.id,
      'engagement_code', e.engagement_code,
      'engagement_name', e.engagement_name,
      'engagement_status', e.status,
      'programme_status', ep.status,
      'version', ep.source_program_version,
      'bound_at', ep.created_at
    ) x
    FROM public.ia_engagement_programmes ep
    JOIN public.ia_audit_engagements e ON e.id = ep.engagement_id
    WHERE ep.source_program_id = p_program_id
  ) s;
  RETURN jsonb_build_object('success', true, 'usage', v_rows);
END; $function$;

-- Create a reusable programme template from a completed/designed audit (methodology only)
CREATE OR REPLACE FUNCTION public.ia_create_programme_from_engagement(
  p_engagement_id uuid, p_new_name text, p_new_code text, p_audit_area text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_actor text := public.ia_actor_label(); v_ep record; v_id uuid; v_count int;
BEGIN
  IF NOT public.ia_can_manage_templates('create') THEN
    RETURN jsonb_build_object('success', false, 'code','IA_FORBIDDEN','error','You do not have permission to create templates');
  END IF;
  IF COALESCE(btrim(p_new_name),'') = '' OR COALESCE(btrim(p_new_code),'') = '' THEN
    RETURN jsonb_build_object('success', false, 'code','IA_INVALID','error','A name and code are required');
  END IF;
  SELECT * INTO v_ep FROM public.ia_engagement_programmes
   WHERE engagement_id = p_engagement_id ORDER BY created_at DESC LIMIT 1;
  IF v_ep IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code','IA_NO_PROGRAMME','error','This audit has no programme to harvest');
  END IF;

  INSERT INTO public.ia_audit_programs (
    program_name, program_code, audit_area, objective, scope, methodology,
    status, version, is_active, source_engagement_id, version_notes, created_by, updated_by)
  VALUES (btrim(p_new_name), btrim(p_new_code), p_audit_area, v_ep.objective, v_ep.scope, v_ep.methodology,
    'Draft', 1, true, p_engagement_id, 'Created from audit methodology', v_actor, v_actor)
  RETURNING id INTO v_id;

  -- Methodology content only: no samples, evidence, exceptions, findings, responses, actions,
  -- reviewer comments, conclusions or actual results are copied.
  INSERT INTO public.ia_audit_procedures (
    audit_program_id, procedure_no, title, description, objective, criteria, expected_result,
    evidence_required, test_type, sampling_method, planned_sample_size, na_rationale_requirement,
    is_key, sort_order, is_active, rcm_control_id, rcm_risk_id, rcm_test_id)
  SELECT v_id, s.step_no, s.title, s.description, s.objective, s.criteria, s.expected_result,
         s.evidence_required, s.test_type, s.sampling_method, s.planned_sample_size,
         COALESCE(s.na_rationale_requirement,'Not Required'), COALESCE(s.is_key,false),
         COALESCE(s.sort_order,0), true, s.rcm_control_id, s.rcm_risk_id, s.source_rcm_test_id
    FROM public.ia_engagement_programme_steps s
   WHERE s.engagement_programme_id = v_ep.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM public.ia_log_event('IA.PROGRAMME_TEMPLATE.CREATED_FROM_AUDIT','audit_program', v_id, p_engagement_id, NULL, NULL,
    jsonb_build_object('engagement_programme_id', v_ep.id, 'procedures', v_count), NULL, NULL, 'ia_create_programme_from_engagement');
  RETURN jsonb_build_object('success', true, 'program_id', v_id, 'procedures', v_count);
END; $function$;

GRANT EXECUTE ON FUNCTION public.ia_can_manage_templates(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ia_programme_root(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ia_create_programme_version(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ia_clone_programme(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ia_approve_programme(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ia_retire_programme(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ia_set_default_programme(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ia_delete_programme_draft(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ia_programme_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ia_create_programme_from_engagement(uuid, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.ia_copy_programme_procedures(uuid, uuid) FROM PUBLIC;