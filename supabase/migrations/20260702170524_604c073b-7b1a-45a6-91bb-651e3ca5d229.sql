
-- ============================================================
-- EPIC-03A — Legal Intake & Qualification schema
-- ============================================================

-- 1) Extend lg_case_intake ----------------------------------------------------
ALTER TABLE public.lg_case_intake
  ADD COLUMN IF NOT EXISTS qualification_status       varchar(40)  NOT NULL DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS qualification_result       varchar(40),
  ADD COLUMN IF NOT EXISTS intake_officer_id          varchar(50),
  ADD COLUMN IF NOT EXISTS intake_officer_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS supervisor_required        boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supervisor_status          varchar(40),
  ADD COLUMN IF NOT EXISTS supervisor_by              varchar(50),
  ADD COLUMN IF NOT EXISTS supervisor_at              timestamptz,
  ADD COLUMN IF NOT EXISTS supervisor_remarks         text,
  ADD COLUMN IF NOT EXISTS financial_exposure         numeric(18,2),
  ADD COLUMN IF NOT EXISTS financial_principal        numeric(18,2),
  ADD COLUMN IF NOT EXISTS financial_interest         numeric(18,2),
  ADD COLUMN IF NOT EXISTS financial_penalty          numeric(18,2),
  ADD COLUMN IF NOT EXISTS financial_court_cost       numeric(18,2),
  ADD COLUMN IF NOT EXISTS financial_legal_cost       numeric(18,2),
  ADD COLUMN IF NOT EXISTS financial_previous_recovery numeric(18,2),
  ADD COLUMN IF NOT EXISTS financial_estimated_recovery numeric(18,2),
  ADD COLUMN IF NOT EXISTS financial_estimated_pct    numeric(6,2),
  ADD COLUMN IF NOT EXISTS financial_outstanding      numeric(18,2),
  ADD COLUMN IF NOT EXISTS arrangement_exists         boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settlement_exists          boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legal_issue                text,
  ADD COLUMN IF NOT EXISTS legal_basis                text,
  ADD COLUMN IF NOT EXISTS recovery_type              varchar(60),
  ADD COLUMN IF NOT EXISTS recommended_path           varchar(60),
  ADD COLUMN IF NOT EXISTS risk_level                 varchar(20),
  ADD COLUMN IF NOT EXISTS complexity                 varchar(20),
  ADD COLUMN IF NOT EXISTS urgency                    varchar(20),
  ADD COLUMN IF NOT EXISTS recommended_officer_id     varchar(50),
  ADD COLUMN IF NOT EXISTS internal_remarks           text,
  ADD COLUMN IF NOT EXISTS rejection_reason           text,
  ADD COLUMN IF NOT EXISTS returned_reason            text,
  ADD COLUMN IF NOT EXISTS mandatory_complete_flag    boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qualification_started_at   timestamptz,
  ADD COLUMN IF NOT EXISTS qualification_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS legal_referral_id          uuid;

CREATE INDEX IF NOT EXISTS idx_lg_intake_qual_status ON public.lg_case_intake(qualification_status);
CREATE INDEX IF NOT EXISTS idx_lg_intake_officer     ON public.lg_case_intake(intake_officer_id);
CREATE INDEX IF NOT EXISTS idx_lg_intake_ref         ON public.lg_case_intake(legal_referral_id);

