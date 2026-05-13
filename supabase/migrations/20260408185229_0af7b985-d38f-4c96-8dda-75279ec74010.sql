
-- ============================================================
-- Table 1: ia_audit_plan_templates
-- Stores formatting template configurations (system + custom)
-- ============================================================
CREATE TABLE public.ia_audit_plan_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  template_key TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ia_apt_template_key ON public.ia_audit_plan_templates (template_key);
CREATE INDEX idx_ia_apt_is_active ON public.ia_audit_plan_templates (is_active) WHERE is_active = true;
CREATE INDEX idx_ia_apt_is_system ON public.ia_audit_plan_templates (is_system) WHERE is_system = true;

-- ============================================================
-- Table 2: ia_audit_plan_profiles
-- Links a named profile to a template for a specific context
-- ============================================================
CREATE TABLE public.ia_audit_plan_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_name TEXT NOT NULL,
  description TEXT,
  template_id UUID NOT NULL REFERENCES public.ia_audit_plan_templates(id) ON DELETE RESTRICT,
  audience TEXT NOT NULL DEFAULT 'management',
  fiscal_year TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ia_app_template_id ON public.ia_audit_plan_profiles (template_id);
CREATE INDEX idx_ia_app_is_active ON public.ia_audit_plan_profiles (is_active) WHERE is_active = true;
CREATE INDEX idx_ia_app_is_default ON public.ia_audit_plan_profiles (is_default) WHERE is_default = true;
CREATE INDEX idx_ia_app_audience ON public.ia_audit_plan_profiles (audience);

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_ia_plan_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_ia_audit_plan_templates_updated_at
  BEFORE UPDATE ON public.ia_audit_plan_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_ia_plan_template_updated_at();

CREATE TRIGGER trg_ia_audit_plan_profiles_updated_at
  BEFORE UPDATE ON public.ia_audit_plan_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_ia_plan_template_updated_at();

-- ============================================================
-- Seed: 5 built-in template presets
-- ============================================================

