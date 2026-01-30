-- C3 Management Tables based on business flow documentation
-- Main C3 reported table for all payer types (Employer, Self Contributor, Voluntary Contributor)

CREATE TABLE cn_c3_reported (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    payer_id VARCHAR(6) NOT NULL,
    payer_type VARCHAR(3) NOT NULL CHECK (payer_type IN ('ER', 'SE', 'VC')),
    sequence_no INT NOT NULL DEFAULT 1,
    period DATE NOT NULL,
    
    -- Employment Data
    number_employed INT NULL,
    
    -- Calculated Amount Fields (system-calculated)
    emp_ss_amt_calc NUMERIC(10,2) NULL DEFAULT 0,
    emp_levy_amt_calc NUMERIC(10,2) NULL DEFAULT 0,
    emp_pe_amt_calc NUMERIC(10,2) NULL DEFAULT 0,
    
    -- Penalty and Fine Fields
    emp_levy_penalty_amt NUMERIC(10,2) NULL DEFAULT 0,
    emp_pe_penalty_amt NUMERIC(10,2) NULL DEFAULT 0,
    emp_ss_fines_due NUMERIC(10,2) NULL DEFAULT 0,
    
    -- Wage Totals
    total_wages NUMERIC(10,2) NULL DEFAULT 0,
    
    -- Date Fields
    date_received TIMESTAMPTZ NULL,
    date_entered TIMESTAMPTZ NULL DEFAULT NOW(),
    date_verified TIMESTAMPTZ NULL,
    date_posted TIMESTAMPTZ NULL,
    modified_date TIMESTAMPTZ NULL,
    
    -- User Tracking Fields
    entered_by VARCHAR(50) NULL,
    verified_by VARCHAR(50) NULL,
    modified_by VARCHAR(50) NULL,
    received_by VARCHAR(50) NULL,
    
    -- Status and Flags
    -- 'Z' = Draft, 'P' = Pending, 'V' = Verified, 'D' = Deleted
    posting_status VARCHAR(3) NOT NULL DEFAULT 'Z' CHECK (posting_status IN ('Z', 'P', 'V', 'D')),
    nil_return BOOLEAN NULL DEFAULT false,
    
    -- Notes
    notes VARCHAR(254) NULL,
    
    -- Payer Details (cached from master tables)
    payer_name VARCHAR(255) NULL,
    payer_address TEXT NULL,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint for composite key
    CONSTRAINT cn_c3_reported_unique UNIQUE (payer_id, payer_type, sequence_no, period)
);

