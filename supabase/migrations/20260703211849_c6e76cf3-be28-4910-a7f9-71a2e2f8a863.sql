
-- EPIC-08: Legal Document Automation & Correspondence
-- Extend lg_document_link with lifecycle & template linkage columns.
ALTER TABLE public.lg_document_link
  ADD COLUMN IF NOT EXISTS template_code text,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS generated_by text,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS issued_by text,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatched_by text,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_channel text,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by text,
  ADD COLUMN IF NOT EXISTS render_error text;

-- Constrain lifecycle values (drop-and-recreate for idempotency)
ALTER TABLE public.lg_document_link
  DROP CONSTRAINT IF EXISTS lg_document_link_lifecycle_status_chk;
ALTER TABLE public.lg_document_link
  ADD CONSTRAINT lg_document_link_lifecycle_status_chk
  CHECK (lifecycle_status IN ('draft','pending_approval','approved','issued','dispatched','acknowledged','failed'));

CREATE INDEX IF NOT EXISTS lg_document_link_lifecycle_idx
  ON public.lg_document_link(lifecycle_status);
CREATE INDEX IF NOT EXISTS lg_document_link_template_code_idx
  ON public.lg_document_link(template_code);
