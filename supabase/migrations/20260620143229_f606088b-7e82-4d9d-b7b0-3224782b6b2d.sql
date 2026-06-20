
-- ============================================================
-- SEED: Legal Department test users, roles, workbaskets, perms
-- ============================================================

-- 1) Roles ---------------------------------------------------
INSERT INTO public.roles (role_name, description, is_active, is_system_role) VALUES
  ('LEGAL_OFFICER',        'SEED- Legal Officer: handle assigned legal cases',                  true, false),
  ('SENIOR_LEGAL_OFFICER', 'SEED- Senior Legal Officer: approve settlements / waivers',         true, false),
  ('LEGAL_MANAGER',        'SEED- Legal Manager: assign cases, oversee workbasket',             true, false),
  ('LEGAL_READ_ONLY',      'SEED- Legal Read-Only: dashboard/audit view access',                true, false),
  ('LEGAL_ADMIN',          'SEED- Legal Admin: configure reference data, fee rules, policies',  true, false)
ON CONFLICT (role_name) DO UPDATE SET
  description = EXCLUDED.description,
  is_active   = true,
  updated_at  = now();

-- 2) lg_role_type_mapping for LEGAL_ADMIN -------------------
INSERT INTO public.lg_role_type_mapping
  (system_role, role_type, can_prepare, can_review, can_approve, can_post_fee, can_close_case, is_active, created_by)
VALUES
  ('LEGAL_ADMIN', 'LG_ADMIN', true, true, true, true, true, true, 'SEED')
ON CONFLICT (system_role, role_type) DO UPDATE SET
  can_prepare    = EXCLUDED.can_prepare,
  can_review     = EXCLUDED.can_review,
  can_approve    = EXCLUDED.can_approve,
  can_post_fee   = EXCLUDED.can_post_fee,
  can_close_case = EXCLUDED.can_close_case,
  is_active      = true,
  updated_at     = now();

-- 3) Legal workbaskets --------------------------------------
INSERT INTO public.bn_workbasket
  (basket_code, basket_name, description, assigned_role, product_category, country_code, is_active, entered_by)
VALUES
  ('LEGAL_REFERRAL_REVIEW',      'Legal Referral Review',     'Incoming referrals awaiting legal triage',     'LEGAL_OFFICER',        'LEGAL', 'STK', true, 'SEED'),
  ('LEGAL_CASE_ASSIGNMENT',      'Legal Case Assignment',     'Cases awaiting officer assignment',            'LEGAL_MANAGER',        'LEGAL', 'STK', true, 'SEED'),
  ('LEGAL_HEARING_PREPARATION',  'Legal Hearing Preparation', 'Cases preparing for upcoming hearings',        'LEGAL_OFFICER',        'LEGAL', 'STK', true, 'SEED'),
  ('LEGAL_SETTLEMENT_REVIEW',    'Legal Settlement Review',   'Settlements and waivers pending approval',     'SENIOR_LEGAL_OFFICER', 'LEGAL', 'STK', true, 'SEED'),
  ('LEGAL_FEE_POSTING',          'Legal Fee Posting',         'Legal fees awaiting posting to ledger',        'SENIOR_LEGAL_OFFICER', 'LEGAL', 'STK', true, 'SEED'),
  ('LEGAL_ENFORCEMENT',          'Legal Enforcement',         'Active enforcement / order execution cases',   'LEGAL_OFFICER',        'LEGAL', 'STK', true, 'SEED')
ON CONFLICT (basket_code) DO UPDATE SET
  basket_name      = EXCLUDED.basket_name,
  description      = EXCLUDED.description,
  assigned_role    = EXCLUDED.assigned_role,
  product_category = EXCLUDED.product_category,
  country_code     = EXCLUDED.country_code,
  is_active        = true,
  modified_by      = 'SEED',
  modified_at      = now();

-- 4) Workbasket → role mappings -----------------------------
WITH wb AS (
  SELECT id, basket_code FROM public.bn_workbasket WHERE basket_code IN (
    'LEGAL_REFERRAL_REVIEW','LEGAL_CASE_ASSIGNMENT','LEGAL_HEARING_PREPARATION',
    'LEGAL_SETTLEMENT_REVIEW','LEGAL_FEE_POSTING','LEGAL_ENFORCEMENT'
  )
), pairs(basket_code, role_name, is_primary) AS (
  VALUES
    -- Legal Manager: all baskets (primary on assignment)
    ('LEGAL_REFERRAL_REVIEW',     'LEGAL_MANAGER',        false),
    ('LEGAL_CASE_ASSIGNMENT',     'LEGAL_MANAGER',        true),
    ('LEGAL_HEARING_PREPARATION', 'LEGAL_MANAGER',        false),
    ('LEGAL_SETTLEMENT_REVIEW',   'LEGAL_MANAGER',        false),
    ('LEGAL_FEE_POSTING',         'LEGAL_MANAGER',        false),
    ('LEGAL_ENFORCEMENT',         'LEGAL_MANAGER',        false),
    -- Senior officer: settlement / fee / closure review
    ('LEGAL_SETTLEMENT_REVIEW',   'SENIOR_LEGAL_OFFICER', true),
    ('LEGAL_FEE_POSTING',         'SENIOR_LEGAL_OFFICER', true),
    -- Officers: referral, hearing, enforcement, notices
    ('LEGAL_REFERRAL_REVIEW',     'LEGAL_OFFICER',        true),
    ('LEGAL_HEARING_PREPARATION', 'LEGAL_OFFICER',        true),
    ('LEGAL_ENFORCEMENT',         'LEGAL_OFFICER',        true),
    -- Read-only: view-only on all baskets
    ('LEGAL_REFERRAL_REVIEW',     'LEGAL_READ_ONLY',      false),
    ('LEGAL_CASE_ASSIGNMENT',     'LEGAL_READ_ONLY',      false),
    ('LEGAL_HEARING_PREPARATION', 'LEGAL_READ_ONLY',      false),
    ('LEGAL_SETTLEMENT_REVIEW',   'LEGAL_READ_ONLY',      false),
    ('LEGAL_FEE_POSTING',         'LEGAL_READ_ONLY',      false),
    ('LEGAL_ENFORCEMENT',         'LEGAL_READ_ONLY',      false)
)
INSERT INTO public.bn_workbasket_role (workbasket_id, role_name, is_primary, created_by)
SELECT wb.id, p.role_name, p.is_primary, 'SEED'
FROM pairs p
JOIN wb ON wb.basket_code = p.basket_code
ON CONFLICT (workbasket_id, role_name) DO UPDATE SET is_primary = EXCLUDED.is_primary;

