
-- Add composite index on assigned_user_id + meeting_date for calendar queries
CREATE INDEX IF NOT EXISTS idx_meetings_assigned_user_date 
ON public.meetings (assigned_user_id, meeting_date);

-- Also index on scheduled_by + meeting_date as fallback
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_by_date 
ON public.meetings (scheduled_by, meeting_date);

-- Enable realtime for meetings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