-- 1. Audit Blue Minimal
INSERT INTO public.ia_audit_plan_templates (template_name, template_key, description, is_system, config_json, created_by)
VALUES (
  'Audit Blue Minimal',
  'audit_blue_minimal',
  'Clean blue/gray palette with minimal cover design. Suitable for most internal audit plans.',
  true,
  '{
    "branding": {
      "logoMode": "cover_only",
      "logoSource": "default",
      "logoSize": "medium",
      "logoAlignment": "center",
      "orgName": "",
      "confidentialLabel": "CONFIDENTIAL",
      "showWatermark": false,
      "watermarkText": "DRAFT",
      "colorPalette": {
        "primary": "#1E3A5F",
        "secondary": "#4A7FB5",
        "accent": "#E8F0FE",
        "tableHeader": "#1E3A5F",
        "tableStripe": "#F5F8FC",
        "text": "#1A1A1A"
      }
    },
    "coverPage": {
      "titleText": "Internal Audit Plan",
      "showOrgName": true,
      "showAuditableEntity": true,
      "showPeriodCovered": true,
      "showVersionNumber": true,
      "showIssueDate": true,
      "showConfidentialLabel": true,
      "fiscalYearMode": "single",
      "coverStyle": "minimal"
    },
    "toc": {
      "enabled": true,
      "title": "Table of Contents",
      "depth": 2,
      "showLeaderDots": true,
      "showPageNumbers": true
    },
    "pagination": {
      "showPageNumbers": true,
      "hideOnCover": true,
      "frontMatterStyle": "roman",
      "bodyStyle": "arabic",
      "appendixStyle": "arabic",
      "position": "bottom-center",
      "pageBreakBetweenSections": true
    },
    "sections": [
      {"id": "cover_page", "label": "Cover Page", "enabled": true, "order": 1, "inToc": false, "startNewPage": false, "displayMode": "auto"},
      {"id": "document_control", "label": "Document Control", "enabled": true, "order": 2, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "approval_signoff", "label": "Approval / Sign-off", "enabled": true, "order": 3, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "table_of_contents", "label": "Table of Contents", "enabled": true, "order": 4, "inToc": false, "startNewPage": true, "displayMode": "auto"},
      {"id": "executive_summary", "label": "Executive Summary", "enabled": true, "order": 5, "inToc": true, "startNewPage": true, "displayMode": "narrative"},
      {"id": "audit_background", "label": "Audit Background", "enabled": true, "order": 6, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_objective", "label": "Audit Objective", "enabled": true, "order": 7, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_scope", "label": "Audit Scope", "enabled": true, "order": 8, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_criteria", "label": "Audit Criteria", "enabled": false, "order": 9, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "risk_assessment_summary", "label": "Risk Assessment Summary", "enabled": true, "order": 10, "inToc": true, "startNewPage": true, "displayMode": "table"},
      {"id": "focus_areas", "label": "Focus Areas / Audit Questions", "enabled": true, "order": 11, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "methodology", "label": "Audit Approach / Methodology", "enabled": true, "order": 12, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "planned_procedures", "label": "Planned Procedures / Work Program", "enabled": false, "order": 13, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "sampling_strategy", "label": "Sampling Strategy", "enabled": false, "order": 14, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "information_required", "label": "Information Required", "enabled": false, "order": 15, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "resource_plan", "label": "Resource Plan", "enabled": true, "order": 16, "inToc": true, "startNewPage": true, "displayMode": "table"},
      {"id": "timeline_milestones", "label": "Timeline / Milestones", "enabled": true, "order": 17, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "deliverables", "label": "Deliverables", "enabled": true, "order": 18, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "communication_protocol", "label": "Communication & Reporting Protocol", "enabled": true, "order": 19, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "independence_statement", "label": "Independence / Confidentiality Statement", "enabled": false, "order": 20, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "limitations", "label": "Limitations / Assumptions", "enabled": false, "order": 21, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "appendices", "label": "Appendices", "enabled": false, "order": 22, "inToc": true, "startNewPage": true, "displayMode": "auto"}
    ],
    "approval": {
      "signatories": [
        {"label": "Prepared By", "defaultName": "", "roleTitle": "Internal Auditor"},
        {"label": "Reviewed By", "defaultName": "", "roleTitle": "Manager, Internal Audit"},
        {"label": "Approved By", "defaultName": "", "roleTitle": "Director"}
      ],
      "showDateField": true,
      "showSignatureLine": true
    },
    "tableStyle": {
      "headerBackground": "#1E3A5F",
      "headerTextColor": "#FFFFFF",
      "stripedRows": true,
      "stripeColor": "#F5F8FC",
      "borderColor": "#D1D5DB",
      "repeatHeaderOnPageBreak": true,
      "fontSize": "normal"
    },
    "typography": {
      "fontFamily": "Arial",
      "headingFont": "Arial",
      "baseFontSize": 11,
      "headingColor": "#1E3A5F",
      "bodyColor": "#1A1A1A",
      "lineHeight": 1.5
    },
    "exportDefaults": {
      "defaultFormat": "pdf",
      "docxEditableNarratives": true,
      "draftWatermark": false,
      "draftWatermarkText": "DRAFT"
    }
  }'::jsonb,
  'system'
);

