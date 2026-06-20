
CREATE TABLE IF NOT EXISTS public.lg_fee_waiver_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code varchar(80) NOT NULL UNIQUE,
  policy_name varchar(200) NOT NULL,
  country_code varchar(10),
  fee_head_id uuid REFERENCES public.tb_income_codes(id),
  case_type_code varchar(40),
  max_waiver_amount_without_approval numeric(18,2) NOT NULL DEFAULT 0,
  max_waiver_percent_without_approval numeric(8,4) NOT NULL DEFAULT 0,
  approval_required boolean NOT NULL DEFAULT true,
  approval_route_code varchar(80),
  min_approvers integer NOT NULL DEFAULT 1,
  allow_self_approval boolean NOT NULL DEFAULT false,
  requires_reason boolean NOT NULL DEFAULT true,
  requires_document boolean NOT NULL DEFAULT false,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','DRAFT')),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  notes text,
  created_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(50),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_fee_waiver_policy TO authenticated;
GRANT ALL ON public.lg_fee_waiver_policy TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_fee_waiver_policy_tier (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.lg_fee_waiver_policy(id) ON DELETE CASCADE,
  tier_order integer NOT NULL DEFAULT 1,
  min_amount numeric(18,2),
  max_amount numeric(18,2),
  min_percent numeric(8,4),
  max_percent numeric(8,4),
  approver_role_type varchar(40),
  workbasket_code varchar(80),
  requires_finance boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_id, tier_order)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_fee_waiver_policy_tier TO authenticated;
GRANT ALL ON public.lg_fee_waiver_policy_tier TO service_role;
CREATE INDEX IF NOT EXISTS idx_lg_waiver_tier_policy ON public.lg_fee_waiver_policy_tier(policy_id);

ALTER TABLE public.lg_fee_rule
  ADD COLUMN IF NOT EXISTS waiver_policy_id uuid REFERENCES public.lg_fee_waiver_policy(id);

ALTER TABLE public.lg_fee_charge
  ADD COLUMN IF NOT EXISTS posting_status varchar(20) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_by varchar(50),
  ADD COLUMN IF NOT EXISTS employer_account_transaction_id uuid REFERENCES public.ce_employer_financial_ledger(id),
  ADD COLUMN IF NOT EXISTS reversal_ledger_entry_id uuid REFERENCES public.ce_employer_financial_ledger(id),
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_by varchar(50);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lg_fee_charge_posting_status_chk') THEN
    ALTER TABLE public.lg_fee_charge ADD CONSTRAINT lg_fee_charge_posting_status_chk
      CHECK (posting_status IN ('DRAFT','PENDING','PENDING_POST','POSTED','REVERSED','CANCELLED'));
  END IF;
END $$;

ALTER TABLE public.lg_fee_waiver
  ADD COLUMN IF NOT EXISTS lg_case_id uuid REFERENCES public.lg_case(id),
  ADD COLUMN IF NOT EXISTS policy_id uuid REFERENCES public.lg_fee_waiver_policy(id),
  ADD COLUMN IF NOT EXISTS requested_waiver_amount numeric(18,2),
  ADD COLUMN IF NOT EXISTS requested_waiver_percent numeric(8,4),
  ADD COLUMN IF NOT EXISTS justification text,
  ADD COLUMN IF NOT EXISTS supporting_document_id uuid REFERENCES public.lg_document_link(id),
  ADD COLUMN IF NOT EXISTS workflow_instance_id uuid,
  ADD COLUMN IF NOT EXISTS rejected_by varchar(50),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by varchar(50),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS requires_finance_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finance_approved_by varchar(50),
  ADD COLUMN IF NOT EXISTS finance_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approver_role_type varchar(40),
  ADD COLUMN IF NOT EXISTS workbasket_code varchar(80);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lg_fee_waiver_approval_status_check') THEN
    ALTER TABLE public.lg_fee_waiver DROP CONSTRAINT lg_fee_waiver_approval_status_check;
  END IF;
END $$;
ALTER TABLE public.lg_fee_waiver
  ADD CONSTRAINT lg_fee_waiver_approval_status_check
  CHECK (approval_status IN ('DRAFT','PENDING','SUBMITTED','APPROVED','REJECTED','CANCELLED','AUTO_APPROVED'));

CREATE INDEX IF NOT EXISTS idx_lg_fee_waiver_case ON public.lg_fee_waiver(lg_case_id);
CREATE INDEX IF NOT EXISTS idx_lg_fee_charge_posting ON public.lg_fee_charge(posting_status);

DROP TRIGGER IF EXISTS trg_lg_fee_waiver_policy_updated ON public.lg_fee_waiver_policy;
CREATE TRIGGER trg_lg_fee_waiver_policy_updated BEFORE UPDATE ON public.lg_fee_waiver_policy
  FOR EACH ROW EXECUTE FUNCTION public.lg_fee_set_updated_at();

INSERT INTO public.core_reference_group (group_code, group_name, module_code, is_active)
SELECT 'LG_WORKBASKET', 'Legal Workbasket', 'LEGAL', true
WHERE NOT EXISTS (SELECT 1 FROM public.core_reference_group WHERE group_code='LG_WORKBASKET');

INSERT INTO public.app_modules (id, name, display_name, route, parent_id, sort_order, is_enabled, icon, description, show_in_menu)
SELECT '1e9a1000-0000-0000-0000-000000000003'::uuid, 'lg_admin_waiver_policy', 'Waiver Policies', '/legal/admin/waiver-policies',
  '1e9a1000-0000-0000-0000-000000000001'::uuid, 30, true, 'ShieldCheck', 'Legal Fee Waiver Approval Policies', true
WHERE NOT EXISTS (SELECT 1 FROM public.app_modules WHERE name='lg_admin_waiver_policy');

INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted, created_by)
SELECT rp.role_id,
       (SELECT id FROM public.app_modules WHERE name='lg_admin_waiver_policy'),
       rp.action_id, true, rp.created_by
FROM public.role_permissions rp
JOIN public.app_modules m ON m.id = rp.module_id
WHERE m.name='lg_admin' AND rp.is_granted = true
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp2
    JOIN public.app_modules m2 ON m2.id = rp2.module_id
    WHERE m2.name='lg_admin_waiver_policy' AND rp2.role_id = rp.role_id AND rp2.action_id = rp.action_id
  );
