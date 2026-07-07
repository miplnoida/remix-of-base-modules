
DROP VIEW IF EXISTS public.core_user_profiles_v;
CREATE VIEW public.core_user_profiles_v AS
SELECT id AS user_id, id AS profile_id, full_name, first_name, last_name, middle_name,
  email, title, phone, gender, date_of_birth, employee_code, office_code,
  department_id, designation_id, is_active, force_password_change, last_login,
  mfa_enabled, failed_login_attempts, locked_until, lockout_exempt, created_at, updated_at
FROM public.profiles;
GRANT SELECT ON public.core_user_profiles_v TO authenticated;
GRANT ALL ON public.core_user_profiles_v TO service_role;

CREATE TABLE IF NOT EXISTS public.core_staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, profile_id uuid,
  employee_code text, staff_number text, legacy_employee_code text,
  title text, first_name text, middle_name text, last_name text, display_name text,
  work_email text, work_phone text,
  employment_status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (employment_status IN ('ACTIVE','INACTIVE','ON_LEAVE','SUSPENDED','TERMINATED','RETIRED','CONTRACT_ENDED')),
  staff_type text NOT NULL DEFAULT 'PERMANENT'
    CHECK (staff_type IN ('PERMANENT','CONTRACT','TEMPORARY','CONSULTANT','SYSTEM','EXTERNAL')),
  hire_date date, termination_date date,
  supervisor_user_id uuid, manager_user_id uuid, notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_staff_profiles TO authenticated;
GRANT ALL ON public.core_staff_profiles TO service_role;

CREATE TABLE IF NOT EXISTS public.core_staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_profile_id uuid NOT NULL REFERENCES public.core_staff_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  office_code text, department_id uuid, designation_id uuid,
  assignment_type text NOT NULL DEFAULT 'PRIMARY'
    CHECK (assignment_type IN ('PRIMARY','SECONDARY','ACTING','TEMPORARY','DELEGATED','PROJECT')),
  assignment_status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (assignment_status IN ('ACTIVE','PENDING','ENDED','SUSPENDED','CANCELLED')),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_primary boolean NOT NULL DEFAULT false,
  is_acting boolean NOT NULL DEFAULT false,
  reason text, notes text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_staff_assignments TO authenticated;
