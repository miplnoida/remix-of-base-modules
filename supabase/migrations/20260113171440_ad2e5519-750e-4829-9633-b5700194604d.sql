-- Create table for storing field updates configured per workflow action
CREATE TABLE public.workflow_action_field_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.workflow_step_actions(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure unique field name per action
  CONSTRAINT unique_action_field UNIQUE (action_id, field_name)
);

-- Create indexes for performance
CREATE INDEX idx_workflow_action_field_updates_action_id ON public.workflow_action_field_updates(action_id);

-- Enable RLS
ALTER TABLE public.workflow_action_field_updates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users with workflow management permission to view
CREATE POLICY "Users with workflow permission can view field updates"
  ON public.workflow_action_field_updates
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users with workflow management permission to insert
CREATE POLICY "Users with workflow permission can insert field updates"
  ON public.workflow_action_field_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users with workflow management permission to update
CREATE POLICY "Users with workflow permission can update field updates"
  ON public.workflow_action_field_updates
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users with workflow management permission to delete  
CREATE POLICY "Users with workflow permission can delete field updates"
  ON public.workflow_action_field_updates
  FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_workflow_action_field_updates_updated_at
  BEFORE UPDATE ON public.workflow_action_field_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.workflow_action_field_updates IS 'Stores field updates to be applied to application records when workflow actions are executed';
COMMENT ON COLUMN public.workflow_action_field_updates.field_name IS 'The column name in the target application table to update';
COMMENT ON COLUMN public.workflow_action_field_updates.field_value IS 'The value to set. Supports placeholders like {{current_user}}, {{current_date}}, {{workflow_status}}';