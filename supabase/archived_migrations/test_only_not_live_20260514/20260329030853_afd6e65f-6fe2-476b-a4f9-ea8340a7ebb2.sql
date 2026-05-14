
-- 1. Add execution_status column to ia_audit_engagements
ALTER TABLE public.ia_audit_engagements
  ADD COLUMN IF NOT EXISTS execution_status text DEFAULT 'Planned',
  ADD COLUMN IF NOT EXISTS launched_at timestamptz,
  ADD COLUMN IF NOT EXISTS launched_by text,
  ADD COLUMN IF NOT EXISTS execution_notes text;

-- 2. Create ia_document_requests table for PBC / information requests
CREATE TABLE IF NOT EXISTS public.ia_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid REFERENCES public.ia_audit_engagements(id) ON DELETE CASCADE NOT NULL,
  document_title text NOT NULL,
  description text,
  requested_from text,
  requested_from_email text,
  due_date date,
  priority text DEFAULT 'Medium',
  status text DEFAULT 'Pending',
  received_date date,
  received_file_path text,
  notes text,
  requested_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text,
  updated_by text,
  is_active boolean DEFAULT true
);

-- 3. Create ia_engagement_execution_log for audit trail of execution events
CREATE TABLE IF NOT EXISTS public.ia_engagement_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid REFERENCES public.ia_audit_engagements(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_description text,
  old_status text,
  new_status text,
  performed_by text,
  performed_at timestamptz DEFAULT now(),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- 4. Create ia_launch_engagement RPC
CREATE OR REPLACE FUNCTION public.ia_launch_engagement(
  p_engagement_id uuid,
  p_launched_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eng record;
  v_plan record;
  v_errors text[] := '{}';
  v_result jsonb;
BEGIN
  -- Fetch engagement
  SELECT * INTO v_eng FROM ia_audit_engagements WHERE id = p_engagement_id AND is_active = true;
  IF v_eng IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Engagement not found');
  END IF;

  -- Check if already launched
  IF v_eng.execution_status NOT IN ('Planned', 'Ready for Launch') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Engagement already launched or in progress (current: ' || COALESCE(v_eng.execution_status, 'NULL') || ')');
  END IF;

  -- Check parent plan is Approved
  IF v_eng.annual_plan_id IS NOT NULL THEN
    SELECT * INTO v_plan FROM ia_annual_plans WHERE id = v_eng.annual_plan_id;
    IF v_plan IS NULL OR v_plan.status NOT IN ('Approved') THEN
      v_errors := array_append(v_errors, 'Parent annual plan is not Approved (status: ' || COALESCE(v_plan.status, 'N/A') || ')');
    END IF;
  END IF;

  -- Validate required fields
  IF v_eng.engagement_name IS NULL OR v_eng.engagement_name = '' THEN
    v_errors := array_append(v_errors, 'Engagement title is missing');
  END IF;
  IF v_eng.department_id IS NULL THEN
    v_errors := array_append(v_errors, 'Department is not assigned');
  END IF;
  IF v_eng.function_id IS NULL THEN
    v_errors := array_append(v_errors, 'Business function is not assigned');
  END IF;
  IF v_eng.lead_auditor_id IS NULL THEN
    v_errors := array_append(v_errors, 'Lead auditor is not assigned');
  END IF;
  IF v_eng.planned_start_date IS NULL OR v_eng.planned_end_date IS NULL THEN
    v_errors := array_append(v_errors, 'Planned dates are missing');
  END IF;
  IF v_eng.objectives IS NULL OR v_eng.objectives = '' THEN
    v_errors := array_append(v_errors, 'Objective is missing');
  END IF;
  IF v_eng.scope IS NULL OR v_eng.scope = '' THEN
    v_errors := array_append(v_errors, 'Scope is missing');
  END IF;
  IF v_eng.primary_auditee_contact_id IS NULL AND (v_eng.auditee_contact IS NULL OR v_eng.auditee_contact = '') THEN
    v_errors := array_append(v_errors, 'Auditee contact is missing');
  END IF;

  -- Return errors if any
  IF array_length(v_errors, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', to_jsonb(v_errors),
      'error', 'Launch readiness check failed: ' || array_to_string(v_errors, '; ')
    );
  END IF;

  -- Launch the engagement
  UPDATE ia_audit_engagements SET
    execution_status = 'Notification Sent',
    status = CASE WHEN status IN ('Planned', 'Approved') THEN 'In Progress' ELSE status END,
    launched_at = now(),
    launched_by = COALESCE(p_launched_by, 'SYSTEM'),
    actual_start_date = COALESCE(actual_start_date, now()::date::text),
    updated_at = now(),
    updated_by = COALESCE(p_launched_by, 'SYSTEM')
  WHERE id = p_engagement_id;

  -- Log the event
  INSERT INTO ia_engagement_execution_log (engagement_id, event_type, event_description, old_status, new_status, performed_by)
  VALUES (p_engagement_id, 'ENGAGEMENT_LAUNCHED', 'Engagement launched for execution', COALESCE(v_eng.execution_status, 'Planned'), 'Notification Sent', COALESCE(p_launched_by, 'SYSTEM'));

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Engagement launched successfully',
    'new_execution_status', 'Notification Sent'
  );
END;
$$;

-- 5. Create ia_transition_execution_status RPC
CREATE OR REPLACE FUNCTION public.ia_transition_execution_status(
  p_engagement_id uuid,
  p_new_status text,
  p_performed_by text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eng record;
  v_valid_statuses text[] := ARRAY[
    'Planned', 'Ready for Launch', 'Notification Sent', 'Opening Meeting Scheduled',
    'Fieldwork In Progress', 'Findings Drafting', 'Management Response Pending',
    'Final Report Issued', 'Follow-up Monitoring', 'Closed', 'Deferred', 'Cancelled'
  ];
BEGIN
  SELECT * INTO v_eng FROM ia_audit_engagements WHERE id = p_engagement_id AND is_active = true;
  IF v_eng IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Engagement not found');
  END IF;

  IF NOT (p_new_status = ANY(v_valid_statuses)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid execution status: ' || p_new_status);
  END IF;

  -- Update status
  UPDATE ia_audit_engagements SET
    execution_status = p_new_status,
    execution_notes = COALESCE(p_notes, execution_notes),
    updated_at = now(),
    updated_by = COALESCE(p_performed_by, 'SYSTEM')
  WHERE id = p_engagement_id;

  -- Log transition
  INSERT INTO ia_engagement_execution_log (engagement_id, event_type, event_description, old_status, new_status, performed_by, metadata)
  VALUES (
    p_engagement_id,
    'STATUS_TRANSITION',
    'Execution status changed from ' || COALESCE(v_eng.execution_status, 'Planned') || ' to ' || p_new_status,
    COALESCE(v_eng.execution_status, 'Planned'),
    p_new_status,
    COALESCE(p_performed_by, 'SYSTEM'),
    CASE WHEN p_notes IS NOT NULL THEN jsonb_build_object('notes', p_notes) ELSE NULL END
  );

  RETURN jsonb_build_object('success', true, 'message', 'Status transitioned to ' || p_new_status);
END;
$$;

-- 6. Create ia_check_launch_readiness RPC (read-only check)
CREATE OR REPLACE FUNCTION public.ia_check_launch_readiness(p_engagement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eng record;
  v_plan record;
  v_checks jsonb := '[]'::jsonb;
  v_all_passed boolean := true;
BEGIN
  SELECT * INTO v_eng FROM ia_audit_engagements WHERE id = p_engagement_id AND is_active = true;
  IF v_eng IS NULL THEN
    RETURN jsonb_build_object('ready', false, 'checks', '[]'::jsonb, 'error', 'Not found');
  END IF;

  -- Plan approved
  IF v_eng.annual_plan_id IS NOT NULL THEN
    SELECT * INTO v_plan FROM ia_annual_plans WHERE id = v_eng.annual_plan_id;
    IF v_plan IS NOT NULL AND v_plan.status = 'Approved' THEN
      v_checks := v_checks || jsonb_build_object('item', 'Parent plan approved', 'passed', true);
    ELSE
      v_checks := v_checks || jsonb_build_object('item', 'Parent plan approved', 'passed', false, 'detail', 'Plan status: ' || COALESCE(v_plan.status, 'N/A'));
      v_all_passed := false;
    END IF;
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Parent plan approved', 'passed', true, 'detail', 'Ad-hoc engagement');
  END IF;

  -- Title
  IF v_eng.engagement_name IS NOT NULL AND v_eng.engagement_name != '' THEN
    v_checks := v_checks || jsonb_build_object('item', 'Engagement title', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Engagement title', 'passed', false);
    v_all_passed := false;
  END IF;

  -- Department
  IF v_eng.department_id IS NOT NULL THEN
    v_checks := v_checks || jsonb_build_object('item', 'Department assigned', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Department assigned', 'passed', false);
    v_all_passed := false;
  END IF;

  -- Function
  IF v_eng.function_id IS NOT NULL THEN
    v_checks := v_checks || jsonb_build_object('item', 'Business function assigned', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Business function assigned', 'passed', false);
    v_all_passed := false;
  END IF;

  -- Lead auditor
  IF v_eng.lead_auditor_id IS NOT NULL THEN
    v_checks := v_checks || jsonb_build_object('item', 'Lead auditor assigned', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Lead auditor assigned', 'passed', false);
    v_all_passed := false;
  END IF;

  -- Dates
  IF v_eng.planned_start_date IS NOT NULL AND v_eng.planned_end_date IS NOT NULL THEN
    v_checks := v_checks || jsonb_build_object('item', 'Planned dates entered', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Planned dates entered', 'passed', false);
    v_all_passed := false;
  END IF;

  -- Objective
  IF v_eng.objectives IS NOT NULL AND v_eng.objectives != '' THEN
    v_checks := v_checks || jsonb_build_object('item', 'Objective entered', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Objective entered', 'passed', false);
    v_all_passed := false;
  END IF;

  -- Scope
  IF v_eng.scope IS NOT NULL AND v_eng.scope != '' THEN
    v_checks := v_checks || jsonb_build_object('item', 'Scope entered', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Scope entered', 'passed', false);
    v_all_passed := false;
  END IF;

  -- Auditee contact
  IF v_eng.primary_auditee_contact_id IS NOT NULL OR (v_eng.auditee_contact IS NOT NULL AND v_eng.auditee_contact != '') THEN
    v_checks := v_checks || jsonb_build_object('item', 'Auditee contact exists', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Auditee contact exists', 'passed', false);
    v_all_passed := false;
  END IF;

  RETURN jsonb_build_object('ready', v_all_passed, 'checks', v_checks);
END;
$$;
