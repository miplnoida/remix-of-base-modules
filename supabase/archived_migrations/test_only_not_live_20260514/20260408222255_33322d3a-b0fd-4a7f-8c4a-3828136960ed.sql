
-- ═══════════════════════════════════════════════════════
-- 1. Organization-Level Document Foundation
-- ═══════════════════════════════════════════════════════

CREATE TABLE public.ia_org_document_foundation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  foundation_key TEXT NOT NULL UNIQUE DEFAULT 'default',
  
  -- Shared branding
  branding JSONB NOT NULL DEFAULT '{
    "showLogo": true,
    "logoSource": "default",
    "logoSize": "medium",
    "logoAlignment": "center",
    "orgName": "SOCIAL SECURITY BOARD",
    "country": "ST. KITTS AND NEVIS",
    "address": "Bay Road, P.O. Box 79, Basseterre, St. Kitts",
    "phone": "(869) 465-2521",
    "confidentialLabel": "CONFIDENTIAL",
    "showWatermark": true,
    "watermarkText": "DRAFT"
  }'::jsonb,

  -- Shared color palette
  color_palette JSONB NOT NULL DEFAULT '{
    "primary": "#1E3A5F",
    "secondary": "#4A6D8C",
    "accent": "#D5E8F0",
    "tableHeader": "#1E3A5F",
    "tableStripe": "#F0F4F8",
    "text": "#1A1A1A",
    "gold": "#C4A756"
  }'::jsonb,

  -- Shared typography
  typography JSONB NOT NULL DEFAULT '{
    "fontFamily": "Arial, Helvetica, sans-serif",
    "headingFont": "Arial, Helvetica, sans-serif",
    "baseFontSize": 11,
    "h1Size": 18,
    "h2Size": 14,
    "h3Size": 12,
    "headingColor": "#1E3A5F",
    "bodyColor": "#1A1A1A",
    "lineHeight": 1.5,
    "paragraphSpacingBefore": 6,
    "paragraphSpacingAfter": 6
  }'::jsonb,

  -- Shared page layout
  page_layout JSONB NOT NULL DEFAULT '{
    "pageSize": "letter",
    "orientation": "portrait",
    "margins": { "top": 1.0, "bottom": 1.0, "left": 1.0, "right": 1.0 }
  }'::jsonb,

  -- Shared pagination
  pagination JSONB NOT NULL DEFAULT '{
    "showPageNumbers": true,
    "hideOnCover": true,
    "position": "bottom-center",
    "frontMatterStyle": "roman",
    "bodyStyle": "arabic",
    "appendixStyle": "arabic",
    "pageBreakBetweenSections": true
  }'::jsonb,

  -- Shared sign-off / signatories
  sign_off JSONB NOT NULL DEFAULT '[
    { "label": "Prepared By", "defaultName": "", "roleTitle": "Internal Auditor" },
    { "label": "Reviewed By", "defaultName": "", "roleTitle": "Manager, Internal Audit" },
    { "label": "Approved By", "defaultName": "", "roleTitle": "Director" }
  ]'::jsonb,

  -- Shared draft / final rules
  draft_rules JSONB NOT NULL DEFAULT '{
    "showWatermark": true,
    "watermarkText": "DRAFT",
    "showIssuedStamp": true
  }'::jsonb,

  -- Shared table style
  table_style JSONB NOT NULL DEFAULT '{
    "headerBackground": "#1E3A5F",
    "headerTextColor": "#FFFFFF",
    "stripedRows": true,
    "stripeColor": "#F0F4F8",
    "borderColor": "#D1D5DB",
    "repeatHeaderOnPageBreak": true,
    "fontSize": "normal",
    "autoFitMode": "auto_fit_window",
    "boldTotalRows": true,
    "cellPadding": 6
  }'::jsonb,

  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert the default foundation
INSERT INTO public.ia_org_document_foundation (foundation_key) VALUES ('default');

-- ═══════════════════════════════════════════════════════
-- 2. Master Document Section Library
-- ═══════════════════════════════════════════════════════