-- 5) Grant lg_* module "view" permission to legal roles ----
WITH r AS (
  SELECT id, role_name FROM public.roles
   WHERE role_name IN ('LEGAL_OFFICER','SENIOR_LEGAL_OFFICER','LEGAL_MANAGER','LEGAL_READ_ONLY','LEGAL_ADMIN')
),
m AS (
  SELECT id AS module_id, name AS module_name
    FROM public.app_modules
   WHERE name LIKE 'lg\_%' ESCAPE '\'
),
a AS (
  SELECT a.id AS action_id, a.module_id, m.module_name
    FROM public.module_actions a
    JOIN m ON m.module_id = a.module_id
   WHERE a.action_name = 'view'
)
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, a.module_id, a.action_id, true
FROM r
CROSS JOIN a
WHERE
  -- Legal Admin sees everything (including lg_admin*)
  r.role_name = 'LEGAL_ADMIN'
  OR
  -- All other Legal roles see Legal screens EXCEPT lg_admin*
  (r.role_name <> 'LEGAL_ADMIN' AND a.module_name NOT LIKE 'lg\_admin%' ESCAPE '\')
ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET is_granted = true;

-- 6) Test auth users + profiles + user_roles ---------------
DO $seed_users$
DECLARE
  v_dept_id uuid := '45a8c32a-ea0e-4e0f-9b9b-6bd471bbfb6b'; -- STK Legal
  v_password text := 'Legal@2026!';
  v_user RECORD;
  v_hash text;
BEGIN
  FOR v_user IN
    SELECT * FROM (VALUES
      ('11111111-aaaa-4aaa-8aaa-000000000001'::uuid, 'legalofficer1@seed.test',  'Legal Officer One',       'LEGAL_OFFICER',        'LGOFF1'),
      ('11111111-aaaa-4aaa-8aaa-000000000002'::uuid, 'legalofficer2@seed.test',  'Legal Officer Two',       'LEGAL_OFFICER',        'LGOFF2'),
      ('11111111-aaaa-4aaa-8aaa-000000000003'::uuid, 'legalsenior1@seed.test',   'Legal Senior One',        'SENIOR_LEGAL_OFFICER', 'LGSEN1'),
      ('11111111-aaaa-4aaa-8aaa-000000000004'::uuid, 'legalmanager1@seed.test',  'Legal Manager One',       'LEGAL_MANAGER',        'LGMGR1'),
      ('11111111-aaaa-4aaa-8aaa-000000000005'::uuid, 'legalreadonly1@seed.test', 'Legal Read-Only One',     'LEGAL_READ_ONLY',      'LGRO1'),
      ('11111111-aaaa-4aaa-8aaa-000000000006'::uuid, 'legaladmin1@seed.test',    'Legal Admin One',         'LEGAL_ADMIN',          'LGADM1')
    ) AS t(uid, email, full_name, role_name, user_code)
  LOOP
    v_hash := crypt(v_password, gen_salt('bf'));

    -- auth.users
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      v_user.uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      v_user.email, v_hash,
      now(),
      jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
      jsonb_build_object('full_name', v_user.full_name, 'seed', true),
      now(), now(), '', '', '', ''
    )
    ON CONFLICT (id) DO UPDATE SET
      email              = EXCLUDED.email,
      encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
      updated_at         = now();

    -- auth.identities (email provider, required for password login)
    INSERT INTO auth.identities (
      id, user_id, provider, provider_id, identity_data,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user.uid, 'email', v_user.uid::text,
      jsonb_build_object('sub', v_user.uid::text, 'email', v_user.email, 'email_verified', true),
      now(), now(), now()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE SET
      identity_data = EXCLUDED.identity_data,
      updated_at    = now();

    -- profiles
    INSERT INTO public.profiles (
      id, email, full_name, first_name, last_name,
      department_id, office_code, user_code, is_active, force_password_change
    ) VALUES (
      v_user.uid, v_user.email, v_user.full_name,
      split_part(v_user.full_name, ' ', 1),
      split_part(v_user.full_name, ' ', array_length(string_to_array(v_user.full_name,' '),1)),
      v_dept_id, 'STK', v_user.user_code, true, false
    )
    ON CONFLICT (id) DO UPDATE SET
      email                 = EXCLUDED.email,
      full_name             = EXCLUDED.full_name,
      department_id         = EXCLUDED.department_id,
      office_code           = EXCLUDED.office_code,
      user_code             = EXCLUDED.user_code,
      is_active             = true,
      force_password_change = false,
      updated_at            = now();

    -- user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user.uid, v_user.role_name)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END
$seed_users$;
