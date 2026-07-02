ALTER TABLE public.notification_templates
  ADD COLUMN IF NOT EXISTS default_layout_id uuid NULL
    REFERENCES public.core_template_layout(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_notification_templates_default_layout
  ON public.notification_templates(default_layout_id);