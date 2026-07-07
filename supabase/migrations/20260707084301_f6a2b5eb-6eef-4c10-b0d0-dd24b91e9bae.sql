
-- ============================================================
-- Epic 9: Workflow Core Engine
-- ============================================================

-- Ensure timestamp trigger function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ 1) core_workflow_definition ============
CREATE TABLE IF NOT EXISTS public.core_workflow_definition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_code text NOT NULL,
  workflow_name text NOT NULL,
  description text,
  module_code text NOT NULL DEFAULT 'CORE',
  domain_code text,
  entity_type text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  workflow_status text NOT NULL DEFAULT 'DRAFT',
  start_step_code text,
  requires_reason_on_reject boolean NOT NULL DEFAULT true,
  allow_withdrawal boolean NOT NULL DEFAULT true,
  allow_delegation boolean NOT NULL DEFAULT true,
  allow_reassignment boolean NOT NULL DEFAULT true,
  effective_from date,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_code, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_workflow_definition TO authenticated;
GRANT ALL ON public.core_workflow_definition TO service_role;
DROP TRIGGER IF EXISTS trg_core_workflow_definition_updated ON public.core_workflow_definition;
CREATE TRIGGER trg_core_workflow_definition_updated BEFORE UPDATE ON public.core_workflow_definition FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2) core_workflow_step ============
CREATE TABLE IF NOT EXISTS public.core_workflow_step (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id uuid NOT NULL REFERENCES public.core_workflow_definition(id) ON DELETE CASCADE,
  step_code text NOT NULL,
  step_name text NOT NULL,
  description text,
  step_type text NOT NULL DEFAULT 'REVIEW',
  assigned_role_key text,
  assigned_permission_key text,
  assigned_user_id uuid,
  assigned_office_code text,
  assigned_department_id uuid,
  is_start_step boolean NOT NULL DEFAULT false,
  is_end_step boolean NOT NULL DEFAULT false,
  sla_hours integer,
  allow_comments boolean NOT NULL DEFAULT true,
  allow_attachments boolean NOT NULL DEFAULT false,
  requires_reason boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_definition_id, step_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_workflow_step TO authenticated;
GRANT ALL ON public.core_workflow_step TO service_role;
DROP TRIGGER IF EXISTS trg_core_workflow_step_updated ON public.core_workflow_step;
CREATE TRIGGER trg_core_workflow_step_updated BEFORE UPDATE ON public.core_workflow_step FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 3) core_workflow_transition ============
CREATE TABLE IF NOT EXISTS public.core_workflow_transition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id uuid NOT NULL REFERENCES public.core_workflow_definition(id) ON DELETE CASCADE,
  from_step_code text NOT NULL,
  to_step_code text,
  transition_code text NOT NULL,
  transition_name text NOT NULL,
  action_type text NOT NULL,
  required_permission_key text,
  requires_reason boolean NOT NULL DEFAULT false,
  requires_comment boolean NOT NULL DEFAULT false,
  condition_expression text,
  is_terminal boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_definition_id, from_step_code, transition_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_workflow_transition TO authenticated;
GRANT ALL ON public.core_workflow_transition TO service_role;
DROP TRIGGER IF EXISTS trg_core_workflow_transition_updated ON public.core_workflow_transition;
CREATE TRIGGER trg_core_workflow_transition_updated BEFORE UPDATE ON public.core_workflow_transition FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 4) core_workflow_instance ============
CREATE TABLE IF NOT EXISTS public.core_workflow_instance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id uuid REFERENCES public.core_workflow_definition(id) ON DELETE SET NULL,
  workflow_code text NOT NULL,
  workflow_version integer,
  module_code text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_display_name text,
  current_step_code text,
  current_step_name text,
  status text NOT NULL DEFAULT 'DRAFT',
  submitted_by uuid,
  submitted_at timestamptz,
  completed_by uuid,
  completed_at timestamptz,
  cancelled_by uuid,
  cancelled_at timestamptz,
  cancellation_reason text,
  due_at timestamptz,
  priority text NOT NULL DEFAULT 'NORMAL',
  owner_user_id uuid,
  owner_role_key text,
  owner_office_code text,
  owner_department_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_code, entity_type, entity_id, workflow_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_workflow_instance TO authenticated;
