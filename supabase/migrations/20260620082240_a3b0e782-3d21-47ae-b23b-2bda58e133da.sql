
-- ============================================================
-- Central Reference Framework: extend bn_reference_* with module
-- governance fields, migrate Legal reference data, drop lg tables
-- ============================================================

-- 1) Extend bn_reference_group
ALTER TABLE public.bn_reference_group
  ADD COLUMN IF NOT EXISTS module_name            text,
  ADD COLUMN IF NOT EXISTS group_category         text,
  ADD COLUMN IF NOT EXISTS owner_role_code        text,
  ADD COLUMN IF NOT EXISTS manage_permission_code text,
  ADD COLUMN IF NOT EXISTS view_permission_code   text,
  ADD COLUMN IF NOT EXISTS is_system_group        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order             integer NOT NULL DEFAULT 0;

-- keep is_system_group aligned with legacy is_system
UPDATE public.bn_reference_group SET is_system_group = is_system WHERE is_system_group IS DISTINCT FROM is_system;

-- Backfill module_name + permission codes for existing modules
UPDATE public.bn_reference_group
   SET module_name = COALESCE(module_name, CASE module_code
        WHEN 'BN' THEN 'Benefits Management'
        WHEN 'BENEFITS' THEN 'Benefits Management'
        WHEN 'LEGAL' THEN 'Legal Management'
        WHEN 'COMPLIANCE' THEN 'Compliance Management'
        WHEN 'COMMON' THEN 'Common / System'
        ELSE module_code END),
       manage_permission_code = COALESCE(manage_permission_code, module_code || '.REFDATA.MANAGE'),
       view_permission_code   = COALESCE(view_permission_code,   module_code || '.REFDATA.VIEW');

-- 2) Extend bn_reference_value
ALTER TABLE public.bn_reference_value
  ADD COLUMN IF NOT EXISTS module_code text,
  ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','INACTIVE','RETIRED'));

-- Backfill module_code from parent group
UPDATE public.bn_reference_value v
   SET module_code = g.module_code
  FROM public.bn_reference_group g
 WHERE v.group_id = g.id
   AND (v.module_code IS NULL OR v.module_code <> g.module_code);

-- Backfill status from is_active for existing rows
UPDATE public.bn_reference_value
   SET status = CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END
 WHERE status = 'ACTIVE' AND is_active = false;

-- 3) Seed LEGAL reference groups (and 5 additional from spec)
WITH src(group_code, group_name, group_category, description, sort_order) AS (
  VALUES
    ('LG_CASE_TYPE',        'Case Type',         'CASE',     'Legal case types',          10),
    ('LG_CASE_STATUS',      'Case Status',       'CASE',     'Legal case statuses',       20),
    ('LG_CASE_STAGE',       'Case Stage',        'CASE',     'Legal case workflow stages',30),
    ('LG_PRIORITY',         'Priority',          'CASE',     'Case priority levels',      40),
    ('LG_CLOSURE_REASON',   'Closure Reason',    'CASE',     'Case closure reasons',      50),
    ('LG_HEARING_TYPE',     'Hearing Type',      'HEARING',  'Court hearing types',       60),
    ('LG_HEARING_OUTCOME',  'Hearing Outcome',   'HEARING',  'Hearing outcomes',          70),
    ('LG_ORDER_TYPE',       'Order Type',        'ORDER',    'Court order types',         80),
    ('LG_NOTICE_TYPE',      'Notice Type',       'NOTICE',   'Legal notice types',        90),
    ('LG_NOTICE_STATUS',    'Notice Status',     'NOTICE',   'Legal notice statuses',    100),
    ('LG_DELIVERY_STATUS',  'Delivery Status',   'NOTICE',   'Notice delivery statuses', 110),
    ('LG_DOCUMENT_CATEGORY','Document Category', 'DOCUMENT', 'Legal document categories',120),
    ('LG_TASK_TYPE',        'Task Type',         'TASK',     'Legal task types',         130),
    ('LG_DEADLINE_TYPE',    'Deadline Type',     'TASK',     'Legal deadline types',     140),
    ('LG_PARTY_ROLE',       'Party Role',        'PARTY',    'Legal party roles',        150),
    ('LG_PARTY_TYPE',       'Party Type',        'PARTY',    'Legal party types',        160)
)
INSERT INTO public.bn_reference_group
  (group_code, group_name, module_code, module_name, group_category, description,
   is_system, is_system_group, is_active, sort_order,
   owner_role_code, manage_permission_code, view_permission_code, created_by, updated_by)
SELECT s.group_code, s.group_name, 'LEGAL', 'Legal Management', s.group_category, s.description,
       true, true, true, s.sort_order,
       'LEGAL_MANAGER', 'LEGAL.REFDATA.MANAGE', 'LEGAL.REFDATA.VIEW', 'system', 'system'
