
-- 1. Create saved distribution recipients table
CREATE TABLE IF NOT EXISTS public.ia_distribution_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  recipient_type TEXT NOT NULL DEFAULT 'external' CHECK (recipient_type IN ('internal', 'external', 'board')),
  designation TEXT,
  organization TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create default distribution templates table
CREATE TABLE IF NOT EXISTS public.ia_distribution_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'general' CHECK (template_type IN ('board_review', 'final_distribution', 'revision_notice', 'general')),
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Seed default templates
INSERT INTO public.ia_distribution_templates (name, subject, body, template_type, is_default) VALUES
(
  'Board Review - Draft Plan',
  'Annual Audit Plan {{fiscal_year}} — For Board Review',
  'Dear {{recipient_name}},

Please find attached the draft Annual Audit Plan for Fiscal Year {{fiscal_year}} for your review and feedback.

Plan Title: {{plan_title}}
Version: {{version_number}}
Prepared By: {{approved_by}}

Your feedback and comments on the proposed audit coverage, risk priorities, and resource allocation would be greatly appreciated.

Please share your comments at your earliest convenience so they may be incorporated before formal submission for approval.

Kind regards,
Internal Audit Department
Social Security Board',
  'board_review',
  true
),
(
  'Final Approved Plan Distribution',
  'Annual Audit Plan {{fiscal_year}} — Final Approved Version',
  'Dear {{recipient_name}},

We are pleased to share the formally approved Annual Audit Plan for Fiscal Year {{fiscal_year}}.

Plan Title: {{plan_title}}
Version: {{version_number}}
Approved By: {{approved_by}}
Approved Date: {{approved_date}}
Board/Committee: {{board_committee_name}}

This document represents the official audit plan for the fiscal year and has been approved by the relevant governance body.

Please retain this for your records. Should you have any questions, do not hesitate to contact the Internal Audit Department.

Kind regards,
Internal Audit Department
Social Security Board',
  'final_distribution',
  true
),
(
  'Revised Plan Notice',
  'Annual Audit Plan {{fiscal_year}} — Revised Version {{version_number}}',
  'Dear {{recipient_name}},

Please be advised that the Annual Audit Plan for Fiscal Year {{fiscal_year}} has been revised. The updated version is attached for your reference.

Plan Title: {{plan_title}}
Version: {{version_number}}

Please disregard any previously distributed versions and use the attached as the current official plan.

Kind regards,
Internal Audit Department
Social Security Board',
  'revision_notice',
  true
);