-- 2. Government Formal
INSERT INTO public.ia_audit_plan_templates (template_name, template_key, description, is_system, config_json, created_by)
VALUES (
  'Government Formal',
  'government_formal',
  'Conservative formal style with Times New Roman. All sections enabled. Suitable for government audit offices.',
  true,
  '{
    "branding": {
      "logoMode": "cover_and_header",
      "logoSource": "default",
      "logoSize": "large",
      "logoAlignment": "center",
      "orgName": "",
      "confidentialLabel": "CONFIDENTIAL — FOR OFFICIAL USE ONLY",
      "showWatermark": false,
      "watermarkText": "DRAFT",
      "colorPalette": {
        "primary": "#1B2838",
        "secondary": "#6B7B8D",
        "accent": "#E8ECF0",
        "tableHeader": "#1B2838",
        "tableStripe": "#F3F4F6",
        "text": "#111111"
      }
    },
    "coverPage": {
      "titleText": "Internal Audit Plan",
      "showOrgName": true,
      "showAuditableEntity": true,
      "showPeriodCovered": true,
      "showVersionNumber": true,
      "showIssueDate": true,
      "showConfidentialLabel": true,
      "fiscalYearMode": "range",
      "coverStyle": "formal"
    },
    "toc": {
      "enabled": true,
      "title": "Table of Contents",
      "depth": 3,
      "showLeaderDots": true,
      "showPageNumbers": true
    },
    "pagination": {
      "showPageNumbers": true,
      "hideOnCover": true,
      "frontMatterStyle": "roman",
      "bodyStyle": "arabic",
      "appendixStyle": "roman",
      "position": "bottom-center",
      "pageBreakBetweenSections": true
    },
    "sections": [
      {"id": "cover_page", "label": "Cover Page", "enabled": true, "order": 1, "inToc": false, "startNewPage": false, "displayMode": "auto"},
      {"id": "document_control", "label": "Document Control", "enabled": true, "order": 2, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "approval_signoff", "label": "Approval / Sign-off", "enabled": true, "order": 3, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "table_of_contents", "label": "Table of Contents", "enabled": true, "order": 4, "inToc": false, "startNewPage": true, "displayMode": "auto"},
      {"id": "executive_summary", "label": "Executive Summary", "enabled": true, "order": 5, "inToc": true, "startNewPage": true, "displayMode": "narrative"},
      {"id": "audit_background", "label": "Audit Background", "enabled": true, "order": 6, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_objective", "label": "Audit Objective", "enabled": true, "order": 7, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_scope", "label": "Audit Scope", "enabled": true, "order": 8, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_criteria", "label": "Audit Criteria", "enabled": true, "order": 9, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "risk_assessment_summary", "label": "Risk Assessment Summary", "enabled": true, "order": 10, "inToc": true, "startNewPage": true, "displayMode": "table"},
      {"id": "focus_areas", "label": "Focus Areas / Audit Questions", "enabled": true, "order": 11, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "methodology", "label": "Audit Approach / Methodology", "enabled": true, "order": 12, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "planned_procedures", "label": "Planned Procedures / Work Program Summary", "enabled": true, "order": 13, "inToc": true, "startNewPage": true, "displayMode": "table"},
      {"id": "sampling_strategy", "label": "Sampling Strategy", "enabled": true, "order": 14, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "information_required", "label": "Information Required", "enabled": true, "order": 15, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "resource_plan", "label": "Resource Plan", "enabled": true, "order": 16, "inToc": true, "startNewPage": true, "displayMode": "table"},
      {"id": "timeline_milestones", "label": "Timeline / Milestones", "enabled": true, "order": 17, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "deliverables", "label": "Deliverables", "enabled": true, "order": 18, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "communication_protocol", "label": "Communication & Reporting Protocol", "enabled": true, "order": 19, "inToc": true, "startNewPage": true, "displayMode": "narrative"},
      {"id": "independence_statement", "label": "Independence / Confidentiality Statement", "enabled": true, "order": 20, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "limitations", "label": "Limitations / Assumptions", "enabled": true, "order": 21, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "appendices", "label": "Appendices", "enabled": true, "order": 22, "inToc": true, "startNewPage": true, "displayMode": "auto"}
    ],
    "approval": {
      "signatories": [
        {"label": "Prepared By", "defaultName": "", "roleTitle": "Internal Auditor"},
        {"label": "Reviewed By", "defaultName": "", "roleTitle": "Senior Auditor"},
        {"label": "Approved By", "defaultName": "", "roleTitle": "Chief Audit Executive"}
      ],
      "showDateField": true,
      "showSignatureLine": true
    },
    "tableStyle": {
      "headerBackground": "#1B2838",
      "headerTextColor": "#FFFFFF",
      "stripedRows": true,
      "stripeColor": "#F3F4F6",
      "borderColor": "#C4C9CF",
      "repeatHeaderOnPageBreak": true,
      "fontSize": "normal"
    },
    "typography": {
      "fontFamily": "Times New Roman",
      "headingFont": "Times New Roman",
      "baseFontSize": 12,
      "headingColor": "#1B2838",
      "bodyColor": "#111111",
      "lineHeight": 1.6
    },
    "exportDefaults": {
      "defaultFormat": "pdf",
      "docxEditableNarratives": true,
      "draftWatermark": false,
      "draftWatermarkText": "DRAFT"
    }
  }'::jsonb,
  'system'
);

