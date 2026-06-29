CREATE OR REPLACE FUNCTION public.fn_ce_generate_legal_recommendations(p_created_by text DEFAULT 'SYSTEM'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_policy_id UUID;
  v_count INT := 0;
  v_rule RECORD;
  v_emp RECORD;
  v_matched BOOLEAN;
  v_triggered JSONB;
  v_cases JSONB;
  v_case_ids JSONB;
  v_total_principal NUMERIC;
BEGIN
  SELECT id INTO v_policy_id
  FROM ce_legal_escalation_policies
  WHERE is_active = true
  LIMIT 1;

  IF v_policy_id IS NULL THEN RETURN 0; END IF;

  FOR v_emp IN
    SELECT DISTINCT
      cc.employer_id,
      cc.employer_name,
      COALESCE(z.zone_name, 'Unassigned') AS employer_zone,
      COALESCE(rp.risk_band, 'LOW') AS risk_band,
      COALESCE(rp.total_score, 0) AS risk_score
    FROM ce_cases cc
    LEFT JOIN ce_risk_profiles rp ON rp.employer_id = cc.employer_id
    LEFT JOIN ce_zones z ON z.id = rp.zone_id
    WHERE cc.status NOT IN ('CLOSED', 'CANCELLED', 'RESOLVED')
      AND cc.employer_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM ce_legal_recommendations lr
        WHERE lr.employer_id = cc.employer_id
          AND lr.status IN ('PENDING_REVIEW', 'APPROVED_FOR_REFERRAL')
      )
  LOOP
    v_triggered := '[]'::jsonb;

    FOR v_rule IN
      SELECT * FROM ce_legal_escalation_policy_rules
      WHERE policy_id = v_policy_id AND is_enabled = true
      ORDER BY priority
    LOOP
      v_matched := false;

      IF v_rule.rule_type = 'AGE_THRESHOLD' AND v_rule.age_days_overdue IS NOT NULL THEN
        PERFORM 1 FROM ce_cases
        WHERE employer_id = v_emp.employer_id
          AND status NOT IN ('CLOSED','CANCELLED','RESOLVED')
          AND created_at < now() - (v_rule.age_days_overdue || ' days')::interval;
        IF FOUND THEN v_matched := true; END IF;
      END IF;

      IF v_rule.rule_type = 'AMOUNT_THRESHOLD' AND v_rule.total_arrears_threshold IS NOT NULL THEN
        PERFORM 1 FROM (
          SELECT SUM(COALESCE(total_amount, 0)) AS total
          FROM ce_cases
          WHERE employer_id = v_emp.employer_id
            AND status NOT IN ('CLOSED','CANCELLED','RESOLVED')
        ) t WHERE t.total >= v_rule.total_arrears_threshold;
        IF FOUND THEN v_matched := true; END IF;
      END IF;

      IF v_rule.rule_type = 'BEHAVIOUR_THRESHOLD' AND v_rule.notices_sent_minimum IS NOT NULL THEN
        PERFORM 1 FROM (
          SELECT COUNT(*) AS cnt FROM ce_notices
          WHERE employer_id = v_emp.employer_id
            AND status IN ('SENT','DELIVERED')
            AND sent_date < now() - COALESCE(v_rule.no_response_days, 60) * INTERVAL '1 day'
        ) t WHERE t.cnt >= v_rule.notices_sent_minimum;
        IF FOUND THEN v_matched := true; END IF;
      END IF;

      IF v_rule.rule_type = 'BEHAVIOUR_THRESHOLD' AND v_rule.payment_plan_breaches_count IS NOT NULL THEN
        PERFORM 1 FROM (
          SELECT COUNT(*) AS cnt FROM ce_payment_arrangements
          WHERE employer_id = v_emp.employer_id
            AND status IN ('BREACHED','DEFAULTED')
        ) t WHERE t.cnt >= v_rule.payment_plan_breaches_count;
        IF FOUND THEN v_matched := true; END IF;
      END IF;

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

    IF jsonb_array_length(v_triggered) > 0 THEN
      SELECT
        COALESCE(jsonb_agg(jsonb_build_object(
          'subcaseId', id::text,
          'caseNumber', COALESCE(case_number, ''),
          'caseType', COALESCE(case_type, ''),
          'periodFrom', '',
          'periodTo', '',
          'principalAmount', COALESCE(total_amount, 0),
          'penaltyAmount', 0,
          'interestAmount', 0,
          'totalAmount', COALESCE(total_amount, 0)
        )), '[]'::jsonb),
        COALESCE(jsonb_agg(to_jsonb(id::text)), '[]'::jsonb)
      INTO v_cases, v_case_ids
      FROM ce_cases
      WHERE employer_id = v_emp.employer_id
        AND status NOT IN ('CLOSED','CANCELLED','RESOLVED');

      SELECT COALESCE(SUM(total_amount), 0)
      INTO v_total_principal
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
        v_total_principal, 0, 0, v_total_principal,
        v_triggered, CURRENT_DATE, 'PENDING_REVIEW', p_created_by
      );

      v_count := v_count + 1;
    END IF;
  END LOOP;

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
$function$;