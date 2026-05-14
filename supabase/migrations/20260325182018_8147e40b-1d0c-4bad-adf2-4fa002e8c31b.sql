
-- ============================================================
-- Phase 3A: Auto-Notification Infrastructure
-- ============================================================

-- 1) Table: ia_notification_triggers — maps audit events to notification config
CREATE TABLE IF NOT EXISTS public.ia_notification_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code text NOT NULL UNIQUE,
  event_label text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT true,
  auto_fire boolean NOT NULL DEFAULT true,
  target_roles text[] DEFAULT '{}',
  notify_auditee boolean NOT NULL DEFAULT false,
  notify_team_lead boolean NOT NULL DEFAULT false,
  notify_all_team boolean NOT NULL DEFAULT false,
  default_template_category text,
  default_priority text NOT NULL DEFAULT 'Normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Table: ia_auto_notification_log — audit trail of auto-fired notifications
CREATE TABLE IF NOT EXISTS public.ia_auto_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code text NOT NULL,
  engagement_id uuid,
  plan_id uuid,
  entity_type text,
  entity_id uuid,
  recipient_user_id uuid,
  recipient_email text,
  recipient_name text,
  template_id uuid,
  template_name text,
  subject text,
  body text,
  channel text NOT NULL DEFAULT 'in_app',
  delivery_status text NOT NULL DEFAULT 'Pending',
  sent_at timestamptz,
  failure_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ia_auto_notif_log_eng ON public.ia_auto_notification_log(engagement_id);
CREATE INDEX IF NOT EXISTS idx_ia_auto_notif_log_event ON public.ia_auto_notification_log(event_code);
CREATE INDEX IF NOT EXISTS idx_ia_auto_notif_log_recipient ON public.ia_auto_notification_log(recipient_user_id);

-- 3) Seed default trigger configurations
INSERT INTO public.ia_notification_triggers (event_code, event_label, description, notify_team_lead, notify_auditee, notify_all_team, default_template_category, default_priority)
VALUES
  ('PLAN_SUBMITTED', 'Plan Submitted for Approval', 'Fires when an audit plan is submitted for approval', true, false, false, 'plan_approval', 'High'),
  ('PLAN_APPROVED', 'Plan Approved', 'Fires when an audit plan is approved', true, false, true, 'plan_approval', 'Normal'),
  ('PLAN_REJECTED', 'Plan Rejected', 'Fires when an audit plan is rejected', true, false, false, 'plan_approval', 'High'),
  ('PLAN_REVISION_SUBMITTED', 'Plan Revision Submitted', 'Fires when a material plan revision needs re-approval', true, false, false, 'plan_revision', 'High'),
  ('ENGAGEMENT_STARTED', 'Engagement Execution Started', 'Fires when fieldwork begins', true, true, true, 'engagement_lifecycle', 'Normal'),
  ('ENGAGEMENT_COMPLETED', 'Engagement Completed', 'Fires when engagement is marked complete', true, true, false, 'engagement_lifecycle', 'Normal'),
  ('FINDING_CREATED', 'New Finding Recorded', 'Fires when a new audit finding is created', true, false, false, 'findings', 'Normal'),
  ('ACTION_ASSIGNED', 'Action Plan Assigned', 'Fires when a corrective action is assigned', false, false, false, 'action_tracking', 'High'),
  ('ACTION_OVERDUE', 'Action Plan Overdue', 'Fires when a corrective action passes its target date', true, true, false, 'action_tracking', 'Critical'),
  ('ACTION_COMPLETED', 'Action Plan Completed', 'Fires when a corrective action is marked completed', true, false, false, 'action_tracking', 'Normal'),
  ('REPORT_ISSUED', 'Final Report Issued', 'Fires when the final audit report is issued', true, true, true, 'report_issuance', 'High'),
  ('CLOSURE_APPROVED', 'Audit Closure Approved', 'Fires when an engagement is formally closed', true, true, false, 'closure', 'Normal'),
  ('TEAM_CONFLICT_DETECTED', 'Team Schedule Conflict', 'Fires when a team availability conflict is detected', true, false, false, 'team_management', 'High'),
  ('COMMUNICATION_STAGE_SENT', 'Communication Stage Sent', 'Fires when a lifecycle communication is recorded', false, false, false, 'communication', 'Low'),
  ('CARRY_FORWARD_CREATED', 'Finding Carried Forward', 'Fires when a prior-year finding is carried forward', true, false, false, 'follow_up', 'Normal'),
  ('ESCALATION_TRIGGERED', 'Overdue Escalation Triggered', 'Fires when an overdue action escalation threshold is reached', true, true, false, 'escalation', 'Critical')
