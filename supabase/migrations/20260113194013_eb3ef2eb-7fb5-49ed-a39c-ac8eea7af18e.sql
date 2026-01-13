-- Step 1: Create master tables

-- Create tb_occup (Occupation master table)
CREATE TABLE IF NOT EXISTS public.tb_occup (
    code VARCHAR(4) PRIMARY KEY NOT NULL,
    short_description VARCHAR(25) NULL,
    long_description VARCHAR(60) NULL
);

-- Create tb_country (Country master table)
CREATE TABLE IF NOT EXISTS public.tb_country (
    code VARCHAR(3) PRIMARY KEY NOT NULL,
    description VARCHAR(25) NULL,
    nationality VARCHAR(25) NULL,
    oecs SMALLINT NULL,
    caricom SMALLINT NULL
);

-- Create tb_verify (Verification documents master table)
CREATE TABLE IF NOT EXISTS public.tb_verify (
    code VARCHAR(1) PRIMARY KEY NOT NULL,
    description VARCHAR(25) NULL
);

-- Create tb_dependent_relation (Dependent relation master table)
CREATE TABLE IF NOT EXISTS public.tb_dependent_relation (
    code VARCHAR(3) PRIMARY KEY NOT NULL,
    description VARCHAR(20) NOT NULL
);

-- Create tb_eye_color (Eye color master table)
CREATE TABLE IF NOT EXISTS public.tb_eye_color (
    code VARCHAR(10) PRIMARY KEY NOT NULL,
    description VARCHAR(25) NULL
);

-- Create tb_postal_district (Postal district master table)
CREATE TABLE IF NOT EXISTS public.tb_postal_district (
    code VARCHAR(10) PRIMARY KEY NOT NULL,
    description VARCHAR(50) NULL
);

-- Create sequence for temp SSN
CREATE SEQUENCE IF NOT EXISTS ip_temp_ssn_seq START WITH 1 INCREMENT BY 1;