-- 3. Professional Minimal
INSERT INTO public.ia_audit_plan_templates (template_name, template_key, description, is_system, config_json, created_by)
VALUES (
  'Professional Minimal',
  'professional_minimal',
  'Modern and clean with reduced sections. Ideal for concise audit plans.',
  true,
  '{
    "branding": {
      "logoMode": "cover_only",
      "logoSource": "default",
      "logoSize": "small",
      "logoAlignment": "left",
      "orgName": "",
      "confidentialLabel": "Confidential",
      "showWatermark": false,
      "watermarkText": "DRAFT",
      "colorPalette": {
        "primary": "#2C3E50",
        "secondary": "#7F8C8D",
        "accent": "#EBF0F5",
        "tableHeader": "#2C3E50",
        "tableStripe": "#FAFBFC",
        "text": "#2C3E50"
      }
    },
    "coverPage": {
      "titleText": "Audit Plan",
      "showOrgName": true,
      "showAuditableEntity": true,
      "showPeriodCovered": true,
      "showVersionNumber": false,
      "showIssueDate": true,
      "showConfidentialLabel": true,
      "fiscalYearMode": "single",
      "coverStyle": "modern"
    },
    "toc": {
      "enabled": true,
      "title": "Contents",
      "depth": 2,
      "showLeaderDots": false,
      "showPageNumbers": true
    },
    "pagination": {
      "showPageNumbers": true,
      "hideOnCover": true,
      "frontMatterStyle": "none",
      "bodyStyle": "arabic",
      "appendixStyle": "alpha",
      "position": "bottom-right",
      "pageBreakBetweenSections": false
    },
    "sections": [
      {"id": "cover_page", "label": "Cover Page", "enabled": true, "order": 1, "inToc": false, "startNewPage": false, "displayMode": "auto"},
      {"id": "document_control", "label": "Document Control", "enabled": false, "order": 2, "inToc": false, "startNewPage": false, "displayMode": "table"},
      {"id": "approval_signoff", "label": "Approval", "enabled": true, "order": 3, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "table_of_contents", "label": "Contents", "enabled": true, "order": 4, "inToc": false, "startNewPage": true, "displayMode": "auto"},
      {"id": "executive_summary", "label": "Executive Summary", "enabled": true, "order": 5, "inToc": true, "startNewPage": true, "displayMode": "narrative"},
      {"id": "audit_background", "label": "Background", "enabled": false, "order": 6, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_objective", "label": "Objective", "enabled": true, "order": 7, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_scope", "label": "Scope", "enabled": true, "order": 8, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_criteria", "label": "Criteria", "enabled": false, "order": 9, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "risk_assessment_summary", "label": "Risk Assessment", "enabled": true, "order": 10, "inToc": true, "startNewPage": true, "displayMode": "table"},
      {"id": "focus_areas", "label": "Focus Areas", "enabled": true, "order": 11, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "methodology", "label": "Methodology", "enabled": true, "order": 12, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "planned_procedures", "label": "Work Program", "enabled": false, "order": 13, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "sampling_strategy", "label": "Sampling", "enabled": false, "order": 14, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "information_required", "label": "Information Required", "enabled": false, "order": 15, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "resource_plan", "label": "Resources", "enabled": true, "order": 16, "inToc": true, "startNewPage": true, "displayMode": "table"},
      {"id": "timeline_milestones", "label": "Timeline", "enabled": true, "order": 17, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "deliverables", "label": "Deliverables", "enabled": true, "order": 18, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "communication_protocol", "label": "Communication Protocol", "enabled": true, "order": 19, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "independence_statement", "label": "Independence Statement", "enabled": false, "order": 20, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "limitations", "label": "Limitations", "enabled": false, "order": 21, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "appendices", "label": "Appendices", "enabled": false, "order": 22, "inToc": true, "startNewPage": true, "displayMode": "auto"}
    ],
    "approval": {
      "signatories": [
        {"label": "Prepared By", "defaultName": "", "roleTitle": "Auditor"},
        {"label": "Approved By", "defaultName": "", "roleTitle": "Audit Manager"}
      ],
      "showDateField": true,
      "showSignatureLine": false
    },
    "tableStyle": {
      "headerBackground": "#2C3E50",
      "headerTextColor": "#FFFFFF",
      "stripedRows": true,
      "stripeColor": "#FAFBFC",
      "borderColor": "#E5E7EB",
      "repeatHeaderOnPageBreak": true,
      "fontSize": "small"
    },
    "typography": {
      "fontFamily": "Calibri",
      "headingFont": "Calibri",
      "baseFontSize": 11,
      "headingColor": "#2C3E50",
      "bodyColor": "#2C3E50",
      "lineHeight": 1.4
    },
    "exportDefaults": {
      "defaultFormat": "pdf",
      "docxEditableNarratives": true,
      "draftWatermark": false,
      "draftWatermarkText": "DRAFT"
    }
  }'::jsonb,
  'system'
);

