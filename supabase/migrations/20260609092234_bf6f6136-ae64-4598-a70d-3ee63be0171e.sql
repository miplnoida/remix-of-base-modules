
-- 1. Roles
INSERT INTO public.roles (role_name, description, is_system_role)
SELECT v.role_name, v.description, true
FROM (VALUES
  ('BN_INTAKE_OFFICER','Benefits intake clerk'),
  ('BN_DOCUMENT_OFFICER','Benefits document reviewer'),
  ('BN_ELIGIBILITY_OFFICER','Benefits eligibility officer'),
  ('BN_SENIOR_ELIGIBILITY_OFFICER','Senior eligibility officer / override reviewer'),
  ('BN_CALCULATION_OFFICER','Benefits calculation officer'),
  ('BN_CLAIMS_OFFICER','Benefits claims officer'),
  ('BN_SUPERVISOR','Benefits supervisor'),
  ('BN_MANAGER','Benefits manager'),
  ('BN_DIRECTOR','Benefits director'),
  ('BN_AWARD_OFFICER','Benefits award setup officer'),
  ('BN_PAYMENT_OFFICER','Benefits payment preparation officer'),
  ('BN_FINANCE_SUPERVISOR','Benefits finance supervisor / payment approver'),
  ('BN_AUDITOR','Benefits auditor (read-only)'),
  ('BN_CONFIG_ADMIN','Benefits configuration administrator')
) AS v(role_name, description)
WHERE NOT EXISTS (SELECT 1 FROM public.roles r WHERE r.role_name = v.role_name);

-- 2. Workbaskets
INSERT INTO public.bn_workbasket (basket_code, basket_name, description, assigned_role, entered_by, modified_by)
SELECT v.code, v.name, v.descr, v.role, 'SYSTEM', 'SYSTEM'
FROM (VALUES
  ('BN_INTAKE_REVIEW','Intake Review','New claim intake queue','BN_INTAKE_OFFICER'),
  ('BN_DOCUMENT_REVIEW','Document Review','Document verification queue','BN_DOCUMENT_OFFICER'),
  ('BN_ELIGIBILITY_REVIEW','Eligibility Review','Eligibility evaluation queue','BN_ELIGIBILITY_OFFICER'),
  ('BN_ELIGIBILITY_OVERRIDE_REVIEW','Eligibility Override Review','Eligibility override approval queue','BN_SENIOR_ELIGIBILITY_OFFICER'),
  ('BN_CALCULATION_REVIEW','Calculation Review','Benefit calculation queue','BN_CALCULATION_OFFICER'),
  ('BN_CLAIM_RECOMMENDATION','Claim Recommendation','Officer recommendation queue','BN_CLAIMS_OFFICER'),
  ('BN_SUPERVISOR_APPROVAL','Supervisor Approval','Supervisor approval queue','BN_SUPERVISOR'),
  ('BN_MANAGER_APPROVAL','Manager Approval','Manager approval queue','BN_MANAGER'),
  ('BN_DIRECTOR_APPROVAL','Director Approval','Director approval queue (high-value / exception)','BN_DIRECTOR'),
  ('BN_AWARD_SETUP','Award Setup','Award setup queue (long-term benefits)','BN_AWARD_OFFICER'),
  ('BN_PAYMENT_PREPARATION','Payment Preparation','Payment instruction preparation','BN_PAYMENT_OFFICER'),
  ('BN_PAYMENT_APPROVAL','Payment Approval','Finance payment approval queue','BN_FINANCE_SUPERVISOR'),
  ('BN_PAYMENT_ISSUE','Payment Issue','Payment issue / EFT / cheque queue','BN_PAYMENT_OFFICER'),
  ('BN_CONFIG_AUDIT','Configuration Audit','Audit and configuration review queue','BN_AUDITOR')
) AS v(code, name, descr, role)
WHERE NOT EXISTS (SELECT 1 FROM public.bn_workbasket w WHERE w.basket_code = v.code);

-- 3. Workflow definition
INSERT INTO public.workflow_definitions (name, description, process_type, secured_table, is_active, version)
SELECT 'CLAIM_GOVERNANCE_WORKFLOW',
       'Benefit Claim end-to-end governance workflow (intake → closed)',
       'BN_CLAIM', 'bn_claim', true, 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.workflow_definitions WHERE name = 'CLAIM_GOVERNANCE_WORKFLOW'
);

-- 4. Workflow steps (14 stages)
WITH wf AS (
  SELECT id FROM public.workflow_definitions WHERE name = 'CLAIM_GOVERNANCE_WORKFLOW'
)
INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, assigned_role, action_type, sla_hours, is_final_step)
SELECT wf.id, v.step_number, v.step_name, v.role, v.action_type, v.sla_hours, v.is_final
FROM wf, (VALUES
  (1,'INTAKE','BN_INTAKE_OFFICER','Review',24,false),
  (2,'DOCUMENT_REVIEW','BN_DOCUMENT_OFFICER','Review',48,false),
  (3,'ELIGIBILITY_CHECK','BN_ELIGIBILITY_OFFICER','Review',48,false),
  (4,'ELIGIBILITY_OVERRIDE_REVIEW','BN_SENIOR_ELIGIBILITY_OFFICER','Approve',48,false),
  (5,'CALCULATION','BN_CALCULATION_OFFICER','Review',48,false),
  (6,'OFFICER_RECOMMENDATION','BN_CLAIMS_OFFICER','Recommend',48,false),
  (7,'SUPERVISOR_REVIEW','BN_SUPERVISOR','Approve',48,false),
  (8,'MANAGER_REVIEW','BN_MANAGER','Approve',72,false),
  (9,'DIRECTOR_REVIEW','BN_DIRECTOR','Approve',72,false),
  (10,'AWARD_SETUP','BN_AWARD_OFFICER','Configure',48,false),
  (11,'PAYMENT_PREPARATION','BN_PAYMENT_OFFICER','Prepare',48,false),
  (12,'PAYMENT_APPROVAL','BN_FINANCE_SUPERVISOR','Approve',48,false),
  (13,'PAYMENT_ISSUE','BN_PAYMENT_OFFICER','Issue',48,false),
  (14,'CLOSED','BN_CLAIMS_OFFICER','Close',24,true)
) AS v(step_number, step_name, role, action_type, sla_hours, is_final)
WHERE NOT EXISTS (
  SELECT 1 FROM public.workflow_steps s WHERE s.workflow_id = wf.id AND s.step_number = v.step_number
);

-- 5. Extend bn_approval_policy with stage_code / stage_sequence for ordered approval paths
ALTER TABLE public.bn_approval_policy
  ADD COLUMN IF NOT EXISTS stage_code TEXT,
  ADD COLUMN IF NOT EXISTS stage_sequence INTEGER;

CREATE INDEX IF NOT EXISTS idx_bn_approval_policy_pv_stage
  ON public.bn_approval_policy (product_version_id, stage_sequence);

COMMENT ON COLUMN public.bn_approval_policy.stage_code IS
  'Workflow stage code (matches workflow_steps.step_name in CLAIM_GOVERNANCE_WORKFLOW). Used to express per-product approval path.';
COMMENT ON COLUMN public.bn_approval_policy.stage_sequence IS
  'Ordering of this approval row within the product approval path. NULL = legacy / non-staged policy row.';
