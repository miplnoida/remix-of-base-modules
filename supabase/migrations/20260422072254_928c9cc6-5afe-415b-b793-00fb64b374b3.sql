-- Field-execution stage → communication template mapping.
-- Reuses templates already configured in Settings (no template duplication).

CREATE TABLE IF NOT EXISTS public.ce_audit_field_stage_template_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_stage text NOT NULL,
  template_id uuid NOT NULL REFERENCES public.ce_audit_communication_templates(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  notes text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text NULL,
  updated_by text NULL,
  CONSTRAINT ce_field_stage_valid CHECK (field_stage IN (
    'visit_created',
    'pre_visit_reminder',
    'during_audit_missing_documents',
    'during_audit_clarification_required',
    'during_audit_interim_findings',
    'post_review_draft_findings',
    'final_report_issuance',
    'enforcement_stage',
    'reminder_stage',
    'escalation_stage'
  )),
  CONSTRAINT ce_field_stage_template_unique UNIQUE (field_stage, template_id)
);

CREATE INDEX IF NOT EXISTS idx_ce_field_stage_template_map_stage
  ON public.ce_audit_field_stage_template_map(field_stage)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ce_field_stage_template_map_template
  ON public.ce_audit_field_stage_template_map(template_id);

-- Reuse standard updated_at trigger if available, else inline.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_ce_field_stage_template_map_updated_at ON public.ce_audit_field_stage_template_map';
    EXECUTE 'CREATE TRIGGER trg_ce_field_stage_template_map_updated_at
             BEFORE UPDATE ON public.ce_audit_field_stage_template_map
             FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;
END$$;

COMMENT ON TABLE public.ce_audit_field_stage_template_map IS
  'Central, admin-managed mapping of field-execution stages to existing communication templates. Consumed by the Audit Visit Workspace to surface stage-relevant templates without hardcoding.';