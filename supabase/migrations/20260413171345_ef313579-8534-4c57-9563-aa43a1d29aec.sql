-- Enable realtime for in_app_notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;

-- Add composite index for efficient querying by user + read status
CREATE INDEX IF NOT EXISTS idx_in_app_notif_user_read ON public.in_app_notifications (user_id, is_read);