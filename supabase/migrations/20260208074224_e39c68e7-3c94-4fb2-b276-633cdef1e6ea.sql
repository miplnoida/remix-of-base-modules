-- =============================================
-- Workflow Action API Integration Tables
-- =============================================

-- Table: workflow_step_action_api
-- Defines which API to call for a workflow action
CREATE TABLE IF NOT EXISTS public.workflow_step_action_api (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  workflow_step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  action_code TEXT NOT NULL,
  http_method TEXT NOT NULL CHECK (http_method IN ('POST', 'PUT', 'PATCH', 'GET', 'DELETE')),
  endpoint_url TEXT NOT NULL,
  api_key_secret_name TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/json',
  timeout_seconds INTEGER NOT NULL DEFAULT 30,
  retry_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  UNIQUE(workflow_id, workflow_step_id, action_code)
);

-- Add comments
COMMENT ON TABLE public.workflow_step_action_api IS 'Defines API configurations for workflow actions (Approve, Reject, Schedule-Meeting)';
COMMENT ON COLUMN public.workflow_step_action_api.action_code IS 'Action type: Approve, Reject, ScheduleMeeting, etc.';
COMMENT ON COLUMN public.workflow_step_action_api.api_key_secret_name IS 'Name of the secret in Supabase Vault/Secrets containing the API key';

-- Table: workflow_step_action_api_body
-- Defines dynamic request body mapping
CREATE TABLE IF NOT EXISTS public.workflow_step_action_api_body (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_action_api_id UUID NOT NULL REFERENCES public.workflow_step_action_api(id) ON DELETE CASCADE,
  json_field_name TEXT NOT NULL,
  value_source TEXT NOT NULL CHECK (value_source IN ('APPLICATION', 'MEETING', 'WORKFLOW', 'SYSTEM', 'STATIC')),
  source_key TEXT NOT NULL,
  static_value TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments
COMMENT ON TABLE public.workflow_step_action_api_body IS 'Dynamic request body field mappings for workflow action APIs';
COMMENT ON COLUMN public.workflow_step_action_api_body.value_source IS 'Source type: APPLICATION (record data), MEETING (meeting data), WORKFLOW (context), SYSTEM (logged_in_user, timestamp), STATIC (fixed value)';
COMMENT ON COLUMN public.workflow_step_action_api_body.source_key IS 'Key to extract value from source (e.g., application_reference_no, meeting_date)';

-- Table: workflow_api_execution_log
-- Tracks all API executions for audit
CREATE TABLE IF NOT EXISTS public.workflow_api_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  workflow_step_id UUID,
  task_id UUID,
  action_code TEXT NOT NULL,
  api_config_id UUID REFERENCES public.workflow_step_action_api(id),
  endpoint_url TEXT NOT NULL,
  http_method TEXT NOT NULL,
  request_payload JSONB NOT NULL,
  response_payload JSONB,
  http_status INTEGER,
  execution_status TEXT NOT NULL CHECK (execution_status IN ('SUCCESS', 'FAILED', 'PENDING', 'TIMEOUT')),
  error_message TEXT,
  duration_ms INTEGER,
  retry_attempt INTEGER NOT NULL DEFAULT 0,
  executed_by TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments
COMMENT ON TABLE public.workflow_api_execution_log IS 'Audit trail for all workflow-triggered API executions';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_step_action_api_workflow ON public.workflow_step_action_api(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_action_api_step ON public.workflow_step_action_api(workflow_step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_action_api_action ON public.workflow_step_action_api(action_code);
CREATE INDEX IF NOT EXISTS idx_workflow_step_action_api_active ON public.workflow_step_action_api(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_workflow_api_body_api ON public.workflow_step_action_api_body(workflow_action_api_id);

CREATE INDEX IF NOT EXISTS idx_workflow_api_log_instance ON public.workflow_api_execution_log(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_api_log_action ON public.workflow_api_execution_log(action_code);
CREATE INDEX IF NOT EXISTS idx_workflow_api_log_status ON public.workflow_api_execution_log(execution_status);
CREATE INDEX IF NOT EXISTS idx_workflow_api_log_executed_at ON public.workflow_api_execution_log(executed_at);

-- Enable RLS
ALTER TABLE public.workflow_step_action_api ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_action_api_body ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_api_execution_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_step_action_api (using text comparison for role column)
CREATE POLICY "workflow_step_action_api_select_authenticated"
ON public.workflow_step_action_api
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "workflow_step_action_api_insert_admin"
ON public.workflow_step_action_api
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('Admin', 'Data Entry')
  )
);

CREATE POLICY "workflow_step_action_api_update_admin"
ON public.workflow_step_action_api
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('Admin', 'Data Entry')
  )
);

CREATE POLICY "workflow_step_action_api_delete_admin"
ON public.workflow_step_action_api
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text = 'Admin'
  )
);

-- RLS Policies for workflow_step_action_api_body
CREATE POLICY "workflow_step_action_api_body_select_authenticated"
ON public.workflow_step_action_api_body
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "workflow_step_action_api_body_insert_admin"
ON public.workflow_step_action_api_body
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('Admin', 'Data Entry')
  )
);

CREATE POLICY "workflow_step_action_api_body_update_admin"
ON public.workflow_step_action_api_body
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('Admin', 'Data Entry')
  )
);

CREATE POLICY "workflow_step_action_api_body_delete_admin"
ON public.workflow_step_action_api_body
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text = 'Admin'
  )
);

-- RLS Policies for workflow_api_execution_log
CREATE POLICY "workflow_api_execution_log_select_authenticated"
ON public.workflow_api_execution_log
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "workflow_api_execution_log_insert_authenticated"
ON public.workflow_api_execution_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Updated_at trigger for workflow_step_action_api
CREATE TRIGGER update_workflow_step_action_api_updated_at
BEFORE UPDATE ON public.workflow_step_action_api
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();