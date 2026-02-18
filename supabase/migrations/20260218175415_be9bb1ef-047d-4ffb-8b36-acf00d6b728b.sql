
-- ============================================================
-- QA FRAMEWORK: Full Schema Migration
-- Created: 2026-02-18
-- ============================================================

-- 1. Knowledge Repository: business rules, validations, workflows
CREATE TABLE public.qa_knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL DEFAULT 'validation', -- validation | calculation | workflow | api_contract | ui_behavior | db_constraint | access_control
  module VARCHAR(100) NOT NULL,
  submodule VARCHAR(100),
  screen_path VARCHAR(200),
  api_endpoint VARCHAR(200),
  db_table VARCHAR(100),
  workflow_step VARCHAR(100),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- critical | high | medium | low
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active | deprecated | draft
  rule_definition JSONB NOT NULL DEFAULT '{}', -- structured rule details
  expected_behavior TEXT,
  positive_example JSONB,
  negative_example JSONB,
  boundary_conditions JSONB,
  tags TEXT[],
  version INTEGER NOT NULL DEFAULT 1,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  parent_id UUID REFERENCES public.qa_knowledge_entries(id),
  created_by UUID,
  created_by_code VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  updated_by_code VARCHAR(10),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Cross-module dependency map
CREATE TABLE public.qa_module_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_module VARCHAR(100) NOT NULL,
  depends_on_module VARCHAR(100) NOT NULL,
  dependency_type VARCHAR(50) NOT NULL DEFAULT 'data', -- data | workflow | api | ui
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Test case definitions (generated or manual)
CREATE TABLE public.qa_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_entry_id UUID REFERENCES public.qa_knowledge_entries(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  test_type VARCHAR(50) NOT NULL DEFAULT 'positive', -- positive | negative | boundary | dependency | workflow | rbac | integrity
  module VARCHAR(100) NOT NULL,
  submodule VARCHAR(100),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- critical | high | medium | low
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active | disabled | archived
  test_config JSONB NOT NULL DEFAULT '{}', -- endpoint, method, payload, headers, expected_status, expected_body, rollback_sql
  expected_result JSONB NOT NULL DEFAULT '{}',
  generation_source VARCHAR(20) NOT NULL DEFAULT 'manual', -- manual | ai | hybrid
  generation_prompt TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT false, -- blocks deployment if fails
  tags TEXT[],
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_by_code VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Test execution runs (per build/publish cycle)
CREATE TABLE public.qa_execution_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_name TEXT NOT NULL,
  run_type VARCHAR(30) NOT NULL DEFAULT 'module', -- full | module | targeted | manual
  trigger_source VARCHAR(30) NOT NULL DEFAULT 'manual', -- manual | build | publish | scheduled
  triggered_by UUID,
  triggered_by_code VARCHAR(10),
  release_version VARCHAR(50),
  modules_targeted TEXT[],
  change_reference TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | running | passed | failed | blocked | cancelled
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  execution_duration_ms INTEGER,
  blocking_failures INTEGER NOT NULL DEFAULT 0,
  deployment_blocked BOOLEAN NOT NULL DEFAULT false,
  summary_notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Individual test case execution results
CREATE TABLE public.qa_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.qa_execution_runs(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES public.qa_test_cases(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | passed | failed | skipped | error | blocked
  request_payload JSONB,
  expected_outcome JSONB,
  actual_outcome JSONB,
  diff_details JSONB,
  error_message TEXT,
  stack_trace TEXT,
  execution_duration_ms INTEGER,
  executed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. AI generation log for test cases
CREATE TABLE public.qa_ai_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(100),
  knowledge_entry_id UUID REFERENCES public.qa_knowledge_entries(id) ON DELETE SET NULL,
  prompt_used TEXT,
  model_used VARCHAR(100),
  generated_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  raw_response JSONB,
  triggered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. QA pipeline settings
CREATE TABLE public.qa_pipeline_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(30) NOT NULL DEFAULT 'string', -- string | boolean | integer | json
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.qa_pipeline_settings (setting_key, setting_value, setting_type, description) VALUES
('block_on_critical_failure', 'true', 'boolean', 'Block deployment if any critical test case fails'),
('block_on_high_failure', 'true', 'boolean', 'Block deployment if any high priority test case fails'),
('auto_run_on_publish', 'true', 'boolean', 'Automatically run full regression on publish'),
('auto_run_on_build', 'true', 'boolean', 'Automatically run targeted regression on build'),
('ai_model', 'google/gemini-3-flash-preview', 'string', 'AI model used for test case generation'),
('max_parallel_tests', '10', 'integer', 'Maximum number of tests to run in parallel'),
('default_timeout_ms', '30000', 'integer', 'Default test execution timeout in milliseconds');

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_qa_knowledge_module ON public.qa_knowledge_entries(module);
CREATE INDEX idx_qa_knowledge_status ON public.qa_knowledge_entries(status);
CREATE INDEX idx_qa_knowledge_latest ON public.qa_knowledge_entries(is_latest) WHERE is_latest = true;
CREATE INDEX idx_qa_testcases_module ON public.qa_test_cases(module);
CREATE INDEX idx_qa_testcases_status ON public.qa_test_cases(status);
CREATE INDEX idx_qa_testcases_knowledge ON public.qa_test_cases(knowledge_entry_id);
CREATE INDEX idx_qa_runs_status ON public.qa_execution_runs(status);
CREATE INDEX idx_qa_runs_created ON public.qa_execution_runs(created_at DESC);
CREATE INDEX idx_qa_results_run ON public.qa_test_results(run_id);
CREATE INDEX idx_qa_results_status ON public.qa_test_results(status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.qa_knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_module_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ai_generation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_pipeline_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users with system_administration can read/write QA tables
CREATE POLICY "qa_knowledge_authenticated_read" ON public.qa_knowledge_entries
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "qa_knowledge_admin_write" ON public.qa_knowledge_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "qa_dependencies_authenticated_read" ON public.qa_module_dependencies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "qa_dependencies_admin_write" ON public.qa_module_dependencies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "qa_testcases_authenticated_read" ON public.qa_test_cases
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "qa_testcases_admin_write" ON public.qa_test_cases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "qa_runs_authenticated_read" ON public.qa_execution_runs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "qa_runs_admin_write" ON public.qa_execution_runs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "qa_results_authenticated_read" ON public.qa_test_results
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "qa_results_admin_write" ON public.qa_test_results
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "qa_ailog_admin_all" ON public.qa_ai_generation_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "qa_settings_authenticated_read" ON public.qa_pipeline_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "qa_settings_admin_write" ON public.qa_pipeline_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SEED: Baseline knowledge entries for IP Registration,
--       Workflow Engine, and System Settings modules
-- ============================================================
INSERT INTO public.qa_knowledge_entries (title, rule_type, module, submodule, screen_path, db_table, priority, expected_behavior, rule_definition, tags) VALUES

-- IP Registration rules
('IP Registration: SSN must never come from external API', 'validation', 'IP Registration', 'Conversion', '/ip-registration', 'ip_master', 'critical',
 'SSN is always generated by the system via submit_ip_registration RPC. It must never be sourced from external API payloads.',
 '{"rule": "ssn_generation", "source": "system_only", "rpc": "submit_ip_registration", "prohibited_source": "api_payload"}',
 ARRAY['ssn', 'conversion', 'ip_master', 'critical']),

('IP Registration: Work Permit Expiry mandatory when Work Permit = Y', 'validation', 'IP Registration', 'Personal Info', '/ip-registration', 'ip_master', 'high',
 'When work_permit field is Y, work_permit_expiration must not be null or empty.',
 '{"rule": "conditional_required", "when_field": "work_permit", "when_value": "Y", "required_field": "work_permit_expiration"}',
 ARRAY['work_permit', 'validation', 'conditional']),

('IP Registration: Date of Residency mandatory when birth place differs from place of residence', 'validation', 'IP Registration', 'Personal Info', '/ip-registration', 'ip_master', 'high',
 'date_of_residency is mandatory when birth_place canonical code differs from place_of_residence canonical code.',
 '{"rule": "conditional_required", "condition": "birth_place_code != place_of_residence_code", "required_field": "date_of_residency"}',
 ARRAY['date_of_residency', 'birth_place', 'place_of_residence', 'validation']),

('IP Registration: Address columns max 50 characters', 'validation', 'IP Registration', 'Address', '/ip-registration', 'ip_master', 'medium',
 'All address columns (resident_addr1/2, mail_addr1/2, contact_addr1/2) are varchar(50). Frontend must enforce maxLength=50.',
 '{"rule": "field_length", "affected_columns": ["resident_addr1","resident_addr2","mail_addr1","mail_addr2","contact_addr1","contact_addr2"], "max_length": 50}',
 ARRAY['address', 'varchar', 'ip_master', 'length']),

('IP Registration: Atomic conversion via convert_application_atomic RPC', 'workflow', 'IP Registration', 'Conversion', '/online-applications/insured-person', 'ip_master', 'critical',
 'Conversion must be atomic: draft insert (status Z), then submit_ip_registration for SSN, then dependants insert. Rollback on any failure.',
 '{"rule": "atomic_transaction", "rpc": "convert_application_atomic", "steps": ["insert_draft_status_Z", "call_submit_ip_registration", "insert_ip_depend"]}',
 ARRAY['conversion', 'atomic', 'rpc', 'critical']),

('IP Registration: Marriage status requires Marriage Certificate', 'validation', 'IP Registration', 'Relations', '/ip-registration', 'ip_master', 'high',
 'When marital status is M (Married), a Marriage Certificate document must be attached.',
 '{"rule": "conditional_required", "when_field": "marital_status", "when_value": "M", "required_field": "marriage_certificate_document"}',
 ARRAY['marriage', 'document', 'conditional', 'validation']),

-- Workflow Engine rules
('Workflow Engine: Terminal actions must set completed_at', 'workflow', 'Workflow Engine', 'State Transition', '/admin/workflow-instances', 'workflow_instances', 'critical',
 'When a workflow transitions to Approved or Rejected (terminal states), completed_at must be stamped and status updated in workflow_instances.',
 '{"rule": "terminal_state", "terminal_statuses": ["Approved","Rejected"], "must_set": "completed_at", "table": "workflow_instances"}',
 ARRAY['workflow', 'terminal', 'approved', 'rejected', 'critical']),

('Workflow Engine: workflow_instances has no updated_at column', 'db_constraint', 'Workflow Engine', 'Database', '/admin/workflow-instances', 'workflow_instances', 'critical',
 'The workflow_instances table does NOT have an updated_at column. Including it in UPDATE statements causes silent failure and stuck workflows.',
 '{"rule": "column_existence", "table": "workflow_instances", "absent_column": "updated_at", "impact": "silent_failure_on_update"}',
 ARRAY['workflow_instances', 'updated_at', 'schema', 'critical', 'silent_failure']),

('Workflow Engine: Approved workflow instances excluded from online applications listing', 'ui_behavior', 'Workflow Engine', 'Listing', '/online-applications/insured-person', 'workflow_instances', 'high',
 'Applications with workflow_instances.status = Approved for module insured-person-applications must be excluded from the listing grid.',
 '{"rule": "exclusion_filter", "table": "workflow_instances", "filter": {"status": "Approved", "source_module": "insured-person-applications"}}',
 ARRAY['listing', 'filter', 'approved', 'online-applications']),

('Workflow Engine: External API call non-blocking on failure', 'workflow', 'Workflow Engine', 'API Integration', '/admin/workflow-instances', 'workflow_step_action_api', 'high',
 'External API integrations triggered after workflow transition are logged but must not block the state transition itself.',
 '{"rule": "non_blocking_integration", "behavior": "log_failure_continue", "table": "workflow_step_action_api"}',
 ARRAY['api', 'non-blocking', 'workflow', 'integration']),

-- System Settings rules  
('System Settings: Only Admin role can access system administration', 'access_control', 'System Settings', 'RBAC', '/admin', 'user_roles', 'critical',
 'The Admin role (case-sensitive) in user_roles table is the single source of truth for administrative privileges.',
 '{"rule": "rbac", "required_role": "Admin", "table": "user_roles", "note": "case_sensitive"}',
 ARRAY['rbac', 'admin', 'security', 'critical']),

('System Settings: User roles stored in separate user_roles table', 'db_constraint', 'System Settings', 'Security', '/admin/users', 'user_roles', 'critical',
 'Roles must NEVER be stored in profiles or users table to prevent privilege escalation attacks. user_roles is the only authoritative source.',
 '{"rule": "role_isolation", "correct_table": "user_roles", "prohibited_tables": ["profiles", "users"]}',
 ARRAY['roles', 'security', 'privilege_escalation', 'critical']),

('System Settings: Audit trail must record user_code not UUID for signatures', 'validation', 'System Settings', 'Audit', '/system-logs/audit', 'system_audit_trail', 'high',
 'Fields like entered_by, modified_by use user_code (5-char). created_by stores UUID. Both must be explicitly applied after form data spreads.',
 '{"rule": "dual_identity_audit", "user_code_fields": ["entered_by","modified_by","submitted_by"], "uuid_fields": ["created_by"]}',
 ARRAY['audit', 'user_code', 'uuid', 'identity']);
