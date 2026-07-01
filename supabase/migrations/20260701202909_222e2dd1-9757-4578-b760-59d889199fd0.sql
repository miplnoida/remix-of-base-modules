
-- 1. core_template: mark base layouts and tag business category
ALTER TABLE public.core_template
  ADD COLUMN IF NOT EXISTS is_base_layout boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_category text;

CREATE INDEX IF NOT EXISTS idx_core_template_business_category
  ON public.core_template(business_category);

-- 2. core_template_layout: mark base layouts
ALTER TABLE public.core_template_layout
  ADD COLUMN IF NOT EXISTS is_base_layout boolean NOT NULL DEFAULT false;

UPDATE public.core_template_layout
   SET is_base_layout = true
 WHERE code LIKE 'BASE_%';

-- 3. notification_templates: bridge columns
ALTER TABLE public.notification_templates
  ADD COLUMN IF NOT EXISTS mapped_core_template_id uuid REFERENCES public.core_template(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS migration_status text NOT NULL DEFAULT 'pending'
    CHECK (migration_status IN ('pending','mapped','deprecated'));

CREATE INDEX IF NOT EXISTS idx_notification_templates_migration_status
  ON public.notification_templates(migration_status);

-- 4. Seed missing base layouts
INSERT INTO public.core_template_layout (code, name, description, is_active, is_base_layout, page_size, orientation)
SELECT 'BASE_DOCUMENT', 'Base Document Layout', 'Foundation layout for generic documents & PDFs', true, true, 'A4', 'PORTRAIT'
WHERE NOT EXISTS (SELECT 1 FROM public.core_template_layout WHERE code='BASE_DOCUMENT');

INSERT INTO public.core_template_layout (code, name, description, is_active, is_base_layout, page_size, orientation)
SELECT 'BASE_PUSH', 'Base Push Notification Layout', 'Foundation layout for push notifications', true, true, 'A4', 'PORTRAIT'
WHERE NOT EXISTS (SELECT 1 FROM public.core_template_layout WHERE code='BASE_PUSH');