-- IP Wages table for individual wage records
CREATE TABLE ip_wages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ssn VARCHAR(6) NOT NULL,
    payer_id VARCHAR(6) NOT NULL,
    payer_type VARCHAR(3) NOT NULL CHECK (payer_type IN ('ER', 'SE', 'VC')),
    sequence_no INT NOT NULL DEFAULT 1,
    period DATE NOT NULL,
    
    -- Pay Period: '1' (Weekly), '2' (Every 2 Weeks), '3' (Monthly), '4' (Bi-Monthly)
    pay_period VARCHAR(2) NULL,
    
    -- Wage Fields (up to 7 weeks)
    wages_paid1 NUMERIC(10,2) NULL DEFAULT 0,
    wages_paid2 NUMERIC(10,2) NULL DEFAULT 0,
    wages_paid3 NUMERIC(10,2) NULL DEFAULT 0,
    wages_paid4 NUMERIC(10,2) NULL DEFAULT 0,
    wages_paid5 NUMERIC(10,2) NULL DEFAULT 0,
    wages_paid6 NUMERIC(10,2) NULL DEFAULT 0,  -- Holiday pay
    wages_paid7 NUMERIC(10,2) NULL DEFAULT 0,  -- Bonus paid
    
    -- Paid Code Fields (indicates if week was worked)
    paid_code1 VARCHAR(1) NULL,
    paid_code2 VARCHAR(1) NULL,
    paid_code3 VARCHAR(1) NULL,
    paid_code4 VARCHAR(1) NULL,
    paid_code5 VARCHAR(1) NULL,
    paid_code6 VARCHAR(1) NULL,
    paid_code7 VARCHAR(1) NULL,
    
    -- Employee/Contributor name (cached from master)
    employee_name VARCHAR(255) NULL,
    
    -- Calculated Contribution Amounts
    ip_ss_amt NUMERIC(10,2) NULL DEFAULT 0,
    ip_levy_amt NUMERIC(10,2) NULL DEFAULT 0,
    ip_pe_amt NUMERIC(10,2) NULL DEFAULT 0,
    er_ss_amt NUMERIC(10,2) NULL DEFAULT 0,
    er_levy_amt NUMERIC(10,2) NULL DEFAULT 0,
    er_ei_amt NUMERIC(10,2) NULL DEFAULT 0,
    
    -- Total wages for this employee
    total_wages NUMERIC(10,2) NULL DEFAULT 0,
    
    -- Audit Fields
    entered_by VARCHAR(50) NULL,
    date_entered TIMESTAMPTZ NULL DEFAULT NOW(),
    modified_by VARCHAR(50) NULL,
    date_modified TIMESTAMPTZ NULL,
    verified_by VARCHAR(50) NULL,
    date_verified TIMESTAMPTZ NULL,
    
    -- Status: 'Z' = Draft, 'P' = Pending, 'V' = Verified
    posting_status VARCHAR(3) NULL DEFAULT 'Z' CHECK (posting_status IN ('Z', 'P', 'V', 'D')),
    
    -- Input sequence number
    input_seq_no INT NULL,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Reference to parent C3 record
    c3_id UUID NULL REFERENCES cn_c3_reported(id) ON DELETE CASCADE,
    
    -- Unique constraint for composite key
    CONSTRAINT ip_wages_unique UNIQUE (ssn, payer_id, payer_type, sequence_no, period)
);

-- Create indexes for better query performance
CREATE INDEX idx_cn_c3_reported_payer ON cn_c3_reported(payer_id, payer_type);
CREATE INDEX idx_cn_c3_reported_period ON cn_c3_reported(period);
CREATE INDEX idx_cn_c3_reported_status ON cn_c3_reported(posting_status);
CREATE INDEX idx_cn_c3_reported_entered_by ON cn_c3_reported(entered_by);

CREATE INDEX idx_ip_wages_payer ON ip_wages(payer_id, payer_type);
CREATE INDEX idx_ip_wages_ssn ON ip_wages(ssn);
CREATE INDEX idx_ip_wages_c3_id ON ip_wages(c3_id);
CREATE INDEX idx_ip_wages_status ON ip_wages(posting_status);

-- Enable RLS
ALTER TABLE cn_c3_reported ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_wages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cn_c3_reported
CREATE POLICY "Allow authenticated read access" ON cn_c3_reported
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON cn_c3_reported
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON cn_c3_reported
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete" ON cn_c3_reported
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow service role full access cn_c3" ON cn_c3_reported
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for ip_wages
CREATE POLICY "Allow authenticated read access" ON ip_wages
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON ip_wages
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON ip_wages
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete" ON ip_wages
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow service role full access ip_wages" ON ip_wages
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_cn_c3_reported_updated_at
    BEFORE UPDATE ON cn_c3_reported
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ip_wages_updated_at
    BEFORE UPDATE ON ip_wages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get next schedule number for a payer and period
