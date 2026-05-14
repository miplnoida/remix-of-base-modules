CREATE OR REPLACE FUNCTION public.generate_sref(
    p_ssn character varying, 
    p_activity_type character varying, 
    p_date_commenced timestamp without time zone, 
    p_entered_by character varying DEFAULT NULL::character varying, 
    p_occupation_code character varying DEFAULT NULL::character varying, 
    p_office_code character varying DEFAULT 'STK'::character varying, 
    p_sector_code character DEFAULT 'O'::bpchar
)
RETURNS character varying
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_current_sref varchar(6);
    v_new_sref_int integer;
    v_new_sref varchar(6);
    v_collision_count integer;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ip_master WHERE ssn = p_ssn) THEN
        RAISE EXCEPTION 'Parent SSN does not exist in ip_master';
    END IF;

    SELECT self_ref_no INTO v_current_sref
    FROM ip_self_employ WHERE ssn = p_ssn LIMIT 1;

    IF v_current_sref IS NOT NULL THEN
        RAISE EXCEPTION 'Person already registered as self-employed with SREF: %', v_current_sref;
    END IF;

    SELECT self_ref_no INTO v_current_sref FROM ip_last_self_emp FOR UPDATE;

    IF v_current_sref IS NULL THEN
        RAISE EXCEPTION 'Cannot retrieve data from ip_last_self_emp';
    END IF;

    v_new_sref_int := v_current_sref::integer + 1;
    v_new_sref := lpad(v_new_sref_int::text, 6, '0');

    SELECT COUNT(*) INTO v_collision_count FROM ip_self_employ WHERE self_ref_no = v_new_sref;
    IF v_collision_count > 0 THEN
        SELECT lpad((max(self_ref_no::integer) + 1)::text, 6, '0') INTO v_new_sref
        FROM ip_self_employ WHERE self_ref_no < '999999';
    END IF;

    INSERT INTO ip_self_employ (
        ssn, self_ref_no, activity_seq_no, activity_type, date_commenced,
        occupation_code, office_code, sector_code, status,
        date_of_entry, date_of_application, entered_by, userid
    ) VALUES (
        p_ssn, v_new_sref, '1', p_activity_type, p_date_commenced,
        p_occupation_code, p_office_code, p_sector_code, 'P',
        now(), now(), p_entered_by, p_entered_by
    );

    -- Added WHERE clause to satisfy pg_safeupdate extension
    UPDATE ip_last_self_emp SET self_ref_no = v_new_sref, date_issued = now()
    WHERE self_ref_no = v_current_sref;

    INSERT INTO au_ip_last_self_emp (self_ref_no, date_issued, modifier, modified_date, action)
    VALUES (v_new_sref, now(), current_user, now(), 'After Update');

    INSERT INTO ip_self_commence (ssn, self_ref_no, activity_seq_no, date_commenced)
    VALUES (p_ssn, v_new_sref, '1', p_date_commenced);

    RETURN v_new_sref;
END;
$function$;