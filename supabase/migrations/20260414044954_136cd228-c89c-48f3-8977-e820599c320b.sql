-- =============================================
-- Legal Recommendations table
-- =============================================
CREATE TABLE public.ce_legal_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id TEXT NOT NULL,
  employer_name TEXT NOT NULL,
  employer_zone TEXT,
  risk_band TEXT,
  risk_score NUMERIC DEFAULT 0,
  qualifying_case_ids JSONB DEFAULT '[]'::jsonb,
  subcase_summary JSONB DEFAULT '[]'::jsonb,
  total_principal NUMERIC DEFAULT 0,
  total_penalties NUMERIC DEFAULT 0,
  total_interest NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  triggered_rules JSONB DEFAULT '[]'::jsonb,
  recommended_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (status IN ('PENDING_REVIEW','APPROVED_FOR_REFERRAL','REFERRAL_CREATED','REJECTED')),
  reviewed_by TEXT,
  reviewed_date TIMESTAMPTZ,
  review_notes TEXT,
  legal_referral_id UUID,
  created_by TEXT DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate active recommendations for the same employer
CREATE UNIQUE INDEX idx_ce_legal_rec_active_employer
  ON public.ce_legal_recommendations (employer_id)
  WHERE status IN ('PENDING_REVIEW', 'APPROVED_FOR_REFERRAL');

CREATE INDEX idx_ce_legal_rec_status ON public.ce_legal_recommendations (status);
CREATE INDEX idx_ce_legal_rec_employer ON public.ce_legal_recommendations (employer_id);

-- =============================================
-- Legal Referrals table
-- =============================================
CREATE TABLE public.ce_legal_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_number TEXT NOT NULL UNIQUE,
  recommendation_id UUID REFERENCES public.ce_legal_recommendations(id),
  employer_id TEXT NOT NULL,
  employer_name TEXT NOT NULL,
  employer_zone TEXT,
  total_principal NUMERIC DEFAULT 0,
  total_penalties NUMERIC DEFAULT 0,
  total_interest NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  period_from TEXT,
  period_to TEXT,
  periods_count INT DEFAULT 0,
  compliance_history TEXT,
  notices_sent INT DEFAULT 0,
  last_notice_date DATE,
  payment_plan_history TEXT,
  audit_findings TEXT,
  contact_attempts TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SUBMITTED_TO_LEGAL','ACCEPTED_BY_LEGAL','REJECTED','IN_LEGAL_PROCEEDINGS','CLOSED')),
  submitted_date TIMESTAMPTZ,
  accepted_date TIMESTAMPTZ,
  accepted_by TEXT,
  rejected_date TIMESTAMPTZ,
  rejected_by TEXT,
  rejection_reason TEXT,
  legal_case_id UUID,
  court_case_number TEXT,
  legal_officer_assigned TEXT,
  created_by TEXT DEFAULT 'SYSTEM',
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ce_legal_ref_status ON public.ce_legal_referrals (status);
CREATE INDEX idx_ce_legal_ref_employer ON public.ce_legal_referrals (employer_id);

-- =============================================
-- Legal Referral Lines table
-- =============================================
CREATE TABLE public.ce_legal_referral_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.ce_legal_referrals(id) ON DELETE CASCADE,
  case_id TEXT,
  case_number TEXT,
  case_type TEXT,
  period_from TEXT,
  period_to TEXT,
  principal_amount NUMERIC DEFAULT 0,
  penalty_amount NUMERIC DEFAULT 0,
  interest_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  line_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ce_legal_ref_lines_referral ON public.ce_legal_referral_lines (referral_id);

-- =============================================
-- Sequence for referral numbers
-- =============================================
CREATE SEQUENCE IF NOT EXISTS ce_legal_referral_seq START WITH 1;

-- =============================================
-- RPC: Generate recommendations from real compliance data
-- Evaluates active escalation policy rules against employer facts
-- =============================================
CREATE OR REPLACE FUNCTION public.fn_ce_generate_legal_recommendations(p_created_by TEXT DEFAULT 'SYSTEM')
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy_id UUID;
  v_count INT := 0;
  v_rule RECORD;
  v_emp RECORD;
  v_matched BOOLEAN;
  v_triggered JSONB;
  v_cases JSONB;
  v_case_ids JSONB;
  v_totals RECORD;
