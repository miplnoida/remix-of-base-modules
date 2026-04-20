
-- Linkage columns on ce_violations
ALTER TABLE public.ce_violations
  ADD COLUMN IF NOT EXISTS linked_evidence_ids uuid[] NULL,
  ADD COLUMN IF NOT EXISTS linked_checklist_response_id uuid NULL,
  ADD COLUMN IF NOT EXISTS linked_working_paper_id uuid NULL,
  ADD COLUMN IF NOT EXISTS related_prior_violation_id uuid NULL,
  ADD COLUMN IF NOT EXISTS related_arrangement_id uuid NULL,
  ADD COLUMN IF NOT EXISTS linkage_metadata jsonb NULL;

-- Index for prior-violation lookups (same employer + type)
CREATE INDEX IF NOT EXISTS idx_ce_violations_employer_type
  ON public.ce_violations (employer_id, violation_type_id)
  WHERE is_deleted IS NULL OR is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_ce_violations_related_prior
  ON public.ce_violations (related_prior_violation_id)
  WHERE related_prior_violation_id IS NOT NULL;

-- Canonical payload snapshot on report versions
ALTER TABLE public.ce_audit_report_versions
  ADD COLUMN IF NOT EXISTS payload_json jsonb NULL,
  ADD COLUMN IF NOT EXISTS payload_schema_version text NULL DEFAULT 'v1';

-- Audit location source tracking on inspections
ALTER TABLE public.ce_inspections
  ADD COLUMN IF NOT EXISTS location_source text NULL,
  ADD COLUMN IF NOT EXISTS location_id bigint NULL;

ALTER TABLE public.ce_inspections
  DROP CONSTRAINT IF EXISTS ce_inspections_location_source_check;

ALTER TABLE public.ce_inspections
  ADD CONSTRAINT ce_inspections_location_source_check
    CHECK (location_source IS NULL OR location_source IN ('HQ','BRANCH','MAILING','OTHER','MANUAL'));

-- Backfill existing rows: anything with a location_address but no source = MANUAL
UPDATE public.ce_inspections
   SET location_source = 'MANUAL'
 WHERE location_source IS NULL AND location_address IS NOT NULL;

COMMENT ON COLUMN public.ce_violations.linked_evidence_ids IS 'Evidence rows (ce_inspection_evidence.id) explicitly attached to this violation. Inherits from finding when empty.';
COMMENT ON COLUMN public.ce_violations.linked_checklist_response_id IS 'Checklist response (ce_audit_checklist_responses.id) that this violation arose from.';
COMMENT ON COLUMN public.ce_violations.linked_working_paper_id IS 'Working paper (ce_inspection_working_papers.id) that supports this violation.';
COMMENT ON COLUMN public.ce_violations.related_prior_violation_id IS 'Prior open violation of same employer + type that this one supersedes/relates to.';
COMMENT ON COLUMN public.ce_violations.related_arrangement_id IS 'Existing payment arrangement (ce_payment_arrangements.id) that may need to be revisited.';
COMMENT ON COLUMN public.ce_audit_report_versions.payload_json IS 'Frozen canonical report payload at version snapshot time. Includes findings, evidence, violations, prior context, visit timeline.';
COMMENT ON COLUMN public.ce_inspections.location_source IS 'Where the audit location came from: HQ, BRANCH, MAILING, OTHER (employer-provided alt), MANUAL (free-text).';
COMMENT ON COLUMN public.ce_inspections.location_id IS 'When location_source=BRANCH, references er_locations.location_id.';
