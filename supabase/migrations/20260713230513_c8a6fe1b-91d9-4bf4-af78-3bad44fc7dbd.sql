-- BN-SEC-S1B.1 — Reproducible Award Suspension access seed
-- Idempotent. Safe to replay on the current live DB and on a clean DB that
-- already contains the module row. Fails loudly if the module row is missing.

DO $mig$
DECLARE
  v_module_id uuid;
  v_role_admin uuid;
  v_role_claims uuid;
  v_role_super uuid;
  v_role_mgr uuid;
  v_role_dir uuid;
  v_role_aud uuid;
  v_action record;
  v_role_action record;
BEGIN
  -- 1. Resolve module by stable name. Fail if missing (do not silently create).
  SELECT id INTO v_module_id
  FROM public.app_modules
  WHERE name = 'bn_award_suspension';

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'BN-SEC-S1B.1: app_modules row with name=bn_award_suspension is missing. Refusing to create a differently structured module.';
  END IF;

  -- 2. Preserve show_in_menu=false and update display name only.
  --    Do NOT modify route, parent_id, sort_order, or show_in_menu.
  UPDATE public.app_modules
     SET display_name = 'Award Suspension & Resumption',
         updated_at   = now()
   WHERE id = v_module_id
     AND display_name IS DISTINCT FROM 'Award Suspension & Resumption';

  -- Defensive assertion: dark launch requires show_in_menu=false at seed time.
  IF EXISTS (
    SELECT 1 FROM public.app_modules
     WHERE id = v_module_id AND show_in_menu = true
  ) THEN
    RAISE EXCEPTION 'BN-SEC-S1B.1: bn_award_suspension must remain show_in_menu=false during dark launch.';
  END IF;

  -- 3. Idempotently seed the seven module_actions.
  --    Uses the real unique key (module_id, action_name).
  INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
  VALUES
    (v_module_id, 'view',            'View',                     'View award suspension records and history', true),
    (v_module_id, 'propose',         'Propose Suspension',       'Propose an award suspension for approval',  true),
    (v_module_id, 'approve',         'Approve Suspension',       'Approve a proposed award suspension',       true),
    (v_module_id, 'resume_propose',  'Propose Resumption',       'Propose resumption of a suspended award',   true),
    (v_module_id, 'resume_approve',  'Approve Resumption',       'Approve a proposed award resumption',       true),
    (v_module_id, 'reverse',         'Reverse Suspension',       'Reverse an executed suspension action',     true),
    (v_module_id, 'audit',           'Audit Suspension History', 'Read-only access to suspension audit',      true)
  ON CONFLICT (module_id, action_name) DO UPDATE
    SET is_enabled   = true,
        display_name = EXCLUDED.display_name,
        description  = COALESCE(EXCLUDED.description, public.module_actions.description);

  -- 4. Resolve role IDs by stable role_name.
  SELECT id INTO v_role_admin  FROM public.roles WHERE role_name = 'Admin';
  SELECT id INTO v_role_claims FROM public.roles WHERE role_name = 'BN_CLAIMS_OFFICER';
  SELECT id INTO v_role_super  FROM public.roles WHERE role_name = 'BN_SUPERVISOR';
  SELECT id INTO v_role_mgr    FROM public.roles WHERE role_name = 'BN_MANAGER';
  SELECT id INTO v_role_dir    FROM public.roles WHERE role_name = 'BN_DIRECTOR';
  SELECT id INTO v_role_aud    FROM public.roles WHERE role_name = 'BN_AUDITOR';

  IF v_role_admin IS NULL OR v_role_claims IS NULL OR v_role_super IS NULL
     OR v_role_mgr IS NULL OR v_role_dir IS NULL OR v_role_aud IS NULL THEN
    RAISE EXCEPTION 'BN-SEC-S1B.1: one or more required roles are missing (Admin, BN_CLAIMS_OFFICER, BN_SUPERVISOR, BN_MANAGER, BN_DIRECTOR, BN_AUDITOR).';
  END IF;

  -- 5. Idempotently seed the accepted role grants (32 total).
  --    Uses the real unique key (role_id, module_id, action_id).
  --    FinanceOfficer intentionally has no operational grant in this epic.
  FOR v_role_action IN
    SELECT * FROM (VALUES
      (v_role_admin,  'view'), (v_role_admin,  'propose'), (v_role_admin,  'approve'),
      (v_role_admin,  'resume_propose'), (v_role_admin,  'resume_approve'),
      (v_role_admin,  'reverse'), (v_role_admin,  'audit'),

      (v_role_claims, 'view'), (v_role_claims, 'propose'), (v_role_claims, 'resume_propose'),

      (v_role_super,  'view'), (v_role_super,  'propose'), (v_role_super,  'approve'),
      (v_role_super,  'resume_propose'), (v_role_super,  'resume_approve'),
      (v_role_super,  'audit'),

      (v_role_mgr,    'view'), (v_role_mgr,    'propose'), (v_role_mgr,    'approve'),
      (v_role_mgr,    'resume_propose'), (v_role_mgr,    'resume_approve'),
      (v_role_mgr,    'reverse'), (v_role_mgr,    'audit'),

      (v_role_dir,    'view'), (v_role_dir,    'propose'), (v_role_dir,    'approve'),
      (v_role_dir,    'resume_propose'), (v_role_dir,    'resume_approve'),
      (v_role_dir,    'reverse'), (v_role_dir,    'audit'),

      (v_role_aud,    'view'), (v_role_aud,    'audit')
    ) AS t(role_id, action_name)
  LOOP
    INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
    SELECT v_role_action.role_id, v_module_id, ma.id, true
      FROM public.module_actions ma
     WHERE ma.module_id = v_module_id
       AND ma.action_name = v_role_action.action_name
    ON CONFLICT (role_id, module_id, action_id) DO NOTHING;
  END LOOP;

  -- 6. Verification. Any drift aborts the migration.
  IF (SELECT COUNT(*) FROM public.module_actions
        WHERE module_id = v_module_id) <> 7 THEN
    RAISE EXCEPTION 'BN-SEC-S1B.1 verification failed: expected 7 module_actions.';
  END IF;

  IF (SELECT COUNT(*) FROM public.role_permissions rp
        WHERE rp.module_id = v_module_id
          AND rp.is_granted = true
          AND rp.role_id IN (v_role_admin, v_role_claims, v_role_super,
                             v_role_mgr, v_role_dir, v_role_aud)) <> 32 THEN
    RAISE EXCEPTION 'BN-SEC-S1B.1 verification failed: expected 32 accepted grants.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.role_permissions rp
      JOIN public.roles r ON r.id = rp.role_id
     WHERE rp.module_id = v_module_id
       AND rp.is_granted = true
       AND r.role_name = 'FinanceOfficer'
  ) THEN
    RAISE EXCEPTION 'BN-SEC-S1B.1 verification failed: FinanceOfficer must have no operational grants.';
  END IF;
END
$mig$;