BEGIN
  -- Get active policy
  SELECT id INTO v_policy_id
  FROM ce_legal_escalation_policies
  WHERE is_active = true
  LIMIT 1;

  IF v_policy_id IS NULL THEN
    RETURN 0;
  END IF;

  -- For each employer with active compliance cases
  FOR v_emp IN
    SELECT DISTINCT
      cc.employer_id,
      cc.employer_name,
      COALESCE(z.zone_name, 'Unassigned') AS employer_zone,
      COALESCE(rp.risk_band, 'LOW') AS risk_band,
      COALESCE(rp.risk_score, 0) AS risk_score
    FROM ce_cases cc
    LEFT JOIN ce_risk_profiles rp ON rp.employer_id = cc.employer_id
    LEFT JOIN ce_zones z ON z.id = rp.zone_id
    WHERE cc.status NOT IN ('CLOSED', 'CANCELLED', 'RESOLVED')
      AND cc.employer_id IS NOT NULL
      -- Skip employers with existing active recommendation
      AND NOT EXISTS (
        SELECT 1 FROM ce_legal_recommendations lr
        WHERE lr.employer_id = cc.employer_id
          AND lr.status IN ('PENDING_REVIEW', 'APPROVED_FOR_REFERRAL')
      )
  LOOP
    v_triggered := '[]'::jsonb;

    -- Evaluate each enabled rule
    FOR v_rule IN
      SELECT * FROM ce_legal_escalation_policy_rules
      WHERE policy_id = v_policy_id AND is_enabled = true
      ORDER BY priority
    LOOP
      v_matched := false;

      -- AGE_THRESHOLD: check oldest open case age
      IF v_rule.rule_type = 'AGE_THRESHOLD' AND v_rule.age_days_overdue IS NOT NULL THEN
        PERFORM 1 FROM ce_cases
        WHERE employer_id = v_emp.employer_id
          AND status NOT IN ('CLOSED','CANCELLED','RESOLVED')
          AND created_at < now() - (v_rule.age_days_overdue || ' days')::interval;
        IF FOUND THEN v_matched := true; END IF;
      END IF;

      -- AMOUNT_THRESHOLD: check total amount
      IF v_rule.rule_type = 'AMOUNT_THRESHOLD' AND v_rule.total_arrears_threshold IS NOT NULL THEN
        PERFORM 1 FROM (
          SELECT SUM(COALESCE(total_amount, 0)) AS total
          FROM ce_cases
          WHERE employer_id = v_emp.employer_id
            AND status NOT IN ('CLOSED','CANCELLED','RESOLVED')
        ) t WHERE t.total >= v_rule.total_arrears_threshold;
        IF FOUND THEN v_matched := true; END IF;
      END IF;

      -- BEHAVIOUR_THRESHOLD: notices no response
      IF v_rule.rule_type = 'BEHAVIOUR_THRESHOLD' AND v_rule.notices_sent_minimum IS NOT NULL THEN
        PERFORM 1 FROM (
          SELECT COUNT(*) AS cnt FROM ce_notices
          WHERE employer_id = v_emp.employer_id
            AND status IN ('SENT','DELIVERED')
            AND sent_date < now() - COALESCE(v_rule.no_response_days, 60) * INTERVAL '1 day'
        ) t WHERE t.cnt >= v_rule.notices_sent_minimum;
        IF FOUND THEN v_matched := true; END IF;
      END IF;

      -- BEHAVIOUR_THRESHOLD: payment plan breaches
      IF v_rule.rule_type = 'BEHAVIOUR_THRESHOLD' AND v_rule.payment_plan_breaches_count IS NOT NULL THEN
        PERFORM 1 FROM (
          SELECT COUNT(*) AS cnt FROM ce_payment_arrangements
          WHERE employer_id = v_emp.employer_id
            AND status IN ('BREACHED','DEFAULTED')
        ) t WHERE t.cnt >= v_rule.payment_plan_breaches_count;
        IF FOUND THEN v_matched := true; END IF;
      END IF;

      -- RISK_THRESHOLD
      IF v_rule.rule_type = 'RISK_THRESHOLD' AND v_rule.risk_score_minimum IS NOT NULL THEN
        IF v_emp.risk_score >= v_rule.risk_score_minimum THEN
          v_matched := true;
        END IF;
      END IF;

      IF v_matched THEN
        v_triggered := v_triggered || jsonb_build_array(jsonb_build_object(
          'ruleId', v_rule.id,
          'ruleName', v_rule.rule_name,
          'reason', COALESCE(v_rule.description, v_rule.rule_name)
        ));
      END IF;
    END LOOP;

    -- If at least one rule matched, create recommendation
    IF jsonb_array_length(v_triggered) > 0 THEN
      -- Gather case details
      SELECT
        COALESCE(jsonb_agg(jsonb_build_object(
          'subcaseId', id::text,
          'caseNumber', COALESCE(case_number, ''),
          'caseType', COALESCE(case_type, ''),
          'periodFrom', '',
          'periodTo', '',
          'principalAmount', COALESCE(total_amount, 0),
          'penaltyAmount', COALESCE(penalty_amount, 0),
          'interestAmount', COALESCE(interest_amount, 0),
          'totalAmount', COALESCE(total_amount, 0) + COALESCE(penalty_amount, 0) + COALESCE(interest_amount, 0)
        )), '[]'::jsonb),
        COALESCE(jsonb_agg(to_jsonb(id::text)), '[]'::jsonb)
      INTO v_cases, v_case_ids
      FROM ce_cases
      WHERE employer_id = v_emp.employer_id
        AND status NOT IN ('CLOSED','CANCELLED','RESOLVED');

      SELECT
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(penalty_amount), 0),
        COALESCE(SUM(interest_amount), 0)
      INTO v_totals
      FROM ce_cases
      WHERE employer_id = v_emp.employer_id
        AND status NOT IN ('CLOSED','CANCELLED','RESOLVED');

      INSERT INTO ce_legal_recommendations (
        employer_id, employer_name, employer_zone,
        risk_band, risk_score,
        qualifying_case_ids, subcase_summary,
        total_principal, total_penalties, total_interest, grand_total,
        triggered_rules, recommended_date, status, created_by
      ) VALUES (
        v_emp.employer_id, v_emp.employer_name, v_emp.employer_zone,
        v_emp.risk_band, v_emp.risk_score,
        v_case_ids, v_cases,
        v_totals.sum, v_totals.sum, v_totals.sum,
        v_totals.sum + v_totals.sum + v_totals.sum,
        v_triggered, CURRENT_DATE, 'PENDING_REVIEW', p_created_by
      );

      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- Update policy evaluation timestamps
  UPDATE ce_legal_escalation_policies
  SET last_evaluation_date = now(),
      next_evaluation_date = CASE evaluation_frequency
        WHEN 'DAILY' THEN now() + INTERVAL '1 day'
        WHEN 'WEEKLY' THEN now() + INTERVAL '7 days'
        WHEN 'MONTHLY' THEN now() + INTERVAL '1 month'
        ELSE now() + INTERVAL '7 days'
      END,
      updated_at = now()
  WHERE id = v_policy_id;

  RETURN v_count;
END;
$$;