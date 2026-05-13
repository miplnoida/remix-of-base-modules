-- 1) Add default TOC and page-break columns to Section Library
ALTER TABLE public.ia_document_section_library
  ADD COLUMN IF NOT EXISTS default_include_in_toc BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_start_on_new_page BOOLEAN NOT NULL DEFAULT false;

-- Set page-break defaults for sections that typically start on a new page
UPDATE public.ia_document_section_library SET default_start_on_new_page = true
WHERE section_key IN ('detailed_findings', 'key_findings', 'approval_signoff', 'appendices');

-- Distribution and cover don't need TOC
UPDATE public.ia_document_section_library SET default_include_in_toc = false
WHERE section_key IN ('cover_page');

-- 2) Seed ia_document_template_sections from Section Library for each document type
-- For each section, create one mapping row per document type it applies to
INSERT INTO public.ia_document_template_sections (template_type, section_key, is_enabled, is_required, sort_order, title_override, include_in_toc, start_on_new_page)
SELECT
  dt.doc_type,
  sl.section_key,
  sl.default_enabled,
  sl.is_mandatory,
  sl.default_order,
  NULL,
  sl.default_include_in_toc,
  sl.default_start_on_new_page
FROM public.ia_document_section_library sl,
     LATERAL unnest(sl.applies_to) AS dt(doc_type)
ON CONFLICT (template_type, section_key) DO NOTHING;