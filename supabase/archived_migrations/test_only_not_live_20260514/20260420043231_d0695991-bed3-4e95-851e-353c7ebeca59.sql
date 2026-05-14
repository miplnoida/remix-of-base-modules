
-- =========================================================
-- COMPLIANCE EMPLOYER AUDIT - Document Template System
-- Fully separate from Internal Audit (ia_*) tables
-- =========================================================

-- 1) Organization document foundation (branding, layout, sign-off)
CREATE TABLE IF NOT EXISTS public.ce_org_document_foundation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  foundation_key TEXT NOT NULL UNIQUE DEFAULT 'default',
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  color_palette JSONB NOT NULL DEFAULT '{}'::jsonb,
  typography JSONB NOT NULL DEFAULT '{}'::jsonb,
  page_layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  pagination JSONB NOT NULL DEFAULT '{}'::jsonb,
  sign_off JSONB NOT NULL DEFAULT '{}'::jsonb,
  draft_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  table_style JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Section library (reusable sections for compliance reports)
CREATE TABLE IF NOT EXISTS public.ce_document_section_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  applies_to TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_shared BOOLEAN NOT NULL DEFAULT true,
  default_enabled BOOLEAN NOT NULL DEFAULT true,
  default_order INTEGER NOT NULL DEFAULT 0,
  display_mode TEXT NOT NULL DEFAULT 'standard',
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  default_include_in_toc BOOLEAN NOT NULL DEFAULT true,
  default_start_on_new_page BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Compliance report templates
CREATE TABLE IF NOT EXISTS public.ce_document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT,
  content TEXT,
  merge_fields TEXT[],
  is_active BOOLEAN DEFAULT true,
  version_number INTEGER DEFAULT 1,
  parent_template_id UUID,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Template -> sections wiring
CREATE TABLE IF NOT EXISTS public.ce_document_template_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL,
  section_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title_override TEXT,
  include_in_toc BOOLEAN NOT NULL DEFAULT true,
  start_on_new_page BOOLEAN NOT NULL DEFAULT false,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_type, section_key)
);

-- 5) Per-template-type settings
CREATE TABLE IF NOT EXISTS public.ce_document_template_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL UNIQUE,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per project policy: no RLS, role-based UI gating only.
ALTER TABLE public.ce_org_document_foundation DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ce_document_section_library DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ce_document_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ce_document_template_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ce_document_template_settings DISABLE ROW LEVEL SECURITY;

-- updated_at trigger (reuse global function if present, else create local)
CREATE OR REPLACE FUNCTION public.ce_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  CREATE TRIGGER trg_ce_org_doc_foundation_uat BEFORE UPDATE ON public.ce_org_document_foundation
  FOR EACH ROW EXECUTE FUNCTION public.ce_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_ce_doc_section_library_uat BEFORE UPDATE ON public.ce_document_section_library
  FOR EACH ROW EXECUTE FUNCTION public.ce_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_ce_doc_templates_uat BEFORE UPDATE ON public.ce_document_templates
  FOR EACH ROW EXECUTE FUNCTION public.ce_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_ce_doc_template_sections_uat BEFORE UPDATE ON public.ce_document_template_sections
  FOR EACH ROW EXECUTE FUNCTION public.ce_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_ce_doc_template_settings_uat BEFORE UPDATE ON public.ce_document_template_settings
  FOR EACH ROW EXECUTE FUNCTION public.ce_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed default foundation
INSERT INTO public.ce_org_document_foundation (foundation_key, branding, color_palette, typography, page_layout, pagination, sign_off, draft_rules, table_style)
VALUES (
  'default',
  '{"organization_name":"Social Security Compliance","logo_url":null,"document_owner":"Compliance & Enforcement Division"}'::jsonb,
  '{"primary":"#0F4C81","accent":"#C0392B","muted":"#6B7280"}'::jsonb,
  '{"heading_font":"Inter","body_font":"Inter","base_size":11}'::jsonb,
  '{"page_size":"A4","margins":{"top":24,"bottom":24,"left":24,"right":24}}'::jsonb,
  '{"show_page_numbers":true,"footer_text":"Compliance Employer Audit Report"}'::jsonb,
  '{"require_signatures":true,"signatories":["Compliance Officer","Employer Representative"]}'::jsonb,
  '{"watermark":"DRAFT","require_review":true}'::jsonb,
  '{"header_bg":"#0F4C81","header_fg":"#FFFFFF","row_alt_bg":"#F3F4F6"}'::jsonb
) ON CONFLICT (foundation_key) DO NOTHING;

-- Seed compliance section library (employer-audit specific)
INSERT INTO public.ce_document_section_library
  (section_key, label, applies_to, default_enabled, default_order, is_mandatory, category, description, default_start_on_new_page)
