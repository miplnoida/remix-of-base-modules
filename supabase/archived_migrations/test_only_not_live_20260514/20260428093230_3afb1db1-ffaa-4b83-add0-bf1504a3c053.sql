-- Relax verification_type validation: it is free-form metadata, not a fixed enum
DROP TRIGGER IF EXISTS trg_validate_verification_type ON public.ip_application_documents;
DROP FUNCTION IF EXISTS public.validate_verification_type();

COMMENT ON COLUMN public.ip_application_documents.verification_type IS
  'Free-form verification type metadata (e.g. birth_status, name_status, marital_status, death_status, supportive, photo, identity, ...). May be NULL. No whitelist enforced.';
