
-- ============================================================
-- PHASE 1-3: Complete SEP Database Schema
-- ============================================================

-- 1. Create ip_last_self_emp (SREF sequence generator)
CREATE TABLE public.ip_last_self_emp (
    self_ref_no varchar(6) NOT NULL PRIMARY KEY,
    date_issued timestamp(3) NULL
);
INSERT INTO public.ip_last_self_emp (self_ref_no, date_issued) VALUES ('000000', now());
ALTER TABLE public.ip_last_self_emp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ip_last_self_emp" ON public.ip_last_self_emp FOR ALL USING (true) WITH CHECK (true);

-- 2. Create ip_self_employ (main SEP table)
CREATE TABLE public.ip_self_employ (
    ssn varchar(6) NOT NULL,
    self_ref_no varchar(6) NOT NULL,
    activity_seq_no varchar(6) NOT NULL,
    activity_type varchar(50),
    date_commenced timestamp(3),
    date_ceased timestamp(3),
    occupation_code varchar(4),
    industrial_code varchar(4) DEFAULT '0000',
    office_code varchar(3) DEFAULT 'STK',
    village_code varchar(3) DEFAULT '000',
    phone varchar(10),
    fax varchar(10),
    inspector_code varchar(3) DEFAULT 'UNK',
    inspector_name varchar(25),
    sector_code char(1) DEFAULT 'O',
    arrears varchar(1),
    legal_action char(1),
    persons_employed double precision,
    self_guide char(1),
    self_edu char(1),
    date_educated timestamp(3),
    self_maddr1 varchar(60),
    self_maddr2 varchar(60),
    self_paddr1 varchar(60),
    self_paddr2 varchar(60),
    status char(1) DEFAULT 'P',
    date_of_entry timestamp(3),
    date_of_issue timestamp(3),
    date_modified timestamp(3),
    date_verified timestamp(3),
    date_of_application timestamp(3),
    entered_by varchar(5),
    verified_by varchar(5),
    userid varchar(5),
    PRIMARY KEY (ssn, self_ref_no, activity_seq_no)
);
ALTER TABLE public.ip_self_employ ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ip_self_employ" ON public.ip_self_employ FOR ALL USING (true) WITH CHECK (true);

-- 3. Create ip_self_commence (activity periods)
CREATE TABLE public.ip_self_commence (
    ssn varchar(6) NOT NULL,
    self_ref_no varchar(6) NOT NULL,
    activity_seq_no varchar(6) NOT NULL,
    date_commenced timestamp(3) NOT NULL,
    date_ceased timestamp(3) NULL,
    PRIMARY KEY (ssn, self_ref_no, date_commenced, activity_seq_no)
);
ALTER TABLE public.ip_self_commence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ip_self_commence" ON public.ip_self_commence FOR ALL USING (true) WITH CHECK (true);

-- 4. Audit table for ip_self_employ
CREATE TABLE public.au_ip_self_employ (
    audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ssn varchar(6), self_ref_no varchar(6), activity_seq_no varchar(6),
    activity_type varchar(50), date_commenced timestamp(3), date_ceased timestamp(3),
    occupation_code varchar(4), industrial_code varchar(4), office_code varchar(3),
    village_code varchar(3), phone varchar(10), fax varchar(10),
    inspector_code varchar(3), inspector_name varchar(25), sector_code char(1),
    arrears varchar(1), legal_action char(1), persons_employed double precision,
    self_guide char(1), self_edu char(1), date_educated timestamp(3),
    self_maddr1 varchar(60), self_maddr2 varchar(60),
    self_paddr1 varchar(60), self_paddr2 varchar(60),
    status char(1), date_of_entry timestamp(3), date_of_issue timestamp(3),
    date_modified timestamp(3), date_verified timestamp(3), date_of_application timestamp(3),
    entered_by varchar(5), verified_by varchar(5), userid varchar(5),
    modifier varchar(30), modified_date timestamp(3), action varchar(15)
);
ALTER TABLE public.au_ip_self_employ ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to au_ip_self_employ" ON public.au_ip_self_employ FOR ALL USING (true) WITH CHECK (true);

-- 5. Audit table for ip_last_self_emp
CREATE TABLE public.au_ip_last_self_emp (
    audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    self_ref_no varchar(6), date_issued timestamp(3),
    modifier varchar(30), modified_date timestamp(3), action varchar(15)
);
ALTER TABLE public.au_ip_last_self_emp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to au_ip_last_self_emp" ON public.au_ip_last_self_emp FOR ALL USING (true) WITH CHECK (true);

