
-- ============================================================
-- Phase 1, Migration 2: Add columns to existing ia_* tables
-- ============================================================

-- ia_annual_plans — 6 new columns
ALTER TABLE public.ia_annual_plans
  ADD COLUMN IF NOT EXISTS current_version_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS workflow_instance_id uuid,
  ADD COLUMN IF NOT EXISTS revision_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_conflict_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS conflict_check_result jsonb,
  ADD COLUMN IF NOT EXISTS execution_gate_status text;

-- ia_audit_engagements — 3 new columns
ALTER TABLE public.ia_audit_engagements
  ADD COLUMN IF NOT EXISTS workflow_instance_id uuid,
  ADD COLUMN IF NOT EXISTS execution_gate_status jsonb,
  ADD COLUMN IF NOT EXISTS conflict_check_result jsonb;

-- ia_audit_reports — 4 new columns
ALTER TABLE public.ia_audit_reports
  ADD COLUMN IF NOT EXISTS workflow_instance_id uuid,
  ADD COLUMN IF NOT EXISTS issuance_gate_status jsonb,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS issued_by text;

-- ia_plan_change_log — 4 new columns
ALTER TABLE public.ia_plan_change_log
  ADD COLUMN IF NOT EXISTS version_number integer,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS requires_reapproval boolean DEFAULT false;
