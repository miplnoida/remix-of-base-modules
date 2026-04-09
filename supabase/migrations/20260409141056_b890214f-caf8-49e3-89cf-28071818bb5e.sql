-- Create table for persisting user-edited tab data during meeting reviews
CREATE TABLE public.meeting_edit_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL,
  data_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  original_api_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by TEXT,
  UNIQUE(meeting_id, data_type)
);

-- Index for fast lookups by meeting
CREATE INDEX idx_meeting_edit_data_meeting_id ON public.meeting_edit_data(meeting_id);

-- Auto-update updated_at on modification
CREATE OR REPLACE FUNCTION public.update_meeting_edit_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_meeting_edit_data_updated_at
BEFORE UPDATE ON public.meeting_edit_data
FOR EACH ROW
EXECUTE FUNCTION public.update_meeting_edit_data_updated_at();