-- 2) Checklist template -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_intake_checklist_template (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         varchar(80) NOT NULL UNIQUE,
  label        text        NOT NULL,
  category     varchar(60),
  mandatory    boolean     NOT NULL DEFAULT false,
  sort_order   integer     NOT NULL DEFAULT 100,
  active       boolean     NOT NULL DEFAULT true,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_intake_checklist_template TO authenticated;
GRANT ALL ON public.lg_intake_checklist_template TO service_role;

-- 3) Checklist responses ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_intake_checklist_response (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id         uuid NOT NULL REFERENCES public.lg_case_intake(id) ON DELETE CASCADE,
  template_item_id  uuid NOT NULL REFERENCES public.lg_intake_checklist_template(id) ON DELETE RESTRICT,
  status            varchar(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | COMPLETE | NA | FAILED
  remarks           text,
  completed_by      varchar(50),
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id, template_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_intake_checklist_response TO authenticated;
GRANT ALL ON public.lg_intake_checklist_response TO service_role;
CREATE INDEX IF NOT EXISTS idx_intake_check_resp_intake ON public.lg_intake_checklist_response(intake_id);

-- 4) Info requests ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_intake_info_request (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id           uuid NOT NULL REFERENCES public.lg_case_intake(id) ON DELETE CASCADE,
  recipient           text NOT NULL,
  recipient_type      varchar(40),
  department          varchar(80),
  information_requested text NOT NULL,
  reason              text,
  due_date            date,
  reminder_date       date,
  status              varchar(20) NOT NULL DEFAULT 'OPEN',  -- OPEN | RESPONDED | CANCELLED | OVERDUE
  response_received_at timestamptz,
  response_text       text,
  requested_by        varchar(50),
  requested_at        timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_intake_info_request TO authenticated;
GRANT ALL ON public.lg_intake_info_request TO service_role;
CREATE INDEX IF NOT EXISTS idx_intake_info_req_intake ON public.lg_intake_info_request(intake_id);
CREATE INDEX IF NOT EXISTS idx_intake_info_req_status ON public.lg_intake_info_request(status);

-- 5) Decision audit -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_intake_decision_audit (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id    uuid NOT NULL REFERENCES public.lg_case_intake(id) ON DELETE CASCADE,
  actor        varchar(50),
  action       varchar(60) NOT NULL,
  old_value    jsonb,
  new_value    jsonb,
  remarks      text,
  performed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.lg_intake_decision_audit TO authenticated;
GRANT ALL ON public.lg_intake_decision_audit TO service_role;
CREATE INDEX IF NOT EXISTS idx_intake_audit_intake ON public.lg_intake_decision_audit(intake_id, performed_at DESC);

-- 6) Seed the default checklist ----------------------------------------------
INSERT INTO public.lg_intake_checklist_template (code, label, category, mandatory, sort_order) VALUES
  ('MANDATORY_REFERRAL_INFO',   'Mandatory referral information received', 'Intake',      true,  10),
  ('EMPLOYER_IDENTIFIED',       'Employer identified',                     'Party',       true,  20),
  ('IP_IDENTIFIED',             'Insured Person identified',               'Party',       false, 30),
  ('OUTSTANDING_VERIFIED',      'Outstanding amount verified',             'Financial',   true,  40),
  ('SUPPORTING_DOCS_RECEIVED',  'Supporting documents received',           'Documents',   true,  50),
  ('LEGAL_JURISDICTION',        'Legal jurisdiction confirmed',            'Legal',       true,  60),
  ('LIMITATION_CHECKED',        'Limitation period checked',               'Legal',       true,  70),
  ('DUPLICATE_CHECKED',         'Duplicate referral checked',              'Governance',  true,  80),
  ('PRIOR_MATTERS_REVIEWED',    'Previous legal matters reviewed',         'Governance',  false, 90),
  ('COMPLIANCE_REVIEWED',       'Compliance review completed',             'Cross-Dept',  false, 100),
  ('BENEFITS_REVIEWED',         'Benefits review completed',               'Cross-Dept',  false, 110),
  ('FINANCIAL_EXPOSURE_VERIFIED','Financial exposure verified',            'Financial',   true,  120),
  ('RECOVERY_PATHWAY',          'Recovery pathway identified',             'Legal',       true,  130)
ON CONFLICT (code) DO NOTHING;

-- 7) Gate case creation from intake -----------------------------------------
CREATE OR REPLACE FUNCTION public.lg_case_intake_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status varchar(40);
BEGIN
  IF NEW.source_intake_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT qualification_status INTO v_status
    FROM public.lg_case_intake
   WHERE id = NEW.source_intake_id;
  IF v_status IS NULL THEN
    RETURN NEW;
  END IF;
  IF v_status NOT IN ('APPROVED','CONVERTED_TO_CASE') THEN
    RAISE EXCEPTION 'Legal Case cannot be created — intake % is % (must be APPROVED).', NEW.source_intake_id, v_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lg_case_intake_gate ON public.lg_case;
