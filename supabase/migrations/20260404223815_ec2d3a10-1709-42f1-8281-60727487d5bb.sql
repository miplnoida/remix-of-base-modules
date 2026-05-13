
-- Parent IDs
-- benefit_management: 839cee37-4006-43a4-a53c-6d0cea76a6b0
-- bn_configuration:   92c8c16d-91c7-4868-bbce-04254af6fc97

-- Insert missing operational items under Benefit Management
INSERT INTO app_modules (id, name, display_name, route, parent_id, is_enabled, show_in_menu, sort_order, icon, description)
VALUES
  (gen_random_uuid(), 'bn_claim_queue', 'Claim Queue', '/bn/queue', '839cee37-4006-43a4-a53c-6d0cea76a6b0', true, true, 15, 'clipboard-list', 'Prioritized claim processing queue'),
  (gen_random_uuid(), 'bn_approval_console', 'Approval Console', '/bn/approval', '839cee37-4006-43a4-a53c-6d0cea76a6b0', true, true, 16, 'clipboard-check', 'Review and approve benefit decisions'),
  (gen_random_uuid(), 'bn_entitlements', 'Entitlements', '/bn/entitlements', '839cee37-4006-43a4-a53c-6d0cea76a6b0', true, true, 17, 'shield', 'Manage approved benefit rights and lifecycle'),
  (gen_random_uuid(), 'bn_payables_queue', 'Payables Queue', '/bn/payables', '839cee37-4006-43a4-a53c-6d0cea76a6b0', true, true, 18, 'credit-card', 'Manage payable instructions before payment issue'),
  (gen_random_uuid(), 'bn_payment_schedules', 'Payment Schedules', '/bn/schedules', '839cee37-4006-43a4-a53c-6d0cea76a6b0', true, true, 19, 'calendar', 'Plan one-time and recurring benefit disbursements'),
  (gen_random_uuid(), 'bn_batch_operations', 'Batch Operations', '/bn/batches', '839cee37-4006-43a4-a53c-6d0cea76a6b0', true, true, 21, 'boxes', 'Group payables into controlled payment batches'),
  (gen_random_uuid(), 'bn_payment_issue', 'Payment Issue', '/bn/issue', '839cee37-4006-43a4-a53c-6d0cea76a6b0', true, true, 22, 'dollar-sign', 'Issue outbound benefit disbursements'),
  (gen_random_uuid(), 'bn_post_issue', 'Post-Issue Review', '/bn/post-issue', '839cee37-4006-43a4-a53c-6d0cea76a6b0', true, true, 23, 'clipboard-check', 'Complete claim-side updates after payment issue'),
  (gen_random_uuid(), 'bn_historical_inquiry', 'Historical Inquiry', '/bn/history', '839cee37-4006-43a4-a53c-6d0cea76a6b0', true, true, 24, 'history', 'Search legacy claims and disbursement history'),
  (gen_random_uuid(), 'bn_simulation', 'Simulation Engine', '/bn/simulation', '839cee37-4006-43a4-a53c-6d0cea76a6b0', true, true, 25, 'flask-conical', 'Test benefit products in an isolated sandbox')
ON CONFLICT DO NOTHING;

