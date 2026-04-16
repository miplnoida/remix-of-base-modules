
-- =====================================================
-- ENTERPRISE RELEASE MANAGEMENT FRAMEWORK
-- =====================================================

-- 1. Extend app_modules with rollout controls
ALTER TABLE app_modules 
  ADD COLUMN IF NOT EXISTS rollout_state text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS internal_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pilot_user_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pilot_role_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS release_version text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS routes_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS actions_enabled boolean NOT NULL DEFAULT true;

-- Add check constraint for valid rollout states
ALTER TABLE app_modules 
  DROP CONSTRAINT IF EXISTS app_modules_rollout_state_check;
ALTER TABLE app_modules 
  ADD CONSTRAINT app_modules_rollout_state_check 
  CHECK (rollout_state IN ('hidden', 'internal_pilot', 'public'));

-- 2. Feature Flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  module_id uuid REFERENCES app_modules(id) ON DELETE SET NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  rollout_state text NOT NULL DEFAULT 'hidden' CHECK (rollout_state IN ('hidden', 'internal_pilot', 'public')),
  pilot_user_ids uuid[] DEFAULT '{}',
  pilot_role_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

-- 3. Release Registry
CREATE TABLE IF NOT EXISTS release_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_name text NOT NULL,
  module_name text,
  code_version text,
  db_migration_version text,
  config_pack_version text,
  release_state text NOT NULL DEFAULT 'planned' 
    CHECK (release_state IN ('planned', 'deploying', 'deployed', 'validated', 'active', 'rolled_back')),
  release_notes text,
  applied_by text,
  applied_at timestamptz,
  validated_by text,
  validated_at timestamptz,
  activated_by text,
  activated_at timestamptz,
  rollback_reference text,
  rollback_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Migration Logs
CREATE TABLE IF NOT EXISTS migration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type text NOT NULL CHECK (log_type IN ('schema_migration', 'config_promotion', 'user_provisioning', 'data_seed', 'rollback')),
  description text NOT NULL,
  source_environment text DEFAULT 'test',
  target_environment text DEFAULT 'live',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
  release_id uuid REFERENCES release_registry(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}',
  error_message text,
  executed_by text,
  executed_at timestamptz,
  completed_at timestamptz,
  rollback_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Config Promotion Packs
CREATE TABLE IF NOT EXISTS config_promotion_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_name text NOT NULL,
  description text,
  source_environment text NOT NULL DEFAULT 'test',
  config_type text NOT NULL CHECK (config_type IN (
    'rules', 'workflows', 'templates', 'queues', 'numbering', 
    'products', 'lookups', 'roles', 'permissions', 'module_setup', 'mixed'
  )),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'approved', 'promoting', 'promoted', 'failed', 'rolled_back'
  )),
  config_payload jsonb NOT NULL DEFAULT '{}',
  dependency_check jsonb DEFAULT '{}',
  item_count integer DEFAULT 0,
  promoted_by text,
  promoted_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  rollback_notes text,
  release_id uuid REFERENCES release_registry(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

-- 6. Config Promotion Items (individual records within a pack)
CREATE TABLE IF NOT EXISTS config_promotion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES config_promotion_packs(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  record_id text,
  operation text NOT NULL CHECK (operation IN ('insert', 'update', 'upsert')),
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'promoted', 'failed', 'skipped', 'rolled_back')),
  error_message text,
  promoted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. User Provisioning Logs
CREATE TABLE IF NOT EXISTS user_provisioning_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL CHECK (action_type IN (
    'create_user', 'assign_role', 'remove_role', 'assign_permission',
    'remove_permission', 'activate', 'deactivate', 'update_profile'
  )),
  target_user_id uuid,
  target_user_email text,
  details jsonb DEFAULT '{}',
  environment text NOT NULL DEFAULT 'live',
  release_id uuid REFERENCES release_registry(id) ON DELETE SET NULL,
  performed_by text,
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_module ON feature_flags(module_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_release_registry_state ON release_registry(release_state);
CREATE INDEX IF NOT EXISTS idx_release_registry_module ON release_registry(module_name);
CREATE INDEX IF NOT EXISTS idx_migration_logs_release ON migration_logs(release_id);
CREATE INDEX IF NOT EXISTS idx_migration_logs_type ON migration_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_config_packs_status ON config_promotion_packs(status);
CREATE INDEX IF NOT EXISTS idx_config_items_pack ON config_promotion_items(pack_id);
CREATE INDEX IF NOT EXISTS idx_user_prov_logs_user ON user_provisioning_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_app_modules_rollout ON app_modules(rollout_state);

-- 9. Auto-update timestamps
CREATE OR REPLACE FUNCTION update_release_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_feature_flags_updated
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_release_timestamps();

CREATE TRIGGER trg_release_registry_updated
  BEFORE UPDATE ON release_registry
  FOR EACH ROW EXECUTE FUNCTION update_release_timestamps();

CREATE TRIGGER trg_config_packs_updated
  BEFORE UPDATE ON config_promotion_packs
  FOR EACH ROW EXECUTE FUNCTION update_release_timestamps();
