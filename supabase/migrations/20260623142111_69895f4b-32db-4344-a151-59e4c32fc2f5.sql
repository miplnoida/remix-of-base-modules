
-- ============================================================
-- Legal Module: Court Configuration Framework + Proceedings
-- + Payment Arrangement Linking enhancements + Templates seed
-- NO RLS (per project NO-RLS architecture)
-- ============================================================

-- 1. COURT MASTER ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_court (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_code varchar(50) NOT NULL UNIQUE,
  court_name varchar(200) NOT NULL,
  court_type varchar(30) NOT NULL CHECK (court_type IN ('MAGISTRATE','HIGH_COURT','COURT_OF_APPEAL','OTHER')),
  island varchar(20) NOT NULL CHECK (island IN ('ST_KITTS','NEVIS')),
  country_code varchar(5) NOT NULL DEFAULT 'SKN',
  case_number_format_hint varchar(200),
  case_number_min_length int DEFAULT 1,
  case_number_max_length int DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  created_by varchar(50),
  updated_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_court TO authenticated, anon;
GRANT ALL ON public.lg_court TO service_role;

-- 2. COURT DIVISION ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_court_division (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_code varchar(50) NOT NULL UNIQUE,
  court_code varchar(50) NOT NULL REFERENCES public.lg_court(court_code) ON DELETE CASCADE,
  division_name varchar(200) NOT NULL,
  civil_criminal_type varchar(20) CHECK (civil_criminal_type IN ('CIVIL','CRIMINAL','BOTH')),
  district_code varchar(20),
  active boolean NOT NULL DEFAULT true,
  created_by varchar(50),
  updated_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_court_division TO authenticated, anon;
GRANT ALL ON public.lg_court_division TO service_role;

-- 3. COURT VENUE ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_court_venue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_code varchar(50) NOT NULL UNIQUE,
  court_code varchar(50) NOT NULL REFERENCES public.lg_court(court_code) ON DELETE CASCADE,
  venue_name varchar(200) NOT NULL,
  address text,
  island varchar(20) CHECK (island IN ('ST_KITTS','NEVIS')),
  active boolean NOT NULL DEFAULT true,
  created_by varchar(50),
  updated_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_court_venue TO authenticated, anon;
GRANT ALL ON public.lg_court_venue TO service_role;

-- 4. COURT OFFICER (Judge/Magistrate/Registrar/Clerk) ------------
CREATE TABLE IF NOT EXISTS public.lg_court_officer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_code varchar(50) NOT NULL UNIQUE,
  officer_name varchar(200) NOT NULL,
  officer_type varchar(20) NOT NULL CHECK (officer_type IN ('MAGISTRATE','JUDGE','REGISTRAR','CLERK','OTHER')),
  court_code varchar(50) REFERENCES public.lg_court(court_code) ON DELETE SET NULL,
  active_from date,
  active_to date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by varchar(50),
  updated_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_court_officer TO authenticated, anon;
GRANT ALL ON public.lg_court_officer TO service_role;

-- 5. COURT PROCEEDING -------------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_court_proceeding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id uuid REFERENCES public.lg_case(id) ON DELETE CASCADE,
  proceeding_type varchar(40) NOT NULL CHECK (proceeding_type IN
    ('SUIT','JUDGMENT_SUMMONS','WRIT_OF_EXECUTION','WARRANT_COMMITMENT','APPEAL','OTHER')),
  court_code varchar(50) REFERENCES public.lg_court(court_code),
  division_code varchar(50) REFERENCES public.lg_court_division(division_code),
  venue_code varchar(50) REFERENCES public.lg_court_venue(venue_code),
  island varchar(20),
  court_reference_no varchar(50),                -- manually entered
  related_previous_court_reference_no varchar(50),
  filing_date date,
  hearing_date date,
  outcome text,
  judgment_amount numeric(18,2),
  cost_amount numeric(18,2),
  installment_amount numeric(18,2),
  default_consequence text,
  status varchar(40) DEFAULT 'DRAFT',
  presiding_officer_code varchar(50) REFERENCES public.lg_court_officer(officer_code),
  notes text,
  created_by varchar(50),
  updated_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_court_proceeding TO authenticated, anon;
GRANT ALL ON public.lg_court_proceeding TO service_role;
CREATE INDEX IF NOT EXISTS idx_lg_court_proceeding_case ON public.lg_court_proceeding(lg_case_id);
CREATE INDEX IF NOT EXISTS idx_lg_court_proceeding_court ON public.lg_court_proceeding(court_code);

-- 6. PAYMENT ARRANGEMENT LINK -----------------------------------
-- Extend existing lg_payment_arrangement_link with action/proceeding/reference/amount
ALTER TABLE public.lg_payment_arrangement_link
  ADD COLUMN IF NOT EXISTS lg_action_id uuid,
  ADD COLUMN IF NOT EXISTS lg_court_proceeding_id uuid REFERENCES public.lg_court_proceeding(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_reference_no varchar(100),
  ADD COLUMN IF NOT EXISTS amount_covered numeric(18,2),
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_lg_pal_proceeding ON public.lg_payment_arrangement_link(lg_court_proceeding_id);
CREATE INDEX IF NOT EXISTS idx_lg_pal_arrangement ON public.lg_payment_arrangement_link(payment_arrangement_id);

-- 7. updated_at trigger -----------------------------------------
CREATE OR REPLACE FUNCTION public.lg_court_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['lg_court','lg_court_division','lg_court_venue','lg_court_officer','lg_court_proceeding']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON public.%s', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.lg_court_set_updated_at()', t, t);
  END LOOP;
END $$;

-- 8. SEED SKN COURTS --------------------------------------------
INSERT INTO public.lg_court (court_code, court_name, court_type, island, case_number_format_hint) VALUES
  ('MC-BAS', 'Basseterre Magistrate Court', 'MAGISTRATE', 'ST_KITTS', 'e.g. SUIT-####/YYYY'),
  ('MC-NEV', 'Nevis Magistrate Court', 'MAGISTRATE', 'NEVIS', 'e.g. NEV-SUIT-####/YYYY'),
  ('HC-SKN', 'Eastern Caribbean Supreme Court / High Court, St. Kitts', 'HIGH_COURT', 'ST_KITTS', 'e.g. SKBHCV####/YYYY')
ON CONFLICT (court_code) DO NOTHING;

INSERT INTO public.lg_court_division (division_code, court_code, division_name, civil_criminal_type, district_code) VALUES
  ('MC-BAS-A', 'MC-BAS', 'Basseterre Magistrate Court - District A', 'BOTH', 'A'),
  ('MC-BAS-B', 'MC-BAS', 'Basseterre Magistrate Court - District B', 'BOTH', 'B'),
  ('MC-NEV-C', 'MC-NEV', 'Nevis Magistrate Court - District C', 'BOTH', 'C'),
  ('HC-SKN-CIV', 'HC-SKN', 'High Court - Civil Division', 'CIVIL', NULL),
  ('HC-SKN-CRM', 'HC-SKN', 'High Court - Criminal Division', 'CRIMINAL', NULL)
ON CONFLICT (division_code) DO NOTHING;

INSERT INTO public.lg_court_venue (venue_code, court_code, venue_name, address, island) VALUES
  ('V-MC-BAS', 'MC-BAS', 'Basseterre Magistrate Court House', 'Cayon Street, Basseterre, St. Kitts', 'ST_KITTS'),
  ('V-MC-NEV', 'MC-NEV', 'Charlestown Magistrate Court House', 'Government Road, Charlestown, Nevis', 'NEVIS'),
  ('V-HC-SKN', 'HC-SKN', 'High Court, Basseterre', 'Independence Square, Basseterre, St. Kitts', 'ST_KITTS')
ON CONFLICT (venue_code) DO NOTHING;

-- Seed officer placeholders (configurable, not hardcoded names tied to logic)
INSERT INTO public.lg_court_officer (officer_code, officer_name, officer_type, court_code, active_from) VALUES
  ('MAG-BAS-A', 'Magistrate - District A (SEED)', 'MAGISTRATE', 'MC-BAS', CURRENT_DATE),
  ('MAG-BAS-B', 'Magistrate - District B (SEED)', 'MAGISTRATE', 'MC-BAS', CURRENT_DATE),
  ('MAG-NEV-C', 'Magistrate - District C (SEED)', 'MAGISTRATE', 'MC-NEV', CURRENT_DATE),
  ('JUDGE-HC-SKN', 'High Court Judge (SEED)', 'JUDGE', 'HC-SKN', CURRENT_DATE),
  ('REG-HC-SKN', 'High Court Registrar (SEED)', 'REGISTRAR', 'HC-SKN', CURRENT_DATE)
ON CONFLICT (officer_code) DO NOTHING;

-- 9. SEED LEGAL TEMPLATES ---------------------------------------
INSERT INTO public.legal_templates (name, type, description, content, status, version, is_active)
SELECT v.name, v.type, v.description, v.content, 'PUBLISHED', 1, true
FROM (VALUES
  ('Demand Letter', 'DEMAND_LETTER', 'Initial demand for outstanding contributions',
    '<p><strong>Demand Letter</strong></p><p>Dear {{employer_name}},</p><p>Our records show outstanding contributions of {{amount_outstanding}} as at {{as_of_date}}. Please remit within {{days_to_pay}} days.</p><p>Reference: {{internal_case_no}}</p>'),
  ('Final Demand Letter', 'FINAL_DEMAND_LETTER', 'Final notice before legal action',
    '<p><strong>FINAL DEMAND</strong></p><p>Dear {{employer_name}},</p><p>This is your final demand for {{amount_outstanding}}. Failure to remit by {{deadline_date}} will result in legal proceedings.</p>'),
  ('Agreement / Payment Arrangement Letter', 'PAYMENT_ARRANGEMENT_LETTER', 'Confirms a payment arrangement',
    '<p><strong>Payment Arrangement Confirmation</strong></p><p>Arrangement: {{arrangement_no}} | Total: {{total_amount}} | Installment: {{installment_amount}} {{frequency}} starting {{start_date}}.</p>'),
  ('Adjournment Letter', 'ADJOURNMENT_LETTER', 'Notice of court adjournment',
    '<p>The matter {{court_reference_no}} has been adjourned to {{new_hearing_date}}.</p>'),
  ('Judgment Letter', 'JUDGMENT_LETTER', 'Communicates judgment outcome',
    '<p>Judgment in matter {{court_reference_no}}: {{judgment_amount}} plus costs {{cost_amount}}.</p>'),
  ('Summons to Appear', 'SUMMONS_APPEAR', 'Summons defendant to court',
    '<p>You are summoned to appear before {{court_name}} on {{hearing_date}} at {{venue_name}}.</p>'),
  ('Judgment Summons', 'JUDGMENT_SUMMONS', 'Judgment summons document',
    '<p>JUDGMENT SUMMONS - {{court_reference_no}} - Debtor {{employer_name}} - Amount {{judgment_amount}}.</p>'),
  ('Writ of Execution', 'WRIT_EXECUTION', 'Writ of execution',
    '<p>WRIT OF EXECUTION issued under {{court_reference_no}} for sum {{judgment_amount}}.</p>'),
  ('Warrant / Commitment', 'WARRANT_COMMITMENT', 'Warrant of commitment',
    '<p>WARRANT OF COMMITMENT - Defendant {{defendant_name}} - Reference {{court_reference_no}}.</p>'),
  ('Court Order Recording Notice', 'COURT_ORDER_NOTICE', 'Records a court order',
    '<p>NOTICE OF COURT ORDER recorded for matter {{court_reference_no}} dated {{order_date}}.</p>'),
  ('Settlement Confirmation', 'SETTLEMENT_CONFIRMATION', 'Confirms a settlement',
    '<p>Settlement confirmed for matter {{internal_case_no}} on {{settlement_date}} for {{settlement_amount}}.</p>'),
  ('Payment Default Notice', 'PAYMENT_DEFAULT_NOTICE', 'Notice of payment default',
    '<p>Payment default on arrangement {{arrangement_no}} - missed installment due {{due_date}}.</p>'),
  ('Enforcement Notice', 'ENFORCEMENT_NOTICE', 'Enforcement notification',
    '<p>ENFORCEMENT NOTICE - {{court_reference_no}} - Action {{enforcement_action}}.</p>'),
  ('Case Closure Letter', 'CASE_CLOSURE', 'Confirms case closure',
    '<p>Case {{internal_case_no}} has been closed on {{closure_date}}. Reason: {{closure_reason}}.</p>'),
  ('Request for Information from Source Department', 'REQUEST_INFO_SOURCE', 'Information request to source department',
    '<p>REQUEST FOR INFORMATION - Case {{internal_case_no}} - Source: {{source_module}} {{source_reference_no}}.</p>')
) AS v(name, type, description, content)
WHERE NOT EXISTS (SELECT 1 FROM public.legal_templates lt WHERE lt.name = v.name);