GRANT ALL ON public.core_workflow_instance TO service_role;
DROP TRIGGER IF EXISTS trg_core_workflow_instance_updated ON public.core_workflow_instance;
CREATE TRIGGER trg_core_workflow_instance_updated BEFORE UPDATE ON public.core_workflow_instance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 5) core_workflow_task ============
CREATE TABLE IF NOT EXISTS public.core_workflow_task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid NOT NULL REFERENCES public.core_workflow_instance(id) ON DELETE CASCADE,
  task_code text,
  task_name text NOT NULL,
  task_description text,
  step_code text NOT NULL,
  step_name text,
  assigned_to_user_id uuid,
  assigned_to_role_key text,
  assigned_to_permission_key text,
  assigned_to_office_code text,
  assigned_to_department_id uuid,
  task_status text NOT NULL DEFAULT 'OPEN',
  priority text NOT NULL DEFAULT 'NORMAL',
  due_at timestamptz,
  claimed_by uuid,
  claimed_at timestamptz,
  completed_by uuid,
  completed_at timestamptz,
  outcome text,
  comments text,
  metadata jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_workflow_task TO authenticated;
GRANT ALL ON public.core_workflow_task TO service_role;
DROP TRIGGER IF EXISTS trg_core_workflow_task_updated ON public.core_workflow_task;
CREATE TRIGGER trg_core_workflow_task_updated BEFORE UPDATE ON public.core_workflow_task FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 6) core_workflow_action_log ============
CREATE TABLE IF NOT EXISTS public.core_workflow_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid NOT NULL REFERENCES public.core_workflow_instance(id) ON DELETE CASCADE,
  workflow_task_id uuid REFERENCES public.core_workflow_task(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  action_name text,
  from_step_code text,
  to_step_code text,
  actor_user_id uuid,
  actor_name text,
  actor_role_summary text,
  outcome text NOT NULL DEFAULT 'SUCCESS',
  reason text,
  comments text,
  before_status text,
  after_status text,
  metadata jsonb,
  action_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_workflow_action_log TO authenticated;
GRANT ALL ON public.core_workflow_action_log TO service_role;

-- ============ 7) core_workflow_delegation_rule ============
CREATE TABLE IF NOT EXISTS public.core_workflow_delegation_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id uuid REFERENCES public.core_workflow_definition(id) ON DELETE CASCADE,
  module_code text NOT NULL DEFAULT 'CORE',
  step_code text,
  role_key text,
  permission_key text,
  allow_delegation boolean NOT NULL DEFAULT true,
  require_approval boolean NOT NULL DEFAULT false,
  max_delegation_days integer DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_workflow_delegation_rule TO authenticated;
GRANT ALL ON public.core_workflow_delegation_rule TO service_role;
DROP TRIGGER IF EXISTS trg_core_workflow_delegation_rule_updated ON public.core_workflow_delegation_rule;
CREATE TRIGGER trg_core_workflow_delegation_rule_updated BEFORE UPDATE ON public.core_workflow_delegation_rule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 8) core_workflow_escalation_rule ============
CREATE TABLE IF NOT EXISTS public.core_workflow_escalation_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id uuid NOT NULL REFERENCES public.core_workflow_definition(id) ON DELETE CASCADE,
  step_code text NOT NULL,
  escalate_after_hours integer NOT NULL,
  escalate_to_role_key text,
  escalate_to_user_id uuid,
  escalate_to_permission_key text,
  notification_template_code text,
  escalation_priority text NOT NULL DEFAULT 'HIGH',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_workflow_escalation_rule TO authenticated;
