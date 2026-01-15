-- Create tb_relation master table
CREATE TABLE IF NOT EXISTS public.tb_relation (
    code VARCHAR(3) PRIMARY KEY NOT NULL,
    description VARCHAR(25) NOT NULL,
    surv_type VARCHAR(2) NULL
);

-- Insert initial relation types
INSERT INTO public.tb_relation (code, description, surv_type) VALUES
    ('CTT', 'Contact', 'CT'),
    ('FAT', 'Father', 'PA'),
    ('MOT', 'Mother', 'PA'),
    ('SPO', 'Spouse', 'SP'),
    ('SON', 'Son', 'CH'),
    ('DAU', 'Daughter', 'CH'),
    ('BRO', 'Brother', 'SB'),
    ('SIS', 'Sister', 'SB'),
    ('WIT', 'Witness', 'WT'),
    ('BEN', 'Beneficiary', 'BN'),
    ('GUA', 'Guardian', 'GU'),
    ('OTH', 'Other', 'OT')
ON CONFLICT (code) DO NOTHING;

-- Enable RLS on tb_relation
ALTER TABLE public.tb_relation ENABLE ROW LEVEL SECURITY;

-- Allow public read access to tb_relation
CREATE POLICY "tb_relation_select" ON public.tb_relation FOR SELECT USING (true);

-- Drop existing ip_depend table and recreate with new schema
DROP TABLE IF EXISTS public.ip_depend CASCADE;

-- Create new ip_depend table with specified schema
CREATE TABLE public.ip_depend (
    ssn VARCHAR(6) NOT NULL,
    depend_id VARCHAR(6) NOT NULL,
    depend_ssn VARCHAR(6) NULL,
    surname VARCHAR(50) NULL,
    firstname VARCHAR(25) NULL,
    middle_name VARCHAR(25) NULL,
    dob TIMESTAMP(3) NULL,
    sex CHAR(1) NULL,
    relation VARCHAR(3) NULL REFERENCES public.tb_relation(code),
    depend_addr1 VARCHAR(30) NULL,
    depend_addr2 VARCHAR(30) NULL,
    school_child CHAR(1) NULL,
    invalid VARCHAR(1) NULL,
    date_modified TIMESTAMP(3) NULL,
    userid VARCHAR(5) NULL,
    tran_code VARCHAR(3) NULL,
    status CHAR(1) DEFAULT 'P',
    date_of_death TIMESTAMP(3) NULL,
    PRIMARY KEY (ssn, depend_id)
);

-- Add foreign key to ip_master
ALTER TABLE public.ip_depend 
ADD CONSTRAINT fk_ip_depend_ssn 
FOREIGN KEY (ssn) REFERENCES public.ip_master(ssn) ON DELETE CASCADE;

-- Enable RLS on ip_depend
ALTER TABLE public.ip_depend ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage ip_depend
CREATE POLICY "ip_depend_select" ON public.ip_depend FOR SELECT TO authenticated USING (true);
CREATE POLICY "ip_depend_insert" ON public.ip_depend FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ip_depend_update" ON public.ip_depend FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ip_depend_delete" ON public.ip_depend FOR DELETE TO authenticated USING (true);

-- Create sequence for depend_id per SSN using a function
CREATE OR REPLACE FUNCTION public.generate_depend_id(p_ssn VARCHAR(6))
RETURNS VARCHAR(6)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_id INTEGER;
    v_new_id VARCHAR(6);
BEGIN
    -- Get the maximum depend_id for this SSN
    SELECT COALESCE(MAX(CAST(depend_id AS INTEGER)), 0) + 1
    INTO v_max_id
    FROM public.ip_depend
    WHERE ssn = p_ssn;
    
    -- Format as 6-character zero-padded string
    v_new_id := LPAD(v_max_id::TEXT, 6, '0');
    
    RETURN v_new_id;
END;
$$;

-- Drop existing ip_notes table and recreate with new schema
DROP TABLE IF EXISTS public.ip_notes CASCADE;

-- Create new ip_notes table with specified schema
CREATE TABLE public.ip_notes (
    ssn VARCHAR(6) NOT NULL,
    note_date TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    note VARCHAR(100) NULL,
    userid VARCHAR(5) NULL,
    note_tran_code VARCHAR(3) NULL,
    note_seq BIGSERIAL,
    PRIMARY KEY (ssn, note_date, note_seq)
);

-- Add foreign key to ip_master
ALTER TABLE public.ip_notes 
ADD CONSTRAINT fk_ip_notes_ssn 
FOREIGN KEY (ssn) REFERENCES public.ip_master(ssn) ON DELETE CASCADE;

-- Enable RLS on ip_notes
ALTER TABLE public.ip_notes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage ip_notes
CREATE POLICY "ip_notes_select" ON public.ip_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ip_notes_insert" ON public.ip_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ip_notes_update" ON public.ip_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ip_notes_delete" ON public.ip_notes FOR DELETE TO authenticated USING (true);

-- Add registration_date column to ip_master if not exists
ALTER TABLE public.ip_master ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP WITH TIME ZONE NULL;