-- Step 2: Add missing columns to ip_master
ALTER TABLE public.ip_master 
ADD COLUMN IF NOT EXISTS surname VARCHAR(25),
ADD COLUMN IF NOT EXISTS firstname VARCHAR(25),
ADD COLUMN IF NOT EXISTS previous_name VARCHAR(25),
ADD COLUMN IF NOT EXISTS sex CHAR(1),
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS resident_addr1 VARCHAR(30),
ADD COLUMN IF NOT EXISTS resident_addr2 VARCHAR(30),
ADD COLUMN IF NOT EXISTS district VARCHAR(3),
ADD COLUMN IF NOT EXISTS mail_addr1 VARCHAR(30),
ADD COLUMN IF NOT EXISTS mail_addr2 VARCHAR(30),
ADD COLUMN IF NOT EXISTS birth_place_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS nationality_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS date_of_residency DATE,
ADD COLUMN IF NOT EXISTS date_married DATE,
ADD COLUMN IF NOT EXISTS spouse_name VARCHAR(35),
ADD COLUMN IF NOT EXISTS spouse_addr1 VARCHAR(30),
ADD COLUMN IF NOT EXISTS spouse_addr2 VARCHAR(30),
ADD COLUMN IF NOT EXISTS father_name VARCHAR(35),
ADD COLUMN IF NOT EXISTS mother_name VARCHAR(35),
ADD COLUMN IF NOT EXISTS beneficiary VARCHAR(35),
ADD COLUMN IF NOT EXISTS ben_addr1 VARCHAR(30),
ADD COLUMN IF NOT EXISTS ben_addr2 VARCHAR(30),
ADD COLUMN IF NOT EXISTS contact VARCHAR(35),
ADD COLUMN IF NOT EXISTS contact_relation VARCHAR(20),
ADD COLUMN IF NOT EXISTS contact_addr1 VARCHAR(30),
ADD COLUMN IF NOT EXISTS contact_addr2 VARCHAR(30),
ADD COLUMN IF NOT EXISTS phone VARCHAR(10),
ADD COLUMN IF NOT EXISTS work_permit CHAR(1),
ADD COLUMN IF NOT EXISTS primary_occup VARCHAR(4),
ADD COLUMN IF NOT EXISTS self_ref_no VARCHAR(6),
ADD COLUMN IF NOT EXISTS asp_num VARCHAR(6),
ADD COLUMN IF NOT EXISTS npf CHAR(1),
ADD COLUMN IF NOT EXISTS date_died DATE,
ADD COLUMN IF NOT EXISTS verify_birth_code CHAR(1),
ADD COLUMN IF NOT EXISTS verify_name_code CHAR(1),
ADD COLUMN IF NOT EXISTS verify_marital_code CHAR(1),
ADD COLUMN IF NOT EXISTS verify_death_code CHAR(1),
ADD COLUMN IF NOT EXISTS witness_name VARCHAR(35),
ADD COLUMN IF NOT EXISTS date_witnessed DATE,
ADD COLUMN IF NOT EXISTS ip_signature VARCHAR(1),
ADD COLUMN IF NOT EXISTS temp_card_date DATE,
ADD COLUMN IF NOT EXISTS perm_card_date DATE,
ADD COLUMN IF NOT EXISTS card_expiration DATE,
ADD COLUMN IF NOT EXISTS old_card_attached CHAR(1),
ADD COLUMN IF NOT EXISTS date_card_recvd DATE,
ADD COLUMN IF NOT EXISTS termination_date DATE,
ADD COLUMN IF NOT EXISTS termination_code CHAR(1),
ADD COLUMN IF NOT EXISTS date_modified TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS userid VARCHAR(5),
ADD COLUMN IF NOT EXISTS tran_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS date_of_entry TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_addr VARCHAR(40),
ADD COLUMN IF NOT EXISTS name_prefix VARCHAR(6),
ADD COLUMN IF NOT EXISTS name_suffix VARCHAR(6),
ADD COLUMN IF NOT EXISTS entered_by VARCHAR(5),
ADD COLUMN IF NOT EXISTS deb_crd_amount NUMERIC(10, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS vol_contrib VARCHAR(1),
ADD COLUMN IF NOT EXISTS delivery_zone CHAR(1),
ADD COLUMN IF NOT EXISTS place_of_residence_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS citizenship_flag CHAR(1),
ADD COLUMN IF NOT EXISTS heightfeet SMALLINT,
ADD COLUMN IF NOT EXISTS heightinches SMALLINT,
ADD COLUMN IF NOT EXISTS eyecolor VARCHAR(10),
ADD COLUMN IF NOT EXISTS photo_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS signature_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_mobile VARCHAR(10),
ADD COLUMN IF NOT EXISTS spouse_ssn VARCHAR(6),
ADD COLUMN IF NOT EXISTS spouse_dob DATE,
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(10),
ADD COLUMN IF NOT EXISTS contact_mobile VARCHAR(10),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(40),
ADD COLUMN IF NOT EXISTS work_permit_expiration DATE,
ADD COLUMN IF NOT EXISTS ip_code VARCHAR(12),
ADD COLUMN IF NOT EXISTS registration_date DATE;

-- Step 3: Update ip_depend table to match exact schema
ALTER TABLE public.ip_depend
ADD COLUMN IF NOT EXISTS depend_id VARCHAR(6),
ADD COLUMN IF NOT EXISTS depend_ssn VARCHAR(6),
ADD COLUMN IF NOT EXISTS surname VARCHAR(50),
ADD COLUMN IF NOT EXISTS firstname VARCHAR(25),
ADD COLUMN IF NOT EXISTS middle_name_dep VARCHAR(25),
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS sex CHAR(1),
ADD COLUMN IF NOT EXISTS relation VARCHAR(3),
ADD COLUMN IF NOT EXISTS depend_addr1 VARCHAR(30),
ADD COLUMN IF NOT EXISTS depend_addr2 VARCHAR(30),
ADD COLUMN IF NOT EXISTS school_child CHAR(1),
ADD COLUMN IF NOT EXISTS invalid VARCHAR(1),
ADD COLUMN IF NOT EXISTS date_modified TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS userid VARCHAR(5),
ADD COLUMN IF NOT EXISTS tran_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS date_of_death DATE;

-- Step 4: Update ip_notes table
ALTER TABLE public.ip_notes
ADD COLUMN IF NOT EXISTS note_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS note VARCHAR(100),
ADD COLUMN IF NOT EXISTS userid VARCHAR(5),
ADD COLUMN IF NOT EXISTS note_tran_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS note_seq SERIAL;

-- Enable RLS on new tables
ALTER TABLE public.tb_occup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_country ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_verify ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_dependent_relation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_eye_color ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_postal_district ENABLE ROW LEVEL SECURITY;

-- Create policies for master tables (allow read for authenticated users)
CREATE POLICY "Allow authenticated users to read tb_occup" ON public.tb_occup 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read tb_country" ON public.tb_country 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read tb_verify" ON public.tb_verify 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read tb_dependent_relation" ON public.tb_dependent_relation 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read tb_eye_color" ON public.tb_eye_color 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read tb_postal_district" ON public.tb_postal_district 
FOR SELECT TO authenticated USING (true);

-- Function to generate temporary SSN (starts with 'T' and 5 digits)
CREATE OR REPLACE FUNCTION public.generate_temp_ssn()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'T' || LPAD(nextval('ip_temp_ssn_seq')::TEXT, 5, '0');
END;
$$;