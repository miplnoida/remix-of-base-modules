
-- Table for configurable document purpose validation rules
CREATE TABLE public.document_purpose_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_code TEXT NOT NULL,
  doc_description TEXT NOT NULL,
  expected_keywords TEXT[] NOT NULL DEFAULT '{}',
  ai_prompt_hint TEXT,
  min_confidence NUMERIC(3,2) NOT NULL DEFAULT 0.60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(doc_code)
);

-- Table to store validation results per document
CREATE TABLE public.document_validation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  doc_code TEXT NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  confidence NUMERIC(3,2),
  reason TEXT,
  extracted_text_preview TEXT,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_by TEXT
);

-- Seed rules for known document types
INSERT INTO public.document_purpose_rules (doc_code, doc_description, expected_keywords, ai_prompt_hint) VALUES
  ('B', 'Birth Certificate', ARRAY['birth', 'born', 'date of birth', 'place of birth', 'father', 'mother', 'registrar', 'certificate of birth', 'live birth'], 'This should be a birth certificate containing information about a person''s birth including date, place, and parents.'),
  ('V', 'Baptism Certificate', ARRAY['baptism', 'baptised', 'baptized', 'christened', 'church', 'parish', 'godparent', 'minister', 'pastor'], 'This should be a baptism or christening certificate from a religious institution.'),
  ('M', 'Marriage Certificate', ARRAY['marriage', 'married', 'spouse', 'bride', 'groom', 'wedding', 'matrimony', 'certificate of marriage', 'solemnized', 'witness'], 'This should be a marriage certificate containing names of both spouses, marriage date, and officiant details.'),
  ('C', 'Certificate of Death', ARRAY['death', 'deceased', 'died', 'date of death', 'cause of death', 'certificate of death', 'burial', 'funeral'], 'This should be a death certificate with details about the deceased person.'),
  ('P', 'Passport', ARRAY['passport', 'nationality', 'date of issue', 'date of expiry', 'passport number', 'bearer', 'immigration'], 'This should be a passport document with personal identification details.'),
  ('I', 'Identification Card', ARRAY['identification', 'identity', 'id card', 'national id', 'identification number', 'photo id'], 'This should be an identification card or national ID document.'),
  ('L', 'Identification Letter', ARRAY['identification', 'letter', 'certify', 'confirm', 'identity', 'bearer'], 'This should be an official letter confirming the identity of a person.'),
  ('D', 'Deed Poll', ARRAY['deed poll', 'change of name', 'formerly known', 'name change', 'statutory declaration'], 'This should be a deed poll or legal name change document.'),
  ('E', 'Adoption Certificate', ARRAY['adoption', 'adopted', 'adoptive parent', 'certificate of adoption', 'court order'], 'This should be an adoption certificate or court order for adoption.'),
  ('A', 'Affidavit', ARRAY['affidavit', 'sworn', 'oath', 'deponent', 'notary', 'commissioner', 'statutory declaration'], 'This should be a sworn affidavit or statutory declaration.'),
  ('X', 'Divorce Certificate', ARRAY['divorce', 'dissolution', 'decree absolute', 'decree nisi', 'certificate of divorce', 'former spouse'], 'This should be a divorce certificate or decree.');
