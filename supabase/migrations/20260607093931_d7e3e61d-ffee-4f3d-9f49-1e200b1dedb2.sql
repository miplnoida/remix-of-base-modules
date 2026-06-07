
ALTER TABLE public.bn_letter
  ADD COLUMN IF NOT EXISTS rendered_subject text,
  ADD COLUMN IF NOT EXISTS rendered_body_html text,
  ADD COLUMN IF NOT EXISTS rendered_body_text text,
  ADD COLUMN IF NOT EXISTS template_version_id uuid REFERENCES public.notification_template_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_version_no integer;

CREATE INDEX IF NOT EXISTS idx_bn_letter_template_version ON public.bn_letter(template_version_id);