FROM src s
ON CONFLICT (group_code) DO UPDATE SET
   group_name             = EXCLUDED.group_name,
   module_code            = 'LEGAL',
   module_name            = 'Legal Management',
   group_category         = EXCLUDED.group_category,
   description            = EXCLUDED.description,
   sort_order             = EXCLUDED.sort_order,
   owner_role_code        = COALESCE(public.bn_reference_group.owner_role_code, EXCLUDED.owner_role_code),
   manage_permission_code = COALESCE(public.bn_reference_group.manage_permission_code, EXCLUDED.manage_permission_code),
   view_permission_code   = COALESCE(public.bn_reference_group.view_permission_code, EXCLUDED.view_permission_code),
   is_system_group        = true;

-- 4) Migrate existing lg_reference_value rows into bn_reference_value
INSERT INTO public.bn_reference_value
  (group_id, value_code, value_label, description, sort_order,
   is_default, is_system, is_active, module_code, status, metadata_json, created_by, updated_by)
SELECT g.id, lv.code, lv.label, lv.description, COALESCE(lv.sort_order, 0),
       false, true, COALESCE(lv.is_active, true), 'LEGAL',
       CASE WHEN COALESCE(lv.is_active,true) THEN 'ACTIVE' ELSE 'INACTIVE' END,
       lv.metadata, 'system', 'system'
  FROM public.lg_reference_value lv
  JOIN public.bn_reference_group g ON g.group_code = lv.group_code
ON CONFLICT (group_id, value_code) DO NOTHING;

-- 5) Seed additional values for the 5 new groups
WITH gids AS (
  SELECT group_code, id FROM public.bn_reference_group
   WHERE group_code IN ('LG_NOTICE_STATUS','LG_DELIVERY_STATUS','LG_DEADLINE_TYPE','LG_PARTY_ROLE','LG_PARTY_TYPE')
), seed(group_code, value_code, value_label, sort_order) AS (
  VALUES
    ('LG_NOTICE_STATUS','DRAFT','Draft',10),
    ('LG_NOTICE_STATUS','ISSUED','Issued',20),
    ('LG_NOTICE_STATUS','SERVED','Served',30),
    ('LG_NOTICE_STATUS','ACKNOWLEDGED','Acknowledged',40),
    ('LG_NOTICE_STATUS','EXPIRED','Expired',50),
    ('LG_NOTICE_STATUS','CANCELLED','Cancelled',60),
    ('LG_DELIVERY_STATUS','PENDING','Pending',10),
    ('LG_DELIVERY_STATUS','DISPATCHED','Dispatched',20),
    ('LG_DELIVERY_STATUS','DELIVERED','Delivered',30),
    ('LG_DELIVERY_STATUS','UNDELIVERED','Undelivered',40),
    ('LG_DELIVERY_STATUS','REFUSED','Refused',50),
    ('LG_DELIVERY_STATUS','RETURNED','Returned',60),
    ('LG_DEADLINE_TYPE','RESPONSE','Response Deadline',10),
    ('LG_DEADLINE_TYPE','FILING','Filing Deadline',20),
    ('LG_DEADLINE_TYPE','APPEAL','Appeal Deadline',30),
    ('LG_DEADLINE_TYPE','COMPLIANCE','Compliance Deadline',40),
    ('LG_DEADLINE_TYPE','HEARING_PREP','Hearing Preparation',50),
    ('LG_PARTY_ROLE','PLAINTIFF','Plaintiff',10),
    ('LG_PARTY_ROLE','DEFENDANT','Defendant',20),
    ('LG_PARTY_ROLE','RESPONDENT','Respondent',30),
    ('LG_PARTY_ROLE','APPELLANT','Appellant',40),
    ('LG_PARTY_ROLE','WITNESS','Witness',50),
    ('LG_PARTY_ROLE','COUNSEL','Counsel',60),
    ('LG_PARTY_ROLE','THIRD_PARTY','Third Party',70),
    ('LG_PARTY_TYPE','INDIVIDUAL','Individual',10),
    ('LG_PARTY_TYPE','EMPLOYER','Employer',20),
    ('LG_PARTY_TYPE','INSURED_PERSON','Insured Person',30),
    ('LG_PARTY_TYPE','GOVERNMENT','Government Agency',40),
    ('LG_PARTY_TYPE','COMPANY','Company',50),
    ('LG_PARTY_TYPE','OTHER','Other',60)
)
INSERT INTO public.bn_reference_value
  (group_id, value_code, value_label, sort_order, is_default, is_system, is_active, module_code, status, created_by, updated_by)
SELECT gids.id, seed.value_code, seed.value_label, seed.sort_order,
       false, true, true, 'LEGAL', 'ACTIVE', 'system', 'system'
  FROM seed JOIN gids USING (group_code)
ON CONFLICT (group_id, value_code) DO NOTHING;

-- 6) Drop legacy lg_reference_value / lg_reference_group
DROP TABLE IF EXISTS public.lg_reference_value;
DROP TABLE IF EXISTS public.lg_reference_group;

-- 7) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_bn_reference_group_module ON public.bn_reference_group(module_code);
CREATE INDEX IF NOT EXISTS idx_bn_reference_value_module ON public.bn_reference_value(module_code);
CREATE INDEX IF NOT EXISTS idx_bn_reference_value_status ON public.bn_reference_value(status);
