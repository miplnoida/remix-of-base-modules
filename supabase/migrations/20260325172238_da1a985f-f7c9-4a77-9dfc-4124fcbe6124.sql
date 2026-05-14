
-- ============================================================
-- Phase 2, Migration 1: Seed Audit Workflow Definitions & Steps
-- ============================================================

-- Use deterministic UUIDs for audit workflows so we can reference them
-- Plan Approval Workflow
INSERT INTO public.workflow_definitions (id, name, description, process_type, secured_table, maker_checker_enabled, is_active, version, created_at, updated_at)
VALUES (
  'a2000000-0000-0000-0000-000000000001',
  'IA Plan Approval Workflow',
  'Two-step approval for annual audit plans. Step 1: Audit Manager review. Step 2: CAE/Lead Auditor final approval.',
  'approval',
  'ia_annual_plans',
  true,
  true,
  1,
  now(), now()
) ON CONFLICT (id) DO NOTHING;

-- Plan Revision Approval Workflow
INSERT INTO public.workflow_definitions (id, name, description, process_type, secured_table, maker_checker_enabled, is_active, version, created_at, updated_at)
VALUES (
  'a2000000-0000-0000-0000-000000000002',
  'IA Plan Revision Approval Workflow',
  'Approval workflow for mid-year plan amendments that require re-approval.',
  'approval',
  'ia_annual_plans',
  true,
  true,
  1,
  now(), now()
) ON CONFLICT (id) DO NOTHING;

-- Report Approval Workflow
INSERT INTO public.workflow_definitions (id, name, description, process_type, secured_table, maker_checker_enabled, is_active, version, created_at, updated_at)
VALUES (
  'a2000000-0000-0000-0000-000000000003',
  'IA Report Approval Workflow',
  'Two-step approval for audit reports before final issuance.',
  'approval',
  'ia_audit_reports',
  false,
  true,
  1,
  now(), now()
) ON CONFLICT (id) DO NOTHING;

-- Closure Approval Workflow
INSERT INTO public.workflow_definitions (id, name, description, process_type, secured_table, maker_checker_enabled, is_active, version, created_at, updated_at)
VALUES (
  'a2000000-0000-0000-0000-000000000004',
  'IA Closure Approval Workflow',
  'Approval workflow for audit engagement closure.',
  'approval',
  'ia_audit_engagements',
  false,
  true,
  1,
  now(), now()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Workflow Steps
-- ============================================================

-- Plan Approval Steps
INSERT INTO public.workflow_steps (id, workflow_id, step_number, step_name, assigned_role, action_type, sla_hours, is_final_step, created_at, updated_at, description, approver_type)
VALUES
  ('a2100000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 1, 'Audit Manager Review', 'Audit Manager', 'review', 48, false, now(), now(), 'Audit Manager reviews the submitted annual plan for completeness and feasibility.', 'role'),
  ('a2100000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 2, 'CAE Final Approval', 'Lead Auditor', 'approve', 72, true, now(), now(), 'Chief Audit Executive or Lead Auditor provides final approval or rejection.', 'role')
ON CONFLICT (id) DO NOTHING;

-- Plan Revision Steps
INSERT INTO public.workflow_steps (id, workflow_id, step_number, step_name, assigned_role, action_type, sla_hours, is_final_step, created_at, updated_at, description, approver_type)
VALUES
  ('a2100000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000002', 1, 'Review Revision', 'Audit Manager', 'review', 48, false, now(), now(), 'Audit Manager reviews the mid-year plan amendment.', 'role'),
  ('a2100000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000002', 2, 'Approve Revision', 'Lead Auditor', 'approve', 72, true, now(), now(), 'CAE approves or rejects the plan revision.', 'role')
ON CONFLICT (id) DO NOTHING;

-- Report Approval Steps
INSERT INTO public.workflow_steps (id, workflow_id, step_number, step_name, assigned_role, action_type, sla_hours, is_final_step, created_at, updated_at, description, approver_type)
VALUES
  ('a2100000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000003', 1, 'Lead Auditor Review', 'Lead Auditor', 'review', 48, false, now(), now(), 'Lead Auditor reviews the draft audit report.', 'role'),
  ('a2100000-0000-0000-0000-000000000006', 'a2000000-0000-0000-0000-000000000003', 2, 'Manager Approval', 'Audit Manager', 'approve', 72, true, now(), now(), 'Audit Manager or CAE approves the report for issuance.', 'role')
ON CONFLICT (id) DO NOTHING;

-- Closure Approval Steps
INSERT INTO public.workflow_steps (id, workflow_id, step_number, step_name, assigned_role, action_type, sla_hours, is_final_step, created_at, updated_at, description, approver_type)
VALUES
  ('a2100000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000004', 1, 'Lead Auditor Closure Review', 'Lead Auditor', 'review', 48, false, now(), now(), 'Lead Auditor confirms all artefacts are complete before closure.', 'role'),
  ('a2100000-0000-0000-0000-000000000008', 'a2000000-0000-0000-0000-000000000004', 2, 'Manager Closure Approval', 'Audit Manager', 'approve', 48, true, now(), now(), 'Audit Manager approves engagement closure.', 'role')
ON CONFLICT (id) DO NOTHING;
