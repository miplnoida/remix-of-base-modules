
-- =========================================================
-- BN RULE GOVERNANCE — PHASE 1 FOUNDATION
-- =========================================================

-- 1. ROLES
INSERT INTO public.roles (role_name, description, is_active, is_system_role)
VALUES
  ('BN_RULE_AUTHOR',             'SEED- BN: Authors eligibility rules in Draft',                true, true),
  ('BN_RULE_TECHNICAL_REVIEWER', 'SEED- BN: Validates rule metadata and technical correctness', true, true),
  ('BN_RULE_LEGAL_APPROVER',     'SEED- BN: Approves legal basis of rules',                     true, true),
  ('BN_PRODUCT_MANAGER',         'SEED- BN: Attaches approved rules to products',               true, true),
  ('BN_PRODUCT_APPROVER',        'SEED- BN: Approves product version activation',               true, true),
  ('BN_CONFIG_ADMIN',            'SEED- BN: Administers configuration; can retire/restore',     true, true),
  ('BN_AUDITOR',                 'SEED- BN: Read-only auditor with audit trail visibility',     true, true)
ON CONFLICT (role_name) DO NOTHING;

-- 2. MODULE + ACTIONS (permissions)
INSERT INTO public.app_modules (name, display_name, description, is_enabled, show_in_menu, actions_enabled)
VALUES ('bn_rule_governance', 'BN Rule Governance', 'SEED- BN rule governance permission scope', true, false, true)
ON CONFLICT DO NOTHING;

-- Ensure single row exists
INSERT INTO public.app_modules (name, display_name, description, is_enabled, show_in_menu, actions_enabled)
SELECT 'bn_rule_governance', 'BN Rule Governance', 'SEED- BN rule governance permission scope', true, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.app_modules WHERE name = 'bn_rule_governance');

INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, a.action_name, a.display_name, a.description, true
FROM public.app_modules m
CROSS JOIN (VALUES
  ('bn.rules.create',              'Create Rule',               'Create a new eligibility rule in Draft'),
  ('bn.rules.edit',                'Edit Rule',                 'Edit rules in Draft state'),
  ('bn.rules.submit_technical',    'Submit for Technical Review','Submit a Draft rule for technical review'),
  ('bn.rules.technical_validate',  'Technical Validate',        'Pass technical review or return for correction'),
  ('bn.rules.submit_legal',        'Submit for Legal Review',   'Move rule into legal review'),
  ('bn.rules.legal_approve',       'Approve Legal',             'Approve legal basis of a rule'),
  ('bn.rules.legal_reject',        'Reject Legal',              'Reject and return rule to draft'),
  ('bn.rules.mark_ready',          'Mark Ready for Product Use','Mark approved rule ready for products'),
  ('bn.rules.retire',              'Retire Rule',               'Retire a rule from product use'),
  ('bn.rules.restore',             'Restore Rule',              'Restore a retired rule'),
  ('bn.rules.attach_to_product',   'Attach to Product',         'Attach an approved rule to a product version'),
  ('bn.rules.override_governance', 'Override Governance',       'Override governance restrictions (admin only)'),
  ('bn.rules.view_audit',          'View Audit Trail',          'View governance audit history')
) AS a(action_name, display_name, description)
WHERE m.name = 'bn_rule_governance'
ON CONFLICT (module_id, action_name) DO NOTHING;

