-- Phase E: Prior Compliance History section for audit reports
INSERT INTO public.ia_document_section_library
  (section_key, label, applies_to, is_shared, default_enabled, default_order, display_mode, is_mandatory, category, description)
VALUES
  ('prior_compliance_history',
   'Prior Compliance History',
   '{"audit_report"}',
   false,
   false,
   9,
   'table',
   false,
   'body',
   'Linked prior employer matters (cases, violations, arrangements, legal, follow-ups, past inspections/reports, disputes) attached to this audit visit or its findings.')
ON CONFLICT (section_key) DO NOTHING;

-- Seed a per-template row for audit_report, default disabled so admin opts in.
INSERT INTO public.ia_document_template_sections
  (template_type, section_key, is_enabled, is_required, sort_order, include_in_toc, start_on_new_page)
SELECT 'audit_report', 'prior_compliance_history', false, false, 9, true, false
WHERE EXISTS (
  SELECT 1 FROM public.ia_document_section_library WHERE section_key = 'prior_compliance_history'
)
ON CONFLICT (template_type, section_key) DO NOTHING;