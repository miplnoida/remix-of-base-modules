CREATE OR REPLACE FUNCTION public.ia_record_communication_stage(
  p_engagement_id UUID,
  p_stage_code TEXT,
  p_template_id UUID DEFAULT NULL,
  p_recipient_name TEXT DEFAULT NULL,
  p_recipient_email TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT NULL,
  p_acknowledgment_required BOOLEAN DEFAULT FALSE,
  p_mode TEXT DEFAULT 'send'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stage_order INT;
  v_template_name TEXT;
  v_policy RECORD;
  v_stage_id UUID;
  v_delivery_status TEXT;
BEGIN
  v_stage_order := CASE p_stage_code
    WHEN 'PLAN_INTIMATION' THEN 1 WHEN 'TEAM_AND_SCOPE_NOTICE' THEN 2
    WHEN 'DOC_REQUEST' THEN 3 WHEN 'ENTRANCE_MEETING' THEN 4
    WHEN 'QUERY_CYCLE' THEN 5 WHEN 'DRAFT_FINDING_DISCUSSION' THEN 6
    WHEN 'EXIT_MEETING' THEN 7 WHEN 'FINAL_REPORT_ISSUE' THEN 8
    WHEN 'ACTION_PLAN_REMINDER' THEN 9 ELSE 99
  END;

  IF p_template_id IS NOT NULL THEN
    SELECT name INTO v_template_name FROM ia_document_templates WHERE id = p_template_id;
    SELECT * INTO v_policy FROM ia_template_policy_matrix WHERE stage_code = p_stage_code AND is_active = true LIMIT 1;
    IF v_policy IS NOT NULL AND v_policy.is_mandatory AND p_mode = 'send' THEN
      IF NOT EXISTS (SELECT 1 FROM ia_document_templates WHERE id = p_template_id AND category = v_policy.required_template_category AND is_active = true) THEN
        RETURN jsonb_build_object('success', false, 'error', format('Template must be of category "%s" for stage %s', v_policy.required_template_category, p_stage_code));
      END IF;
    END IF;
  END IF;

  -- Only block duplicate for initial 'send' mode, not resend/reminder
  IF p_mode = 'send' AND p_stage_code != 'QUERY_CYCLE' THEN
    IF EXISTS (SELECT 1 FROM ia_communication_stages WHERE engagement_id = p_engagement_id AND stage_code = p_stage_code AND delivery_status IN ('Sent','Delivered','Acknowledged')) THEN
      RETURN jsonb_build_object('success', false, 'error', format('Stage %s already completed for this engagement', p_stage_code));
    END IF;
  END IF;

  v_delivery_status := CASE p_mode
    WHEN 'resend' THEN 'Resent'
    WHEN 'reminder' THEN 'Reminder Sent'
    ELSE 'Sent'
  END;

  INSERT INTO ia_communication_stages (engagement_id, stage_code, stage_order, template_id, template_name, recipient_name, recipient_email, sent_at, acknowledgment_required, delivery_status, notes, created_by)
  VALUES (p_engagement_id, p_stage_code, v_stage_order, p_template_id, v_template_name, p_recipient_name, p_recipient_email, now(), p_acknowledgment_required, v_delivery_status, p_notes, p_created_by)
  RETURNING id INTO v_stage_id;

  RETURN jsonb_build_object('success', true, 'stage_id', v_stage_id, 'stage_code', p_stage_code, 'mode', p_mode, 'delivery_status', v_delivery_status);
END;
$$;