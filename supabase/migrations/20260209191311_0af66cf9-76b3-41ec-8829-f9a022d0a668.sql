
-- Table 4: ip_self_locations (fixed: seq_no must be integer type for IDENTITY)
CREATE TABLE public.ip_self_locations (
    ssn varchar(6) NOT NULL,
    self_ref_no varchar(6) NOT NULL,
    activity_seq_no varchar(6) NOT NULL,
    seq_no bigint GENERATED ALWAYS AS IDENTITY,
    location varchar(20),
    activity_type varchar(50),
    PRIMARY KEY (ssn, self_ref_no, activity_seq_no, seq_no)
);

ALTER TABLE public.ip_self_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to ip_self_locations" ON public.ip_self_locations FOR ALL USING (true) WITH CHECK (true);

-- Table 5: ip_self_weeks_paid
CREATE TABLE public.ip_self_weeks_paid (
    ssn varchar(6) NOT NULL,
    payer_id varchar(6) NOT NULL,
    payer_type varchar(3) NOT NULL,
    sequence_no int NOT NULL,
    period timestamp(3) NOT NULL,
    pay_period varchar(2),
    paid_code1 char(1),
    paid_code2 char(1),
    paid_code3 char(1),
    paid_code4 char(1),
    paid_code5 char(1),
    paid_code6 char(1),
    sep_ss_amt numeric(10, 2),
    PRIMARY KEY (ssn, payer_id, payer_type, sequence_no, period)
);

ALTER TABLE public.ip_self_weeks_paid ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to ip_self_weeks_paid" ON public.ip_self_weeks_paid FOR ALL USING (true) WITH CHECK (true);
