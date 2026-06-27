
ALTER TABLE public.comm_letterhead
  ADD COLUMN IF NOT EXISTS owner_department_code text,
  ADD COLUMN IF NOT EXISTS business_object text,
  ADD COLUMN IF NOT EXISTS recipient_type text,
  ADD COLUMN IF NOT EXISTS security_classification text,
  ADD COLUMN IF NOT EXISTS communication_profile_code text,
  ADD COLUMN IF NOT EXISTS document_profile_code text,
  ADD COLUMN IF NOT EXISTS signature_policy text,
  ADD COLUMN IF NOT EXISTS stamp_policy text,
  ADD COLUMN IF NOT EXISTS approval_workflow_code text,
  ADD COLUMN IF NOT EXISTS retention_policy text,
  ADD COLUMN IF NOT EXISTS dms_folder text,
  ADD COLUMN IF NOT EXISTS default_language text,
  ADD COLUMN IF NOT EXISTS supported_languages text[],
  ADD COLUMN IF NOT EXISTS output_channels text[];
