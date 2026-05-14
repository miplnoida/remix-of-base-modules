
-- =========================================================================
-- 1) Seed the 4 missing trigger rules so every requested communication
--    stage in the user's flow is wired to a rule + template.
-- =========================================================================

INSERT INTO public.ce_audit_comm_trigger_rules
  (rule_code, rule_name, description, field_stage, comm_type, template_id,
   trigger_mode, condition_json, cooldown_hours, max_per_visit,
   requires_approval, priority, is_active)
VALUES
  ('DRAFT_REPORT_AFTER_CLOSE',
   'Draft findings / report after session close',
   'When the audit session is closed and the report is ready/in review, surface the draft findings communication.',
   'post_review_draft_findings', 'draft_findings',
   (SELECT id FROM public.ce_audit_communication_templates WHERE template_code='AUD_DRAFT' LIMIT 1),
   'SUGGEST',
   '{"all":[{"field":"sessionClosed","op":"truthy"},{"field":"reportStatus","op":"in","value":["ready","in_review","draft","pending_review"]}]}'::jsonb,
   24, 1, true, 65, true),

  ('CORRECTIVE_ACTION_AFTER_VIOLATION',
   'Corrective action after violation notice',
   'When violations exist or a violation notice has been issued, follow up with a corrective action request.',
   'enforcement_stage', 'corrective_action',
   (SELECT id FROM public.ce_audit_communication_templates WHERE template_code='AUD_CORR' LIMIT 1),
   'SUGGEST',
   '{"any":[{"field":"hasViolations","op":"truthy"},{"field":"existingByType.violation_notice.count","op":"gte","value":1}]}'::jsonb,
   48, 2, true, 85, true),

  ('ACKNOWLEDGMENT_AFTER_REPORT',
   'Acknowledgment request after report issuance',
   'After a draft or final report has been sent, request employer acknowledgment of receipt.',
   'post_review_draft_findings', 'acknowledgment_request',
   (SELECT id FROM public.ce_audit_communication_templates WHERE template_code='AUD_ACK' LIMIT 1),
   'SUGGEST',
   '{"any":[{"field":"existingByType.draft_findings.count","op":"gte","value":1},{"field":"existingByType.final_report.count","op":"gte","value":1}]}'::jsonb,
   24, 1, false, 75, true),

  ('DISPUTE_INSTRUCTIONS_ON_CONTEST',
   'Dispute instructions when contestable findings exist',
   'When violations exist after report issuance (dispute window applicable), share dispute instructions.',
   'post_review_draft_findings', 'dispute_instructions',
   (SELECT id FROM public.ce_audit_communication_templates WHERE template_code='AUD_DISP' LIMIT 1),
   'SUGGEST',
   '{"all":[{"field":"hasViolations","op":"truthy"},{"any":[{"field":"existingByType.draft_findings.count","op":"gte","value":1},{"field":"existingByType.final_report.count","op":"gte","value":1}]}]}'::jsonb,
   72, 1, false, 78, true)
ON CONFLICT (rule_code) DO UPDATE SET
  rule_name = EXCLUDED.rule_name,
  description = EXCLUDED.description,
  field_stage = EXCLUDED.field_stage,
  comm_type = EXCLUDED.comm_type,
  template_id = EXCLUDED.template_id,
  trigger_mode = EXCLUDED.trigger_mode,
  condition_json = EXCLUDED.condition_json,
  cooldown_hours = EXCLUDED.cooldown_hours,
  max_per_visit = EXCLUDED.max_per_visit,
  requires_approval = EXCLUDED.requires_approval,
  priority = EXCLUDED.priority,
  is_active = EXCLUDED.is_active,
  updated_at = now();


