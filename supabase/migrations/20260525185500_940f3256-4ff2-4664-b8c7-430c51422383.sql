
-- 1. Extend ce_case_families with the full configuration set
ALTER TABLE public.ce_case_families
  ADD COLUMN IF NOT EXISTS allowed_violation_type_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS grouping_rule jsonb NOT NULL DEFAULT jsonb_build_object(
    'sameEmployer', true,
    'sameFund', false,
    'sameContributionPeriod', false,
    'sameViolationType', false,
    'sameCaseFamily', true,
    'openCaseOnly', true,
    'dateRangeDays', 0,
    'maxOpenCaseAgeDays', 0
  ),
  ADD COLUMN IF NOT EXISTS default_severity varchar(20) NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS default_workflow_id uuid,
  ADD COLUMN IF NOT EXISTS default_officer_queue_id uuid,
  ADD COLUMN IF NOT EXISTS default_notice_sequence_id uuid,
  ADD COLUMN IF NOT EXISTS merge_allowed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reopen_allowed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS legal_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_intake_on_no_match boolean NOT NULL DEFAULT true;

-- 2. Audit table for every grouping decision
CREATE TABLE IF NOT EXISTS public.ce_violation_grouping_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id uuid NOT NULL REFERENCES public.ce_violations(id) ON DELETE CASCADE,
  case_family_id uuid REFERENCES public.ce_case_families(id),
  decision varchar(30) NOT NULL,
    -- ATTACH_EXISTING | CREATE_NEW | SEND_TO_INTAKE | MANUAL_OVERRIDE
  target_case_id uuid REFERENCES public.ce_cases(id),
  reason text,
  matched_criteria jsonb DEFAULT '{}'::jsonb,
  candidate_case_ids uuid[] DEFAULT '{}',
  is_override boolean NOT NULL DEFAULT false,
  override_of uuid REFERENCES public.ce_violation_grouping_decisions(id),
  decided_by varchar(50) NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_vgd_violation ON public.ce_violation_grouping_decisions(violation_id);
CREATE INDEX IF NOT EXISTS idx_ce_vgd_case ON public.ce_violation_grouping_decisions(target_case_id) WHERE target_case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_vgd_family ON public.ce_violation_grouping_decisions(case_family_id) WHERE case_family_id IS NOT NULL;

