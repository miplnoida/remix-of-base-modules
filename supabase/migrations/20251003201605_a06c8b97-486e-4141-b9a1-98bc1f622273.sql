-- Create admin configuration tables

-- Code Sets table
CREATE TABLE IF NOT EXISTS legal_code_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- caseTypes, statuses, flags, hearingTypes, outcomes, penaltyTypes, serviceMethods, confidentialityLevels
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(category, code)
);

-- Document Templates table
CREATE TABLE IF NOT EXISTS legal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- Notice, Order, Decision, Summons
  description TEXT,
  content TEXT NOT NULL, -- Rich text with merge fields
  merge_fields JSONB DEFAULT '[]', -- Available merge fields
  status TEXT DEFAULT 'Draft', -- Draft, Review, Published, Archived
  version INTEGER DEFAULT 1,
  parent_template_id UUID REFERENCES legal_templates(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id)
);

-- SLA Rules table
CREATE TABLE IF NOT EXISTS legal_sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  case_type TEXT,
  stage TEXT,
  sla_days INTEGER NOT NULL,
  escalation_queue TEXT,
  notification_email BOOLEAN DEFAULT true,
  notification_sms BOOLEAN DEFAULT false,
  auto_assign_rule TEXT, -- round-robin, by-workload, manual
  status TEXT DEFAULT 'Draft', -- Draft, Active, Archived
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Status Transition Rules table
CREATE TABLE IF NOT EXISTS legal_status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  allowed_roles TEXT[] NOT NULL,
  requires_approval BOOLEAN DEFAULT false,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_status, to_status)
);

-- Integration Configuration table
CREATE TABLE IF NOT EXISTS legal_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- SSO, Registry, DocumentStore, Notifications, eSign, Finance
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Admin Audit Log table
CREATE TABLE IF NOT EXISTS legal_admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- CodeSet, Template, SLARule, Permission, Integration
  entity_id UUID,
  action TEXT NOT NULL, -- Created, Updated, Deleted, Published, Archived
  user_id UUID REFERENCES profiles(id),
  user_name TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  changes JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT
);

-- Enable RLS
ALTER TABLE legal_code_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_admin_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Admin tables (Admin only)
CREATE POLICY "Admins can manage code sets" ON legal_code_sets FOR ALL USING (has_role(auth.uid(), 'Admin'));
CREATE POLICY "Admins can manage templates" ON legal_templates FOR ALL USING (has_role(auth.uid(), 'Admin'));
CREATE POLICY "Admins can manage SLA rules" ON legal_sla_rules FOR ALL USING (has_role(auth.uid(), 'Admin'));
CREATE POLICY "Admins can manage transitions" ON legal_status_transitions FOR ALL USING (has_role(auth.uid(), 'Admin'));
CREATE POLICY "Admins can manage integrations" ON legal_integrations FOR ALL USING (has_role(auth.uid(), 'Admin'));
CREATE POLICY "Users can view audit log" ON legal_admin_audit FOR SELECT USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_legal_code_sets_updated_at BEFORE UPDATE ON legal_code_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_templates_updated_at BEFORE UPDATE ON legal_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_sla_rules_updated_at BEFORE UPDATE ON legal_sla_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_integrations_updated_at BEFORE UPDATE ON legal_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();