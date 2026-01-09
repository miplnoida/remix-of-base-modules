-- Workflow Engine Database Schema

-- Enum types for workflow
CREATE TYPE workflow_status AS ENUM ('Draft', 'Active', 'Disabled', 'Archived');
CREATE TYPE workflow_step_action_type AS ENUM ('Approve', 'Reject', 'SendBack', 'Escalate', 'AutoApprove', 'Review', 'Custom');
CREATE TYPE workflow_instance_status AS ENUM ('Pending', 'InProgress', 'Completed', 'Rejected', 'Cancelled', 'Escalated');
CREATE TYPE workflow_task_status AS ENUM ('Pending', 'InProgress', 'Completed', 'Skipped', 'Cancelled');

-- Main workflow definitions table
CREATE TABLE workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  process_type TEXT NOT NULL,
  default_sla_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_workflow_name UNIQUE (name)
);

-- Workflow steps table
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  assigned_role TEXT,
  assigned_designation TEXT,
  action_type TEXT NOT NULL DEFAULT 'Review',
  sla_hours INTEGER DEFAULT 24,
  is_final_step BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_step_order UNIQUE (workflow_id, step_number)
);

-- Step actions (Approve, Reject, etc.)
CREATE TABLE workflow_step_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  action_name TEXT NOT NULL,
  action_type workflow_step_action_type NOT NULL DEFAULT 'Custom',
  next_step_id UUID REFERENCES workflow_steps(id) ON DELETE SET NULL,
  is_final_action BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification bindings for step actions
CREATE TABLE workflow_action_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES workflow_step_actions(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- Email, SMS, Push, In-App
  template_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow triggers (bind workflow to module actions)
CREATE TABLE workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES app_modules(id),
  action_name TEXT NOT NULL,
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_trigger UNIQUE (module_id, action_name)
);

-- Workflow instances (running workflows)
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id),
  workflow_name TEXT NOT NULL,
  source_module TEXT,
  source_record_id TEXT,
  source_record_name TEXT,
  current_step_id UUID REFERENCES workflow_steps(id),
  status workflow_instance_status DEFAULT 'Pending',
  started_by UUID REFERENCES profiles(id),
  started_by_name TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Workflow tasks (individual tasks for users)
CREATE TABLE workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES workflow_steps(id),
  step_name TEXT NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  assigned_to_name TEXT,
  assigned_role TEXT,
  assigned_designation TEXT,
  status workflow_task_status DEFAULT 'Pending',
  due_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  action_taken TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow logs (audit trail)
CREATE TABLE workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_id UUID REFERENCES workflow_steps(id),
  step_name TEXT,
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  comments TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_action_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow tables
-- Workflow definitions - viewable by authenticated users, editable by admins
CREATE POLICY "Authenticated users can view workflow definitions"
  ON workflow_definitions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage workflow definitions"
  ON workflow_definitions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Workflow steps
CREATE POLICY "Authenticated users can view workflow steps"
  ON workflow_steps FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage workflow steps"
  ON workflow_steps FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Workflow step actions
CREATE POLICY "Authenticated users can view step actions"
  ON workflow_step_actions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage step actions"
  ON workflow_step_actions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Workflow action notifications
CREATE POLICY "Authenticated users can view action notifications"
  ON workflow_action_notifications FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage action notifications"
  ON workflow_action_notifications FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Workflow triggers
CREATE POLICY "Authenticated users can view triggers"
  ON workflow_triggers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage triggers"
  ON workflow_triggers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Workflow instances
CREATE POLICY "Authenticated users can view workflow instances"
  ON workflow_instances FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create workflow instances"
  ON workflow_instances FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update their workflow instances"
  ON workflow_instances FOR UPDATE TO authenticated
  USING (true);

-- Workflow tasks - users see their own tasks
CREATE POLICY "Users can view their assigned tasks"
  ON workflow_tasks FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "System can manage tasks"
  ON workflow_tasks FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Workflow logs
CREATE POLICY "Authenticated users can view logs"
  ON workflow_logs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can create logs"
  ON workflow_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_workflow_definitions_updated_at
  BEFORE UPDATE ON workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_steps_updated_at
  BEFORE UPDATE ON workflow_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_triggers_updated_at
  BEFORE UPDATE ON workflow_triggers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create workflow module and actions
INSERT INTO app_modules (name, display_name, description, icon, route, is_enabled, sort_order)
VALUES 
  ('workflow_management', 'Workflow Management', 'Design and manage approval workflows', 'GitBranch', '/admin/workflows', true, 50),
  ('workflow_triggers', 'Workflow Triggers', 'Bind workflows to module actions', 'Zap', '/admin/workflow-triggers', true, 51),
  ('workflow_tasks', 'My Workflow Tasks', 'View and process assigned workflow tasks', 'ClipboardList', '/workflow/tasks', true, 52),
  ('workflow_logs', 'Workflow Logs', 'View workflow execution history', 'FileText', '/admin/workflow-logs', true, 53),
  ('workflow_analytics', 'Workflow Analytics', 'Workflow performance metrics', 'BarChart3', '/admin/workflow-analytics', true, 54)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  route = EXCLUDED.route;

-- Create module actions for workflow modules
INSERT INTO module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, a.action_name, a.display_name, a.description, true
FROM app_modules m
CROSS JOIN (
  VALUES 
    ('view', 'View', 'View workflows'),
    ('create', 'Create Workflow', 'Create new workflows'),
    ('edit', 'Edit', 'Edit workflows'),
    ('disable', 'Disable', 'Disable workflows'),
    ('delete', 'Delete', 'Delete workflows'),
    ('view_logs', 'View Logs', 'View workflow logs'),
    ('view_analytics', 'View Analytics', 'View analytics')
) AS a(action_name, display_name, description)
WHERE m.name = 'workflow_management'
ON CONFLICT DO NOTHING;

INSERT INTO module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, a.action_name, a.display_name, a.description, true
FROM app_modules m
CROSS JOIN (
  VALUES 
    ('view', 'View', 'View triggers'),
    ('create', 'Create', 'Create triggers'),
    ('edit', 'Edit', 'Edit triggers'),
    ('delete', 'Delete', 'Delete triggers')
) AS a(action_name, display_name, description)
WHERE m.name = 'workflow_triggers'
ON CONFLICT DO NOTHING;

INSERT INTO module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, a.action_name, a.display_name, a.description, true
FROM app_modules m
CROSS JOIN (
  VALUES 
    ('view', 'View', 'View tasks'),
    ('process', 'Process', 'Process tasks')
) AS a(action_name, display_name, description)
WHERE m.name = 'workflow_tasks'
ON CONFLICT DO NOTHING;

INSERT INTO module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, a.action_name, a.display_name, a.description, true
FROM app_modules m
CROSS JOIN (
  VALUES 
    ('view', 'View', 'View logs'),
    ('export', 'Export', 'Export logs')
) AS a(action_name, display_name, description)
WHERE m.name = 'workflow_logs'
ON CONFLICT DO NOTHING;

INSERT INTO module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, a.action_name, a.display_name, a.description, true
FROM app_modules m
CROSS JOIN (
  VALUES 
    ('view', 'View', 'View analytics')
) AS a(action_name, display_name, description)
WHERE m.name = 'workflow_analytics'
ON CONFLICT DO NOTHING;