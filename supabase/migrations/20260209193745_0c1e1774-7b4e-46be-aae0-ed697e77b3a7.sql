
-- Fix check_sep_eligibility - correct column names
CREATE OR REPLACE FUNCTION public.check_sep_eligibility(p_ssn varchar)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ip_exists boolean;
    v_self_ref_no varchar(6);
    v_ip_status text;
    v_ip_name text;
BEGIN
    SELECT EXISTS(SELECT 1 FROM ip_master WHERE ssn = p_ssn) INTO v_ip_exists;
    
    IF NOT v_ip_exists THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'SSN does not exist in ip_master', 'ip_exists', false, 'sep_exists', false, 'self_ref_no', null, 'ip_status', null, 'ip_name', null);
    END IF;

    SELECT status, COALESCE(first_name || ' ' || COALESCE(last_name, ''), first_name) INTO v_ip_status, v_ip_name
    FROM ip_master WHERE ssn = p_ssn;

    SELECT self_ref_no INTO v_self_ref_no FROM ip_self_employ WHERE ssn = p_ssn LIMIT 1;

    IF v_ip_status IN ('S', 'C') THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'IP status does not allow SEP registration', 'ip_exists', true, 'sep_exists', v_self_ref_no IS NOT NULL, 'self_ref_no', v_self_ref_no, 'ip_status', v_ip_status, 'ip_name', v_ip_name);
    END IF;

    RETURN jsonb_build_object(
        'eligible', v_self_ref_no IS NULL,
        'reason', CASE WHEN v_self_ref_no IS NOT NULL THEN 'Already registered as self-employed' ELSE 'Eligible' END,
        'ip_exists', true, 'sep_exists', v_self_ref_no IS NOT NULL,
        'self_ref_no', v_self_ref_no, 'ip_status', v_ip_status, 'ip_name', v_ip_name
    );
END;
$$;

-- Fix change_sep_status - explicit column inserts for audit
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
  v_current_status text;
  v_activity record;
BEGIN
  SELECT status INTO v_current_status
  FROM ip_self_employ
  WHERE ssn = p_ssn AND self_ref_no = p_self_ref_no
  ORDER BY activity_seq_no
  LIMIT 1;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'No self-employment record found for SSN % with SREF %', p_ssn, p_self_ref_no;
  END IF;

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

  FOR v_activity IN
    SELECT * FROM ip_self_employ
    WHERE ssn = p_ssn AND self_ref_no = p_self_ref_no
  LOOP
    INSERT INTO au_ip_self_employ (
      ssn, self_ref_no, activity_seq_no, activity_type, date_commenced, date_ceased,
      occupation_code, industrial_code, office_code, village_code, phone, fax,
      inspector_code, inspector_name, sector_code, arrears, legal_action, persons_employed,
      self_guide, self_edu, date_educated, self_maddr1, self_maddr2, self_paddr1, self_paddr2,
      status, date_of_entry, date_of_issue, date_modified, date_verified, date_of_application,
      entered_by, verified_by, userid, modifier, modified_date, action
    ) VALUES (
      v_activity.ssn, v_activity.self_ref_no, v_activity.activity_seq_no,
      v_activity.activity_type, v_activity.date_commenced, v_activity.date_ceased,
      v_activity.occupation_code, v_activity.industrial_code, v_activity.office_code,
      v_activity.village_code, v_activity.phone, v_activity.fax,
      v_activity.inspector_code, v_activity.inspector_name, v_activity.sector_code,
      v_activity.arrears, v_activity.legal_action, v_activity.persons_employed,
      v_activity.self_guide, v_activity.self_edu, v_activity.date_educated,
      v_activity.self_maddr1, v_activity.self_maddr2, v_activity.self_paddr1, v_activity.self_paddr2,
      v_activity.status, v_activity.date_of_entry, v_activity.date_of_issue,
      v_activity.date_modified, v_activity.date_verified, v_activity.date_of_application,
      v_activity.entered_by, v_activity.verified_by, v_activity.userid,
      COALESCE(p_userid, current_user), now(), 'Before Update'
    );

    UPDATE ip_self_employ
    SET status = p_new_status,
        userid = COALESCE(p_userid, userid),
        date_modified = now()
    WHERE ssn = p_ssn
      AND self_ref_no = p_self_ref_no
      AND activity_seq_no = v_activity.activity_seq_no;

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

    INSERT INTO au_ip_self_employ (
      ssn, self_ref_no, activity_seq_no, activity_type, date_commenced, date_ceased,
      occupation_code, industrial_code, office_code, village_code, phone, fax,
      inspector_code, inspector_name, sector_code, arrears, legal_action, persons_employed,
      self_guide, self_edu, date_educated, self_maddr1, self_maddr2, self_paddr1, self_paddr2,
      status, date_of_entry, date_of_issue, date_modified, date_verified, date_of_application,
      entered_by, verified_by, userid, modifier, modified_date, action
    )
    SELECT
      e.ssn, e.self_ref_no, e.activity_seq_no, e.activity_type, e.date_commenced, e.date_ceased,
      e.occupation_code, e.industrial_code, e.office_code, e.village_code, e.phone, e.fax,
      e.inspector_code, e.inspector_name, e.sector_code, e.arrears, e.legal_action, e.persons_employed,
      e.self_guide, e.self_edu, e.date_educated, e.self_maddr1, e.self_maddr2, e.self_paddr1, e.self_paddr2,
      e.status, e.date_of_entry, e.date_of_issue, e.date_modified, e.date_verified, e.date_of_application,
      e.entered_by, e.verified_by, e.userid,
      COALESCE(p_userid, current_user), now(), 'After Update'
    FROM ip_self_employ e
    WHERE e.ssn = p_ssn AND e.self_ref_no = p_self_ref_no AND e.activity_seq_no = v_activity.activity_seq_no;
  END LOOP;
END;
$$;
