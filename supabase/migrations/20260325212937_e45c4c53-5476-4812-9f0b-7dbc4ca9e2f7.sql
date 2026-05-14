
-- ============================================================
-- Version-Anchored Engagement Governance
-- ============================================================

-- 1. Junction table: which engagements belong to which plan version
CREATE TABLE IF NOT EXISTS public.ia_plan_version_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id uuid NOT NULL,
  engagement_id uuid NOT NULL,
  -- Snapshot of engagement config at time of version creation
  engagement_snapshot jsonb DEFAULT '{}'::jsonb,
  -- Was this engagement added in this version vs inherited
  change_type text DEFAULT 'inherited', -- 'inherited', 'added', 'modified', 'removed'
  change_description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(plan_version_id, engagement_id)
);

-- 2. Add approved_version_number to engagements for gate checking
ALTER TABLE public.ia_audit_engagements 
  ADD COLUMN IF NOT EXISTS approved_plan_version integer;

-- 3. Update ia_start_plan_approval_workflow to snapshot engagements into version
CREATE OR REPLACE FUNCTION public.ia_start_plan_approval_workflow(
  p_plan_id uuid,
  p_submitted_by text DEFAULT 'SYSTEM',
  p_is_revision boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_event_type text;
  v_binding record;
  v_workflow_def record;
  v_first_step record;
  v_instance_id uuid;
  v_task_id uuid;
  v_version_number integer;
  v_version_id uuid;
  v_conflict_result jsonb;
  v_eng record;
BEGIN
  -- Load plan
  SELECT * INTO v_plan FROM ia_annual_plans WHERE id = p_plan_id;
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  -- Determine event type
  v_event_type := CASE WHEN p_is_revision THEN 'plan_revision' ELSE 'plan_approval' END;

  -- Validate current status
  IF NOT p_is_revision AND v_plan.status NOT IN ('Draft', 'Rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan must be in Draft or Rejected status to submit');
  END IF;
  IF p_is_revision AND v_plan.status NOT IN ('Approved', 'In Progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan must be Approved or In Progress to submit a revision');
  END IF;

  -- Run conflict check
  v_conflict_result := ia_validate_team_availability(p_plan_id := p_plan_id);
  IF (v_conflict_result->>'has_blocking')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Blocking team availability conflicts detected', 'conflicts', v_conflict_result->'conflicts');
  END IF;

  -- Get workflow binding
  SELECT * INTO v_binding FROM ia_plan_workflow_bindings WHERE event_type = v_event_type AND is_active = true;
  IF v_binding IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workflow binding found for ' || v_event_type);
  END IF;

  -- Get workflow definition
  SELECT * INTO v_workflow_def FROM workflow_definitions WHERE id = v_binding.workflow_definition_id AND is_active = true;
  IF v_workflow_def IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workflow definition is inactive or missing');
  END IF;

  -- Get first step
  SELECT * INTO v_first_step FROM workflow_steps WHERE workflow_id = v_workflow_def.id ORDER BY step_number LIMIT 1;
  IF v_first_step IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workflow has no steps configured');
  END IF;

  -- Increment version
  v_version_number := COALESCE(v_plan.current_version_number, 0) + 1;

  -- Create plan version record
  INSERT INTO ia_plan_versions (plan_id, version_number, snapshot_data, status_at_snapshot, change_summary, created_by)
  VALUES (
    p_plan_id, v_version_number,
    to_jsonb(v_plan),
    v_plan.status,
    CASE WHEN p_is_revision THEN 'Revision submitted' ELSE 'Initial submission' END,
    p_submitted_by
  )
  RETURNING id INTO v_version_id;

  -- *** NEW: Snapshot all child engagements into this version ***
  FOR v_eng IN 
    SELECT * FROM ia_audit_engagements 
    WHERE annual_plan_id = p_plan_id AND (is_active = true OR is_active IS NULL)
  LOOP
    INSERT INTO ia_plan_version_engagements (plan_version_id, engagement_id, engagement_snapshot, change_type)
    VALUES (
      v_version_id,
      v_eng.id,
      to_jsonb(v_eng),
      CASE 
        WHEN v_version_number = 1 THEN 'added'
        ELSE 'inherited'
      END
    );
  END LOOP;

  -- Create workflow instance
  INSERT INTO workflow_instances (
    workflow_id, workflow_name, source_module, source_record_id, source_record_name,
    current_step_id, status, started_by, started_by_name, metadata
  )
  VALUES (
    v_workflow_def.id, v_workflow_def.name,
    'ia_annual_plan', p_plan_id::text, v_plan.title,
    v_first_step.id, 'InProgress', p_submitted_by, p_submitted_by,
    jsonb_build_object('version_number', v_version_number, 'is_revision', p_is_revision, 'plan_version_id', v_version_id)
  )
  RETURNING id INTO v_instance_id;

  -- Create first task
  INSERT INTO workflow_tasks (
    instance_id, step_id, step_name, status
  )
  VALUES (v_instance_id, v_first_step.id, v_first_step.step_name, 'Pending')
  RETURNING id INTO v_task_id;

  -- Log workflow start
  INSERT INTO workflow_logs (instance_id, step_id, step_name, action, performed_by, performed_by_name, details)
  VALUES (v_instance_id, v_first_step.id, v_first_step.step_name, 'workflow_started', p_submitted_by, p_submitted_by,
    'Plan ' || CASE WHEN p_is_revision THEN 'revision' ELSE 'approval' END || ' workflow started (v' || v_version_number || ')');

  -- Update plan status and version
  UPDATE ia_annual_plans
  SET status = CASE WHEN p_is_revision THEN 'Pending Revision Approval' ELSE 'Submitted' END,
      current_version_number = v_version_number,
      workflow_instance_id = v_instance_id,
      updated_at = now(),
      updated_by = p_submitted_by
  WHERE id = p_plan_id;

  RETURN jsonb_build_object(
    'success', true,
    'workflow_instance_id', v_instance_id,
    'task_id', v_task_id,
    'version_number', v_version_number,
    'plan_version_id', v_version_id,
    'new_status', CASE WHEN p_is_revision THEN 'Pending Revision Approval' ELSE 'Submitted' END,
    'engagements_snapshot_count', (SELECT count(*) FROM ia_plan_version_engagements WHERE plan_version_id = v_version_id)
  );
END;
$$;

-- 4. Update ia_can_start_engagement to check version-level approval
CREATE OR REPLACE FUNCTION public.ia_can_start_engagement(p_engagement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eng record;
  v_plan_status text;
  v_plan_version_number integer;
  v_reasons text[] := '{}';
  v_intimation_done boolean;
  v_team_notice_done boolean;
  v_version_approved boolean;
BEGIN
  SELECT e.*, ap.status AS plan_status, ap.current_version_number AS plan_current_version
  INTO v_eng
  FROM ia_audit_engagements e
  LEFT JOIN ia_annual_plans ap ON ap.id = e.annual_plan_id
  WHERE e.id = p_engagement_id;

  IF v_eng IS NULL THEN
    RETURN jsonb_build_object('can_start', false, 'reasons', ARRAY['Engagement not found']);
  END IF;

  -- Gate 1: Parent plan must be Approved or In Progress
  IF v_eng.plan_status IS NOT NULL AND v_eng.plan_status NOT IN ('Approved', 'In Progress') THEN
    v_reasons := v_reasons || ('Parent plan status is "' || COALESCE(v_eng.plan_status, 'NULL') || '" — must be Approved or In Progress');
  END IF;

  -- Gate 1b (NEW): Engagement must be part of the current approved plan version
  IF v_eng.annual_plan_id IS NOT NULL AND v_eng.plan_status IN ('Approved', 'In Progress') THEN
    SELECT EXISTS (
      SELECT 1 FROM ia_plan_version_engagements pve
      JOIN ia_plan_versions pv ON pv.id = pve.plan_version_id
      WHERE pve.engagement_id = p_engagement_id
        AND pv.plan_id = v_eng.annual_plan_id
        AND pv.version_number = v_eng.plan_current_version
        AND pve.change_type != 'removed'
    ) INTO v_version_approved;
    
    IF NOT v_version_approved THEN
      v_reasons := v_reasons || 'Engagement is not included in the current approved plan version (v' || COALESCE(v_eng.plan_current_version::text, '?') || ')';
    END IF;
  END IF;

  -- Gate 2: Engagement must have planned dates
  IF v_eng.planned_start_date IS NULL OR v_eng.planned_end_date IS NULL THEN
    v_reasons := v_reasons || 'Engagement must have planned start and end dates';
  END IF;

  -- Gate 3: Must have a lead auditor
  IF v_eng.lead_auditor_id IS NULL THEN
    v_reasons := v_reasons || 'A lead auditor must be assigned';
  END IF;

  -- Gate 4: Audit Intimation communication must be sent
  SELECT EXISTS (
    SELECT 1 FROM ia_communication_stages cs
    WHERE cs.engagement_id = p_engagement_id
      AND cs.stage_code = 'PLAN_INTIMATION'
      AND cs.delivery_status IN ('Sent','Delivered','Acknowledged')
  ) INTO v_intimation_done;
  IF NOT v_intimation_done THEN
    v_reasons := v_reasons || 'Audit intimation notice must be sent to auditee before execution';
  END IF;

  -- Gate 5: Team & scope notice must be sent
  SELECT EXISTS (
    SELECT 1 FROM ia_communication_stages cs
    WHERE cs.engagement_id = p_engagement_id
      AND cs.stage_code = 'TEAM_AND_SCOPE_NOTICE'
      AND cs.delivery_status IN ('Sent','Delivered','Acknowledged')
  ) INTO v_team_notice_done;
  IF NOT v_team_notice_done THEN
    v_reasons := v_reasons || 'Team and scope disclosure must be sent to auditee before execution';
  END IF;

  RETURN jsonb_build_object(
    'can_start', array_length(v_reasons, 1) IS NULL,
    'reasons', v_reasons,
    'engagement_status', v_eng.status,
    'plan_status', v_eng.plan_status,
    'plan_version', v_eng.plan_current_version,
    'is_in_current_version', COALESCE(v_version_approved, false)
  );
END;
$$;

-- 5. Update execution gate trigger to also check version membership
CREATE OR REPLACE FUNCTION public.ia_enforce_engagement_execution_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_status text;
  v_gate_result jsonb;
  v_in_version boolean;
  v_plan_version integer;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Gate 1: Moving to execution states requires approved plan + version membership
  IF NEW.status IN ('In Progress', 'Execution', 'Fieldwork') THEN
    IF NEW.annual_plan_id IS NOT NULL THEN
      SELECT status, current_version_number INTO v_plan_status, v_plan_version FROM ia_annual_plans WHERE id = NEW.annual_plan_id;
      IF v_plan_status IS NOT NULL AND v_plan_status NOT IN ('Approved', 'In Progress') THEN
        RAISE EXCEPTION 'Cannot start engagement: parent audit plan status is "%" — must be Approved or In Progress', v_plan_status;
      END IF;

      -- Check version membership
      SELECT EXISTS (
        SELECT 1 FROM ia_plan_version_engagements pve
        JOIN ia_plan_versions pv ON pv.id = pve.plan_version_id
        WHERE pve.engagement_id = NEW.id
          AND pv.plan_id = NEW.annual_plan_id
          AND pv.version_number = v_plan_version
          AND pve.change_type != 'removed'
      ) INTO v_in_version;
      
      IF NOT v_in_version THEN
        RAISE EXCEPTION 'Cannot start engagement: not included in current approved plan version (v%)', v_plan_version;
      END IF;
    END IF;

    IF NEW.lead_auditor_id IS NULL THEN
      RAISE EXCEPTION 'Cannot start engagement: a lead auditor must be assigned';
    END IF;

    IF NEW.planned_start_date IS NULL OR NEW.planned_end_date IS NULL THEN
      RAISE EXCEPTION 'Cannot start engagement: planned start and end dates are required';
    END IF;
  END IF;

  -- Gate 2: Moving to closure requires artefact completeness
  IF NEW.status IN ('Completed', 'Closed') AND OLD.status NOT IN ('Completed', 'Closed') THEN
    v_gate_result := ia_check_engagement_completeness(NEW.id);
    IF NOT (v_gate_result->>'passed')::boolean THEN
      RAISE EXCEPTION 'Cannot close engagement: completeness check failed — %', v_gate_result->>'reasons';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
