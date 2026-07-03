
-- EPIC-08A: Document Automation Stabilization
-- Add dispatch tracking fields + cancelled lifecycle state on lg_document_link
ALTER TABLE public.lg_document_link
  ADD COLUMN IF NOT EXISTS dispatch_recipient text,
  ADD COLUMN IF NOT EXISTS dispatch_recipient_address text,
  ADD COLUMN IF NOT EXISTS dispatch_status text,
  ADD COLUMN IF NOT EXISTS dispatch_failure_reason text,
  ADD COLUMN IF NOT EXISTS acknowledgement_status text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by text,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

CREATE INDEX IF NOT EXISTS idx_lg_document_link_lifecycle
  ON public.lg_document_link(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_lg_document_link_template_code
  ON public.lg_document_link(template_code);
