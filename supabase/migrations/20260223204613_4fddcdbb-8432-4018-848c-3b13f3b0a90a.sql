-- Add missing columns to in_app_notifications for meeting module support
ALTER TABLE public.in_app_notifications 
  ADD COLUMN IF NOT EXISTS notification_type text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS module text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS related_record_id text DEFAULT NULL;

-- Add index for module-based filtering
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_module ON public.in_app_notifications(module);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_type ON public.in_app_notifications(notification_type);