CREATE OR REPLACE FUNCTION get_next_c3_schedule_no(
    p_payer_id VARCHAR(6),
    p_payer_type VARCHAR(3),
    p_period DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_seq INT;
BEGIN
    SELECT COALESCE(MAX(sequence_no), 0) + 1
    INTO v_max_seq
    FROM cn_c3_reported
    WHERE payer_id = p_payer_id
      AND payer_type = p_payer_type
      AND period = p_period;
    
    RETURN v_max_seq;
END;
$$;

-- Function to submit a C3 record (change status from Z to P)
CREATE OR REPLACE FUNCTION submit_c3_record(
    p_c3_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record RECORD;
    v_user_name TEXT;
BEGIN
    -- Get user name if user_id provided
    IF p_user_id IS NOT NULL THEN
        SELECT full_name INTO v_user_name FROM profiles WHERE id = p_user_id;
    END IF;

    -- Lock the record
    SELECT * INTO v_record
    FROM cn_c3_reported
    WHERE id = p_c3_id
    FOR UPDATE;
    
    IF v_record IS NULL THEN
        RAISE EXCEPTION 'C3 record not found';
    END IF;
    
    IF v_record.posting_status != 'Z' THEN
        RAISE EXCEPTION 'Only draft records can be submitted. Current status: %', v_record.posting_status;
    END IF;
    
    -- Update C3 record status to Pending
    UPDATE cn_c3_reported
    SET posting_status = 'P',
        date_entered = COALESCE(date_entered, NOW()),
        entered_by = COALESCE(entered_by, v_user_name),
        modified_date = NOW(),
        modified_by = v_user_name,
        updated_at = NOW()
    WHERE id = p_c3_id;
    
    -- Update all associated wage records
    UPDATE ip_wages
    SET posting_status = 'P',
        date_entered = COALESCE(date_entered, NOW()),
        entered_by = COALESCE(entered_by, v_user_name),
        date_modified = NOW(),
        modified_by = v_user_name,
        updated_at = NOW()
    WHERE c3_id = p_c3_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'c3_id', p_c3_id,
        'old_status', 'Z',
        'new_status', 'P',
        'message', 'C3 record submitted successfully'
    );
END;
$$;

-- Function to verify a C3 record (change status from P to V)
CREATE OR REPLACE FUNCTION verify_c3_record(
    p_c3_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record RECORD;
    v_user_name TEXT;
    v_unverified_wages INT;
BEGIN
    -- Get user name if user_id provided
    IF p_user_id IS NOT NULL THEN
        SELECT full_name INTO v_user_name FROM profiles WHERE id = p_user_id;
    END IF;

    -- Lock the record
    SELECT * INTO v_record
    FROM cn_c3_reported
    WHERE id = p_c3_id
    FOR UPDATE;
    
    IF v_record IS NULL THEN
        RAISE EXCEPTION 'C3 record not found';
    END IF;
    
    IF v_record.posting_status != 'P' THEN
        RAISE EXCEPTION 'Only pending records can be verified. Current status: %', v_record.posting_status;
    END IF;
    
    -- Check if user is same as entered_by
    IF v_record.entered_by = v_user_name THEN
        RAISE EXCEPTION 'The user who entered the record cannot verify it. A different user must verify the C3 record.';
    END IF;
    
    -- Check all wage records are verified first (for employers)
    IF v_record.payer_type = 'ER' THEN
        SELECT COUNT(*) INTO v_unverified_wages
        FROM ip_wages
        WHERE c3_id = p_c3_id AND posting_status != 'V';
        
        IF v_unverified_wages > 0 THEN
            RAISE EXCEPTION 'Cannot verify C3 record. Please verify all wage records first. % wage records are not verified.', v_unverified_wages;
        END IF;
    END IF;
    
    -- Update C3 record status to Verified
    UPDATE cn_c3_reported
    SET posting_status = 'V',
        date_verified = NOW(),
        verified_by = v_user_name,
        modified_date = NOW(),
        modified_by = v_user_name,
        updated_at = NOW()
    WHERE id = p_c3_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'c3_id', p_c3_id,
        'old_status', 'P',
        'new_status', 'V',
        'message', 'C3 record verified successfully'
    );
END;
$$;