-- 3. Decision RPC — driven entirely by ce_case_families configuration
DROP FUNCTION IF EXISTS public.fn_ce_decide_violation_grouping(uuid);
CREATE OR REPLACE FUNCTION public.fn_ce_decide_violation_grouping(p_violation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_violation        record;
  v_family           record;
  v_rule             jsonb;
  v_candidate        record;
  v_candidate_ids    uuid[] := '{}';
  v_matched          jsonb;
  v_decision         varchar(30);
  v_target           uuid;
  v_reason           text;
  v_max_age          int;
  v_date_range_days  int;
BEGIN
  SELECT v.id, v.employer_id, v.fund_type, v.period_from, v.period_to,
         v.violation_type_id, vt.category AS violation_category
  INTO v_violation
  FROM ce_violations v
  LEFT JOIN ce_violation_types vt ON vt.id = v.violation_type_id
  WHERE v.id = p_violation_id;

  IF v_violation.id IS NULL THEN
    RETURN jsonb_build_object('decision','SEND_TO_INTAKE','reason','Violation not found');
  END IF;

  -- Resolve case family — prefer allowed_violation_type_ids, fall back to violation_categories
  SELECT * INTO v_family
  FROM ce_case_families
  WHERE is_active = true
    AND (
      (v_violation.violation_type_id = ANY (allowed_violation_type_ids))
      OR (v_violation.violation_category IS NOT NULL
          AND v_violation.violation_category = ANY (violation_categories))
    )
  ORDER BY sort_order, name
  LIMIT 1;

  IF v_family.id IS NULL THEN
    RETURN jsonb_build_object(
      'decision','SEND_TO_INTAKE',
      'reason','No active case family configured for this violation type or category'
    );
  END IF;

  v_rule := v_family.grouping_rule;
  v_max_age := COALESCE((v_rule->>'maxOpenCaseAgeDays')::int, 0);
  v_date_range_days := COALESCE((v_rule->>'dateRangeDays')::int, 0);

  -- Find candidate open cases obeying grouping configuration
  FOR v_candidate IN
    SELECT c.*
    FROM ce_cases c
    WHERE (c.is_deleted IS NULL OR c.is_deleted = false)
      AND ( NOT COALESCE((v_rule->>'openCaseOnly')::boolean, true)
            OR c.status NOT IN ('CLOSED','RESOLVED','MERGED','CANCELLED') )
      AND ( NOT COALESCE((v_rule->>'sameEmployer')::boolean, true)
            OR c.employer_id = v_violation.employer_id )
      AND ( NOT COALESCE((v_rule->>'sameCaseFamily')::boolean, true)
            OR c.case_family_id = v_family.id )
      AND ( NOT COALESCE((v_rule->>'sameFund')::boolean, false)
            OR c.fund_type = v_violation.fund_type )
      AND ( v_max_age = 0
            OR c.opened_date >= CURRENT_DATE - v_max_age )
    ORDER BY c.opened_date DESC
  LOOP
    v_candidate_ids := array_append(v_candidate_ids, v_candidate.id);
  END LOOP;

  IF array_length(v_candidate_ids, 1) IS NULL THEN
    IF COALESCE(v_family.auto_create_case, true) THEN
      v_decision := 'CREATE_NEW';
      v_reason := 'No matching open case — auto-create per family configuration';
    ELSIF COALESCE(v_family.manual_intake_on_no_match, true) THEN
      v_decision := 'SEND_TO_INTAKE';
      v_reason := 'No matching case and auto-create disabled — sent to manual intake';
    ELSE
      v_decision := 'SEND_TO_INTAKE';
      v_reason := 'No matching case';
    END IF;
    v_target := NULL;
  ELSE
    v_decision := 'ATTACH_EXISTING';
    v_target := v_candidate_ids[1];
    v_reason := 'Matched existing open case by grouping rule';
  END IF;

  v_matched := jsonb_build_object(
    'caseFamilyId', v_family.id,
    'caseFamilyCode', v_family.code,
    'rule', v_rule,
    'violationTypeId', v_violation.violation_type_id,
    'violationCategory', v_violation.violation_category,
    'employerId', v_violation.employer_id,
    'fundType', v_violation.fund_type
  );

  RETURN jsonb_build_object(
    'decision', v_decision,
    'caseFamilyId', v_family.id,
    'caseFamilyCode', v_family.code,
    'targetCaseId', v_target,
    'candidateCaseIds', to_jsonb(v_candidate_ids),
    'matched', v_matched,
    'reason', v_reason
  );
END;
$$;

-- 4. Seed standard families (idempotent)
INSERT INTO public.ce_case_families (code, name, description, default_severity, merge_allowed, reopen_allowed, legal_eligible, sort_order)
VALUES
  ('FILING_DEFAULT','Filing Default Case','Late or missing contribution filings','Medium', true, true, false, 10),
  ('PAYMENT_DEFAULT','Payment Default Case','Unpaid or late contribution payments','High', true, true, true, 20),
  ('UNDER_DECLARATION','Under Declaration Investigation','Suspected under-reporting of wages or employees','High', true, true, true, 30),
  ('ARRANGEMENT_BREACH','Arrangement Breach Case','Breach of an approved payment arrangement','High', false, true, true, 40),
  ('INSPECTION_FINDING','Inspection Finding Case','Violations raised from field inspections','Medium', true, true, false, 50),
  ('LEGAL_RECOVERY','Legal Recovery Case','Cases escalated to legal recovery','Critical', false, false, true, 60)
ON CONFLICT (code) DO NOTHING;
