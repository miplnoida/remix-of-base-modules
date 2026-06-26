
ALTER TABLE public.lg_department_profile
  ADD COLUMN IF NOT EXISTS time_zone text,
  ADD COLUMN IF NOT EXISTS fax text,
  ADD COLUMN IF NOT EXISTS reply_to_email text,
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS head_of_legal_staff_id uuid,
  ADD COLUMN IF NOT EXISTS deputy_head_staff_id uuid,
  ADD COLUMN IF NOT EXISTS default_team_id uuid,
  ADD COLUMN IF NOT EXISTS default_workbasket_id uuid,
  ADD COLUMN IF NOT EXISTS letter_signature text,
  ADD COLUMN IF NOT EXISTS email_signature text,
  ADD COLUMN IF NOT EXISTS notice_footer text,
  ADD COLUMN IF NOT EXISTS default_salutation text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS dms_folder_root text,
  ADD COLUMN IF NOT EXISTS ai_prompt_prefix text,
  ADD COLUMN IF NOT EXISTS show_on_pdfs boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_letterhead_on_reports boolean NOT NULL DEFAULT true;
