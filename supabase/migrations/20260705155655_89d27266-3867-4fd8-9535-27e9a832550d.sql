
-- Epic 1.1.3 — Reference Framework Adoption Wave 1
-- Target group: CORE_TIMEZONE (platform-owned, low risk)
-- Fills in missing governance metadata + seeds one alias, one external code, one i18n row
-- All operations are idempotent and scoped to this single group.

DO $$
DECLARE
  v_group_id uuid;
  v_utc_id uuid;
  v_stk_id uuid;
BEGIN
  SELECT id INTO v_group_id FROM public.core_reference_group WHERE group_code = 'CORE_TIMEZONE';
  IF v_group_id IS NULL THEN
    RAISE NOTICE 'CORE_TIMEZONE group not found; skipping Wave 1 seed.';
    RETURN;
  END IF;

  UPDATE public.core_reference_group
     SET description = COALESCE(NULLIF(description, ''), 'IANA time zones supported by the platform for date/time display and scheduling.'),
         category_code = COALESCE(category_code, 'PLATFORM'),
         ownership_module_code = COALESCE(ownership_module_code, 'CORE'),
         is_platform_owned = TRUE,
         is_org_overridable = FALSE,
         lifecycle_status = COALESCE(lifecycle_status, 'ACTIVE'),
         supports_hierarchy = FALSE,
         supports_i18n = TRUE,
         supports_external_codes = TRUE,
         business_owner = COALESCE(business_owner, 'Platform Product Owner'),
         steward = COALESCE(steward, 'Platform Reference Steward'),
         version_strategy = COALESCE(version_strategy, 'IMMUTABLE_CODES')
   WHERE id = v_group_id;

  SELECT id INTO v_utc_id FROM public.core_reference_value
   WHERE group_id = v_group_id AND value_code = 'UTC';
  SELECT id INTO v_stk_id FROM public.core_reference_value
   WHERE group_id = v_group_id AND value_code = 'America/St_Kitts';

  -- Alias example (idempotent)
  IF v_stk_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.core_reference_value_alias
     WHERE value_id = v_stk_id AND alias = 'SKT'
  ) THEN
    INSERT INTO public.core_reference_value_alias (value_id, alias, alias_type, locale)
    VALUES (v_stk_id, 'SKT', 'SHORT_CODE', NULL);
  END IF;

  -- External code example: Windows tz id for St Kitts
  IF v_stk_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.core_reference_value_external_code
     WHERE value_id = v_stk_id AND system_code = 'WINDOWS_TZ'
  ) THEN
    INSERT INTO public.core_reference_value_external_code (value_id, system_code, external_code, notes)
    VALUES (v_stk_id, 'WINDOWS_TZ', 'SA Western Standard Time', 'Windows time zone identifier equivalent');
  END IF;

  -- i18n example: French label for UTC
  IF v_utc_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.core_reference_value_i18n
     WHERE value_id = v_utc_id AND locale = 'fr'
  ) THEN
    INSERT INTO public.core_reference_value_i18n (value_id, locale, label, description)
    VALUES (v_utc_id, 'fr', 'Temps universel coordonné (UTC)', 'Fuseau horaire de référence mondial');
  END IF;
END $$;
