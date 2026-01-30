-- Tax Table Details
CREATE TABLE tb_deductions_tax_table_details (
    TaxTabID SERIAL PRIMARY KEY,
    Tax_Year varchar(4) NULL,
    Ded_Code varchar(6) NULL,
    Pay_Period varchar(50) NULL,
    Marital_Stat varchar(1) NULL,
    Over_Amt decimal(18, 3) NULL,
    Base_Amt decimal(18, 3) NULL,
    Tax_Rate decimal(18, 3) NULL,
    Order_No int NULL,
    TaxHeaderID int NULL,
    Month int NULL
);

-- Tax Table Header
CREATE TABLE tb_deductions_tax_table_header (
    TaxTabHID SERIAL PRIMARY KEY,
    Tax_Year varchar(6) NULL,
    Ded_Code varchar(50) NULL,
    Week_Allow decimal(18, 2) NULL,
    Biweek_Allow decimal(18, 2) NULL,
    Smonth_Allow decimal(18, 2) NULL,
    Month_Allow decimal(18, 2) NULL,
    Quarter_Allow decimal(18, 2) NULL,
    Syear_Allow decimal(18, 2) NULL,
    Year_Allow decimal(18, 2) NULL,
    Misc_Allow decimal(18, 2) NULL,
    HRS_Week_Allow decimal(18, 2) NULL,
    HRS_Biweek_Allow decimal(18, 2) NULL,
    HRS_Smonth_Allow decimal(18, 2) NULL,
    HRS_Month_Allow decimal(18, 2) NULL,
    HRS_Quarter_Allow decimal(18, 2) NULL,
    HRS_Syear_Allow decimal(18, 2) NULL,
    HRS_Year_Allow decimal(18, 2) NULL,
    HRS_Misc_Allow decimal(18, 2) NULL,
    Allow_or_Limit varchar(1) NULL,
    StartDate timestamp NULL,
    EndDate timestamp NULL
);

-- Penalty Table
CREATE TABLE tb_penalty (
    id SERIAL PRIMARY KEY,
    effective_start_date timestamp(3) NOT NULL,
    effective_end_date timestamp(3) NULL,
    penalty_type varchar(20) NOT NULL,
    month_number int NOT NULL,
    penalty_percentage decimal(5, 2) NOT NULL,
    description varchar(255) NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_by varchar(50) NOT NULL DEFAULT 'SYSTEM',
    created_date timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by varchar(50) NULL,
    modified_date timestamp(3) NULL
);

-- SSC Rates Table
CREATE TABLE tb_ssc_rates (
    id SERIAL PRIMARY KEY,
    effective_start_date timestamp(3) NOT NULL,
    effective_end_date timestamp(3) NULL,
    employee_ss_percentage decimal(5, 2) NOT NULL DEFAULT 5.00,
    employer_ss_percentage decimal(5, 2) NOT NULL DEFAULT 5.00,
    employee_pe_percentage decimal(5, 2) NOT NULL DEFAULT 1.00,
    employer_ei_percentage decimal(5, 2) NOT NULL DEFAULT 1.00,
    employer_levy_percentage decimal(5, 2) NOT NULL DEFAULT 3.00,
    description varchar(255) NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_by varchar(50) NOT NULL DEFAULT 'SYSTEM',
    created_date timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by varchar(50) NULL,
    modified_date timestamp(3) NULL
);

-- Self Employed Contribution Rate Table
CREATE TABLE tb_self_emp_contrib_rate (
    effstart timestamp(3) NOT NULL,
    effend timestamp(3) NOT NULL,
    wage_cat numeric(10, 2) NOT NULL DEFAULT 0.0,
    sep_ss_percent numeric(5, 2) NOT NULL,
    sep_penalty_percent numeric(5, 2) NULL,
    PRIMARY KEY (effstart, effend, wage_cat)
);

-- Enable RLS on all tables
ALTER TABLE tb_deductions_tax_table_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_deductions_tax_table_header ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_penalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_ssc_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_self_emp_contrib_rate ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to read these master tables
CREATE POLICY "Allow authenticated read access" ON tb_deductions_tax_table_details FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON tb_deductions_tax_table_header FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON tb_penalty FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON tb_ssc_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON tb_self_emp_contrib_rate FOR SELECT TO authenticated USING (true);

-- Create policies for service role to manage data
CREATE POLICY "Allow service role full access" ON tb_deductions_tax_table_details FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON tb_deductions_tax_table_header FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON tb_penalty FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON tb_ssc_rates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON tb_self_emp_contrib_rate FOR ALL TO service_role USING (true) WITH CHECK (true);