ON CONFLICT (event_code) DO NOTHING;

-- 4) Trigger: engagement status changes -> auto-notify
CREATE OR REPLACE FUNCTION public.trg_ia_engagement_status_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trigger_config record;
  v_event_code text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'In Progress' THEN v_event_code := 'ENGAGEMENT_STARTED';
      WHEN 'Completed' THEN v_event_code := 'ENGAGEMENT_COMPLETED';
      ELSE v_event_code := NULL;
    END CASE;
    
    IF v_event_code IS NOT NULL THEN
      SELECT * INTO v_trigger_config FROM ia_notification_triggers WHERE event_code = v_event_code AND is_enabled = true LIMIT 1;
      
      IF FOUND AND v_trigger_config.auto_fire THEN
        IF v_trigger_config.notify_team_lead AND NEW.lead_auditor_id IS NOT NULL THEN
          INSERT INTO ia_auto_notification_log (event_code, engagement_id, entity_type, entity_id, recipient_user_id, subject, channel, delivery_status)
          VALUES (v_event_code, NEW.id, 'engagement', NEW.id, NEW.lead_auditor_id,
                  v_event_code || ': ' || COALESCE(NEW.engagement_name, NEW.id::text), 'in_app', 'Queued');
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ia_engagement_status_notify ON ia_audit_engagements;
CREATE TRIGGER trg_ia_engagement_status_notify
  AFTER UPDATE ON ia_audit_engagements
  FOR EACH ROW
  EXECUTE FUNCTION trg_ia_engagement_status_notify();

-- 5) Trigger: new finding -> auto-notify
CREATE OR REPLACE FUNCTION public.trg_ia_finding_created_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trigger_config record;
  v_lead_id uuid;
BEGIN
  SELECT * INTO v_trigger_config FROM ia_notification_triggers WHERE event_code = 'FINDING_CREATED' AND is_enabled = true LIMIT 1;
  
  IF FOUND AND v_trigger_config.auto_fire THEN
    SELECT lead_auditor_id INTO v_lead_id FROM ia_audit_engagements WHERE id = NEW.engagement_id;
    
    IF v_trigger_config.notify_team_lead AND v_lead_id IS NOT NULL THEN
      INSERT INTO ia_auto_notification_log (event_code, engagement_id, entity_type, entity_id, recipient_user_id, subject, channel, delivery_status)
      VALUES ('FINDING_CREATED', NEW.engagement_id, 'finding', NEW.id, v_lead_id,
              'New Finding: ' || COALESCE(NEW.title, NEW.id::text), 'in_app', 'Queued');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ia_finding_created_notify ON ia_findings;
CREATE TRIGGER trg_ia_finding_created_notify
  AFTER INSERT ON ia_findings
  FOR EACH ROW
  EXECUTE FUNCTION trg_ia_finding_created_notify();

-- 6) Trigger: action assignment/completion/overdue -> auto-notify
CREATE OR REPLACE FUNCTION public.trg_ia_action_status_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trigger_config record;
  v_event_code text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_code := 'ACTION_ASSIGNED';
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'Completed' THEN v_event_code := 'ACTION_COMPLETED';
      WHEN 'Overdue' THEN v_event_code := 'ACTION_OVERDUE';
      ELSE v_event_code := NULL;
    END CASE;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF v_event_code IS NOT NULL THEN
    SELECT * INTO v_trigger_config FROM ia_notification_triggers WHERE event_code = v_event_code AND is_enabled = true LIMIT 1;
    
    IF FOUND AND v_trigger_config.auto_fire THEN
      IF NEW.responsible_person IS NOT NULL THEN
        INSERT INTO ia_auto_notification_log (event_code, engagement_id, entity_type, entity_id, recipient_user_id, subject, channel, delivery_status)
        VALUES (v_event_code, NEW.engagement_id, 'action', NEW.id, NEW.responsible_person,
                v_event_code || ': ' || COALESCE(NEW.action_description, NEW.id::text), 'in_app', 'Queued');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ia_action_status_notify ON ia_action_tracking;
