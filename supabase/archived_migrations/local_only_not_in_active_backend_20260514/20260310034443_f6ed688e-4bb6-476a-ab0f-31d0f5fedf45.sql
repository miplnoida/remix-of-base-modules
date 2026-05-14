
-- DB Diagram Metadata Repository Tables

CREATE TABLE IF NOT EXISTS db_diagram_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text UNIQUE NOT NULL,
  module_name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  last_analyzed_at timestamptz,
  last_analyzed_by text,
  current_version_no integer DEFAULT 0,
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS db_diagram_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES db_diagram_modules(id) ON DELETE CASCADE,
  schema_name text DEFAULT 'public',
  table_name text NOT NULL,
  table_category text DEFAULT 'module_primary',
  description text,
  is_physical_table boolean DEFAULT true,
  is_view boolean DEFAULT false,
  is_shared boolean DEFAULT false,
  primary_key_summary text,
  foreign_key_summary text,
  index_summary text,
  estimated_row_count integer,
  last_analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(schema_name, table_name)
);

CREATE TABLE IF NOT EXISTS db_diagram_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table_id uuid REFERENCES db_diagram_tables(id) ON DELETE CASCADE,
  source_column text NOT NULL,
  target_table_id uuid REFERENCES db_diagram_tables(id) ON DELETE CASCADE,
  target_column text NOT NULL,
  relationship_type text DEFAULT 'foreign_key',
  is_physical_fk boolean DEFAULT true,
  is_inferred boolean DEFAULT false,
  cardinality text,
  dependency_strength text DEFAULT 'strong',
  description text,
  last_analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS db_diagram_table_module_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES db_diagram_tables(id) ON DELETE CASCADE,
  module_id uuid REFERENCES db_diagram_modules(id) ON DELETE CASCADE,
  ownership_type text DEFAULT 'primary',
  confidence_score numeric DEFAULT 1.0,
  is_primary_owner boolean DEFAULT true,
  remarks text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(table_id, module_id)
);

CREATE TABLE IF NOT EXISTS db_diagram_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES db_diagram_modules(id) ON DELETE CASCADE,
  version_no integer NOT NULL,
  generated_at timestamptz DEFAULT now(),
  generated_by text,
  generation_type text DEFAULT 'auto',
  summary text,
  snapshot_json jsonb,
  is_current boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS db_diagram_analysis_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES db_diagram_modules(id) ON DELETE CASCADE,
  triggered_by text,
  triggered_at timestamptz DEFAULT now(),
  analysis_scope text DEFAULT 'module',
  status text DEFAULT 'pending',
  tables_found integer DEFAULT 0,
  relationships_found integer DEFAULT 0,
  warnings text,
  errors text,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS db_diagram_object_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES db_diagram_tables(id) ON DELETE CASCADE,
  object_type text NOT NULL,
  object_name text NOT NULL,
  reference_path text,
  module_id uuid REFERENCES db_diagram_modules(id) ON DELETE CASCADE,
  remarks text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS db_diagram_module_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_module_id uuid REFERENCES db_diagram_modules(id) ON DELETE CASCADE,
  target_module_id uuid REFERENCES db_diagram_modules(id) ON DELETE CASCADE,
  dependency_type text DEFAULT 'data',
  criticality text DEFAULT 'medium',
  tables_involved text,
  description text,
  last_analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_module_id, target_module_id)
);

CREATE TABLE IF NOT EXISTS db_diagram_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid,
  user_id text,
  user_email text,
  action text NOT NULL,
  details text,
  ip_address text,
  accessed_at timestamptz DEFAULT now()
);