GRANT ALL ON public.core_workflow_escalation_rule TO service_role;
DROP TRIGGER IF EXISTS trg_core_workflow_escalation_rule_updated ON public.core_workflow_escalation_rule;
CREATE TRIGGER trg_core_workflow_escalation_rule_updated BEFORE UPDATE ON public.core_workflow_escalation_rule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Helpful indexes ============
CREATE INDEX IF NOT EXISTS idx_cwi_module_entity ON public.core_workflow_instance (module_code, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cwi_status ON public.core_workflow_instance (status);
CREATE INDEX IF NOT EXISTS idx_cwt_assigned_user ON public.core_workflow_task (assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_cwt_status ON public.core_workflow_task (task_status);
CREATE INDEX IF NOT EXISTS idx_cwal_instance ON public.core_workflow_action_log (workflow_instance_id, action_at DESC);

-- ============ Table registry ============
INSERT INTO public.core_table_registry (table_name, table_prefix, ownership_type, module_code, domain_code, table_category, is_legacy_table, data_classification, lifecycle_status, canonical_admin_route, contains_pii, is_active)
VALUES
  ('core_workflow_definition','core_','PLATFORM','CORE','OPERATIONS','WORKFLOW',false,'INTERNAL','ACTIVE','/admin/workflows',false,true),
  ('core_workflow_step','core_','PLATFORM','CORE','OPERATIONS','WORKFLOW',false,'INTERNAL','ACTIVE','/admin/workflows',false,true),
  ('core_workflow_transition','core_','PLATFORM','CORE','OPERATIONS','WORKFLOW',false,'INTERNAL','ACTIVE','/admin/workflows',false,true),
  ('core_workflow_instance','core_','PLATFORM','CORE','OPERATIONS','WORKFLOW',false,'INTERNAL','ACTIVE','/admin/workflow-inbox',false,true),
  ('core_workflow_task','core_','PLATFORM','CORE','OPERATIONS','WORKFLOW',false,'INTERNAL','ACTIVE','/admin/workflow-inbox',false,true),
  ('core_workflow_action_log','core_','PLATFORM','CORE','OPERATIONS','AUDIT',false,'CONFIDENTIAL','ACTIVE','/admin/workflow-logs',false,true),
  ('core_workflow_delegation_rule','core_','PLATFORM','CORE','OPERATIONS','WORKFLOW',false,'INTERNAL','ACTIVE','/admin/workflows',false,true),
  ('core_workflow_escalation_rule','core_','PLATFORM','CORE','OPERATIONS','WORKFLOW',false,'INTERNAL','ACTIVE','/admin/workflows',false,true)
ON CONFLICT (table_name) DO UPDATE SET
  ownership_type=EXCLUDED.ownership_type, module_code=EXCLUDED.module_code, domain_code=EXCLUDED.domain_code,
  table_category=EXCLUDED.table_category, data_classification=EXCLUDED.data_classification,
  lifecycle_status=EXCLUDED.lifecycle_status, canonical_admin_route=EXCLUDED.canonical_admin_route, is_active=EXCLUDED.is_active;

-- ============ Admin route registry ============
INSERT INTO public.core_admin_route_registry (route_path, page_name, admin_domain, canonical_status, owner_module_code, requires_permission, show_in_platform_admin, is_active)
VALUES
  ('/admin/workflow-inbox','Workflow Inbox','OPERATIONS','CANONICAL','CORE','core.workflow.inbox.view',true,true)
ON CONFLICT (route_path) DO UPDATE SET
  page_name=EXCLUDED.page_name, admin_domain=EXCLUDED.admin_domain, canonical_status=EXCLUDED.canonical_status,
  owner_module_code=EXCLUDED.owner_module_code, requires_permission=EXCLUDED.requires_permission,
  show_in_platform_admin=EXCLUDED.show_in_platform_admin, is_active=EXCLUDED.is_active;

-- ============ Reference source & consumer mappings ============
INSERT INTO public.core_reference_source_map
  (reference_category_code, reference_group_code, source_type, source_view_name, legacy_table_name,
   modern_entity_name, admin_route, owner_module_code, owner_domain_code, is_primary_source,
   sync_strategy, lifecycle_status, description, is_active)
VALUES
  ('WORKFLOW','WORKFLOW_STATUS','STATIC_ENUM',NULL,NULL,'WorkflowStatus','/admin/workflows','CORE','OPERATIONS',true,'READ_ONLY','ACTIVE','Workflow definition status enum',true),
  ('WORKFLOW','WORKFLOW_STEP_TYPE','STATIC_ENUM',NULL,NULL,'WorkflowStepType','/admin/workflows','CORE','OPERATIONS',true,'READ_ONLY','ACTIVE','Workflow step type enum',true),
  ('WORKFLOW','WORKFLOW_ACTION_TYPE','STATIC_ENUM',NULL,NULL,'WorkflowActionType','/admin/workflows','CORE','OPERATIONS',true,'READ_ONLY','ACTIVE','Workflow transition action type enum',true),
  ('WORKFLOW','WORKFLOW_TASK_STATUS','STATIC_ENUM',NULL,NULL,'WorkflowTaskStatus','/admin/workflow-inbox','CORE','OPERATIONS',true,'READ_ONLY','ACTIVE','Workflow task status enum',true),
  ('WORKFLOW','WORKFLOW_PRIORITY','STATIC_ENUM',NULL,NULL,'WorkflowPriority','/admin/workflow-inbox','CORE','OPERATIONS',true,'READ_ONLY','ACTIVE','Workflow priority enum',true),
  ('WORKFLOW','WORKFLOW_OUTCOME','STATIC_ENUM',NULL,NULL,'WorkflowOutcome','/admin/workflow-logs','CORE','OPERATIONS',true,'READ_ONLY','ACTIVE','Workflow outcome enum',true)
ON CONFLICT DO NOTHING;

INSERT INTO public.core_reference_consumer_map
  (reference_group_code, consumer_module_code, consumer_domain_code, usage_type, is_required, is_active, notes)
VALUES
  ('WORKFLOW_STATUS','CORE','OPERATIONS','WORKFLOW',true,true,'Workflow engine core'),
  ('WORKFLOW_STEP_TYPE','CORE','OPERATIONS','WORKFLOW',true,true,'Workflow engine core'),
  ('WORKFLOW_ACTION_TYPE','CORE','OPERATIONS','WORKFLOW',true,true,'Workflow engine core'),
  ('WORKFLOW_TASK_STATUS','CORE','OPERATIONS','WORKFLOW',true,true,'Workflow engine core'),
  ('WORKFLOW_PRIORITY','CORE','OPERATIONS','WORKFLOW',true,true,'Workflow engine core'),
  ('WORKFLOW_OUTCOME','CORE','OPERATIONS','WORKFLOW',true,true,'Workflow engine core'),
  ('WORKFLOW_TASK_STATUS','CORE','PEOPLE_ACCESS','LOOKUP',false,true,'Task inbox filters'),
  ('WORKFLOW_STATUS','CORE','REPORTING','REPORTING',false,true,'Workflow reporting filters'),
  ('WORKFLOW_PRIORITY','CORE','REPORTING','REPORTING',false,true,'Workflow reporting filters')
ON CONFLICT DO NOTHING;

-- ============ Permission registry ============
INSERT INTO public.core_permission_registry
  (permission_key, permission_name, description, module_code, domain_code, permission_scope, action_code,
   is_platform_permission, is_sensitive_permission, is_admin_permission, risk_level, lifecycle_status,
   seeded_from_registry, source_file, is_active)
VALUES
  ('core.admin.workflow.view','View Workflows','View workflow definitions & configuration','CORE','OPERATIONS','PAGE','view',true,false,true,'LOW','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.admin.workflow.manage_definitions','Manage Workflow Definitions',NULL,'CORE','OPERATIONS','ADMIN','manage',true,true,true,'HIGH','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.admin.workflow.manage_steps','Manage Workflow Steps',NULL,'CORE','OPERATIONS','ADMIN','manage',true,true,true,'HIGH','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.admin.workflow.manage_transitions','Manage Workflow Transitions',NULL,'CORE','OPERATIONS','ADMIN','manage',true,true,true,'HIGH','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.admin.workflow.manage_rules','Manage Workflow Delegation/Escalation Rules',NULL,'CORE','OPERATIONS','ADMIN','manage',true,true,true,'HIGH','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.admin.workflow.activate','Activate Workflow',NULL,'CORE','OPERATIONS','ADMIN','activate',true,true,true,'CRITICAL','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.admin.workflow.retire','Retire Workflow',NULL,'CORE','OPERATIONS','ADMIN','retire',true,true,true,'CRITICAL','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.workflow.inbox.view','View Workflow Inbox',NULL,'CORE','OPERATIONS','PAGE','view',true,false,false,'LOW','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.workflow.task.claim','Claim Workflow Task',NULL,'CORE','OPERATIONS','ACTION','claim',true,false,false,'MEDIUM','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.workflow.task.complete','Complete Workflow Task',NULL,'CORE','OPERATIONS','ACTION','complete',true,false,false,'MEDIUM','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.workflow.task.approve','Approve Workflow Task',NULL,'CORE','OPERATIONS','ACTION','approve',true,true,false,'HIGH','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.workflow.task.reject','Reject Workflow Task',NULL,'CORE','OPERATIONS','ACTION','reject',true,true,false,'HIGH','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.workflow.task.return','Return Workflow Task',NULL,'CORE','OPERATIONS','ACTION','return',true,false,false,'MEDIUM','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.workflow.task.reassign','Reassign Workflow Task',NULL,'CORE','OPERATIONS','ACTION','reassign',true,true,false,'HIGH','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.workflow.task.delegate','Delegate Workflow Task',NULL,'CORE','OPERATIONS','ACTION','delegate',true,true,false,'HIGH','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.workflow.task.escalate','Escalate Workflow Task',NULL,'CORE','OPERATIONS','ACTION','escalate',true,true,false,'HIGH','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.workflow.task.withdraw','Withdraw Workflow Task',NULL,'CORE','OPERATIONS','ACTION','withdraw',true,false,false,'MEDIUM','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.workflow.task.cancel','Cancel Workflow Task',NULL,'CORE','OPERATIONS','ACTION','cancel',true,true,false,'HIGH','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true),
  ('core.workflow.audit.view','View Workflow Audit History',NULL,'CORE','OPERATIONS','PAGE','view',true,false,false,'MEDIUM','ACTIVE',true,'src/platform/workflow/workflowPermissions.ts',true)
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name=EXCLUDED.permission_name, description=EXCLUDED.description,
  risk_level=EXCLUDED.risk_level, is_sensitive_permission=EXCLUDED.is_sensitive_permission,
  is_admin_permission=EXCLUDED.is_admin_permission, is_platform_permission=EXCLUDED.is_platform_permission,
  lifecycle_status=EXCLUDED.lifecycle_status, source_file=EXCLUDED.source_file, is_active=EXCLUDED.is_active;

-- ============ Audit event types ============
INSERT INTO public.core_audit_event_type
  (event_code, event_name, module_code, domain_code, event_category, default_severity, default_risk_level,
   is_admin_event, is_security_event, is_migration_event, is_pii_event, is_financial_event, requires_before_after)
VALUES
  ('WORKFLOW_DEFINITION_CREATED','Workflow Definition Created','CORE','OPERATIONS','CONFIG','INFO','MEDIUM',true,false,false,false,false,false),
  ('WORKFLOW_DEFINITION_UPDATED','Workflow Definition Updated','CORE','OPERATIONS','CONFIG','INFO','MEDIUM',true,false,false,false,false,true),
  ('WORKFLOW_DEFINITION_ACTIVATED','Workflow Definition Activated','CORE','OPERATIONS','CONFIG','INFO','HIGH',true,false,false,false,false,false),
  ('WORKFLOW_DEFINITION_RETIRED','Workflow Definition Retired','CORE','OPERATIONS','CONFIG','WARNING','HIGH',true,false,false,false,false,false),
  ('WORKFLOW_STEP_CREATED','Workflow Step Created','CORE','OPERATIONS','CONFIG','INFO','MEDIUM',true,false,false,false,false,false),
  ('WORKFLOW_STEP_UPDATED','Workflow Step Updated','CORE','OPERATIONS','CONFIG','INFO','MEDIUM',true,false,false,false,false,true),
  ('WORKFLOW_TRANSITION_CREATED','Workflow Transition Created','CORE','OPERATIONS','CONFIG','INFO','MEDIUM',true,false,false,false,false,false),
  ('WORKFLOW_TRANSITION_UPDATED','Workflow Transition Updated','CORE','OPERATIONS','CONFIG','INFO','MEDIUM',true,false,false,false,false,true),
  ('WORKFLOW_INSTANCE_STARTED','Workflow Started','CORE','OPERATIONS','WORKFLOW','INFO','LOW',false,false,false,false,false,false),
  ('WORKFLOW_INSTANCE_SUBMITTED','Workflow Submitted','CORE','OPERATIONS','WORKFLOW','INFO','LOW',false,false,false,false,false,false),
  ('WORKFLOW_INSTANCE_APPROVED','Workflow Approved','CORE','OPERATIONS','WORKFLOW','INFO','MEDIUM',false,false,false,false,false,false),
  ('WORKFLOW_INSTANCE_REJECTED','Workflow Rejected','CORE','OPERATIONS','WORKFLOW','WARNING','MEDIUM',false,false,false,false,false,false),
  ('WORKFLOW_INSTANCE_RETURNED','Workflow Returned','CORE','OPERATIONS','WORKFLOW','INFO','LOW',false,false,false,false,false,false),
  ('WORKFLOW_INSTANCE_WITHDRAWN','Workflow Withdrawn','CORE','OPERATIONS','WORKFLOW','INFO','LOW',false,false,false,false,false,false),
  ('WORKFLOW_INSTANCE_CANCELLED','Workflow Cancelled','CORE','OPERATIONS','WORKFLOW','WARNING','MEDIUM',false,false,false,false,false,false),
  ('WORKFLOW_INSTANCE_COMPLETED','Workflow Completed','CORE','OPERATIONS','WORKFLOW','INFO','LOW',false,false,false,false,false,false),
  ('WORKFLOW_INSTANCE_ESCALATED','Workflow Escalated','CORE','OPERATIONS','WORKFLOW','WARNING','HIGH',false,false,false,false,false,false),
  ('WORKFLOW_TASK_CREATED','Workflow Task Created','CORE','OPERATIONS','WORKFLOW','INFO','LOW',false,false,false,false,false,false),
  ('WORKFLOW_TASK_CLAIMED','Workflow Task Claimed','CORE','OPERATIONS','WORKFLOW','INFO','LOW',false,false,false,false,false,false),
  ('WORKFLOW_TASK_COMPLETED','Workflow Task Completed','CORE','OPERATIONS','WORKFLOW','INFO','LOW',false,false,false,false,false,false),
  ('WORKFLOW_TASK_REASSIGNED','Workflow Task Reassigned','CORE','OPERATIONS','WORKFLOW','INFO','MEDIUM',false,false,false,false,false,false),
  ('WORKFLOW_TASK_DELEGATED','Workflow Task Delegated','CORE','OPERATIONS','WORKFLOW','INFO','MEDIUM',false,false,false,false,false,false),
  ('WORKFLOW_TASK_ESCALATED','Workflow Task Escalated','CORE','OPERATIONS','WORKFLOW','WARNING','HIGH',false,false,false,false,false,false)
ON CONFLICT (event_code) DO NOTHING;

-- ============ Sample workflow definitions (DRAFT) ============
DO $$
DECLARE
  v_id uuid;
  v_codes text[] := ARRAY[
    'EMPLOYER_REGISTRATION_APPROVAL',
    'INSURED_PERSON_DATA_CORRECTION_APPROVAL',
    'BENEFIT_CLAIM_APPROVAL',
    'PAYMENT_AUTHORIZATION',
    'REFERENCE_DATA_CHANGE_APPROVAL',
    'USER_DELEGATION_APPROVAL'
  ];
  v_names text[] := ARRAY[
    'Employer Registration Approval',
    'Insured Person Data Correction Approval',
    'Benefit Claim Approval',
    'Payment Authorization',
    'Reference Data Change Approval',
    'User Delegation Approval'
  ];
  v_entities text[] := ARRAY['EMPLOYER','INSURED_PERSON','BENEFIT_CLAIM','PAYMENT','REFERENCE_CHANGE','USER_DELEGATION'];
  v_modules  text[] := ARRAY['ER','IP','BN','FIN','CORE','CORE'];
  i int;
BEGIN
  FOR i IN 1..array_length(v_codes,1) LOOP
    INSERT INTO public.core_workflow_definition
      (workflow_code, workflow_name, description, module_code, domain_code, entity_type, version, workflow_status, start_step_code, is_active)
    VALUES
      (v_codes[i], v_names[i], 'Sample workflow template — Epic 9 seed', v_modules[i], 'OPERATIONS', v_entities[i], 1, 'DRAFT', 'SUBMIT', true)
    ON CONFLICT (workflow_code, version) DO NOTHING
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM public.core_workflow_definition WHERE workflow_code=v_codes[i] AND version=1;
    END IF;

    INSERT INTO public.core_workflow_step
      (workflow_definition_id, step_code, step_name, step_type, is_start_step, is_end_step, display_order, sla_hours)
    VALUES
      (v_id,'SUBMIT','Submit','SUBMIT',true,false,10,NULL),
      (v_id,'REVIEW','Review','REVIEW',false,false,20,48),
      (v_id,'APPROVE','Approve','APPROVAL',false,false,30,24),
      (v_id,'END','Completed','END',false,true,40,NULL)
    ON CONFLICT (workflow_definition_id, step_code) DO NOTHING;

    INSERT INTO public.core_workflow_transition
      (workflow_definition_id, from_step_code, to_step_code, transition_code, transition_name, action_type, requires_reason, is_terminal, display_order)
    VALUES
      (v_id,'SUBMIT','REVIEW','SUBMIT','Submit for Review','SUBMIT',false,false,10),
      (v_id,'REVIEW','APPROVE','FORWARD','Forward to Approver','SUBMIT',false,false,20),
      (v_id,'REVIEW','SUBMIT','RETURN','Return to Submitter','RETURN',true,false,30),
      (v_id,'APPROVE','END','APPROVE','Approve','APPROVE',false,true,40),
      (v_id,'APPROVE','END','REJECT','Reject','REJECT',true,true,50),
      (v_id,'APPROVE','REVIEW','RETURN','Return to Reviewer','RETURN',true,false,60)
    ON CONFLICT (workflow_definition_id, from_step_code, transition_code) DO NOTHING;
  END LOOP;
END $$;