VALUES
  ('cover_page','Cover Page',ARRAY['employer_audit_report','findings_memo','evidence_summary','violation_notice','enforcement_pack','management_summary'],true,10,true,'foundation','Report cover with branding, employer name, audit period',true),
  ('table_of_contents','Table of Contents',ARRAY['employer_audit_report','enforcement_pack'],true,20,false,'foundation','Auto-generated TOC',true),
  ('executive_summary','Executive Summary',ARRAY['employer_audit_report','management_summary'],true,30,false,'summary','High-level summary of audit outcomes',false),
  ('employer_identity','Employer Identity',ARRAY['employer_audit_report','findings_memo','violation_notice','enforcement_pack'],true,40,true,'employer','Legal name, trade name, contact and address',false),
  ('registration_details','Registration Details',ARRAY['employer_audit_report','enforcement_pack'],true,50,false,'employer','Registration number, status, registration date, sector',false),
  ('audit_scope_period','Audit Scope & Period',ARRAY['employer_audit_report'],true,60,true,'audit','Scope of work, audit start/end dates, period covered',false),
  ('visit_summary','Visit Summary',ARRAY['employer_audit_report','evidence_summary'],true,70,false,'audit','Actual visit dates, locations, attendees',false),
  ('employer_interaction_summary','Employer Interaction Summary',ARRAY['employer_audit_report'],true,80,false,'audit','Cooperation level, communications and meetings held',false),
  ('records_reviewed','Books & Records Reviewed',ARRAY['employer_audit_report','evidence_summary'],true,90,true,'evidence','Payroll registers, contribution returns, bank statements, etc.',false),
  ('findings_communicated','Findings Communicated',ARRAY['employer_audit_report','findings_memo'],true,100,true,'findings','Findings raised and communicated to employer',true),
  ('evidence_summary','Evidence Summary',ARRAY['employer_audit_report','evidence_summary','enforcement_pack'],true,110,false,'evidence','Supporting evidence for each finding',false),
  ('violations_issued','Violations Issued',ARRAY['employer_audit_report','violation_notice','enforcement_pack'],true,120,true,'violations','Violations raised under social security law',true),
  ('prior_active_violations','Prior Active Violations',ARRAY['employer_audit_report','enforcement_pack','management_summary'],true,130,false,'violations','Outstanding compliance matters from prior audits',false),
  ('payment_arrangement_summary','Payment Arrangement Summary',ARRAY['employer_audit_report','enforcement_pack'],true,140,false,'financial','Existing or proposed payment arrangements',false),
  ('legal_case_summary','Legal Case Summary',ARRAY['employer_audit_report','enforcement_pack'],true,150,false,'legal','Linked legal cases and current status',false),
  ('dispute_instructions','Dispute Instructions',ARRAY['employer_audit_report','violation_notice','findings_memo'],true,160,true,'legal','How and within what period the employer may dispute',false),
  ('corrective_actions','Corrective Actions Required',ARRAY['employer_audit_report','findings_memo','enforcement_pack'],true,170,true,'remediation','Required corrective actions and deadlines',false),
  ('appendix_calculations','Appendix - Calculations',ARRAY['employer_audit_report','enforcement_pack'],true,180,false,'appendix','Detailed contribution and penalty calculations',true),
  ('acknowledgment_signatures','Acknowledgment & Signatures',ARRAY['employer_audit_report','findings_memo','violation_notice','enforcement_pack','management_summary'],true,190,true,'foundation','Sign-off block for compliance officer and employer rep',false)
ON CONFLICT (section_key) DO NOTHING;

-- Seed default compliance report templates
INSERT INTO public.ce_document_templates (name, type, category, content, is_active)
VALUES
  ('Employer Audit Report','employer_audit_report','report','',true),
  ('Findings Memo','findings_memo','memo','',true),
  ('Evidence Summary','evidence_summary','report','',true),
  ('Violation Notice','violation_notice','notice','',true),
  ('Legal / Enforcement Pack','enforcement_pack','pack','',true),
  ('Management Summary','management_summary','summary','',true)
ON CONFLICT DO NOTHING;

-- Seed default per-template settings rows
INSERT INTO public.ce_document_template_settings (template_type, config_json) VALUES
  ('employer_audit_report','{"include_appendices":true,"watermark_until_approved":true}'::jsonb),
  ('findings_memo','{"max_findings_per_page":5}'::jsonb),
  ('evidence_summary','{"group_by":"finding"}'::jsonb),
  ('violation_notice','{"include_dispute_instructions":true,"dispute_window_days":30}'::jsonb),
  ('enforcement_pack','{"include_legal_case_summary":true}'::jsonb),
  ('management_summary','{"include_kpis":true}'::jsonb)
ON CONFLICT (template_type) DO NOTHING;

-- Seed template->section wiring from library defaults
INSERT INTO public.ce_document_template_sections
  (template_type, section_key, is_enabled, is_required, sort_order, include_in_toc, start_on_new_page)
SELECT t_type, l.section_key, l.default_enabled, l.is_mandatory, l.default_order, l.default_include_in_toc, l.default_start_on_new_page
FROM public.ce_document_section_library l
CROSS JOIN LATERAL unnest(l.applies_to) AS t_type
ON CONFLICT (template_type, section_key) DO NOTHING;