-- Insert missing Configuration sub-items
INSERT INTO app_modules (id, name, display_name, route, parent_id, is_enabled, show_in_menu, sort_order, icon, description)
VALUES
  (gen_random_uuid(), 'bn_rule_groups', 'Rule Groups', '/bn/config/rules', '92c8c16d-91c7-4868-bbce-04254af6fc97', true, true, 20, 'layers', 'Eligibility, calculation, and timeline rules'),
  (gen_random_uuid(), 'bn_rules_admin', 'Rules Administration', '/bn/config/rules-admin', '92c8c16d-91c7-4868-bbce-04254af6fc97', true, true, 25, 'shield', 'Version governance, compare, approve, and publish rules'),
  (gen_random_uuid(), 'bn_formulas', 'Formula Templates', '/bn/config/formulas', '92c8c16d-91c7-4868-bbce-04254af6fc97', true, true, 30, 'flask-conical', 'Reusable calculation formulas'),
  (gen_random_uuid(), 'bn_doc_setup', 'Document Setup', '/bn/config/document-setup', '92c8c16d-91c7-4868-bbce-04254af6fc97', true, true, 40, 'file-text', 'Document profiles and requirements'),
  (gen_random_uuid(), 'bn_screen_setup', 'Screen & Fields', '/bn/config/screen-setup', '92c8c16d-91c7-4868-bbce-04254af6fc97', true, true, 50, 'monitor', 'Screen templates and field metadata'),
  (gen_random_uuid(), 'bn_calc_engine', 'Calculation Engine', '/bn/engine', '92c8c16d-91c7-4868-bbce-04254af6fc97', true, true, 60, 'flask-conical', 'Run, simulate, and audit benefit calculations'),
  (gen_random_uuid(), 'bn_transitions', 'Transition Matrix', '/bn/config/transitions', '92c8c16d-91c7-4868-bbce-04254af6fc97', true, true, 70, 'git-branch', 'Claim status transition rules'),
  (gen_random_uuid(), 'bn_reason_codes', 'Reason Codes', '/bn/config/reason-codes', '92c8c16d-91c7-4868-bbce-04254af6fc97', true, true, 80, 'activity', 'Denial, suspension, and escalation reasons'),
  (gen_random_uuid(), 'bn_workbaskets', 'Workbaskets', '/bn/config/workbaskets', '92c8c16d-91c7-4868-bbce-04254af6fc97', true, true, 90, 'layers', 'Claim queues and workload distribution'),
  (gen_random_uuid(), 'bn_escalation', 'Escalation Policies', '/bn/config/escalation', '92c8c16d-91c7-4868-bbce-04254af6fc97', true, true, 100, 'alert-triangle', 'SLA breach and manual escalation rules'),
  (gen_random_uuid(), 'bn_service_doc_types', 'Service Doc Types', '/bn/config/service-doc-types', '92c8c16d-91c7-4868-bbce-04254af6fc97', true, true, 110, 'file-check', 'Special document types for claims')
ON CONFLICT DO NOTHING;

-- Create Country Packs parent under Configuration
INSERT INTO app_modules (id, name, display_name, route, parent_id, is_enabled, show_in_menu, sort_order, icon, description)
VALUES
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'bn_country_packs', 'Country Packs', NULL, '92c8c16d-91c7-4868-bbce-04254af6fc97', true, true, 120, 'flag', 'Country-specific configuration packs')
ON CONFLICT DO NOTHING;

-- Country Pack sub-items
INSERT INTO app_modules (id, name, display_name, route, parent_id, is_enabled, show_in_menu, sort_order, icon, description)
VALUES
  (gen_random_uuid(), 'bn_cp_overview', 'Pack Overview', '/bn/config/country', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', true, true, 10, 'globe', 'Country pack completeness dashboard'),
  (gen_random_uuid(), 'bn_cp_id_rules', 'ID / SSN Rules', '/bn/config/country/id-rules', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', true, true, 20, 'file-check', 'Country-specific ID validation rules'),
  (gen_random_uuid(), 'bn_cp_address', 'Address Model', '/bn/config/country/address-model', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', true, true, 30, 'map-pin', 'Country-specific address fields'),
  (gen_random_uuid(), 'bn_cp_participants', 'Participant Types', '/bn/config/country/participant-types', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', true, true, 40, 'users', 'Claimant and beneficiary types'),
  (gen_random_uuid(), 'bn_cp_payment', 'Payment Config', '/bn/config/country/payment-config', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', true, true, 50, 'credit-card', 'Payment methods and calendars'),
  (gen_random_uuid(), 'bn_cp_legal', 'Legal References', '/bn/config/country/legal-refs', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', true, true, 60, 'shield', 'Governing legislation with versioning')
ON CONFLICT DO NOTHING;
