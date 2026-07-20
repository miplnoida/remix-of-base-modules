-- BN-MORT-UI-RECOVERY-2E §9 — Menu placement verification.
-- Fails when Death & Mortality Processing is not exactly one child of
-- Benefit Servicing under Benefit Management with the expected pilot flags.
DO $$
DECLARE
  v_root uuid;
  v_servicing uuid;
  v_mortality_count int;
  v_mortality record;
BEGIN
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

  IF v_mortality.parent_id IS DISTINCT FROM v_servicing THEN
    RAISE EXCEPTION 'bn_mortality.parent_id must equal bn_servicing (%), got %',
      v_servicing, v_mortality.parent_id;
  END IF;
  IF v_mortality.route IS DISTINCT FROM '/bn/mortality' THEN
    RAISE EXCEPTION 'bn_mortality.route must be /bn/mortality, got %', v_mortality.route;
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

  -- No legacy top-level Mortality module.
  IF EXISTS (
    SELECT 1 FROM public.app_modules
     WHERE name = 'bn_mortality' AND parent_id IS NULL
  ) THEN
    RAISE EXCEPTION 'bn_mortality must not be a top-level module';
  END IF;

  RAISE NOTICE 'bn_mortality menu placement verified: parent=bn_servicing, order=%',
    v_mortality.sort_order;
END $$;
