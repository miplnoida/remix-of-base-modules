-- Per-template section configuration
CREATE TABLE public.ia_document_template_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL,
  section_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 100,
  title_override TEXT,
  include_in_toc BOOLEAN NOT NULL DEFAULT true,
  start_on_new_page BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT,
  CONSTRAINT ia_doc_tmpl_sections_unique UNIQUE (template_type, section_key),
  CONSTRAINT ia_doc_tmpl_sections_section_fk FOREIGN KEY (section_key)
    REFERENCES public.ia_document_section_library(section_key) ON DELETE CASCADE
);

-- Seed: Sign-Off enabled in Audit Report, disabled in Audit Plan
INSERT INTO public.ia_document_template_sections (template_type, section_key, is_enabled, is_required, sort_order, include_in_toc, start_on_new_page)
SELECT 'audit_report', 'approval', true, false, 130, true, true
WHERE EXISTS (SELECT 1 FROM public.ia_document_section_library WHERE section_key = 'approval');

INSERT INTO public.ia_document_template_sections (template_type, section_key, is_enabled, is_required, sort_order, include_in_toc, start_on_new_page)
SELECT 'audit_plan', 'approval', false, false, 220, true, false
WHERE EXISTS (SELECT 1 FROM public.ia_document_section_library WHERE section_key = 'approval');

-- Trigger for updated_at
CREATE TRIGGER update_ia_doc_tmpl_sections_updated_at
  BEFORE UPDATE ON public.ia_document_template_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();