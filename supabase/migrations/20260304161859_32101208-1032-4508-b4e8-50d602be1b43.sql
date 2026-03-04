-- Fix historical records where document_type was stored as 'mandatory' instead of actual tb_verify code
-- and verification_category was stored as 'birth_status' instead of 'birth'

UPDATE ip_application_documents
SET document_type = CASE document_name
  WHEN 'Birth Certificate' THEN 'B'
  WHEN 'Baptism Certificate' THEN 'V'
  WHEN 'Marriage Certificate' THEN 'M'
  WHEN 'Certificate of Death' THEN 'C'
  WHEN 'Identification Card' THEN 'I'
  WHEN 'Identification Letter' THEN 'L'
  WHEN 'Passport' THEN 'P'
  WHEN 'Affidavit' THEN 'A'
  WHEN 'Deed Poll' THEN 'D'
  WHEN 'Divorce Certificate' THEN 'X'
  WHEN 'Adoption Certificate' THEN 'E'
  ELSE document_type
END
WHERE document_type = 'mandatory';

-- Normalize verification_category from 'birth_status' → 'birth', etc.
UPDATE ip_application_documents
SET verification_category = CASE verification_category
  WHEN 'birth_status' THEN 'birth'
  WHEN 'name_status' THEN 'name'
  WHEN 'marital_status' THEN 'marital'
  WHEN 'death_status' THEN 'death'
  ELSE verification_category
END
WHERE verification_category IN ('birth_status', 'name_status', 'marital_status', 'death_status');