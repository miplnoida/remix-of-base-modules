
-- 1. Add missing columns to notification_templates
ALTER TABLE public.notification_templates
  ADD COLUMN IF NOT EXISTS template_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS trigger_event text,
  ADD COLUMN IF NOT EXISTS html_body text,
  ADD COLUMN IF NOT EXISTS version_no integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'informational',
  ADD COLUMN IF NOT EXISTS description text;

-- 2. Create email layout components table (shared header/footer)
CREATE TABLE IF NOT EXISTS public.email_layout_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_type text NOT NULL CHECK (component_type IN ('header','footer')),
  display_name text NOT NULL,
  html_content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  version_no integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (component_type)   -- only one active header and footer
);

-- 3. Create template version history table
CREATE TABLE IF NOT EXISTS public.notification_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.notification_templates(id) ON DELETE CASCADE,
  version_no integer NOT NULL,
  name text NOT NULL,
  subject text,
  body text,
  html_body text,
  placeholders jsonb,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  change_summary text
);

-- 4. Create template audit log table
CREATE TABLE IF NOT EXISTS public.notification_template_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  template_name text,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  details jsonb
);

-- 5. RLS for email_layout_components
ALTER TABLE public.email_layout_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "elc_select" ON public.email_layout_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "elc_admin" ON public.email_layout_components TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));

-- 6. RLS for version history
ALTER TABLE public.notification_template_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ntv_select" ON public.notification_template_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ntv_admin" ON public.notification_template_versions TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));

-- 7. RLS for audit logs
ALTER TABLE public.notification_template_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ntal_select" ON public.notification_template_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::public.app_role));
CREATE POLICY "ntal_insert" ON public.notification_template_audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- 8. Seed default header layout
INSERT INTO public.email_layout_components (component_type, display_name, html_content, is_active)
VALUES (
  'header',
  'Default Header',
  '<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; }
  .email-wrapper { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
  .header { background-color: #1a3353; padding: 32px 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0 0 6px 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
  .header p { color: #a8c4e0; margin: 0; font-size: 13px; }
</style>
</head>
<body>
<div class="email-wrapper">
  <div class="header">
    <h1>{{EMAIL_TITLE}}</h1>
    <p>Social Security Board</p>
  </div>
  <div class="body-content" style="padding: 32px 28px;">',
  true
)
ON CONFLICT (component_type) DO NOTHING;

-- 9. Seed default footer layout
INSERT INTO public.email_layout_components (component_type, display_name, html_content, is_active)
VALUES (
  'footer',
  'Default Footer',
  '  </div>
  <div class="footer" style="background-color: #f8f9fa; border-top: 1px solid #e9ecef; padding: 20px 28px; text-align: center;">
    <p style="color: #6c757d; font-size: 12px; margin: 0 0 4px 0;">Social Security Board &bull; St. Kitts and Nevis</p>
    <p style="color: #adb5bd; font-size: 11px; margin: 0;">This is an automated message, please do not reply directly to this email.</p>
  </div>
</div>
</body>
</html>',
  true
)
ON CONFLICT (component_type) DO NOTHING;

-- 10. Function to merge template with layout
CREATE OR REPLACE FUNCTION public.render_email_template(
  p_template_id uuid,
  p_variables jsonb DEFAULT '{}'::jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_header text;
  v_footer text;
  v_body text;
  v_merged text;
  v_key text;
  v_value text;
BEGIN
  -- Get template
  SELECT * INTO v_template FROM notification_templates WHERE id = p_template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Template % not found', p_template_id; END IF;

  -- Get header and footer
  SELECT html_content INTO v_header FROM email_layout_components WHERE component_type = 'header' AND is_active = true;
  SELECT html_content INTO v_footer FROM email_layout_components WHERE component_type = 'footer' AND is_active = true;

  -- Use html_body if available, else body
  v_body := COALESCE(v_template.html_body, v_template.body);

  -- Replace EMAIL_TITLE placeholder in header with subject
  v_header := replace(v_header, '{{EMAIL_TITLE}}', COALESCE(v_template.subject, v_template.name));

  -- Merge header + body + footer
  v_merged := COALESCE(v_header, '') || v_body || COALESCE(v_footer, '');

  -- Replace variables
  IF p_variables IS NOT NULL THEN
    FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
    LOOP
      v_merged := replace(v_merged, '{{' || v_key || '}}', COALESCE(v_value, ''));
    END LOOP;
  END IF;

  RETURN v_merged;
END;
$$;

GRANT EXECUTE ON FUNCTION public.render_email_template(uuid, jsonb) TO authenticated;

-- 11. Index for template_code
CREATE INDEX IF NOT EXISTS idx_notification_templates_code ON public.notification_templates (template_code);
CREATE INDEX IF NOT EXISTS idx_notification_templates_trigger ON public.notification_templates (trigger_event);
