
CREATE TABLE IF NOT EXISTS public.ce_legal_handoff_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  integration_mode text NOT NULL DEFAULT 'MANUAL' CHECK (integration_mode IN ('DISABLED','MANUAL','INTEGRATED')),
  required_notice_count int NOT NULL DEFAULT 1,
  days_after_final_notice int NOT NULL DEFAULT 0,
  min_outstanding_amount numeric NOT NULL DEFAULT 0,
  min_severity text,
  require_repeat_default boolean NOT NULL DEFAULT false,
  require_arrangement_breach boolean NOT NULL DEFAULT false,
  required_evidence text[] NOT NULL DEFAULT '{}',
  employer_response_window_days int NOT NULL DEFAULT 0,
  applicable_funds text[] NOT NULL DEFAULT '{}',
  applicable_violation_type_ids uuid[] NOT NULL DEFAULT '{}',
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_by varchar(50),
  updated_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ce_legal_pack_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.ce_legal_referrals(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_label text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  is_satisfied boolean NOT NULL DEFAULT false,
  satisfied_by varchar(50),
  satisfied_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referral_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_ce_legal_pack_items_referral ON public.ce_legal_pack_items(referral_id);

CREATE TABLE IF NOT EXISTS public.ce_legal_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.ce_legal_referrals(id) ON DELETE CASCADE,
  returned_at timestamptz NOT NULL DEFAULT now(),
  returned_by varchar(50),
  reason text NOT NULL,
  required_action text,
  resolution_status text NOT NULL DEFAULT 'OPEN' CHECK (resolution_status IN ('OPEN','IN_PROGRESS','RESOLVED','CANCELLED')),
  resolved_at timestamptz,
  resolved_by varchar(50),
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_legal_returns_referral ON public.ce_legal_returns(referral_id);
CREATE INDEX IF NOT EXISTS idx_ce_legal_returns_status ON public.ce_legal_returns(resolution_status);

-- Seed a default handoff rule (MANUAL mode) if none exist
INSERT INTO public.ce_legal_handoff_rules (code, name, description, integration_mode, required_notice_count, days_after_final_notice, min_outstanding_amount, require_repeat_default, require_arrangement_breach, required_evidence, employer_response_window_days, created_by, updated_by)
SELECT 'DEFAULT', 'Default Legal Handoff Policy', 'Default eligibility rule used when no fund/severity-specific rule matches.', 'MANUAL', 2, 14, 1000, false, false, ARRAY['NOTICES','DELIVERY_PROOF','CASE_SUMMARY']::text[], 14, 'SYSTEM', 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM public.ce_legal_handoff_rules);
