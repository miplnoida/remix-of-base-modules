
-- Developer Information Repository Tables

CREATE TABLE dev_info_screens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_code varchar(100) NOT NULL UNIQUE,
  screen_name varchar(255) NOT NULL,
  module_name varchar(100),
  submodule_name varchar(100),
  route_url varchar(500),
  menu_path varchar(500),
  screen_type varchar(50) DEFAULT 'List',
  functional_summary text,
  business_purpose text,
  primary_user_roles text,
  trigger_context text,
  upstream_screens text,
  downstream_screens text,
  documentation_status varchar(20) DEFAULT 'not_started',
  is_active boolean DEFAULT true,
  last_ai_analysis_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by varchar(20),
  created_by varchar(20),
  created_at timestamptz DEFAULT now(),
  updated_by varchar(20),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE dev_info_table_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL REFERENCES dev_info_screens(id) ON DELETE CASCADE,
  table_name varchar(200) NOT NULL,
  table_type varchar(50) DEFAULT 'Primary',
  purpose text,
  remarks text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE dev_info_logic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL REFERENCES dev_info_screens(id) ON DELETE CASCADE,
  logic_type varchar(50) NOT NULL,
  logic_title varchar(255) NOT NULL,
  logic_description text,
  execution_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE dev_info_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL REFERENCES dev_info_screens(id) ON DELETE CASCADE,
  field_name varchar(200) NOT NULL,
  field_label varchar(200),
  control_type varchar(50),
  data_type varchar(50),
  is_required boolean DEFAULT false,
  source_table varchar(200),
  source_column varchar(200),
  validation_rule text,
  default_logic text,
  edit_rule text,
  visibility_rule text,
  remarks text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE dev_info_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL REFERENCES dev_info_screens(id) ON DELETE CASCADE,
  action_name varchar(100) NOT NULL,
  action_type varchar(50),
  action_description text,
  permission_required varchar(100),
  business_logic text,
  tables_affected text,
  api_or_service_called text,
  downstream_effect text,
  remarks text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE dev_info_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL REFERENCES dev_info_screens(id) ON DELETE CASCADE,
  dependency_type varchar(50) NOT NULL,
  dependency_name varchar(200) NOT NULL,
  dependency_details text,
  remarks text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE dev_info_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL REFERENCES dev_info_screens(id) ON DELETE CASCADE,
  document_type varchar(50),
  document_name varchar(255),
  document_reference text,
  remarks text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE dev_info_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL REFERENCES dev_info_screens(id) ON DELETE CASCADE,
  audit_type varchar(100),
  audit_description text,
  is_enabled boolean DEFAULT true,
  remarks text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE dev_info_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid REFERENCES dev_info_screens(id) ON DELETE SET NULL,
  screen_code varchar(100),
  accessed_by varchar(20),
  accessed_at timestamptz DEFAULT now(),
  user_role varchar(50),
  action_type varchar(50) DEFAULT 'view',
  ip_address varchar(50),
  remarks text
);

CREATE INDEX idx_dev_info_screens_route ON dev_info_screens(route_url);
CREATE INDEX idx_dev_info_screens_module ON dev_info_screens(module_name);
CREATE INDEX idx_dev_info_screens_status ON dev_info_screens(documentation_status);
CREATE INDEX idx_dev_info_table_maps_screen ON dev_info_table_maps(screen_id);
CREATE INDEX idx_dev_info_logic_screen ON dev_info_logic(screen_id);
CREATE INDEX idx_dev_info_fields_screen ON dev_info_fields(screen_id);
CREATE INDEX idx_dev_info_actions_screen ON dev_info_actions(screen_id);
CREATE INDEX idx_dev_info_dependencies_screen ON dev_info_dependencies(screen_id);
CREATE INDEX idx_dev_info_access_log_screen ON dev_info_access_log(screen_id);
CREATE INDEX idx_dev_info_access_log_user ON dev_info_access_log(accessed_by);
