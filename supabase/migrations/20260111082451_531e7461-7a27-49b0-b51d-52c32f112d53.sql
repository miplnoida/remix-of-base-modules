
-- Create system log tables

-- Technical Logs
CREATE TABLE IF NOT EXISTS public.system_technical_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  correlation_id UUID,
  user_id UUID,
  session_id TEXT,
  api_name TEXT,
  module TEXT,
  entity_type TEXT,
  entity_id TEXT,
  severity TEXT DEFAULT 'info',
  ip_address TEXT,
  device_info TEXT,
  payload_json JSONB,
  execution_time_ms INTEGER,
  status TEXT DEFAULT 'success',
  request_payload JSONB,
  response_payload JSONB,
  headers JSONB,
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Error Logs
CREATE TABLE IF NOT EXISTS public.system_error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  correlation_id UUID,
  user_id UUID,
  session_id TEXT,
  api_name TEXT,
  module TEXT,
  entity_type TEXT,
  entity_id TEXT,
  severity TEXT DEFAULT 'error',
  ip_address TEXT,
  device_info TEXT,
  payload_json JSONB,
  error_type TEXT,
  error_message TEXT,
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Business Events
CREATE TABLE IF NOT EXISTS public.system_business_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  correlation_id UUID,
  user_id UUID,
  session_id TEXT,
  api_name TEXT,
  module TEXT,
  entity_type TEXT,
  entity_id TEXT,
  severity TEXT DEFAULT 'info',
  ip_address TEXT,
  device_info TEXT,
  payload_json JSONB,
  action TEXT,
  performed_by TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit Trail
CREATE TABLE IF NOT EXISTS public.system_audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  correlation_id UUID,
  user_id UUID,
  session_id TEXT,
  api_name TEXT,
  module TEXT,
  entity_type TEXT,
  entity_id TEXT,
  severity TEXT DEFAULT 'info',
  ip_address TEXT,
  device_info TEXT,
  payload_json JSONB,
  action TEXT,
  before_value JSONB,
  after_value JSONB,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Security Logs
CREATE TABLE IF NOT EXISTS public.system_security_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  correlation_id UUID,
  user_id UUID,
  session_id TEXT,
  api_name TEXT,
  module TEXT,
  entity_type TEXT,
  entity_id TEXT,
  severity TEXT DEFAULT 'info',
  ip_address TEXT,
  device_info TEXT,
  payload_json JSONB,
  event_type TEXT,
  user_name TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Integration Logs
CREATE TABLE IF NOT EXISTS public.system_integration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  correlation_id UUID,
  user_id UUID,
  session_id TEXT,
  api_name TEXT,
  module TEXT,
  entity_type TEXT,
  entity_id TEXT,
  severity TEXT DEFAULT 'info',
  ip_address TEXT,
  device_info TEXT,
  payload_json JSONB,
  external_service TEXT,
  request_data JSONB,
  response_data JSONB,
  status TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS public.system_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  correlation_id UUID,
  user_id UUID,
  session_id TEXT,
  api_name TEXT,
  module TEXT,
  entity_type TEXT,
  entity_id TEXT,
  severity TEXT DEFAULT 'info',
  ip_address TEXT,
  device_info TEXT,
  payload_json JSONB,
  execution_time_ms INTEGER,
  memory_usage_mb NUMERIC,
  cpu_usage_percent NUMERIC,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Workflow Execution Logs
CREATE TABLE IF NOT EXISTS public.workflow_execution_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  correlation_id UUID,
  user_id UUID,
  session_id TEXT,
  api_name TEXT,
  module TEXT,
  entity_type TEXT,
  entity_id TEXT,
  severity TEXT DEFAULT 'info',
  ip_address TEXT,
  device_info TEXT,
  payload_json JSONB,
  workflow_id TEXT,
  application_id TEXT,
  current_step TEXT,
  step_number INTEGER,
  status TEXT,
  step_history JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.system_technical_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_business_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_execution_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Admin access only (read)
CREATE POLICY "Admins can view technical logs" ON public.system_technical_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can view error logs" ON public.system_error_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can view business events" ON public.system_business_events FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can view audit trail" ON public.system_audit_trail FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can view security logs" ON public.system_security_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can view integration logs" ON public.system_integration_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can view performance metrics" ON public.system_performance_metrics FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can view workflow logs" ON public.workflow_execution_logs FOR SELECT USING (public.is_admin(auth.uid()));

