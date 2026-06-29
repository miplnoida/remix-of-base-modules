
ALTER TABLE public.core_generated_document
  ADD COLUMN IF NOT EXISTS resolved_context             jsonb,
  ADD COLUMN IF NOT EXISTS resolved_letterhead_id       uuid,
  ADD COLUMN IF NOT EXISTS resolved_signature_id        uuid,
  ADD COLUMN IF NOT EXISTS resolved_seal_asset_id       uuid,
  ADD COLUMN IF NOT EXISTS resolved_watermark_asset_id  uuid,
  ADD COLUMN IF NOT EXISTS resolved_footer_id           uuid,
  ADD COLUMN IF NOT EXISTS resolved_disclaimer_id       uuid,
  ADD COLUMN IF NOT EXISTS issued_at                    timestamptz,
  ADD COLUMN IF NOT EXISTS issued_by                    text,
  ADD COLUMN IF NOT EXISTS is_immutable                 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS superseded_by_id             uuid REFERENCES public.core_generated_document(id);

CREATE OR REPLACE FUNCTION public.core_generated_document_enforce_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.is_immutable IS TRUE THEN
    IF NEW.generated_html      IS DISTINCT FROM OLD.generated_html      OR
       NEW.subject             IS DISTINCT FROM OLD.subject             OR
       NEW.template_version_id IS DISTINCT FROM OLD.template_version_id OR
       NEW.template_id         IS DISTINCT FROM OLD.template_id         OR
       NEW.resolved_tokens     IS DISTINCT FROM OLD.resolved_tokens     OR
       NEW.resolved_context    IS DISTINCT FROM OLD.resolved_context    OR
       NEW.resolved_letterhead_id      IS DISTINCT FROM OLD.resolved_letterhead_id      OR
       NEW.resolved_signature_id       IS DISTINCT FROM OLD.resolved_signature_id       OR
       NEW.resolved_seal_asset_id      IS DISTINCT FROM OLD.resolved_seal_asset_id      OR
       NEW.resolved_watermark_asset_id IS DISTINCT FROM OLD.resolved_watermark_asset_id OR
       NEW.resolved_footer_id          IS DISTINCT FROM OLD.resolved_footer_id          OR
       NEW.resolved_disclaimer_id      IS DISTINCT FROM OLD.resolved_disclaimer_id      OR
       NEW.legal_references_snapshot   IS DISTINCT FROM OLD.legal_references_snapshot   OR
       NEW.content_hash        IS DISTINCT FROM OLD.content_hash        OR
       NEW.issued_at           IS DISTINCT FROM OLD.issued_at           OR
       NEW.issued_by           IS DISTINCT FROM OLD.issued_by
    THEN
      RAISE EXCEPTION
        'core_generated_document % is immutable (issued at %); only delivery/storage fields may be updated',
        OLD.id, OLD.issued_at;
    END IF;
    -- Prevent flipping the lock off
    IF NEW.is_immutable IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'Cannot clear is_immutable on issued document %', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_core_generated_document_immutable
  ON public.core_generated_document;
CREATE TRIGGER trg_core_generated_document_immutable
  BEFORE UPDATE ON public.core_generated_document
  FOR EACH ROW
  EXECUTE FUNCTION public.core_generated_document_enforce_immutability();