CREATE TABLE public.ia_document_section_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  applies_to TEXT[] NOT NULL DEFAULT '{}',
  is_shared BOOLEAN NOT NULL DEFAULT false,
  default_enabled BOOLEAN NOT NULL DEFAULT true,
  default_order INTEGER NOT NULL DEFAULT 100,
  display_mode TEXT NOT NULL DEFAULT 'auto',
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT 'body',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: Shared sections (appear in multiple document types)
INSERT INTO public.ia_document_section_library (section_key, label, applies_to, is_shared, default_enabled, default_order, display_mode, is_mandatory, category, description) VALUES
  ('cover_page',           'Cover Page',                        '{"audit_report","audit_plan","mgmt_response"}', true,  true,  1,  'auto',      true,  'cover',        'Document cover page with branding and title'),
  ('table_of_contents',    'Table of Contents',                 '{"audit_report","audit_plan"}',                 true,  true,  2,  'auto',      false, 'front_matter', 'Auto-generated table of contents'),
  ('executive_summary',    'Executive Summary',                 '{"audit_report","audit_plan"}',                 true,  true,  3,  'narrative', false, 'front_matter', 'High-level summary of key points'),
  ('audit_objective',      'Audit Objective',                   '{"audit_report","audit_plan"}',                 true,  true,  5,  'narrative', true,  'body',         'Statement of audit objectives'),
  ('audit_scope',          'Scope',                             '{"audit_report","audit_plan"}',                 true,  true,  6,  'narrative', true,  'body',         'Boundaries and coverage of the audit'),
  ('methodology',          'Audit Approach / Methodology',      '{"audit_report","audit_plan"}',                 true,  true,  7,  'narrative', false, 'body',         'Approach and methods used'),
  ('risk_assessment_summary','Risk Assessment Summary',         '{"audit_report","audit_plan"}',                 true,  true,  8,  'table',     false, 'body',         'Summary of risk assessment results'),
  ('approval_signoff',     'Approval / Sign-off',               '{"audit_report","audit_plan","mgmt_response"}', true,  true,  50, 'table',     false, 'appendix',     'Signature block for approvals'),
  ('distribution',         'Distribution',                      '{"audit_report","audit_plan"}',                 true,  true,  49, 'table',     false, 'appendix',     'List of report recipients'),

  -- Audit Report-specific sections
  ('background',           'Audit Background',                  '{"audit_report"}',                              false, true,  4,  'narrative', false, 'body',         'Context and background of the audit engagement'),
  ('risk_overview',        'Risk Overview',                     '{"audit_report"}',                              false, true,  9,  'narrative', false, 'body',         'Overall risk landscape'),
  ('key_findings',         'Key Findings Snapshot',             '{"audit_report"}',                              false, true,  10, 'table',     false, 'body',         'Summary table of key findings'),
  ('detailed_findings',    'Detailed Findings',                 '{"audit_report"}',                              false, true,  11, 'narrative', false, 'body',         'Full findings with criteria, condition, cause, effect'),
  ('management_responses', 'Management Responses',              '{"audit_report"}',                              false, true,  12, 'narrative', false, 'body',         'Responses from management to findings'),
  ('action_plan',          'Agreed Action Plan',                '{"audit_report"}',                              false, true,  13, 'table',     false, 'body',         'Action items with owners and due dates'),
  ('conclusion',           'Conclusion',                        '{"audit_report"}',                              false, true,  14, 'narrative', false, 'body',         'Final conclusions and recommendations'),

  -- Audit Plan-specific sections
  ('document_control',     'Document Control',                  '{"audit_plan"}',                                false, true,  2,  'table',     false, 'front_matter', 'Version history and document control info'),
  ('audit_background_plan','Audit Background',                  '{"audit_plan"}',                                false, true,  4,  'narrative', false, 'body',         'Background specific to the audit plan'),
  ('audit_criteria',       'Audit Criteria',                    '{"audit_plan"}',                                false, false, 9,  'narrative', false, 'body',         'Criteria against which audit is conducted'),
  ('focus_areas',          'Focus Areas / Audit Questions',     '{"audit_plan"}',                                false, true,  10, 'table',     false, 'body',         'Key areas of focus and audit questions'),
  ('planned_procedures',   'Planned Procedures / Work Program', '{"audit_plan"}',                                false, false, 11, 'table',     false, 'body',         'Detailed work steps and procedures'),
  ('sampling_strategy',    'Sampling Strategy',                 '{"audit_plan"}',                                false, false, 12, 'narrative', false, 'body',         'Approach to sampling data'),
  ('information_required', 'Information Required',              '{"audit_plan"}',                                false, false, 13, 'table',     false, 'body',         'Documents and data needed from auditee'),
  ('resource_plan',        'Resource Plan',                     '{"audit_plan"}',                                false, true,  14, 'table',     false, 'body',         'Team allocation and resource budget'),
  ('timeline_milestones',  'Timeline / Milestones',             '{"audit_plan"}',                                false, true,  15, 'table',     false, 'body',         'Key dates and milestones'),
  ('deliverables',         'Deliverables',                      '{"audit_plan"}',                                false, true,  16, 'table',     false, 'body',         'Expected outputs from the engagement'),
  ('communication_protocol','Communication & Reporting Protocol','{"audit_plan"}',                               false, true,  17, 'narrative', false, 'body',         'How and when to communicate findings'),
  ('independence_statement','Independence / Confidentiality Statement','{"audit_plan"}',                         false, false, 18, 'narrative', false, 'body',         'Auditor independence declaration'),
  ('limitations',          'Limitations / Assumptions',         '{"audit_plan"}',                                false, false, 19, 'narrative', false, 'body',         'Known constraints and assumptions'),
  ('appendices',           'Appendices',                        '{"audit_plan"}',                                false, false, 20, 'auto',      false, 'appendix',     'Supporting documents and attachments'),

  -- Management Response-specific sections
  ('mgmt_summary_metrics', 'Summary Metrics',                   '{"mgmt_response"}',                            false, true,  3,  'table',     false, 'body',         'Open/closed counts and overdue statistics'),
  ('mgmt_findings_table',  'Findings & Responses Table',        '{"mgmt_response"}',                            false, true,  5,  'table',     true,  'body',         'Consolidated table of findings and management responses'),
  ('mgmt_action_plans',    'Action Plan Status',                '{"mgmt_response"}',                            false, true,  6,  'table',     false, 'body',         'Status of agreed action plans'),
  ('mgmt_overdue_items',   'Overdue Items',                     '{"mgmt_response"}',                            false, true,  7,  'table',     false, 'body',         'Items past their due date');

-- Enable realtime for foundation changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.ia_org_document_foundation;