CREATE TRIGGER trg_lg_case_intake_gate
BEFORE INSERT ON public.lg_case
FOR EACH ROW EXECUTE FUNCTION public.lg_case_intake_gate();

-- 8) Atomic RPC to create case from intake -----------------------------------
CREATE OR REPLACE FUNCTION public.lg_create_case_from_intake(
  p_intake_id uuid,
  p_actor     varchar(50)
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_intake   public.lg_case_intake%ROWTYPE;
  v_missing  int;
  v_case_id  uuid;
  v_case_no  text;
BEGIN
  SELECT * INTO v_intake FROM public.lg_case_intake WHERE id = p_intake_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Intake % not found', p_intake_id; END IF;

  IF v_intake.qualification_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Intake must be APPROVED before case creation (current: %)', v_intake.qualification_status;
  END IF;

  -- Mandatory checklist gate
  SELECT count(*) INTO v_missing
    FROM public.lg_intake_checklist_template t
    LEFT JOIN public.lg_intake_checklist_response r
      ON r.template_item_id = t.id AND r.intake_id = p_intake_id
   WHERE t.mandatory = true AND t.active = true
     AND (r.status IS NULL OR r.status NOT IN ('COMPLETE','NA'));
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'Cannot create case: % mandatory checklist items outstanding', v_missing;
  END IF;

  -- Assessments gate
  IF v_intake.financial_exposure IS NULL AND v_intake.financial_outstanding IS NULL THEN
    RAISE EXCEPTION 'Financial assessment incomplete';
  END IF;
  IF v_intake.legal_issue IS NULL OR v_intake.recovery_type IS NULL THEN
    RAISE EXCEPTION 'Legal assessment incomplete';
  END IF;

  -- Supervisor approval
  IF v_intake.supervisor_required AND coalesce(v_intake.supervisor_status,'') <> 'APPROVED' THEN
    RAISE EXCEPTION 'Supervisor approval required and not granted';
  END IF;

  v_case_no := 'LC-' || to_char(now(),'YYYY') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);

  INSERT INTO public.lg_case(
    case_no, country_code, matter_type_code, case_type_code,
    primary_entity_type, primary_entity_id,
    legal_status, case_stage, priority_code,
    exposure_amount, source_intake_id, source_module,
    opened_date, created_at, updated_at, created_by
  ) VALUES (
    v_case_no, coalesce(v_intake.country_code,'SKN'),
    v_intake.matter_type_code, coalesce(v_intake.recommended_case_type_code, v_intake.matter_type_code),
    v_intake.primary_entity_type, v_intake.primary_entity_id,
    'OPEN','INTAKE', coalesce(v_intake.priority_code,'MEDIUM'),
    coalesce(v_intake.financial_exposure, v_intake.exposure_amount),
    p_intake_id, v_intake.source_module,
    current_date, now(), now(), p_actor
  ) RETURNING id INTO v_case_id;

  UPDATE public.lg_case_intake
     SET qualification_status = 'CONVERTED_TO_CASE',
         qualification_result = 'CONVERTED',
         lg_case_id = v_case_id,
         qualification_completed_at = now(),
         updated_at = now()
   WHERE id = p_intake_id;

  IF v_intake.legal_referral_id IS NOT NULL THEN
    UPDATE public.legal_referral
       SET status = 'LEGAL_CASE_CREATED', legal_case_id = v_case_id, last_status_at = now(), updated_at = now()
     WHERE id = v_intake.legal_referral_id;
  END IF;

  INSERT INTO public.lg_intake_decision_audit(intake_id, actor, action, new_value)
  VALUES (p_intake_id, p_actor, 'CONVERTED_TO_CASE', jsonb_build_object('case_id', v_case_id, 'case_no', v_case_no));

  RETURN v_case_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lg_create_case_from_intake(uuid, varchar) TO authenticated, service_role;
