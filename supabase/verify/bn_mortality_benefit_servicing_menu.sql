-- BN-MORT-UI-RECOVERY-2E §9 + BN-MORT-UI-RECOVERY-2F §8
-- Menu placement + sibling order + role-permission verification.
-- Fails when structural, ordering, or permission invariants are violated.
DO $$
DECLARE
  v_root uuid;
  v_servicing uuid;
  v_module_id uuid;
  v_view_action_id uuid;
  v_read_action_id uuid;
  v_mortality_count int;
  v_mortality record;
  v_prev_name text;
  v_prev_sort int;
  v_role text;
  v_role_id uuid;
  v_missing_roles text[] := ARRAY[]::text[];
  v_effective_grants text[] := ARRAY[]::text[];
  v_explicit_denies text[] := ARRAY[]::text[];
  v_missing_grants text[] := ARRAY[]::text[];
  v_unexpected_non_view_grants text[] := ARRAY[]::text[];
  v_top_level_count int;
  v_grant_row record;
BEGIN
  -- ============================================================
  -- Structural placement
  -- ============================================================
  SELECT id INTO v_root FROM public.app_modules
   WHERE name = 'benefits_management' AND parent_id IS NULL;
  IF v_root IS NULL THEN
    RAISE EXCEPTION 'benefits_management root missing';
  END IF;

  SELECT id INTO v_servicing FROM public.app_modules
   WHERE name = 'bn_servicing' AND parent_id = v_root;
  IF v_servicing IS NULL THEN
    RAISE EXCEPTION 'bn_servicing group missing under benefits_management';
  END IF;

  SELECT count(*) INTO v_mortality_count FROM public.app_modules WHERE name = 'bn_mortality';
  IF v_mortality_count <> 1 THEN
    RAISE EXCEPTION 'expected exactly 1 bn_mortality row, found %', v_mortality_count;
  END IF;

  SELECT * INTO v_mortality FROM public.app_modules WHERE name = 'bn_mortality';
  v_module_id := v_mortality.id;

  IF v_mortality.parent_id IS DISTINCT FROM v_servicing THEN
    RAISE EXCEPTION 'bn_mortality.parent_id must equal bn_servicing (%), got %',
      v_servicing, v_mortality.parent_id;
  END IF;
  IF v_mortality.route IS DISTINCT FROM '/bn/mortality' THEN
    RAISE EXCEPTION 'bn_mortality.route must be /bn/mortality, got %', v_mortality.route;
  END IF;
  IF v_mortality.display_name IS DISTINCT FROM 'Death & Mortality Processing' THEN
    RAISE EXCEPTION 'bn_mortality.display_name must be "Death & Mortality Processing", got %',
      v_mortality.display_name;
  END IF;
  IF v_mortality.show_in_menu IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'bn_mortality.show_in_menu must be true';
  END IF;
  IF v_mortality.is_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'bn_mortality.is_enabled must be true';
  END IF;
  IF v_mortality.routes_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'bn_mortality.routes_enabled must be true';
  END IF;
  IF v_mortality.actions_enabled IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'bn_mortality.actions_enabled must be false';
  END IF;
  IF v_mortality.rollout_state IS DISTINCT FROM 'internal_pilot' THEN
    RAISE EXCEPTION 'bn_mortality.rollout_state must be internal_pilot, got %',
      v_mortality.rollout_state;
  END IF;
  IF v_mortality.sort_order IS DISTINCT FROM 30 THEN
    RAISE EXCEPTION 'bn_mortality.sort_order must be 30, got %', v_mortality.sort_order;
  END IF;

  -- No legacy top-level Mortality module.
  SELECT count(*) INTO v_top_level_count FROM public.app_modules
   WHERE name = 'bn_mortality' AND parent_id IS NULL;
  IF v_top_level_count > 0 THEN
    RAISE EXCEPTION 'bn_mortality must not be a top-level module';
  END IF;

  -- ============================================================
  -- Sibling order (BN-MORT-UI-RECOVERY-2F §8 sibling-order assertions)
  -- Intended visible order across the Benefit Servicing group:
  --   1. Life Certificates
  --   2. Medical Reviews
  --   3. Death & Mortality Processing
  --   4. Award Suspension
  --   5. Overpayments
  --   6. Survivors Processing
  -- Assert RELATIVE order among whichever intended siblings exist.
  -- Missing siblings are recorded as a NOTICE, not a hard failure — but
  -- when two intended siblings both exist their relative sort_order must
  -- match the intended order.
  -- ============================================================
  v_prev_name := NULL;
  v_prev_sort := NULL;
  FOR v_grant_row IN
    SELECT name, sort_order
      FROM public.app_modules
     WHERE parent_id = v_servicing
       AND name IN (
         'bn_life_certificates',
         'bn_medical_reviews',
         'bn_mortality',
         'bn_award_suspension',
         'bn_overpayments',
         'bn_survivors_processing'
       )
     ORDER BY
       CASE name
         WHEN 'bn_life_certificates'    THEN 1
         WHEN 'bn_medical_reviews'      THEN 2
         WHEN 'bn_mortality'            THEN 3
         WHEN 'bn_award_suspension'     THEN 4
         WHEN 'bn_overpayments'         THEN 5
         WHEN 'bn_survivors_processing' THEN 6
       END
  LOOP
    IF v_prev_sort IS NOT NULL AND v_grant_row.sort_order <= v_prev_sort THEN
      RAISE EXCEPTION
        'Sibling order violation: % (sort=%) must appear AFTER % (sort=%).',
        v_grant_row.name, v_grant_row.sort_order, v_prev_name, v_prev_sort;
    END IF;
    v_prev_name := v_grant_row.name;
    v_prev_sort := v_grant_row.sort_order;
  END LOOP;

  -- ============================================================
  -- Canonical view action (§6)
  -- ============================================================
  SELECT id INTO v_view_action_id
    FROM public.module_actions
   WHERE module_id = v_module_id AND action_name = 'view';
  IF v_view_action_id IS NULL THEN
    RAISE EXCEPTION 'bn_mortality canonical view action missing';
  END IF;

  SELECT id INTO v_read_action_id
    FROM public.module_actions
   WHERE module_id = v_module_id AND action_name = 'read';
  IF v_read_action_id IS NULL THEN
    RAISE NOTICE 'bn_mortality read action absent (compatibility alias not required)';
  END IF;

  -- ============================================================
  -- Approved role visibility permissions (§7 / §8)
  -- ============================================================
  -- BN-MORT-RBAC-1A: reuse existing Benefits roles instead of parallel lowercase codes.
  FOREACH v_role IN ARRAY ARRAY[
    'BN_INTAKE_OFFICER',
    'BN_DOCUMENT_OFFICER',
    'BN_BENEFIT_OFFICER_GENERALIST',
    'BN_SUPERVISOR',
    'BN_MANAGER',
    'BN_FINANCE_SUPERVISOR'
  ] LOOP
    SELECT id INTO v_role_id FROM public.roles WHERE role_name = v_role;
    IF v_role_id IS NULL THEN
      v_missing_roles := v_missing_roles || v_role;
      CONTINUE;
    END IF;

    SELECT rp.role_id, rp.is_granted
      INTO v_grant_row
      FROM public.role_permissions rp
     WHERE rp.role_id = v_role_id AND rp.action_id = v_view_action_id
     LIMIT 1;

    IF NOT FOUND THEN
      v_missing_grants := v_missing_grants || v_role;
    ELSIF v_grant_row.is_granted IS DISTINCT FROM true THEN
      v_explicit_denies := v_explicit_denies || v_role;
    ELSE
      v_effective_grants := v_effective_grants || v_role;
    END IF;
  END LOOP;

  -- Non-view permissions on Mortality granted to approved roles: none may be added by 2F.
  FOR v_grant_row IN
    SELECT r.role_name, ma.action_name
      FROM public.role_permissions rp
      JOIN public.roles r ON r.id = rp.role_id
      JOIN public.module_actions ma ON ma.id = rp.action_id
     WHERE ma.module_id = v_module_id
       AND ma.action_name <> 'view'
       AND ma.action_name <> 'read'
       AND rp.is_granted = true
       AND r.role_name IN (
         'BN_INTAKE_OFFICER',
         'BN_DOCUMENT_OFFICER',
         'BN_BENEFIT_OFFICER_GENERALIST',
         'BN_SUPERVISOR',
         'BN_MANAGER',
         'BN_FINANCE_SUPERVISOR'
       )
  LOOP
    v_unexpected_non_view_grants := v_unexpected_non_view_grants
      || (v_grant_row.role_name || '/' || v_grant_row.action_name);
  END LOOP;

  IF array_length(v_unexpected_non_view_grants, 1) IS NOT NULL THEN
    RAISE EXCEPTION
      'Approved role received non-view Mortality permission(s): %. §7 forbids granting write/decide/approve/reverse/admin from this slice.',
      array_to_string(v_unexpected_non_view_grants, ', ');
  END IF;

  RAISE NOTICE '===============================================================';
  RAISE NOTICE 'BN-MORT-2F menu + permission verification report';
  RAISE NOTICE '===============================================================';
  RAISE NOTICE '  module:            bn_mortality (id=%)', v_module_id;
  RAISE NOTICE '  parent:            bn_servicing (id=%)', v_servicing;
  RAISE NOTICE '  sort_order:        %', v_mortality.sort_order;
  RAISE NOTICE '  view action_id:    %', v_view_action_id;
  RAISE NOTICE '  read action_id:    %', COALESCE(v_read_action_id::text, '(absent)');
  RAISE NOTICE '  effective grants:  %', COALESCE(array_to_string(v_effective_grants, ', '), '(none)');
  RAISE NOTICE '  explicit denies:   %', COALESCE(array_to_string(v_explicit_denies, ', '), '(none)');
  RAISE NOTICE '  missing grants:    %', COALESCE(array_to_string(v_missing_grants, ', '), '(none)');
  RAISE NOTICE '  missing roles:     %', COALESCE(array_to_string(v_missing_roles, ', '), '(none)');
  RAISE NOTICE '===============================================================';
END $$;
