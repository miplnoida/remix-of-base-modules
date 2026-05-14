-- Compliance Admin: Restructure template-related menu entries
-- Goal: Eliminate duplicate "templates" sibling entries and group them cleanly.
--
-- Before:
--   Policy & Rules
--     ├─ Templates (generic, superseded)
--     ├─ Audit Communication Templates
--     └─ Employer Online Response (not a template)
--
-- After:
--   Policy & Rules                (rules/numbering only)
--   Templates & Output            (NEW group)
--     ├─ Communication Templates       → /compliance/admin/communication-templates
--     ├─ Report Templates              → /compliance/admin/report-templates
--     └─ Shared Sections & Foundation  → /compliance/admin/document-foundation
--   Employer Interaction          (NEW group)
--     └─ Employer Online Response      → /compliance/admin/online-response

-- 1. Create the two new parent groups under Compliance > Admin (parent ca000000-..-100)
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, show_in_menu, description)
VALUES
  ('ca000000-0000-0000-0000-000000000170', 'ce_templates_output', 'Templates & Output', 'FileText', NULL,
   'ca000000-0000-0000-0000-000000000100', 12, true, true,
   'Communication templates, report templates, and shared document foundation'),
  ('ca000000-0000-0000-0000-000000000180', 'ce_employer_interaction', 'Employer Interaction', 'Globe', NULL,
   'ca000000-0000-0000-0000-000000000100', 14, true, true,
   'Configuration for direct employer-facing channels')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  icon = EXCLUDED.icon,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_enabled = EXCLUDED.is_enabled,
  show_in_menu = EXCLUDED.show_in_menu,
  description = EXCLUDED.description;

-- 2. Hide the legacy generic "Templates" entry (superseded by Communication Templates).
--    The route stays mounted for bookmarks; we just remove it from the sidebar.
UPDATE public.app_modules
SET show_in_menu = false,
    description = 'DEPRECATED — superseded by Communication Templates under Templates & Output'
WHERE id = 'ca000000-0000-0000-0000-000000000161';

-- 3. Move "Audit Communication Templates" → "Templates & Output" group
--    Rename to just "Communication Templates" for the new structure.
UPDATE public.app_modules
SET parent_id = 'ca000000-0000-0000-0000-000000000170',
    display_name = 'Communication Templates',
    sort_order = 1,
    icon = 'Mail',
    description = 'Audit intimation, books-required, reminders, findings, transmittal, violation, corrective-action, payment-arrangement review'
WHERE id = '1571ed3c-6237-4c0c-bd56-7af2a748068e';

-- 4. Add the two new template-area children: Report Templates + Shared Sections & Foundation
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, show_in_menu, description)
VALUES
  ('ca000000-0000-0000-0000-000000000171', 'ce_report_templates', 'Report Templates', 'FileText',
   '/compliance/admin/report-templates', 'ca000000-0000-0000-0000-000000000170', 2, true, true,
   'Internal Working Paper, Employer Audit Report, Findings Memo, Evidence Summary, Violation Document, Legal/Enforcement Pack, Management Summary'),
  ('ca000000-0000-0000-0000-000000000172', 'ce_document_foundation', 'Shared Sections & Foundation', 'Layers',
   '/compliance/admin/document-foundation', 'ca000000-0000-0000-0000-000000000170', 3, true, true,
   'Section library, reusable clauses, document branding, merge fields, and output defaults')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_enabled = EXCLUDED.is_enabled,
  show_in_menu = EXCLUDED.show_in_menu,
  description = EXCLUDED.description;

-- 5. Move "Employer Online Response" → "Employer Interaction" group
UPDATE public.app_modules
SET parent_id = 'ca000000-0000-0000-0000-000000000180',
    sort_order = 1,
    icon = 'Globe',
    description = 'Configure online response modes, policy matrix, and review workflow'
WHERE id = 'db813cae-1cb8-47b7-a8d2-0c3729724024';
