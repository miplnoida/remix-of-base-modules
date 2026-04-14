
CREATE TABLE public.ce_violation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  violation_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'InspectorComment',
  note_text TEXT NOT NULL,
  linked_weekly_plan_item_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ce_violation_notes_violation_id ON public.ce_violation_notes(violation_id);
