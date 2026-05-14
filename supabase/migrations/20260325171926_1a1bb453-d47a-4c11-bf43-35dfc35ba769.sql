
-- ============================================================
-- Phase 1, Migration 1: Create 4 new ia_* tables
-- ============================================================

-- 1. ia_plan_versions — Full plan snapshots on submit/approval
CREATE TABLE IF NOT EXISTS public.ia_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.ia_annual_plans(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  snapshot_data jsonb NOT NULL,
  status_at_snapshot text NOT NULL,
  change_summary text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, version_number)
);

-- 2. ia_plan_workflow_bindings — Maps audit lifecycle events to workflow definitions
CREATE TABLE IF NOT EXISTS public.ia_plan_workflow_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  workflow_definition_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  UNIQUE(event_type)
);

-- 3. ia_availability_conflicts — Detected conflicts for plan/engagement submissions
CREATE TABLE IF NOT EXISTS public.ia_availability_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.ia_annual_plans(id) ON DELETE CASCADE,
  engagement_id uuid REFERENCES public.ia_audit_engagements(id) ON DELETE CASCADE,
  auditor_id uuid NOT NULL REFERENCES public.ia_auditors(id) ON DELETE CASCADE,
  conflict_type text NOT NULL,
  conflict_date_start date NOT NULL,
  conflict_date_end date NOT NULL,
  conflict_reference text,
  severity text NOT NULL DEFAULT 'warning',
  resolved boolean NOT NULL DEFAULT false,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. ia_execution_gate_config — Configurable minimum artefact thresholds
CREATE TABLE IF NOT EXISTS public.ia_execution_gate_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_type text NOT NULL,
  min_evidence_count integer NOT NULL DEFAULT 1,
  min_working_papers_count integer NOT NULL DEFAULT 1,
  min_findings_documented boolean NOT NULL DEFAULT true,
  require_management_responses boolean NOT NULL DEFAULT true,
  require_action_plans boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  UNIQUE(gate_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ia_plan_versions_plan_id ON public.ia_plan_versions(plan_id);
CREATE INDEX IF NOT EXISTS idx_ia_availability_conflicts_plan_id ON public.ia_availability_conflicts(plan_id);
CREATE INDEX IF NOT EXISTS idx_ia_availability_conflicts_engagement_id ON public.ia_availability_conflicts(engagement_id);
CREATE INDEX IF NOT EXISTS idx_ia_availability_conflicts_auditor_id ON public.ia_availability_conflicts(auditor_id);