-- Create policies for insert (authenticated users can insert logs)
CREATE POLICY "Authenticated can insert technical logs" ON public.system_technical_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert error logs" ON public.system_error_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert business events" ON public.system_business_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert audit trail" ON public.system_audit_trail FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert security logs" ON public.system_security_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert integration logs" ON public.system_integration_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert performance metrics" ON public.system_performance_metrics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert workflow logs" ON public.workflow_execution_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create indexes for better query performance
CREATE INDEX idx_technical_logs_timestamp ON public.system_technical_logs(timestamp DESC);
CREATE INDEX idx_technical_logs_correlation ON public.system_technical_logs(correlation_id);
CREATE INDEX idx_technical_logs_api ON public.system_technical_logs(api_name);
CREATE INDEX idx_error_logs_timestamp ON public.system_error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_severity ON public.system_error_logs(severity);
CREATE INDEX idx_business_events_timestamp ON public.system_business_events(timestamp DESC);
CREATE INDEX idx_business_events_module ON public.system_business_events(module);
CREATE INDEX idx_audit_trail_timestamp ON public.system_audit_trail(timestamp DESC);
CREATE INDEX idx_audit_trail_user ON public.system_audit_trail(user_id);
CREATE INDEX idx_security_logs_timestamp ON public.system_security_logs(timestamp DESC);
CREATE INDEX idx_security_logs_event ON public.system_security_logs(event_type);
CREATE INDEX idx_integration_logs_timestamp ON public.system_integration_logs(timestamp DESC);
CREATE INDEX idx_integration_logs_service ON public.system_integration_logs(external_service);
CREATE INDEX idx_performance_metrics_timestamp ON public.system_performance_metrics(timestamp DESC);
CREATE INDEX idx_performance_metrics_api ON public.system_performance_metrics(api_name);
CREATE INDEX idx_workflow_logs_timestamp ON public.workflow_execution_logs(timestamp DESC);
CREATE INDEX idx_workflow_logs_workflow ON public.workflow_execution_logs(workflow_id);

-- Insert parent module for System Monitoring
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES 
  ('a1000000-0000-0000-0000-000000000001', 'system_monitoring', 'System Monitoring & Logs', 'Monitor', NULL, NULL, 900, true, 'System monitoring and logging module')
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

-- Insert child modules with unique names
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES 
  ('a1000000-0000-0000-0000-000000000002', 'sys_technical_logs', 'Technical Logs', 'FileCode', '/system-logs/technical', 'a1000000-0000-0000-0000-000000000001', 1, true, 'Technical API logs'),
  ('a1000000-0000-0000-0000-000000000003', 'sys_error_logs', 'Error Logs', 'AlertTriangle', '/system-logs/errors', 'a1000000-0000-0000-0000-000000000001', 2, true, 'System error logs'),
  ('a1000000-0000-0000-0000-000000000004', 'sys_business_events', 'Business Events', 'Briefcase', '/system-logs/business', 'a1000000-0000-0000-0000-000000000001', 3, true, 'Business event logs'),
  ('a1000000-0000-0000-0000-000000000005', 'sys_audit_trail', 'Audit Trail', 'History', '/system-logs/audit', 'a1000000-0000-0000-0000-000000000001', 4, true, 'Audit trail logs'),
  ('a1000000-0000-0000-0000-000000000006', 'sys_security_logs', 'Security Logs', 'Shield', '/system-logs/security', 'a1000000-0000-0000-0000-000000000001', 5, true, 'Security event logs'),
  ('a1000000-0000-0000-0000-000000000007', 'sys_integration_logs', 'Integration Logs', 'Link', '/system-logs/integration', 'a1000000-0000-0000-0000-000000000001', 6, true, 'External integration logs'),
  ('a1000000-0000-0000-0000-000000000008', 'sys_performance_monitor', 'Performance Monitor', 'Activity', '/system-logs/performance', 'a1000000-0000-0000-0000-000000000001', 7, true, 'Performance monitoring dashboard'),
  ('a1000000-0000-0000-0000-000000000009', 'sys_workflow_logs', 'Workflow Logs', 'GitBranch', '/system-logs/workflows', 'a1000000-0000-0000-0000-000000000001', 8, true, 'Workflow execution logs')
ON CONFLICT (name) DO UPDATE SET 
  display_name = EXCLUDED.display_name, 
  icon = EXCLUDED.icon, 
  route = EXCLUDED.route,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order;

-- Insert module actions for parent (with display_name)
INSERT INTO public.module_actions (id, module_id, action_name, display_name, description, is_enabled)
VALUES 
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'view', 'View', 'View system monitoring', true),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'export', 'Export', 'Export logs', true),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'view-details', 'View Details', 'View log details', true)
ON CONFLICT (module_id, action_name) DO NOTHING;

-- Insert module actions for each child module (with display_name)
INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, a.action_name, a.display_name, a.description, true
FROM public.app_modules m
CROSS JOIN (
  VALUES 
    ('view', 'View', 'View logs'),
    ('export', 'Export', 'Export logs'),
    ('view-details', 'View Details', 'View log details')
) AS a(action_name, display_name, description)
WHERE m.parent_id = 'a1000000-0000-0000-0000-000000000001'
ON CONFLICT (module_id, action_name) DO NOTHING;

-- Grant Admin permissions for all new modules and actions
INSERT INTO public.role_permissions (role, module_id, action_id, is_granted)
SELECT 'Admin'::app_role, ma.module_id, ma.id, true
FROM public.module_actions ma
JOIN public.app_modules m ON m.id = ma.module_id
WHERE m.id = 'a1000000-0000-0000-0000-000000000001' 
   OR m.parent_id = 'a1000000-0000-0000-0000-000000000001'
ON CONFLICT (role, module_id, action_id) DO UPDATE SET is_granted = true;
