
-- ============================================================
-- 1. Extend bn_escalation_policy with SLA framework columns
-- ============================================================
ALTER TABLE public.bn_escalation_policy
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS applies_to_entity_type TEXT NOT NULL DEFAULT 'WORKFLOW_STEP',
  ADD COLUMN IF NOT EXISTS calendar_code TEXT,
  ADD COLUMN IF NOT EXISTS use_business_hours BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS warning_before_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS due_after_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS breach_after_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS escalation_target_user TEXT,
  ADD COLUMN IF NOT EXISTS create_escalation_task BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_assignee BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_supervisor BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_target_role BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notification_template_code TEXT,
  ADD COLUMN IF NOT EXISTS repeat_interval_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS max_repeat_count INTEGER,
  ADD COLUMN IF NOT EXISTS effective_from DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE;

COMMENT ON COLUMN public.bn_escalation_policy.applies_to_entity_type IS
  'WORKFLOW_STEP | WORKBASKET | TASK_TYPE | CLAIM_STAGE | OVERRIDE_REQUEST | PAYMENT_BATCH';

-- ============================================================
-- 2. Multi-level escalation table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bn_escalation_policy_level (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.bn_escalation_policy(id) ON DELETE CASCADE,
  level_no INTEGER NOT NULL,
  trigger_after_hours NUMERIC NOT NULL,
  target_role TEXT NOT NULL,
  target_user TEXT,
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  action_type TEXT NOT NULL DEFAULT 'NOTIFY',
  notification_template_code TEXT,
  auto_reassign BOOLEAN NOT NULL DEFAULT FALSE,
  repeat_interval_hours NUMERIC,
  max_repeat_count INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  entered_by TEXT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by TEXT,
  modified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bn_escalation_policy_level_unique UNIQUE (policy_id, level_no)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_escalation_policy_level TO authenticated;
GRANT ALL ON public.bn_escalation_policy_level TO service_role;
-- RLS intentionally NOT enabled (project NO-RLS architecture)

CREATE INDEX IF NOT EXISTS idx_bn_esc_policy_level_policy ON public.bn_escalation_policy_level(policy_id);

-- ============================================================
-- 3. Reference data: trigger types, severities, action types
-- ============================================================
INSERT INTO public.bn_reference_group (group_code, group_name, module_code, description, is_system, is_active)
VALUES
  ('BN_ESCALATION_TRIGGER_TYPE', 'Escalation Trigger Types', 'BN', 'Conditions that fire an escalation policy', TRUE, TRUE),
  ('BN_ESCALATION_SEVERITY', 'Escalation Severity', 'BN', 'Severity ranking for escalation policies and levels', TRUE, TRUE),
  ('BN_ESCALATION_ACTION_TYPE', 'Escalation Action Types', 'BN', 'Action taken when an escalation level fires', TRUE, TRUE)
ON CONFLICT (group_code) DO NOTHING;

WITH g AS (SELECT id, group_code FROM public.bn_reference_group
           WHERE group_code IN ('BN_ESCALATION_TRIGGER_TYPE','BN_ESCALATION_SEVERITY','BN_ESCALATION_ACTION_TYPE'))
INSERT INTO public.bn_reference_value (group_id, value_code, value_label, sort_order, is_default, is_system, is_active)
SELECT g.id, v.value_code, v.value_label, v.sort_order, v.is_default, TRUE, TRUE
FROM g
JOIN (VALUES
  ('BN_ESCALATION_TRIGGER_TYPE','SLA_BREACH','SLA Breach',10,TRUE),
  ('BN_ESCALATION_TRIGGER_TYPE','TASK_OVERDUE','Task Overdue',20,FALSE),
  ('BN_ESCALATION_TRIGGER_TYPE','WARNING_THRESHOLD','Warning Threshold Reached',30,FALSE),
  ('BN_ESCALATION_TRIGGER_TYPE','MANUAL','Manual Escalation',40,FALSE),
  ('BN_ESCALATION_TRIGGER_TYPE','EXCEPTION','Exception Raised',50,FALSE),
  ('BN_ESCALATION_TRIGGER_TYPE','THRESHOLD','Threshold Exceeded',60,FALSE),
  ('BN_ESCALATION_SEVERITY','LOW','Low',10,FALSE),
  ('BN_ESCALATION_SEVERITY','MEDIUM','Medium',20,TRUE),
  ('BN_ESCALATION_SEVERITY','HIGH','High',30,FALSE),
  ('BN_ESCALATION_SEVERITY','CRITICAL','Critical',40,FALSE),
  ('BN_ESCALATION_ACTION_TYPE','NOTIFY','Notify',10,TRUE),
  ('BN_ESCALATION_ACTION_TYPE','REASSIGN','Reassign',20,FALSE),
  ('BN_ESCALATION_ACTION_TYPE','PRIORITY_UPGRADE','Priority Upgrade',30,FALSE),
  ('BN_ESCALATION_ACTION_TYPE','CREATE_TASK','Create Task',40,FALSE),
  ('BN_ESCALATION_ACTION_TYPE','HOLD','Hold',50,FALSE),
  ('BN_ESCALATION_ACTION_TYPE','MANAGER_ALERT','Manager Alert',60,FALSE)
) AS v(group_code, value_code, value_label, sort_order, is_default)
  ON g.group_code = v.group_code
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Seed recommended SKN Benefits escalation policies
-- ============================================================
WITH seed AS (
  SELECT * FROM (VALUES
    ('INTAKE_REVIEW_24H',        'Intake Review SLA (24h)',         'WORKFLOW_STEP', 18, 24, 24, 'BN_SUPERVISOR'),
    ('DOCUMENT_REVIEW_48H',      'Document Review SLA (48h)',       'TASK_TYPE',     36, 48, 48, 'BN_DOCUMENT_OFFICER'),
    ('ELIGIBILITY_REVIEW_48H',   'Eligibility Review SLA (48h)',    'WORKFLOW_STEP', 36, 48, 48, 'BN_SENIOR_ELIGIBILITY_OFFICER'),
    ('MEDICAL_BOARD_7D',         'Medical Board Review SLA (7d)',   'CLAIM_STAGE',  120,168,168, 'MEDICAL_BOARD'),
    ('CALCULATION_REVIEW_24H',   'Calculation Review SLA (24h)',    'WORKFLOW_STEP', 18, 24, 24, 'BN_SUPERVISOR'),
    ('PAYMENT_PREPARATION_24H',  'Payment Preparation SLA (24h)',   'PAYMENT_BATCH', 18, 24, 24, 'BN_FINANCE_SUPERVISOR'),
    ('PAYMENT_APPROVAL_24H',     'Payment Approval SLA (24h)',      'PAYMENT_BATCH', 18, 24, 24, 'BN_FINANCE_SUPERVISOR'),
    ('OVERRIDE_REVIEW_24H',      'Override Review SLA (24h)',       'OVERRIDE_REQUEST',18,24,24, 'BN_SENIOR_ELIGIBILITY_OFFICER'),
    ('APPEAL_REVIEW_14D',        'Appeal Review SLA (14d)',         'CLAIM_STAGE',  240,336,336, 'BN_MANAGER')
  ) AS s(policy_code, policy_name, entity, warn_h, due_h, breach_h, role)
)
INSERT INTO public.bn_escalation_policy (
  policy_code, policy_name, description, trigger_type, trigger_config,
  applies_to_entity_type, use_business_hours,
  warning_before_hours, due_after_hours, breach_after_hours,
  escalation_target_role, severity, auto_reassign,
  notify_assignee, notify_supervisor, notify_target_role,
  is_active, effective_from
)
SELECT s.policy_code, s.policy_name,
       'Seed policy ' || s.policy_code || ' — standard SLA escalation for SKN Benefits.',
       'SLA_BREACH', jsonb_build_object('hours_overdue', s.breach_h),
       s.entity, TRUE,
       s.warn_h, s.due_h, s.breach_h,
       s.role, 'MEDIUM', FALSE,
       TRUE, TRUE, TRUE,
       TRUE, CURRENT_DATE
FROM seed s
WHERE NOT EXISTS (
  SELECT 1 FROM public.bn_escalation_policy p WHERE p.policy_code = s.policy_code
);

-- Levels per policy
WITH p AS (SELECT id, policy_code FROM public.bn_escalation_policy)
INSERT INTO public.bn_escalation_policy_level
  (policy_id, level_no, trigger_after_hours, target_role, severity, action_type, auto_reassign)
SELECT p.id, lvl.level_no, lvl.hours, lvl.role, lvl.severity, lvl.action, lvl.reassign
FROM p
JOIN (VALUES
  ('INTAKE_REVIEW_24H',       1, 24,  'BN_SUPERVISOR',                'MEDIUM',   'NOTIFY',          FALSE),
  ('DOCUMENT_REVIEW_48H',     1, 48,  'BN_DOCUMENT_OFFICER',          'MEDIUM',   'NOTIFY',          FALSE),
  ('DOCUMENT_REVIEW_48H',     2, 72,  'BN_MANAGER',                   'HIGH',     'REASSIGN',        TRUE),
  ('ELIGIBILITY_REVIEW_48H',  1, 48,  'BN_SENIOR_ELIGIBILITY_OFFICER','MEDIUM',   'NOTIFY',          FALSE),
  ('ELIGIBILITY_REVIEW_48H',  2, 72,  'BN_MANAGER',                   'HIGH',     'REASSIGN',        TRUE),
  ('MEDICAL_BOARD_7D',        1, 120, 'MEDICAL_BOARD',                'MEDIUM',   'NOTIFY',          FALSE),
  ('MEDICAL_BOARD_7D',        2, 168, 'BN_DIRECTOR',                  'HIGH',     'MANAGER_ALERT',   FALSE),
  ('CALCULATION_REVIEW_24H',  1, 24,  'BN_SUPERVISOR',                'MEDIUM',   'NOTIFY',          FALSE),
  ('PAYMENT_PREPARATION_24H', 1, 24,  'BN_FINANCE_SUPERVISOR',        'MEDIUM',   'NOTIFY',          FALSE),
  ('PAYMENT_APPROVAL_24H',    1, 24,  'BN_FINANCE_SUPERVISOR',        'MEDIUM',   'NOTIFY',          FALSE),
  ('PAYMENT_APPROVAL_24H',    2, 48,  'BN_DIRECTOR',                  'HIGH',     'MANAGER_ALERT',   FALSE),
  ('OVERRIDE_REVIEW_24H',     1, 24,  'BN_SENIOR_ELIGIBILITY_OFFICER','MEDIUM',   'NOTIFY',          FALSE),
  ('OVERRIDE_REVIEW_24H',     2, 48,  'BN_MANAGER',                   'HIGH',     'REASSIGN',        TRUE),
  ('APPEAL_REVIEW_14D',       1, 240, 'BN_MANAGER',                   'MEDIUM',   'NOTIFY',          FALSE),
  ('APPEAL_REVIEW_14D',       2, 336, 'BN_DIRECTOR',                  'HIGH',     'MANAGER_ALERT',   FALSE)
) AS lvl(policy_code, level_no, hours, role, severity, action, reassign)
  ON p.policy_code = lvl.policy_code
ON CONFLICT (policy_id, level_no) DO NOTHING;