CREATE TRIGGER trg_ia_action_status_notify
  AFTER INSERT OR UPDATE ON ia_action_tracking
  FOR EACH ROW
  EXECUTE FUNCTION trg_ia_action_status_notify();

-- 7) Enhanced template policy validation
CREATE OR REPLACE FUNCTION public.ia_validate_template_policy(
  p_stage_code text,
  p_template_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy record;
  v_template record;
BEGIN
  SELECT * INTO v_policy FROM ia_template_policy_matrix
  WHERE stage_code = p_stage_code AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', true, 'warning', 'No template policy defined for this stage');
  END IF;
  
  SELECT id, name, category, is_active, version_number
  INTO v_template FROM ia_document_templates WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Template not found');
  END IF;
  
  IF NOT v_template.is_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Template is not active. Only active templates may be used.');
  END IF;
  
  IF v_policy.required_template_category IS NOT NULL AND v_template.category != v_policy.required_template_category THEN
    RETURN jsonb_build_object('valid', false, 'error', 
      format('Template category "%s" does not match required category "%s" for stage %s', 
             v_template.category, v_policy.required_template_category, p_stage_code));
  END IF;
  
  IF v_policy.min_version IS NOT NULL AND COALESCE(v_template.version_number, 1) < v_policy.min_version THEN
    RETURN jsonb_build_object('valid', false, 'error',
      format('Template version %s is below minimum required version %s', v_template.version_number, v_policy.min_version));
  END IF;
  
  RETURN jsonb_build_object('valid', true, 'template_name', v_template.name, 'template_version', v_template.version_number);
END;
$$;

-- 8) RPC: fetch notification log
CREATE OR REPLACE FUNCTION public.ia_get_notification_log(
  p_engagement_id uuid DEFAULT NULL,
  p_plan_id uuid DEFAULT NULL,
  p_event_code text DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(row_to_json(n.*) ORDER BY n.created_at DESC)
  INTO v_result
  FROM (
    SELECT * FROM ia_auto_notification_log nl
    WHERE (p_engagement_id IS NULL OR nl.engagement_id = p_engagement_id)
      AND (p_plan_id IS NULL OR nl.plan_id = p_plan_id)
      AND (p_event_code IS NULL OR nl.event_code = p_event_code)
    ORDER BY nl.created_at DESC
    LIMIT p_limit
  ) n;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 9) RPC: fire notification programmatically (for use by service layer)
CREATE OR REPLACE FUNCTION public.ia_fire_notification(
  p_event_code text,
  p_engagement_id uuid DEFAULT NULL,
  p_plan_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_recipient_user_id uuid DEFAULT NULL,
  p_recipient_email text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_body text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trigger record;
  v_log_id uuid;
BEGIN
  -- Check trigger is enabled
  SELECT * INTO v_trigger FROM ia_notification_triggers WHERE event_code = p_event_code AND is_enabled = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notification trigger not found or disabled: ' || p_event_code);
  END IF;
  
  INSERT INTO ia_auto_notification_log (
    event_code, engagement_id, plan_id, entity_type, entity_id,
    recipient_user_id, recipient_email, subject, body, channel,
    delivery_status, metadata
  ) VALUES (
    p_event_code, p_engagement_id, p_plan_id, p_entity_type, p_entity_id,
    p_recipient_user_id, p_recipient_email, 
    COALESCE(p_subject, v_trigger.event_label),
    p_body, 'in_app', 'Queued', p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN jsonb_build_object('success', true, 'notification_log_id', v_log_id);
END;
$$;