-- 3. ROLE-PERMISSION MAPPING
WITH module_ref AS (SELECT id FROM public.app_modules WHERE name = 'bn_rule_governance' LIMIT 1),
mapping(role_name, action_name) AS (VALUES
  ('BN_RULE_AUTHOR',             'bn.rules.create'),
  ('BN_RULE_AUTHOR',             'bn.rules.edit'),
  ('BN_RULE_AUTHOR',             'bn.rules.submit_technical'),
  ('BN_RULE_TECHNICAL_REVIEWER', 'bn.rules.technical_validate'),
  ('BN_RULE_TECHNICAL_REVIEWER', 'bn.rules.submit_legal'),
  ('BN_RULE_LEGAL_APPROVER',     'bn.rules.legal_approve'),
  ('BN_RULE_LEGAL_APPROVER',     'bn.rules.legal_reject'),
  ('BN_PRODUCT_MANAGER',         'bn.rules.attach_to_product'),
  ('BN_PRODUCT_MANAGER',         'bn.rules.mark_ready'),
  ('BN_PRODUCT_MANAGER',         'bn.rules.retire'),
  ('BN_PRODUCT_APPROVER',        'bn.rules.attach_to_product'),
  ('BN_CONFIG_ADMIN',            'bn.rules.create'),
  ('BN_CONFIG_ADMIN',            'bn.rules.edit'),
  ('BN_CONFIG_ADMIN',            'bn.rules.submit_technical'),
  ('BN_CONFIG_ADMIN',            'bn.rules.technical_validate'),
  ('BN_CONFIG_ADMIN',            'bn.rules.submit_legal'),
  ('BN_CONFIG_ADMIN',            'bn.rules.mark_ready'),
  ('BN_CONFIG_ADMIN',            'bn.rules.retire'),
  ('BN_CONFIG_ADMIN',            'bn.rules.restore'),
  ('BN_CONFIG_ADMIN',            'bn.rules.attach_to_product'),
  ('BN_CONFIG_ADMIN',            'bn.rules.override_governance'),
  ('BN_CONFIG_ADMIN',            'bn.rules.view_audit'),
  ('BN_AUDITOR',                 'bn.rules.view_audit')
)
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, a.id, true
FROM mapping mp
JOIN public.roles r ON r.role_name = mp.role_name
JOIN module_ref m ON true
JOIN public.module_actions a ON a.module_id = m.id AND a.action_name = mp.action_name
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

-- 4. WORKBASKETS
INSERT INTO public.bn_workbasket (basket_code, basket_name, description, assigned_role, is_active, entered_by)
VALUES
  ('BN_RULE_AUTHORING',        'Rule Authoring',         'SEED- Drafts created by rule authors',              'BN_RULE_AUTHOR',             true, 'SYSTEM'),
  ('BN_RULE_TECHNICAL_REVIEW', 'Rule Technical Review',  'SEED- Rules awaiting technical validation',         'BN_RULE_TECHNICAL_REVIEWER', true, 'SYSTEM'),
  ('BN_RULE_LEGAL_REVIEW',     'Rule Legal Review',      'SEED- Rules awaiting legal approval',               'BN_RULE_LEGAL_APPROVER',     true, 'SYSTEM'),
  ('BN_PRODUCT_GOVERNANCE',    'Product Governance',     'SEED- Rules ready to attach to products',           'BN_PRODUCT_MANAGER',         true, 'SYSTEM'),
  ('BN_PRODUCT_APPROVAL',      'Product Approval',       'SEED- Product version activation approvals',        'BN_PRODUCT_APPROVER',        true, 'SYSTEM'),
  ('BN_CONFIG_AUDIT',          'Config Audit',           'SEED- Governance audit visibility',                 'BN_AUDITOR',                 true, 'SYSTEM')
ON CONFLICT (basket_code) DO NOTHING;

-- 5. WORKFLOW DEFINITION + STEPS
INSERT INTO public.workflow_definitions (name, description, process_type, default_sla_hours, is_active, version, secured_table)
VALUES (
  'RULE_GOVERNANCE_WORKFLOW',
  'SEED- BN Eligibility Rule governance lifecycle: Draft → Technical Review → Legal Review → Legal Confirmed → Ready → Active / Retired',
  'BN_ELIGIBILITY_RULE',
  48,
  true,
  1,
  'bn_eligibility_rule'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, assigned_role, action_type, sla_hours, is_final_step, description)
