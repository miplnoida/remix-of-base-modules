-- BN-MORT-UI-RECOVERY-2E §5 — Place Death & Mortality Processing under Benefit Servicing.
-- Additive & idempotent. No new module rows are created; the canonical bn_mortality
-- row is re-parented under the canonical bn_servicing group.
DO $$
DECLARE
  v_root uuid;
  v_servicing uuid;
  v_mortality uuid;
BEGIN
  SELECT id INTO v_root FROM public.app_modules
   WHERE name = 'benefits_management' AND parent_id IS NULL;
  IF v_root IS NULL THEN
    RAISE EXCEPTION 'benefits_management root missing — cannot reparent bn_mortality';
  END IF;

  SELECT id INTO v_servicing FROM public.app_modules
   WHERE name = 'bn_servicing' AND parent_id = v_root;
  IF v_servicing IS NULL THEN
    RAISE EXCEPTION 'bn_servicing group missing under benefits_management';
  END IF;

  SELECT id INTO v_mortality FROM public.app_modules WHERE name = 'bn_mortality';
  IF v_mortality IS NULL THEN
    RAISE EXCEPTION 'bn_mortality module row missing — cannot proceed';
  END IF;

  UPDATE public.app_modules
     SET display_name    = 'Death & Mortality Processing',
         description     = 'Register, verify and coordinate the servicing impact of reported deaths.',
         route           = '/bn/mortality',
         icon            = 'ShieldAlert',
         parent_id       = v_servicing,
         is_enabled      = true,
         show_in_menu    = true,
         routes_enabled  = true,
         actions_enabled = false,
         rollout_state   = 'internal_pilot',
         -- Position before Award Suspension (which is sort_order=40 under bn_servicing).
         sort_order      = 30,
         updated_at      = now()
   WHERE id = v_mortality;
END $$;