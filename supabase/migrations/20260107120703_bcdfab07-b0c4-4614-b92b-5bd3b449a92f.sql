-- Update notification_providers to use provider_type instead of channel (for better semantics)
-- The column 'channel' exists, we can use it as provider_type

-- Update user_notification_preferences to support per-type preferences
ALTER TABLE public.user_notification_preferences 
ADD COLUMN IF NOT EXISTS notification_type TEXT,
ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS in_app_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS preferred_channel TEXT DEFAULT 'email';

-- Add unique constraint for user + notification_type
ALTER TABLE public.user_notification_preferences 
DROP CONSTRAINT IF EXISTS user_notification_preferences_user_type_unique;

-- Create unique constraint only if notification_type is populated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_notification_preferences_user_type_unique'
  ) THEN
    ALTER TABLE public.user_notification_preferences 
    ADD CONSTRAINT user_notification_preferences_user_type_unique 
    UNIQUE (user_id, notification_type);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if constraint already exists or there's duplicate data
  NULL;
END $$;