GRANT ALL ON public.core_staff_assignments TO service_role;
CREATE INDEX IF NOT EXISTS idx_core_staff_assignments_user ON public.core_staff_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_core_staff_assignments_staff ON public.core_staff_assignments(staff_profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_core_staff_assignments_primary_active
  ON public.core_staff_assignments(user_id)
  WHERE is_primary = true AND is_active = true AND assignment_status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.core_user_security_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  account_status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (account_status IN ('ACTIVE','LOCKED','SUSPENDED','DISABLED','PENDING_ACTIVATION','PASSWORD_RESET_REQUIRED')),
  is_locked boolean NOT NULL DEFAULT false, locked_at timestamptz, locked_until timestamptz, locked_reason text,
  is_suspended boolean NOT NULL DEFAULT false, suspended_at timestamptz, suspended_reason text,
  is_disabled boolean NOT NULL DEFAULT false, disabled_at timestamptz, disabled_reason text,
  failed_login_count integer NOT NULL DEFAULT 0, last_failed_login_at timestamptz, last_login_at timestamptz,
  mfa_required boolean NOT NULL DEFAULT false, mfa_enabled boolean NOT NULL DEFAULT false,
  password_reset_required boolean NOT NULL DEFAULT false, password_reset_reason text,
  security_notes text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_user_security_state TO authenticated;
GRANT ALL ON public.core_user_security_state TO service_role;

CREATE TABLE IF NOT EXISTS public.core_user_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_user_id uuid NOT NULL,
  delegate_user_id uuid NOT NULL,
  delegation_type text NOT NULL DEFAULT 'GENERAL'
    CHECK (delegation_type IN ('GENERAL','APPROVAL','WORKFLOW','MODULE','PERMISSION','TEMPORARY')),
  scope_module_code text, scope_permission_key text,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz NOT NULL,
  approval_status text NOT NULL DEFAULT 'APPROVED'
    CHECK (approval_status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','REVOKED','EXPIRED')),
  approved_by uuid, approved_at timestamptz, reason text, notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (delegator_user_id <> delegate_user_id),
  CHECK (effective_to > effective_from)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_user_delegations TO authenticated;
GRANT ALL ON public.core_user_delegations TO service_role;
CREATE INDEX IF NOT EXISTS idx_core_user_delegations_delegator ON public.core_user_delegations(delegator_user_id);
CREATE INDEX IF NOT EXISTS idx_core_user_delegations_delegate ON public.core_user_delegations(delegate_user_id);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_core_staff_profiles_upd') THEN
      CREATE TRIGGER trg_core_staff_profiles_upd BEFORE UPDATE ON public.core_staff_profiles
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_core_staff_assignments_upd') THEN
      CREATE TRIGGER trg_core_staff_assignments_upd BEFORE UPDATE ON public.core_staff_assignments
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_core_user_security_state_upd') THEN
      CREATE TRIGGER trg_core_user_security_state_upd BEFORE UPDATE ON public.core_user_security_state
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_core_user_delegations_upd') THEN
      CREATE TRIGGER trg_core_user_delegations_upd BEFORE UPDATE ON public.core_user_delegations
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF;
  END IF;
END $$;

INSERT INTO public.core_table_registry
  (table_name, ownership_type, module_code, domain_code, table_category,
   is_legacy_table, data_classification, contains_pii,
   lifecycle_status, canonical_admin_route, description)
VALUES
  ('core_staff_profiles','PLATFORM','CORE','PEOPLE_ACCESS','SECURITY',false,'CONFIDENTIAL',true,'ACTIVE','/admin/users','Enterprise staff profile extending user profile'),
  ('core_staff_assignments','PLATFORM','CORE','PEOPLE_ACCESS','SECURITY',false,'CONFIDENTIAL',true,'ACTIVE','/admin/users','Staff assignments'),
  ('core_user_security_state','PLATFORM','CORE','PEOPLE_ACCESS','SECURITY',false,'RESTRICTED',true,'ACTIVE','/admin/users','User security state'),
  ('core_user_delegations','PLATFORM','CORE','PEOPLE_ACCESS','SECURITY',false,'INTERNAL',false,'ACTIVE','/admin/users','User delegations'),
  ('core_user_profiles_v','PLATFORM','CORE','PEOPLE_ACCESS','SECURITY',false,'CONFIDENTIAL',true,'ACTIVE','/admin/users','Compatibility view over profiles')
ON CONFLICT (table_name) DO NOTHING;

INSERT INTO public.core_table_registry
  (table_name, ownership_type, module_code, domain_code, table_category,
   is_legacy_table, legacy_table_name, legacy_schema_name, modern_alias,
   data_classification, contains_pii, lifecycle_status, canonical_admin_route, description)
VALUES
  ('tb_office','LEGACY','CORE','ORGANIZATION','MASTER',true,'tb_office','public','office','INTERNAL',false,'ACTIVE','/admin/offices','Legacy office master'),
  ('tb_office_departments','LEGACY','CORE','ORGANIZATION','MASTER',true,'tb_office_departments','public','department','INTERNAL',false,'ACTIVE','/admin/departments','Legacy department master')
ON CONFLICT (table_name) DO NOTHING;

INSERT INTO public.core_legacy_table_map
  (legacy_schema_name, legacy_table_name, modern_table_name, modern_entity_name, modern_alias,
   module_code, domain_code, table_category, use_strategy, mapping_status, source_system, description)
VALUES
  ('public','profiles','profiles','UserProfile','user_profile','CORE','PEOPLE_ACCESS','SECURITY','DIRECT','APPROVED','LOVABLE','Standard user profile - preserved'),
  ('public','tb_office','tb_office','Office','office','CORE','ORGANIZATION','MASTER','DIRECT','APPROVED','POWERBUILDER','Legacy office master'),
  ('public','tb_office_departments','tb_office_departments','Department','department','CORE','ORGANIZATION','MASTER','DIRECT','APPROVED','POWERBUILDER','Legacy department master'),
  ('public','user_roles','user_roles','UserRole','user_role','CORE','SECURITY','SECURITY','DIRECT','APPROVED','LOVABLE','User role assignments')
ON CONFLICT (legacy_schema_name, legacy_table_name) DO NOTHING;

WITH tm AS (
  SELECT id, legacy_table_name FROM public.core_legacy_table_map
   WHERE legacy_table_name IN ('profiles','tb_office','tb_office_departments')
)
INSERT INTO public.core_legacy_column_map
  (table_map_id, legacy_column_name, modern_field_name, mapping_status)
SELECT tm.id, c.legacy_column_name, c.modern_field_name, 'APPROVED'
FROM (VALUES
  ('profiles','id','userId'),('profiles','full_name','fullName'),
  ('profiles','first_name','firstName'),('profiles','middle_name','middleName'),
  ('profiles','last_name','lastName'),('profiles','email','email'),
  ('profiles','phone','phone'),('profiles','employee_code','employeeCode'),
  ('profiles','office_code','officeCode'),('profiles','department_id','departmentId'),
  ('profiles','designation_id','designationId'),('profiles','is_active','isActive'),
  ('profiles','locked_until','lockedUntil'),('profiles','failed_login_attempts','failedLoginAttempts'),
  ('profiles','mfa_enabled','mfaEnabled'),
  ('tb_office','code','officeCode'),('tb_office','description','officeName'),
  ('tb_office_departments','id','departmentId'),
  ('tb_office_departments','office_code','officeCode'),
  ('tb_office_departments','name','departmentName')
) AS c(tbl, legacy_column_name, modern_field_name)
JOIN tm ON tm.legacy_table_name = c.tbl
ON CONFLICT (table_map_id, legacy_column_name) DO NOTHING;

INSERT INTO public.core_permission_registry
  (permission_key, permission_name, description, module_code, domain_code,
   permission_scope, action_code, is_platform_permission, is_admin_permission,
   is_sensitive_permission, risk_level, lifecycle_status, seeded_from_registry, source_file)
VALUES
  ('core.admin.users.manage_assignments','Manage User Assignments','Create and update staff assignments','CORE','SECURITY','ADMIN','manage_assignments',true,true,true,'HIGH','ACTIVE',true,'src/platform/identity/identityPermissions.ts'),
  ('core.admin.users.manage_security','Manage User Security State','Lock, suspend, disable, MFA controls','CORE','SECURITY','SECURITY','manage_security',true,true,true,'CRITICAL','ACTIVE',true,'src/platform/identity/identityPermissions.ts'),
  ('core.admin.users.manage_delegations','Manage User Delegations','Grant/revoke delegations','CORE','SECURITY','ADMIN','manage_delegations',true,true,true,'HIGH','ACTIVE',true,'src/platform/identity/identityPermissions.ts'),
  ('core.admin.staff_profiles.view','View Staff Profiles','View enterprise staff profiles','CORE','PEOPLE_ACCESS','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/identity/identityPermissions.ts'),
  ('core.admin.staff_profiles.manage','Manage Staff Profiles','Create/update staff profiles','CORE','PEOPLE_ACCESS','ADMIN','manage',true,true,true,'HIGH','ACTIVE',true,'src/platform/identity/identityPermissions.ts'),
  ('core.admin.identity.view','View Identity Framework','View identity/security admin surfaces','CORE','PEOPLE_ACCESS','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/identity/identityPermissions.ts'),
  ('core.admin.identity.manage','Manage Identity Framework','Manage identity/security admin surfaces','CORE','PEOPLE_ACCESS','ADMIN','manage',true,true,true,'HIGH','ACTIVE',true,'src/platform/identity/identityPermissions.ts')
ON CONFLICT (permission_key) DO NOTHING;

UPDATE public.core_permission_registry
   SET risk_level = 'CRITICAL', is_sensitive_permission = true
 WHERE permission_key = 'core.admin.users.manage_roles';
UPDATE public.core_permission_registry
   SET risk_level = 'HIGH', is_sensitive_permission = true
 WHERE permission_key = 'core.admin.users.disable';
