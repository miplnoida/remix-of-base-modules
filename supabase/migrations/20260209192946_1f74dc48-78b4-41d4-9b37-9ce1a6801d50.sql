
-- =============================================
-- Phase 8: Contribution Rate Lookup Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.tb_self_emp_contrib_rate (
  effstart timestamp(3) NOT NULL,
  effend timestamp(3) NOT NULL,
  wage_cat numeric(10,2) NOT NULL DEFAULT 0.0,
  sep_ss_percent numeric(5,2) NOT NULL,
  sep_penalty_percent numeric(5,2) NULL,
  CONSTRAINT pk_tb_self_emp_contrib_rate PRIMARY KEY (effstart, effend, wage_cat)
);

ALTER TABLE public.tb_self_emp_contrib_rate ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to tb_self_emp_contrib_rate" ON public.tb_self_emp_contrib_rate FOR ALL USING (true) WITH CHECK (true);

-- Seed some default contribution rates
INSERT INTO public.tb_self_emp_contrib_rate (effstart, effend, wage_cat, sep_ss_percent, sep_penalty_percent) VALUES
  ('2020-01-01', '2030-12-31', 1.00, 5.00, 5.00),
  ('2020-01-01', '2030-12-31', 2.00, 5.00, 5.00),
  ('2020-01-01', '2030-12-31', 3.00, 5.00, 5.00),
  ('2020-01-01', '2030-12-31', 4.00, 5.00, 5.00),
  ('2020-01-01', '2030-12-31', 5.00, 5.00, 5.00);