-- 6. Foreign keys
ALTER TABLE public.ip_self_employ
    ADD CONSTRAINT fk_ip_self_employ_ip_master
    FOREIGN KEY (ssn) REFERENCES public.ip_master (ssn);

ALTER TABLE public.ip_self_commence
    ADD CONSTRAINT fk_ip_self_commence_ip_self_employ
    FOREIGN KEY (ssn, self_ref_no, activity_seq_no)
    REFERENCES public.ip_self_employ (ssn, self_ref_no, activity_seq_no);

ALTER TABLE public.ip_self_category
    ADD CONSTRAINT fk_ip_self_category_ip_self_employ
    FOREIGN KEY (ssn, self_ref_no, activity_seq_no)
    REFERENCES public.ip_self_employ (ssn, self_ref_no, activity_seq_no);

ALTER TABLE public.ip_self_locations
    ADD CONSTRAINT fk_ip_self_locations_ip_self_employ
    FOREIGN KEY (ssn, self_ref_no, activity_seq_no)
    REFERENCES public.ip_self_employ (ssn, self_ref_no, activity_seq_no);

-- 7. SREF generation function
CREATE OR REPLACE FUNCTION public.generate_sref(
    p_ssn varchar(6),
    p_activity_type varchar(50),
    p_date_commenced timestamp,
    p_entered_by varchar(5) DEFAULT NULL,
    p_occupation_code varchar(4) DEFAULT NULL,
    p_office_code varchar(3) DEFAULT 'STK',
    p_sector_code char(1) DEFAULT 'O'
)
RETURNS varchar(6)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    UPDATE ip_last_self_emp SET self_ref_no = v_new_sref, date_issued = now();

    INSERT INTO au_ip_last_self_emp (self_ref_no, date_issued, modifier, modified_date, action)
    VALUES (v_new_sref, now(), current_user, now(), 'After Update');

    INSERT INTO ip_self_commence (ssn, self_ref_no, activity_seq_no, date_commenced)
    VALUES (p_ssn, v_new_sref, '1', p_date_commenced);

    RETURN v_new_sref;
END;
$$;

-- 8. Add additional activity function
CREATE OR REPLACE FUNCTION public.add_sep_activity(
    p_ssn varchar(6),
    p_self_ref_no varchar(6),
    p_activity_type varchar(50),
    p_date_commenced timestamp,
    p_entered_by varchar(5) DEFAULT NULL,
    p_occupation_code varchar(4) DEFAULT NULL,
    p_office_code varchar(3) DEFAULT 'STK',
    p_sector_code char(1) DEFAULT 'O'
)
RETURNS varchar(6)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_open_count integer;
    v_next_seq varchar(6);
BEGIN
    SELECT COUNT(*) INTO v_open_count
    FROM ip_self_employ
    WHERE ssn = p_ssn AND self_ref_no = p_self_ref_no AND date_ceased IS NULL;

    IF v_open_count > 0 THEN
        RAISE EXCEPTION 'Cannot add new activity while existing activities are still open.';
    END IF;

    SELECT (COALESCE(max(activity_seq_no::integer), 0) + 1)::text INTO v_next_seq
    FROM ip_self_employ WHERE ssn = p_ssn AND self_ref_no = p_self_ref_no;

    INSERT INTO ip_self_employ (
        ssn, self_ref_no, activity_seq_no, activity_type, date_commenced,
        occupation_code, office_code, sector_code, status,
        date_of_entry, date_of_application, entered_by, userid
    ) VALUES (
        p_ssn, p_self_ref_no, v_next_seq, p_activity_type, p_date_commenced,
        p_occupation_code, p_office_code, p_sector_code, 'P',
        now(), now(), p_entered_by, p_entered_by
    );

    INSERT INTO ip_self_commence (ssn, self_ref_no, activity_seq_no, date_commenced)
    VALUES (p_ssn, p_self_ref_no, v_next_seq, p_date_commenced);

    RETURN v_next_seq;
END;
$$;

-- 9. Check SEP eligibility function
CREATE OR REPLACE FUNCTION public.check_sep_eligibility(p_ssn varchar(6))
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ip_exists boolean;
    v_self_ref_no varchar(6);
    v_ip_status char(1);
    v_ip_name text;
BEGIN
    SELECT EXISTS(SELECT 1 FROM ip_master WHERE ssn = p_ssn) INTO v_ip_exists;
    
    IF NOT v_ip_exists THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'SSN does not exist in ip_master', 'ip_exists', false, 'sep_exists', false);
    END IF;

    SELECT status, COALESCE(firstname || ' ' || surname, '') INTO v_ip_status, v_ip_name
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
