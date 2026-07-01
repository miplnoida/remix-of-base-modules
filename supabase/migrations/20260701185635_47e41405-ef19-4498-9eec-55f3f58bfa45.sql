
-- 1) Backfill any comm_disclaimer without a linked text block (safety net; currently none).
INSERT INTO public.core_text_block (text_block_code, name, category, language_code, content_html, content_text, body_html, body_text, effective_from, effective_to, is_active, scope, version_no)
SELECT
  'DISC-' || UPPER(regexp_replace(coalesce(d.name,'disclaimer'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(d.id::text, 1, 8),
  d.name, 'DISCLAIMER', coalesce(d.language,'en'),
  NULL, d.body, NULL, d.body,
  d.effective_from, d.effective_to, d.is_active, 'GLOBAL', 1
FROM public.comm_disclaimer d
WHERE d.text_block_id IS NULL;

UPDATE public.comm_disclaimer d
SET text_block_id = tb.id
FROM public.core_text_block tb
WHERE d.text_block_id IS NULL
  AND tb.category = 'DISCLAIMER'
  AND tb.name = d.name
  AND tb.content_text = d.body;

-- 2) Body is no longer the source of truth — allow it to be NULL.
ALTER TABLE public.comm_disclaimer ALTER COLUMN body DROP NOT NULL;

-- 3) Add a check note via comment for future maintainers.
COMMENT ON COLUMN public.comm_disclaimer.body IS 'DEPRECATED. Source of truth = core_text_block via text_block_id. Kept nullable for legacy FK compatibility only.';
COMMENT ON TABLE public.comm_disclaimer IS 'Thin mapping/metadata for disclaimers. Body content lives in core_text_block (category=DISCLAIMER). Retained because core_organization.default_disclaimer_id references it.';