-- =============================================
-- Phase 9: Status Change RPC with lifecycle control
-- =============================================
CREATE OR REPLACE FUNCTION public.change_sep_status(
  p_ssn varchar,
  p_self_ref_no varchar,
  p_new_status char,
  p_userid varchar DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status char(1);
  v_activity record;
BEGIN
  -- Get current status from first activity
  SELECT status INTO v_current_status
  FROM ip_self_employ
  WHERE ssn = p_ssn AND self_ref_no = p_self_ref_no
  ORDER BY activity_seq_no
  LIMIT 1;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'No self-employment record found for SSN % with SREF %', p_ssn, p_self_ref_no;
  END IF;

  -- Validate status transitions
  IF p_new_status = 'A' AND v_current_status NOT IN ('P', 'V', 'S') THEN
    RAISE EXCEPTION 'Cannot activate from status %', v_current_status;
  END IF;

  IF p_new_status = 'S' AND v_current_status NOT IN ('A', 'V') THEN
    RAISE EXCEPTION 'Cannot suspend from status %', v_current_status;
  END IF;

  IF p_new_status = 'C' AND v_current_status NOT IN ('A', 'S', 'P', 'V') THEN
    RAISE EXCEPTION 'Cannot cease from status %', v_current_status;
  END IF;

  IF p_new_status = 'V' AND v_current_status NOT IN ('P') THEN
    RAISE EXCEPTION 'Cannot verify from status %', v_current_status;
  END IF;

  -- Update all activities for this SREF
  FOR v_activity IN
    SELECT activity_seq_no FROM ip_self_employ
    WHERE ssn = p_ssn AND self_ref_no = p_self_ref_no
  LOOP
    -- Audit before update
    INSERT INTO au_ip_self_employ
    SELECT (ip_self_employ).*, p_userid, now(), 'Before Update'
    FROM (SELECT ip_self_employ FROM ip_self_employ
          WHERE ssn = p_ssn AND self_ref_no = p_self_ref_no
          AND activity_seq_no = v_activity.activity_seq_no) sub;

    -- Update status
    UPDATE ip_self_employ
    SET status = p_new_status,
        userid = COALESCE(p_userid, userid),
        date_modified = now()
    WHERE ssn = p_ssn
      AND self_ref_no = p_self_ref_no
      AND activity_seq_no = v_activity.activity_seq_no;

    -- If ceasing, end all active activities
    IF p_new_status = 'C' THEN
      UPDATE ip_self_employ
      SET date_ceased = now()
      WHERE ssn = p_ssn
        AND self_ref_no = p_self_ref_no
        AND activity_seq_no = v_activity.activity_seq_no
        AND date_ceased IS NULL;

      UPDATE ip_self_commence
      SET date_ceased = now()
      WHERE ssn = p_ssn
        AND self_ref_no = p_self_ref_no
        AND activity_seq_no = v_activity.activity_seq_no
        AND date_ceased IS NULL;
    END IF;

    -- Audit after update
    INSERT INTO au_ip_self_employ
    SELECT (ip_self_employ).*, p_userid, now(), 'After Update'
    FROM (SELECT ip_self_employ FROM ip_self_employ
          WHERE ssn = p_ssn AND self_ref_no = p_self_ref_no
          AND activity_seq_no = v_activity.activity_seq_no) sub;
  END LOOP;
END;
$$;

-- =============================================
-- Phase 8: Contribution rate lookup RPC
-- =============================================
CREATE OR REPLACE FUNCTION public.get_sep_contribution_rate(
  p_wage_category numeric,
  p_period timestamp
)
RETURNS TABLE(sep_ss_percent numeric, sep_penalty_percent numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT r.sep_ss_percent, r.sep_penalty_percent
  FROM tb_self_emp_contrib_rate r
  WHERE r.wage_cat = p_wage_category
    AND p_period BETWEEN r.effstart AND r.effend
  LIMIT 1;
END;
$$;

-- =============================================
-- Phase 8: Get weeks paid for a self-employed person
-- =============================================
CREATE OR REPLACE FUNCTION public.get_sep_weeks_paid(
  p_ssn varchar,
  p_payer_id varchar
)
RETURNS SETOF ip_self_weeks_paid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM ip_self_weeks_paid
  WHERE ssn = p_ssn
    AND payer_id = p_payer_id
    AND payer_type = 'SE'
  ORDER BY period DESC, sequence_no;
END;
$$;

-- =============================================
-- Phase 11: Database triggers for audit trail
-- =============================================

-- UPDATE trigger on ip_self_employ
CREATE OR REPLACE FUNCTION public.fn_audit_ip_self_employ_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Record "Before Update" state
  INSERT INTO au_ip_self_employ (
    ssn, self_ref_no, self_maddr1, self_maddr2, self_paddr1, self_paddr2,
    occupation_code, industrial_code, office_code, village_code, phone, fax,
    inspector_code, activity_type, sector_code, arrears, legal_action,
    persons_employed, self_guide, self_edu, inspector_name, date_educated,
    date_of_entry, date_of_issue, date_modified, date_verified, date_of_application,
    entered_by, verified_by, userid, status, activity_seq_no, date_commenced, date_ceased,
    modifier, modified_date, action
  ) VALUES (
    OLD.ssn, OLD.self_ref_no, OLD.self_maddr1, OLD.self_maddr2, OLD.self_paddr1, OLD.self_paddr2,
    OLD.occupation_code, OLD.industrial_code, OLD.office_code, OLD.village_code, OLD.phone, OLD.fax,
    OLD.inspector_code, OLD.activity_type, OLD.sector_code, OLD.arrears, OLD.legal_action,
    OLD.persons_employed, OLD.self_guide, OLD.self_edu, OLD.inspector_name, OLD.date_educated,
    OLD.date_of_entry, OLD.date_of_issue, OLD.date_modified, OLD.date_verified, OLD.date_of_application,
    OLD.entered_by, OLD.verified_by, OLD.userid, OLD.status, OLD.activity_seq_no, OLD.date_commenced, OLD.date_ceased,
    current_user::varchar, now(), 'Before Update'
  );

  -- Record "After Update" state
  INSERT INTO au_ip_self_employ (
    ssn, self_ref_no, self_maddr1, self_maddr2, self_paddr1, self_paddr2,
    occupation_code, industrial_code, office_code, village_code, phone, fax,
    inspector_code, activity_type, sector_code, arrears, legal_action,
    persons_employed, self_guide, self_edu, inspector_name, date_educated,
    date_of_entry, date_of_issue, date_modified, date_verified, date_of_application,
    entered_by, verified_by, userid, status, activity_seq_no, date_commenced, date_ceased,
    modifier, modified_date, action
  ) VALUES (
    NEW.ssn, NEW.self_ref_no, NEW.self_maddr1, NEW.self_maddr2, NEW.self_paddr1, NEW.self_paddr2,
    NEW.occupation_code, NEW.industrial_code, NEW.office_code, NEW.village_code, NEW.phone, NEW.fax,
    NEW.inspector_code, NEW.activity_type, NEW.sector_code, NEW.arrears, NEW.legal_action,
    NEW.persons_employed, NEW.self_guide, NEW.self_edu, NEW.inspector_name, NEW.date_educated,
    NEW.date_of_entry, NEW.date_of_issue, NEW.date_modified, NEW.date_verified, NEW.date_of_application,
    NEW.entered_by, NEW.verified_by, NEW.userid, NEW.status, NEW.activity_seq_no, NEW.date_commenced, NEW.date_ceased,
    current_user::varchar, now(), 'After Update'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tu_ip_self_employ ON public.ip_self_employ;
CREATE TRIGGER tu_ip_self_employ
  AFTER UPDATE ON public.ip_self_employ
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_ip_self_employ_update();

-- DELETE trigger on ip_self_employ
CREATE OR REPLACE FUNCTION public.fn_audit_ip_self_employ_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO au_ip_self_employ (
    ssn, self_ref_no, self_maddr1, self_maddr2, self_paddr1, self_paddr2,
    occupation_code, industrial_code, office_code, village_code, phone, fax,
    inspector_code, activity_type, sector_code, arrears, legal_action,
    persons_employed, self_guide, self_edu, inspector_name, date_educated,
    date_of_entry, date_of_issue, date_modified, date_verified, date_of_application,
    entered_by, verified_by, userid, status, activity_seq_no, date_commenced, date_ceased,
    modifier, modified_date, action
  ) VALUES (
    OLD.ssn, OLD.self_ref_no, OLD.self_maddr1, OLD.self_maddr2, OLD.self_paddr1, OLD.self_paddr2,
    OLD.occupation_code, OLD.industrial_code, OLD.office_code, OLD.village_code, OLD.phone, OLD.fax,
    OLD.inspector_code, OLD.activity_type, OLD.sector_code, OLD.arrears, OLD.legal_action,
    OLD.persons_employed, OLD.self_guide, OLD.self_edu, OLD.inspector_name, OLD.date_educated,
    OLD.date_of_entry, OLD.date_of_issue, OLD.date_modified, OLD.date_verified, OLD.date_of_application,
    OLD.entered_by, OLD.verified_by, OLD.userid, OLD.status, OLD.activity_seq_no, OLD.date_commenced, OLD.date_ceased,
    current_user::varchar, now(), 'Deleted'
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS td_ip_self_employ ON public.ip_self_employ;
CREATE TRIGGER td_ip_self_employ
  AFTER DELETE ON public.ip_self_employ
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_ip_self_employ_delete();

-- Audit triggers on ip_last_self_emp
CREATE OR REPLACE FUNCTION public.fn_audit_ip_last_self_emp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO au_ip_last_self_emp (self_ref_no, date_issued, modifier, modified_date, action)
    VALUES (NEW.self_ref_no, NEW.date_issued, current_user::varchar, now(), 'Inserting');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO au_ip_last_self_emp (self_ref_no, date_issued, modifier, modified_date, action)
    VALUES (OLD.self_ref_no, OLD.date_issued, current_user::varchar, now(), 'Before Update');
    INSERT INTO au_ip_last_self_emp (self_ref_no, date_issued, modifier, modified_date, action)
    VALUES (NEW.self_ref_no, NEW.date_issued, current_user::varchar, now(), 'After Update');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO au_ip_last_self_emp (self_ref_no, date_issued, modifier, modified_date, action)
    VALUES (OLD.self_ref_no, OLD.date_issued, current_user::varchar, now(), 'Deleted');
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS t_audit_ip_last_self_emp ON public.ip_last_self_emp;
CREATE TRIGGER t_audit_ip_last_self_emp
  AFTER INSERT OR UPDATE OR DELETE ON public.ip_last_self_emp
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_ip_last_self_emp();

-- =============================================
-- Phase 8: Get SEP contribution summary
-- =============================================
CREATE OR REPLACE FUNCTION public.get_sep_contribution_summary(p_ssn varchar)
RETURNS TABLE(
  total_contributions bigint,
  total_ss_amount numeric,
  latest_period timestamp,
  earliest_period timestamp
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_contributions,
    COALESCE(SUM(w.sep_ss_amt), 0)::numeric as total_ss_amount,
    MAX(w.period) as latest_period,
    MIN(w.period) as earliest_period
  FROM ip_self_weeks_paid w
  WHERE w.ssn = p_ssn AND w.payer_type = 'SE';
END;
$$;

-- =============================================
-- Phase 11: Get audit history for a SEP record
-- =============================================
CREATE OR REPLACE FUNCTION public.get_sep_audit_history(
  p_ssn varchar,
  p_self_ref_no varchar
)
RETURNS TABLE(
  audit_id bigint,
  action varchar,
  modifier varchar,
  modified_date timestamp,
  status char,
  activity_seq_no varchar,
  activity_type varchar,
  date_commenced timestamp,
  date_ceased timestamp
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.audit_id::bigint,
    a.action::varchar,
    a.modifier::varchar,
    a.modified_date::timestamp,
    a.status::char,
    a.activity_seq_no::varchar,
    a.activity_type::varchar,
    a.date_commenced::timestamp,
    a.date_ceased::timestamp
  FROM au_ip_self_employ a
  WHERE a.ssn = p_ssn AND a.self_ref_no = p_self_ref_no
  ORDER BY a.audit_id DESC
  LIMIT 100;
END;
$$;