-- 4. Audit Committee Pack
INSERT INTO public.ia_audit_plan_templates (template_name, template_key, description, is_system, config_json, created_by)
VALUES (
  'Audit Committee Pack',
  'audit_committee_pack',
  'Formal deep-blue style emphasizing executive summary and risk assessment. Designed for board/committee presentations.',
  true,
  '{
    "branding": {
      "logoMode": "cover_and_header",
      "logoSource": "default",
      "logoSize": "medium",
      "logoAlignment": "left",
      "orgName": "",
      "confidentialLabel": "CONFIDENTIAL — FOR BOARD USE ONLY",
      "showWatermark": false,
      "watermarkText": "DRAFT",
      "colorPalette": {
        "primary": "#1A237E",
        "secondary": "#3949AB",
        "accent": "#E8EAF6",
        "tableHeader": "#1A237E",
        "tableStripe": "#F5F5FF",
        "text": "#1A1A2E"
      }
    },
    "coverPage": {
      "titleText": "Annual Internal Audit Plan",
      "showOrgName": true,
      "showAuditableEntity": false,
      "showPeriodCovered": true,
      "showVersionNumber": true,
      "showIssueDate": true,
      "showConfidentialLabel": true,
      "fiscalYearMode": "range",
      "coverStyle": "formal"
    },
    "toc": {
      "enabled": true,
      "title": "Table of Contents",
      "depth": 2,
      "showLeaderDots": true,
      "showPageNumbers": true
    },
    "pagination": {
      "showPageNumbers": true,
      "hideOnCover": true,
      "frontMatterStyle": "roman",
      "bodyStyle": "arabic",
      "appendixStyle": "arabic",
      "position": "bottom-center",
      "pageBreakBetweenSections": true
    },
    "sections": [
      {"id": "cover_page", "label": "Cover Page", "enabled": true, "order": 1, "inToc": false, "startNewPage": false, "displayMode": "auto"},
      {"id": "document_control", "label": "Document Control", "enabled": true, "order": 2, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "approval_signoff", "label": "Approval / Sign-off", "enabled": true, "order": 3, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "table_of_contents", "label": "Table of Contents", "enabled": true, "order": 4, "inToc": false, "startNewPage": true, "displayMode": "auto"},
      {"id": "executive_summary", "label": "Executive Summary", "enabled": true, "order": 5, "inToc": true, "startNewPage": true, "displayMode": "narrative"},
      {"id": "audit_background", "label": "Audit Background", "enabled": true, "order": 6, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_objective", "label": "Audit Objective", "enabled": true, "order": 7, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_scope", "label": "Audit Scope", "enabled": true, "order": 8, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_criteria", "label": "Audit Criteria", "enabled": false, "order": 9, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "risk_assessment_summary", "label": "Risk Assessment Summary", "enabled": true, "order": 10, "inToc": true, "startNewPage": true, "displayMode": "table"},
      {"id": "focus_areas", "label": "Key Focus Areas", "enabled": true, "order": 11, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "methodology", "label": "Audit Methodology", "enabled": true, "order": 12, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "planned_procedures", "label": "Work Program Summary", "enabled": false, "order": 13, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "sampling_strategy", "label": "Sampling Strategy", "enabled": false, "order": 14, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "information_required", "label": "Information Required", "enabled": false, "order": 15, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "resource_plan", "label": "Resource Plan", "enabled": true, "order": 16, "inToc": true, "startNewPage": true, "displayMode": "table"},
      {"id": "timeline_milestones", "label": "Timeline & Key Milestones", "enabled": true, "order": 17, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "deliverables", "label": "Deliverables", "enabled": true, "order": 18, "inToc": true, "startNewPage": false, "displayMode": "table"},
      {"id": "communication_protocol", "label": "Communication & Reporting Protocol", "enabled": true, "order": 19, "inToc": true, "startNewPage": true, "displayMode": "narrative"},
      {"id": "independence_statement", "label": "Independence & Confidentiality", "enabled": true, "order": 20, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "limitations", "label": "Limitations / Assumptions", "enabled": false, "order": 21, "inToc": true, "startNewPage": false, "displayMode": "narrative"},
      {"id": "appendices", "label": "Appendices", "enabled": true, "order": 22, "inToc": true, "startNewPage": true, "displayMode": "auto"}
    ],
    "approval": {
      "signatories": [
        {"label": "Prepared By", "defaultName": "", "roleTitle": "Internal Auditor"},
        {"label": "Reviewed By", "defaultName": "", "roleTitle": "Manager, Internal Audit"},
        {"label": "Approved By", "defaultName": "", "roleTitle": "Chief Audit Executive"},
        {"label": "Noted By", "defaultName": "", "roleTitle": "Chair, Audit Committee"}
      ],
      "showDateField": true,
      "showSignatureLine": true
    },
    "tableStyle": {
      "headerBackground": "#1A237E",
      "headerTextColor": "#FFFFFF",
      "stripedRows": true,
      "stripeColor": "#F5F5FF",
      "borderColor": "#C5CAE9",
      "repeatHeaderOnPageBreak": true,
      "fontSize": "normal"
    },
    "typography": {
      "fontFamily": "Arial",
      "headingFont": "Arial",
      "baseFontSize": 11,
      "headingColor": "#1A237E",
      "bodyColor": "#1A1A2E",
      "lineHeight": 1.5
    },
    "exportDefaults": {
      "defaultFormat": "pdf",
      "docxEditableNarratives": true,
      "draftWatermark": false,
      "draftWatermarkText": "DRAFT"
    }
  }'::jsonb,
  'system'
);

