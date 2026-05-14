
-- ============================================================
-- Phase 5 Completion: Add missing required RPC functions
-- ============================================================

-- 1. ia_detect_material_plan_changes — Standalone material change detector
CREATE OR REPLACE FUNCTION public.ia_detect_material_plan_changes(
  p_plan_id uuid,
  p_proposed_changes jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_key text;
  v_old_value text;
  v_new_value text;
  v_material_fields text[] := ARRAY['title','fiscal_year','risk_level','assigned_auditor','department_id','function_id','scope','objective','planned_start_date','planned_end_date','budget_hours'];
  v_material_changes jsonb := '[]'::jsonb;
  v_minor_changes jsonb := '[]'::jsonb;
  v_has_material boolean := false;
BEGIN
  SELECT * INTO v_plan FROM ia_annual_plans WHERE id = p_plan_id;
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_proposed_changes) LOOP
    v_new_value := p_proposed_changes->>v_key;
    v_old_value := to_jsonb(v_plan)->>v_key;

    IF v_old_value IS DISTINCT FROM v_new_value THEN
      IF v_key = ANY(v_material_fields) THEN
        v_has_material := true;
        v_material_changes := v_material_changes || jsonb_build_object(
          'field', v_key,
          'old_value', COALESCE(v_old_value, ''),
          'new_value', COALESCE(v_new_value, ''),
          'is_material', true
        );
      ELSE
        v_minor_changes := v_minor_changes || jsonb_build_object(
          'field', v_key,
          'old_value', COALESCE(v_old_value, ''),
          'new_value', COALESCE(v_new_value, ''),
          'is_material', false
        );
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'has_material_changes', v_has_material,
    'material_changes', v_material_changes,
    'minor_changes', v_minor_changes,
    'total_changes', jsonb_array_length(v_material_changes) + jsonb_array_length(v_minor_changes),
    'requires_reapproval', v_has_material,
    'plan_status', v_plan.status
  );
END;
$$;

-- 2. ia_start_annual_plan_approval_workflow — Named wrapper for plan approval
CREATE OR REPLACE FUNCTION public.ia_start_annual_plan_approval_workflow(
  p_plan_id uuid,
  p_submitted_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN ia_start_plan_approval_workflow(p_plan_id, p_submitted_by, false);
END;
$$;

-- 3. ia_start_annual_plan_revision_workflow — Named wrapper for revision approval
CREATE OR REPLACE FUNCTION public.ia_start_annual_plan_revision_workflow(
  p_plan_id uuid,
  p_submitted_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN ia_start_plan_approval_workflow(p_plan_id, p_submitted_by, true);
END;
$$;