SELECT wd.id, s.step_number, s.step_name, s.assigned_role, s.action_type, s.sla_hours, s.is_final_step, s.description
FROM public.workflow_definitions wd
CROSS JOIN (VALUES
  (1, 'DRAFT',                   'BN_RULE_AUTHOR',             'Draft',     72, false, 'Author drafts rule and submits for technical review'),
  (2, 'TECHNICAL_REVIEW',        'BN_RULE_TECHNICAL_REVIEWER', 'Review',    48, false, 'Technical reviewer validates metadata, fact, operator, dates'),
  (3, 'LEGAL_REVIEW',            'BN_RULE_LEGAL_APPROVER',     'Approval',  72, false, 'Legal approver confirms statutory basis'),
  (4, 'LEGAL_CONFIRMED',         'BN_PRODUCT_MANAGER',         'Approval',  48, false, 'Legally approved; awaiting product readiness'),
  (5, 'READY_FOR_PRODUCT_USE',   'BN_PRODUCT_MANAGER',         'Review',    48, false, 'Ready to be attached to product versions'),
  (6, 'ACTIVE',                  'BN_PRODUCT_MANAGER',         'Notify',     0, false, 'Active in at least one active product version (system-managed)'),
  (7, 'RETIRED',                 'BN_CONFIG_ADMIN',            'Notify',     0, true,  'Retired from use')
) AS s(step_number, step_name, assigned_role, action_type, sla_hours, is_final_step, description)
WHERE wd.name = 'RULE_GOVERNANCE_WORKFLOW'
  AND NOT EXISTS (
    SELECT 1 FROM public.workflow_steps ws
    WHERE ws.workflow_id = wd.id AND ws.step_number = s.step_number
  );

-- 6. GOVERNANCE COLUMNS ON bn_eligibility_rule
ALTER TABLE public.bn_eligibility_rule
  ADD COLUMN IF NOT EXISTS governance_status        VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS legal_reference          TEXT,
  ADD COLUMN IF NOT EXISTS legal_notes              TEXT,
  ADD COLUMN IF NOT EXISTS jurisdiction_country     VARCHAR(10),
  ADD COLUMN IF NOT EXISTS effective_date           DATE,
  ADD COLUMN IF NOT EXISTS legal_approver_comment   TEXT,
  ADD COLUMN IF NOT EXISTS legal_approved_by        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS legal_approved_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS technical_validated_by   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS technical_validated_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS governance_updated_by    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS governance_updated_at    TIMESTAMPTZ DEFAULT now();

-- Constrain governance_status to known values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bn_eligibility_rule_governance_status_chk'
  ) THEN
    ALTER TABLE public.bn_eligibility_rule
      ADD CONSTRAINT bn_eligibility_rule_governance_status_chk
      CHECK (governance_status IN (
        'DRAFT','TECHNICAL_REVIEW','LEGAL_REVIEW','LEGAL_CONFIRMED',
        'READY_FOR_PRODUCT_USE','ACTIVE','RETIRED'
      ));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_bn_eligibility_rule_governance_status
  ON public.bn_eligibility_rule(governance_status);

-- 7. BACKFILL governance_status from legacy fields
UPDATE public.bn_eligibility_rule
SET governance_status = 'ACTIVE',
    legal_notes       = COALESCE(legal_notes, 'Backfilled from legacy status'),
    legal_approved_at = COALESCE(legal_approved_at, now()),
    legal_approved_by = COALESCE(legal_approved_by, 'SYSTEM-BACKFILL'),
    governance_updated_by = 'SYSTEM-BACKFILL',
    governance_updated_at = now()
WHERE is_active = true
  AND governance_status = 'DRAFT'
  AND confidence_status IN ('LEGAL_CONFIRMED','APPROVED');

UPDATE public.bn_eligibility_rule
SET governance_status = 'READY_FOR_PRODUCT_USE',
    governance_updated_by = 'SYSTEM-BACKFILL',
    governance_updated_at = now()
WHERE is_active = true
  AND governance_status = 'DRAFT'
  AND confidence_status = 'NEEDS_LEGAL_CONFIRMATION';
