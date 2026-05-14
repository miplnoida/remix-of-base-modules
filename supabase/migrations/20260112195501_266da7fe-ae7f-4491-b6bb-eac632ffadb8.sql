
-- Insured Person Registration Module Tables

-- SSN sequence for generating 6-digit SSN
CREATE SEQUENCE IF NOT EXISTS ip_ssn_seq START 100001 MAXVALUE 999999;

-- Application ID sequence for generating TE00001 format
CREATE SEQUENCE IF NOT EXISTS ip_application_seq START 1;

-- Main verified IP records
CREATE TABLE public.ip_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unique_uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL UNIQUE,
  ssn TEXT UNIQUE,
  
  -- Basic Details
  title TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  suffix TEXT,
  maiden_name TEXT,
  alias TEXT,
  gender TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  marital_status TEXT NOT NULL,
  date_married DATE,
  height_feet INTEGER,
  height_inches INTEGER,
  birth_place TEXT,
  nationality TEXT NOT NULL,
  eye_color TEXT,
  
  -- Address & Contact
  resident_address_1 TEXT,
  resident_address_2 TEXT,
  postal_district TEXT,
  mailing_address TEXT,
  email TEXT,
  telephone TEXT,
  mobile TEXT,
  
  -- Employment Details
  occupation TEXT,
  work_permit_status TEXT,
  npf_status TEXT,
  application_date DATE,
  date_resident DATE,
  place_of_residence TEXT,
  work_permit_expiry DATE,
  citizenship TEXT,
  signature_on_file TEXT,
  
  -- Document Verification
  marital_doc_type TEXT,
  birth_doc_type TEXT,
  death_doc_type TEXT,
  name_doc_type TEXT,
  
  -- Status and Workflow
  status TEXT NOT NULL DEFAULT 'V', -- V=Verified, P=Pending, R=Rejected
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified_by UUID,
  date_verified TIMESTAMP WITH TIME ZONE,
  rejected_by UUID,
  date_rejected TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT
);

-- Temporary IP records (drafts and pending)
CREATE TABLE public.tmp_ip_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unique_uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL UNIQUE,
  ssn TEXT,
  
  -- Basic Details
  title TEXT,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  suffix TEXT,
  maiden_name TEXT,
  alias TEXT,
  gender TEXT,
  date_of_birth DATE,
  marital_status TEXT,
  date_married DATE,
  height_feet INTEGER,
  height_inches INTEGER,
  birth_place TEXT,
  nationality TEXT,
  eye_color TEXT,
  
  -- Address & Contact
  resident_address_1 TEXT,
  resident_address_2 TEXT,
  postal_district TEXT,
  mailing_address TEXT,
  email TEXT,
  telephone TEXT,
  mobile TEXT,
  
  -- Employment Details
  occupation TEXT,
  work_permit_status TEXT,
  npf_status TEXT,
  application_date DATE,
  date_resident DATE,
  place_of_residence TEXT,
  work_permit_expiry DATE,
  citizenship TEXT,
  signature_on_file TEXT,
  
  -- Document Verification
  marital_doc_type TEXT,
  birth_doc_type TEXT,
  death_doc_type TEXT,
  name_doc_type TEXT,
  
  -- Status: D=Draft, P=Pending, R=Rejected
  status TEXT NOT NULL DEFAULT 'D',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by UUID
);

-- Verified dependents
CREATE TABLE public.ip_depend (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_id UUID REFERENCES ip_master(id),
  unique_uuid UUID NOT NULL,
  relation_type TEXT NOT NULL,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  ssn TEXT,
  status TEXT DEFAULT 'A', -- A=Active, D=Deceased
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Temporary dependents
CREATE TABLE public.tmp_ip_dependents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tmp_ip_id UUID REFERENCES tmp_ip_master(id) ON DELETE CASCADE,
  unique_uuid UUID NOT NULL,
  relation_type TEXT NOT NULL,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  ssn TEXT,
  status TEXT DEFAULT 'A', -- A=Active, archive=deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Deleted dependents audit table
CREATE TABLE public.mi_tb_del_ip_depend (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID NOT NULL,
  ip_id UUID,
  unique_uuid UUID NOT NULL,
  relation_type TEXT,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_by UUID,
  deletion_reason TEXT
);

-- Verified notes
CREATE TABLE public.ip_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_id UUID REFERENCES ip_master(id),
  unique_uuid UUID NOT NULL,
  note_type TEXT,
  note_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Temporary notes
CREATE TABLE public.tmp_ip_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tmp_ip_id UUID REFERENCES tmp_ip_master(id) ON DELETE CASCADE,
  unique_uuid UUID NOT NULL,
  note_type TEXT,
  note_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- IP Name history
CREATE TABLE public.ip_name (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_id UUID REFERENCES ip_master(id),
  unique_uuid UUID NOT NULL,
  previous_first_name TEXT,
  previous_middle_name TEXT,
  previous_last_name TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  changed_by UUID,
  reason TEXT
);

-- IP Documents
CREATE TABLE public.ip_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unique_uuid UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by UUID,
  is_temp BOOLEAN DEFAULT true
);

