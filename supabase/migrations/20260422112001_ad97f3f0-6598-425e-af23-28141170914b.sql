-- Extend ce_audit_communications with visit-linked fields requested for the
-- audit field-execution workflow. All additions are additive and nullable to
-- preserve compatibility with existing rows, services, and policies.

-- 1) Trigger type enum (manual / automatic / recommended)
DO $$ BEGIN
  CREATE TYPE public.ce_comm_trigger_type AS ENUM ('manual','automatic','recommended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ce_audit_communications
  -- Case linkage (compliance case the visit belongs to). Nullable because
  -- standalone inspections may not always have a case yet.
  ADD COLUMN IF NOT EXISTS case_id uuid,
  -- Explicit visit linkage. We keep the legacy `inspection_id` column for
  -- backward compatibility; `visit_id` is the canonical forward-looking name
  -- and is auto-synced from inspection_id by trigger when not supplied.
  ADD COLUMN IF NOT EXISTS visit_id uuid,
  -- Field-execution stage key (mirrors values in ce_audit_field_stage_template_map.field_stage)
  ADD COLUMN IF NOT EXISTS stage_key text,
  -- How the comm was raised
  ADD COLUMN IF NOT EXISTS trigger_type public.ce_comm_trigger_type NOT NULL DEFAULT 'manual',
  -- Lifecycle timestamps requested
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  -- Escalation tracking (0 = none, increments on each escalation)
  ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0,
  -- Convenience denormalised approver user id (the final/effective approver).
  -- Detailed per-step approval history continues to live in
  -- ce_audit_communication_approvals.
  ADD COLUMN IF NOT EXISTS approved_by text,
  -- Free-form extensibility bucket for future fields without further migrations
  ADD COLUMN IF NOT EXISTS extension_json jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Validate stage_key against the same allow-list used by the mapping table so
-- we don't drift between admin config and runtime.
DO $$ BEGIN
  ALTER TABLE public.ce_audit_communications
    ADD CONSTRAINT ce_audit_comm_stage_key_valid
    CHECK (stage_key IS NULL OR stage_key = ANY (ARRAY[
      'visit_created','pre_visit_reminder',
      'during_audit_missing_documents','during_audit_clarification_required','during_audit_interim_findings',
      'post_review_draft_findings','final_report_issuance',
      'enforcement_stage','reminder_stage','escalation_stage'
    ]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes for the new linkage fields (lookup by case / visit / stage)
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_case ON public.ce_audit_communications(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_visit ON public.ce_audit_communications(visit_id) WHERE visit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_stage ON public.ce_audit_communications(stage_key) WHERE stage_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_escalation ON public.ce_audit_communications(escalation_level) WHERE escalation_level > 0;

-- Backfill: keep visit_id == inspection_id for existing rows so consumers can
-- migrate to the new field gradually.
UPDATE public.ce_audit_communications
   SET visit_id = inspection_id
 WHERE visit_id IS NULL AND inspection_id IS NOT NULL;

-- Trigger: keep visit_id and inspection_id in sync on insert/update so callers
-- can populate either field without breaking the other.
CREATE OR REPLACE FUNCTION public.fn_ce_audit_comm_sync_visit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.visit_id IS NULL AND NEW.inspection_id IS NOT NULL THEN
    NEW.visit_id := NEW.inspection_id;
  ELSIF NEW.inspection_id IS NULL AND NEW.visit_id IS NOT NULL THEN
    NEW.inspection_id := NEW.visit_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ce_audit_comm_sync_visit ON public.ce_audit_communications;
CREATE TRIGGER trg_ce_audit_comm_sync_visit
  BEFORE INSERT OR UPDATE OF visit_id, inspection_id
  ON public.ce_audit_communications
  FOR EACH ROW EXECUTE FUNCTION public.fn_ce_audit_comm_sync_visit();

-- Trigger: stamp lifecycle timestamps when status transitions, without
-- overwriting values explicitly set by the application.
CREATE OR REPLACE FUNCTION public.fn_ce_audit_comm_stamp_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'sent' AND NEW.sent_at IS NULL THEN
      NEW.sent_at := now();
    END IF;
    IF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN
      NEW.delivered_at := now();
    END IF;
    IF NEW.status = 'acknowledged' AND NEW.acknowledged_at IS NULL THEN
      NEW.acknowledged_at := now();
    END IF;
    IF NEW.status = 'responded' AND NEW.responded_at IS NULL THEN
      NEW.responded_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ce_audit_comm_stamp_lifecycle ON public.ce_audit_communications;
CREATE TRIGGER trg_ce_audit_comm_stamp_lifecycle
  BEFORE UPDATE ON public.ce_audit_communications
  FOR EACH ROW EXECUTE FUNCTION public.fn_ce_audit_comm_stamp_lifecycle();

COMMENT ON COLUMN public.ce_audit_communications.case_id IS 'Compliance case the visit belongs to (nullable for case-less inspections).';
COMMENT ON COLUMN public.ce_audit_communications.visit_id IS 'Canonical forward-looking visit linkage; mirrors inspection_id via trigger.';
COMMENT ON COLUMN public.ce_audit_communications.stage_key IS 'Field-execution stage key, must match ce_audit_field_stage_template_map.field_stage.';
COMMENT ON COLUMN public.ce_audit_communications.trigger_type IS 'How this comm was raised: manual, automatic (engine), or recommended (suggestion accepted by user).';
COMMENT ON COLUMN public.ce_audit_communications.escalation_level IS '0 = none. Incremented each time the escalation engine acts on this comm.';
COMMENT ON COLUMN public.ce_audit_communications.approved_by IS 'Effective approver user code (denormalised). Full per-step history lives in ce_audit_communication_approvals.';
COMMENT ON COLUMN public.ce_audit_communications.extension_json IS 'Forward-compatible bucket so future stage/visit attributes can be added without migrations.';