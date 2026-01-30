-- Create ip_self_category table
CREATE TABLE ip_self_category (
    ssn varchar(6) NOT NULL,
    self_ref_no varchar(6) NOT NULL,
    activity_seq_no varchar(6) NOT NULL,
    effective_start_date timestamp(3) NOT NULL,
    effective_end_date timestamp(3) NULL,
    wage_category numeric(10, 2) NULL DEFAULT 0.0,
    PRIMARY KEY (ssn, self_ref_no, activity_seq_no, effective_start_date)
);

-- Create ip_vol_contrib table
CREATE TABLE ip_vol_contrib (
    ssn varchar(6) NOT NULL,
    date_commenced timestamp(3) NULL,
    date_ceased timestamp(3) NULL,
    contrib_amt decimal(10, 4) NULL,
    payment_interval varchar(2) NULL,
    last_payment_date timestamp(3) NULL,
    due_date timestamp(3) NULL,
    date_registered timestamp(3) NOT NULL,
    avg_weekly_wage decimal(12, 4) NULL,
    PRIMARY KEY (ssn, date_registered)
);

-- Create ip_vol_contrib_wages table
CREATE TABLE ip_vol_contrib_wages (
    ssn varchar(6) NOT NULL,
    payment_sequence_no numeric(15, 0) NOT NULL,
    period timestamp(3) NULL,
    contrib_amt numeric(10, 2) NULL DEFAULT 0.0,
    PRIMARY KEY (ssn, payment_sequence_no)
);

-- Create c3_wage_category table
CREATE TABLE c3_wage_category (
    category_id SERIAL PRIMARY KEY,
    category varchar(50) NULL,
    weekly_income numeric(18, 4) NULL,
    weekly_contribution numeric(18, 4) NULL,
    category_description varchar(2000) NULL,
    ses_id int NULL,
    is_locked int NULL
);

-- Enable RLS on all tables
ALTER TABLE ip_self_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_vol_contrib ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_vol_contrib_wages ENABLE ROW LEVEL SECURITY;
ALTER TABLE c3_wage_category ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ip_self_category
CREATE POLICY "Allow authenticated read access" ON ip_self_category FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access" ON ip_self_category FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create RLS policies for ip_vol_contrib
CREATE POLICY "Allow authenticated read access" ON ip_vol_contrib FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access" ON ip_vol_contrib FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create RLS policies for ip_vol_contrib_wages
CREATE POLICY "Allow authenticated read access" ON ip_vol_contrib_wages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access" ON ip_vol_contrib_wages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create RLS policies for c3_wage_category
CREATE POLICY "Allow authenticated read access" ON c3_wage_category FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access" ON c3_wage_category FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Insert data into c3_wage_category
INSERT INTO c3_wage_category (category, weekly_income, weekly_contribution, category_description, ses_id, is_locked) VALUES 
('A', 200.00, 20.00, NULL, 1, 1),
('B', 300.00, 30.00, NULL, 1, 1),
('C', 400.00, 40.00, NULL, 1, 1),
('D', 500.00, 50.00, NULL, 1, 1),
('E', 600.00, 60.00, NULL, 1, 1),
('F', 700.00, 70.00, NULL, 1, 1),
('G', 800.00, 80.00, NULL, 1, 1),
('H', 900.00, 90.00, NULL, 1, 1),
('I', 1000.00, 100.00, NULL, 1, 1),
('J', 1100.00, 110.00, NULL, 1, 1),
('K', 1200.00, 120.00, NULL, 1, 1),
('L', 1350.00, 135.00, NULL, 1, 1),
('M', 1500.00, 150.00, NULL, 1, 1),
('Special', 100.00, 10.00, NULL, 1, 1);