-- IP Audit Log
CREATE TABLE public.ip_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  unique_uuid UUID,
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  changed_by UUID,
  user_name TEXT
);

-- Function to generate application ID
CREATE OR REPLACE FUNCTION generate_application_id()
RETURNS TEXT AS $$
DECLARE
  next_val INTEGER;
BEGIN
  SELECT nextval('ip_application_seq') INTO next_val;
  RETURN 'TE' || LPAD(next_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate SSN
CREATE OR REPLACE FUNCTION generate_ip_ssn()
RETURNS TEXT AS $$
BEGIN
  RETURN nextval('ip_ssn_seq')::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to check duplicates
CREATE OR REPLACE FUNCTION check_ip_duplicates(
  p_first_name TEXT,
  p_last_name TEXT,
  p_dob DATE,
  p_gender TEXT,
  p_exclude_uuid UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  ssn TEXT,
  full_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  match_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    im.id,
    im.ssn,
    CONCAT(im.first_name, ' ', COALESCE(im.middle_name, ''), ' ', im.last_name) as full_name,
    im.date_of_birth,
    im.gender,
    (
      CASE WHEN LOWER(im.first_name) = LOWER(p_first_name) THEN 30 ELSE 0 END +
      CASE WHEN LOWER(im.last_name) = LOWER(p_last_name) THEN 30 ELSE 0 END +
      CASE WHEN im.date_of_birth = p_dob THEN 25 ELSE 0 END +
      CASE WHEN LOWER(im.gender) = LOWER(p_gender) THEN 15 ELSE 0 END
    ) as match_score
  FROM ip_master im
  WHERE im.unique_uuid != COALESCE(p_exclude_uuid, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      (LOWER(im.first_name) = LOWER(p_first_name) AND LOWER(im.last_name) = LOWER(p_last_name))
      OR (im.date_of_birth = p_dob AND LOWER(im.gender) = LOWER(p_gender))
    )
  ORDER BY match_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.ip_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmp_ip_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_depend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmp_ip_dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmp_ip_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_name ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mi_tb_del_ip_depend ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Users can view all ip_master" ON public.ip_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert ip_master" ON public.ip_master FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update ip_master" ON public.ip_master FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can view all tmp_ip_master" ON public.tmp_ip_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert tmp_ip_master" ON public.tmp_ip_master FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update tmp_ip_master" ON public.tmp_ip_master FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete tmp_ip_master" ON public.tmp_ip_master FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view all ip_depend" ON public.ip_depend FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert ip_depend" ON public.ip_depend FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update ip_depend" ON public.ip_depend FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can view all tmp_ip_dependents" ON public.tmp_ip_dependents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert tmp_ip_dependents" ON public.tmp_ip_dependents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update tmp_ip_dependents" ON public.tmp_ip_dependents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete tmp_ip_dependents" ON public.tmp_ip_dependents FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view all ip_notes" ON public.ip_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert ip_notes" ON public.ip_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update ip_notes" ON public.ip_notes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can view all tmp_ip_notes" ON public.tmp_ip_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert tmp_ip_notes" ON public.tmp_ip_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update tmp_ip_notes" ON public.tmp_ip_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete tmp_ip_notes" ON public.tmp_ip_notes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view all ip_name" ON public.ip_name FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert ip_name" ON public.ip_name FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view all ip_documents" ON public.ip_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert ip_documents" ON public.ip_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update ip_documents" ON public.ip_documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete ip_documents" ON public.ip_documents FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view all ip_audit_log" ON public.ip_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert ip_audit_log" ON public.ip_audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view all mi_tb_del_ip_depend" ON public.mi_tb_del_ip_depend FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert mi_tb_del_ip_depend" ON public.mi_tb_del_ip_depend FOR INSERT TO authenticated WITH CHECK (true);

-- Create storage bucket for IP documents
INSERT INTO storage.buckets (id, name, public) VALUES ('ip-documents', 'ip-documents', false) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload IP documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ip-documents');
CREATE POLICY "Authenticated users can view IP documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'ip-documents');
CREATE POLICY "Authenticated users can delete IP documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ip-documents');