-- =========================================================================
-- 2) Reminder + Escalation automation
--
-- Scans sent audit communications that:
--   - have a response_due_at in the past
--   - have NOT been acknowledged or responded to
-- And takes action based on escalation_level:
--   level 0 -> create a 'due_date_reminder' draft and bump to level 1
--   level 1 -> if reminder is itself overdue, create an 'escalation_notice'
--              draft and bump to level 2
--   level >= 2 -> leave alone (handled by humans / case escalation)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.fn_ce_audit_run_reminder_escalation()
RETURNS TABLE(reminders_created int, escalations_created int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reminders int := 0;
  v_escalations int := 0;
  v_reminder_window_hours int := 24;     -- escalate if no response 24h after reminder
  v_reminder_template uuid;
  v_escalation_template uuid;
  r record;
BEGIN
  SELECT id INTO v_reminder_template
  FROM public.ce_audit_communication_templates
  WHERE template_code = 'AUD_DUE_REM' AND is_active = true LIMIT 1;

  SELECT id INTO v_escalation_template
  FROM public.ce_audit_communication_templates
  WHERE template_code = 'AUD_ESC' AND is_active = true LIMIT 1;

  -- ---- Reminders (level 0 -> 1) ----------------------------------------
  IF v_reminder_template IS NOT NULL THEN
    FOR r IN
      SELECT c.*
      FROM public.ce_audit_communications c
      WHERE c.status IN ('sent','partial')
        AND c.response_due_at IS NOT NULL
        AND c.response_due_at < now()
        AND c.acknowledged_at IS NULL
        AND c.responded_at IS NULL
        AND COALESCE(c.escalation_level, 0) = 0
        -- don't re-reminder a reminder
        AND c.comm_type NOT IN ('due_date_reminder','escalation_notice')
        -- skip if a reminder for this visit+source already exists in last 24h
        AND NOT EXISTS (
          SELECT 1 FROM public.ce_audit_communications x
          WHERE x.inspection_id = c.inspection_id
            AND x.comm_type = 'due_date_reminder'
            AND x.created_at > now() - interval '24 hours'
        )
    LOOP
      INSERT INTO public.ce_audit_communications
        (inspection_id, visit_id, case_id, employer_id, template_id,
         comm_type, status, stage_key, trigger_type, created_by,
         response_due_at, escalation_level)
      VALUES
        (r.inspection_id, r.visit_id, r.case_id, r.employer_id, v_reminder_template,
         'due_date_reminder', 'draft', 'reminder_stage', 'automatic',
         'SYSTEM_REMINDER',
         now() + (v_reminder_window_hours || ' hours')::interval,
         1);

      UPDATE public.ce_audit_communications
      SET escalation_level = 1
      WHERE id = r.id;

      v_reminders := v_reminders + 1;
    END LOOP;
  END IF;

  -- ---- Escalations (level 1 -> 2) --------------------------------------
  IF v_escalation_template IS NOT NULL THEN
    FOR r IN
      SELECT c.*
      FROM public.ce_audit_communications c
      WHERE c.status IN ('sent','partial')
        AND c.acknowledged_at IS NULL
        AND c.responded_at IS NULL
        AND COALESCE(c.escalation_level, 0) = 1
        AND c.comm_type NOT IN ('escalation_notice')
        -- the reminder itself must be overdue (response_due_at + window passed)
        AND (c.response_due_at IS NULL OR c.response_due_at < now() - (v_reminder_window_hours || ' hours')::interval)
        AND NOT EXISTS (
          SELECT 1 FROM public.ce_audit_communications x
          WHERE x.inspection_id = c.inspection_id
            AND x.comm_type = 'escalation_notice'
            AND x.created_at > now() - interval '48 hours'
        )
    LOOP
      INSERT INTO public.ce_audit_communications
        (inspection_id, visit_id, case_id, employer_id, template_id,
         comm_type, status, stage_key, trigger_type, created_by,
         response_due_at, escalation_level)
      VALUES
        (r.inspection_id, r.visit_id, r.case_id, r.employer_id, v_escalation_template,
         'escalation_notice', 'draft', 'escalation_stage', 'automatic',
         'SYSTEM_ESCALATION',
         now() + interval '48 hours',
         2);

      UPDATE public.ce_audit_communications
      SET escalation_level = 2
      WHERE id = r.id;

      v_escalations := v_escalations + 1;
    END LOOP;
  END IF;

  RETURN QUERY SELECT v_reminders, v_escalations;
END$$;

COMMENT ON FUNCTION public.fn_ce_audit_run_reminder_escalation() IS
  'Scans sent audit communications past their response_due_at; creates reminder and escalation drafts and bumps escalation_level. Idempotent within a 24h/48h window.';

-- ---- Schedule via pg_cron (every 15 minutes) ----------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- remove any prior schedule with this name
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'ce-audit-comm-reminder-escalation';

    PERFORM cron.schedule(
      'ce-audit-comm-reminder-escalation',
      '*/15 * * * *',
      $cron$ SELECT public.fn_ce_audit_run_reminder_escalation(); $cron$
    );
  END IF;
END$$;
