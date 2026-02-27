
-- Settings table for audit system configuration (key-value pairs)
CREATE TABLE public.ia_audit_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_category TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  setting_type TEXT NOT NULL DEFAULT 'string',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(setting_category, setting_key)
);

-- Risk criteria config table
CREATE TABLE public.ia_risk_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criteria TEXT NOT NULL,
  weight TEXT NOT NULL DEFAULT 'Medium',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

-- Activity types config table
CREATE TABLE public.ia_activity_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_duration INT DEFAULT 4,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

-- Seed default settings
INSERT INTO public.ia_audit_settings (setting_category, setting_key, setting_value, setting_type) VALUES
('general', 'defaultAuditPeriod', 'Monthly', 'string'),
('general', 'autoAssignAuditors', 'true', 'boolean'),
('general', 'requireApproval', 'true', 'boolean'),
('general', 'allowSelfAudit', 'false', 'boolean'),
('general', 'maxActivitiesPerDay', '3', 'number'),
('general', 'defaultActivityDuration', '8', 'number'),
('general', 'reminderDays', '7', 'number'),
('notifications', 'planSubmitted', 'true', 'boolean'),
('notifications', 'planApproved', 'true', 'boolean'),
('notifications', 'activityReminder', 'true', 'boolean'),
('notifications', 'overdueFollowup', 'true', 'boolean'),
('notifications', 'emailNotifications', 'true', 'boolean'),
('notifications', 'systemNotifications', 'true', 'boolean'),
('security', 'dataRetentionYears', '7', 'number'),
('security', 'sessionTimeoutMinutes', '30', 'number');

-- Seed default risk criteria
INSERT INTO public.ia_risk_criteria (criteria, weight, sort_order) VALUES
('Large employer (>100 employees)', 'High', 1),
('Financial institution', 'High', 2),
('Previous non-compliance', 'Medium', 3),
('New registration', 'Medium', 4),
('Seasonal variations', 'Low', 5);

-- Seed default activity types
INSERT INTO public.ia_activity_types (name, description, default_duration, sort_order) VALUES
('Compliance Check', 'Basic compliance verification', 4, 1),
('Records Review', 'Document and record examination', 6, 2),
('Site Visit', 'On-site audit and inspection', 8, 3),
('Contribution Verification', 'Verify contribution calculations', 6, 4),
('Payroll Sampling', 'Sample payroll records audit', 4, 5);