-- 5. Working Draft
INSERT INTO public.ia_audit_plan_templates (template_name, template_key, description, is_system, config_json, created_by)
VALUES (
  'Working Draft',
  'working_draft',
  'Lightweight draft-focused template with watermark enabled and minimal formatting. For internal working copies.',
  true,
  '{
    "branding": {
      "logoMode": "none",
      "logoSource": "default",
      "logoSize": "small",
      "logoAlignment": "left",
      "orgName": "",
      "confidentialLabel": "",
      "showWatermark": true,
      "watermarkText": "WORKING DRAFT",
      "colorPalette": {
        "primary": "#455A64",
        "secondary": "#90A4AE",
        "accent": "#ECEFF1",
        "tableHeader": "#455A64",
        "tableStripe": "#F5F5F5",
        "text": "#37474F"
      }
    },
    "coverPage": {
      "titleText": "Audit Plan — Working Draft",
      "showOrgName": false,
      "showAuditableEntity": true,
      "showPeriodCovered": true,
      "showVersionNumber": true,
      "showIssueDate": true,
      "showConfidentialLabel": false,
      "fiscalYearMode": "single",
      "coverStyle": "minimal"
    },
    "toc": {
      "enabled": false,
      "title": "Contents",
      "depth": 1,
      "showLeaderDots": false,
      "showPageNumbers": false
    },
    "pagination": {
      "showPageNumbers": true,
      "hideOnCover": false,
      "frontMatterStyle": "none",
      "bodyStyle": "arabic",
      "appendixStyle": "arabic",
      "position": "bottom-right",
      "pageBreakBetweenSections": false
    },
    "sections": [
      {"id": "cover_page", "label": "Cover Page", "enabled": true, "order": 1, "inToc": false, "startNewPage": false, "displayMode": "auto"},
      {"id": "document_control", "label": "Document Control", "enabled": false, "order": 2, "inToc": false, "startNewPage": false, "displayMode": "table"},
      {"id": "approval_signoff", "label": "Approval", "enabled": false, "order": 3, "inToc": false, "startNewPage": false, "displayMode": "table"},
      {"id": "table_of_contents", "label": "Contents", "enabled": false, "order": 4, "inToc": false, "startNewPage": false, "displayMode": "auto"},
      {"id": "executive_summary", "label": "Summary", "enabled": true, "order": 5, "inToc": false, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_background", "label": "Background", "enabled": true, "order": 6, "inToc": false, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_objective", "label": "Objective", "enabled": true, "order": 7, "inToc": false, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_scope", "label": "Scope", "enabled": true, "order": 8, "inToc": false, "startNewPage": false, "displayMode": "narrative"},
      {"id": "audit_criteria", "label": "Criteria", "enabled": false, "order": 9, "inToc": false, "startNewPage": false, "displayMode": "narrative"},
      {"id": "risk_assessment_summary", "label": "Risk Assessment", "enabled": true, "order": 10, "inToc": false, "startNewPage": false, "displayMode": "table"},
      {"id": "focus_areas", "label": "Focus Areas", "enabled": true, "order": 11, "inToc": false, "startNewPage": false, "displayMode": "table"},
      {"id": "methodology", "label": "Methodology", "enabled": true, "order": 12, "inToc": false, "startNewPage": false, "displayMode": "narrative"},
      {"id": "planned_procedures", "label": "Work Program", "enabled": false, "order": 13, "inToc": false, "startNewPage": false, "displayMode": "table"},
      {"id": "sampling_strategy", "label": "Sampling", "enabled": false, "order": 14, "inToc": false, "startNewPage": false, "displayMode": "narrative"},
      {"id": "information_required", "label": "Info Required", "enabled": false, "order": 15, "inToc": false, "startNewPage": false, "displayMode": "table"},
      {"id": "resource_plan", "label": "Resources", "enabled": true, "order": 16, "inToc": false, "startNewPage": false, "displayMode": "table"},
      {"id": "timeline_milestones", "label": "Timeline", "enabled": true, "order": 17, "inToc": false, "startNewPage": false, "displayMode": "table"},
      {"id": "deliverables", "label": "Deliverables", "enabled": true, "order": 18, "inToc": false, "startNewPage": false, "displayMode": "table"},
      {"id": "communication_protocol", "label": "Communication", "enabled": false, "order": 19, "inToc": false, "startNewPage": false, "displayMode": "narrative"},
      {"id": "independence_statement", "label": "Independence", "enabled": false, "order": 20, "inToc": false, "startNewPage": false, "displayMode": "narrative"},
      {"id": "limitations", "label": "Limitations", "enabled": false, "order": 21, "inToc": false, "startNewPage": false, "displayMode": "narrative"},
      {"id": "appendices", "label": "Appendices", "enabled": false, "order": 22, "inToc": false, "startNewPage": false, "displayMode": "auto"}
    ],
    "approval": {
      "signatories": [],
      "showDateField": false,
      "showSignatureLine": false
    },
    "tableStyle": {
      "headerBackground": "#455A64",
      "headerTextColor": "#FFFFFF",
      "stripedRows": false,
      "stripeColor": "#F5F5F5",
      "borderColor": "#CFD8DC",
      "repeatHeaderOnPageBreak": true,
      "fontSize": "small"
    },
    "typography": {
      "fontFamily": "Calibri",
      "headingFont": "Calibri",
      "baseFontSize": 10,
      "headingColor": "#455A64",
      "bodyColor": "#37474F",
      "lineHeight": 1.4
    },
    "exportDefaults": {
      "defaultFormat": "pdf",
      "docxEditableNarratives": true,
      "draftWatermark": true,
      "draftWatermarkText": "WORKING DRAFT"
    }
  }'::jsonb,
  'system'
);

-- ============================================================
-- Seed: Default profile using "Audit Blue Minimal"
-- ============================================================
INSERT INTO public.ia_audit_plan_profiles (profile_name, description, template_id, audience, is_active, is_default, created_by)
SELECT
  'Default Audit Plan Profile',
  'Standard profile using the Audit Blue Minimal template. Suitable for most audit plans.',
  t.id,
  'management',
  true,
  true,
  'system'
FROM public.ia_audit_plan_templates t
WHERE t.template_key = 'audit_blue_minimal';
