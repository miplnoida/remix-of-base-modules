-- Manual linkage of prior employer matters to audit visits or findings
CREATE TABLE IF NOT EXISTS public.ce_audit_prior_matter_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NULL,
  finding_id uuid NULL,
  employer_id text NOT NULL,
  matter_type text NOT NULL,
  matter_id text NOT NULL,
  matter_label text NULL,
  relevance_note text NULL,
  linked_by varchar(50) NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ce_audit_prior_matter_links_target_chk
    CHECK (
      (inspection_id IS NOT NULL AND finding_id IS NULL)
      OR (inspection_id IS NULL AND finding_id IS NOT NULL)
    ),
  CONSTRAINT ce_audit_prior_matter_links_type_chk
    CHECK (matter_type IN (
      'CASE','VIOLATION','ARRANGEMENT','LEGAL',
      'FOLLOW_UP','PAST_INSPECTION','PAST_REPORT','DISPUTE'
    ))
);

CREATE INDEX IF NOT EXISTS idx_apml_inspection ON public.ce_audit_prior_matter_links(inspection_id) WHERE inspection_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apml_finding ON public.ce_audit_prior_matter_links(finding_id) WHERE finding_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apml_matter ON public.ce_audit_prior_matter_links(matter_type, matter_id);
CREATE INDEX IF NOT EXISTS idx_apml_employer ON public.ce_audit_prior_matter_links(employer_id);

CREATE TRIGGER trg_apml_updated_at
  BEFORE UPDATE ON public.ce_audit_prior_matter_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();