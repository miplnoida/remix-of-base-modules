ALTER TABLE public.core_department_profile
  ADD COLUMN IF NOT EXISTS notification_sender_email      text,
  ADD COLUMN IF NOT EXISTS notification_sender_name       text,
  ADD COLUMN IF NOT EXISTS reply_to_email                 text,
  ADD COLUMN IF NOT EXISTS support_email                  text,
  ADD COLUMN IF NOT EXISTS default_salutation             text,
  ADD COLUMN IF NOT EXISTS default_document_owner_user_code text,
  ADD COLUMN IF NOT EXISTS retention_days                 integer,
  ADD COLUMN IF NOT EXISTS dms_folder_pattern             text,
  ADD COLUMN IF NOT EXISTS ai_context_settings            jsonb NOT NULL DEFAULT '{}'::jsonb;