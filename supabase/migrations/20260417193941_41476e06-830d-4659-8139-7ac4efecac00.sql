-- Repair Live publish pipeline: idempotent re-application of the last 3 migrations
-- so they succeed on Live where the prior publish aborted on a missing trigger.

-- ============================================================
-- Section 1: Cleanup (re-do of 20260417113408 safely)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'admin_permissions_protection'
      AND c.relname = 'role_permissions'
  ) THEN
    EXECUTE 'ALTER TABLE public.role_permissions DISABLE TRIGGER admin_permissions_protection';
  END IF;
END $$;

DELETE FROM public.role_permissions
 WHERE module_id IN (
   'c3010000-0000-0000-0000-000000000031',
   'c3010000-0000-0000-0000-000000000032'
 );

DELETE FROM public.app_modules
 WHERE id IN (
   'c3010000-0000-0000-0000-000000000031',
   'c3010000-0000-0000-0000-000000000032'
 );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'admin_permissions_protection'
      AND c.relname = 'role_permissions'
  ) THEN
    EXECUTE 'ALTER TABLE public.role_permissions ENABLE TRIGGER admin_permissions_protection';
  END IF;
END $$;

-- ============================================================
-- Section 2: C3-Wizard seed (re-do of 20260417122616 idempotently)
-- ============================================================
INSERT INTO public.c3_site_settings (setting_key, setting_value, setting_type, description, environment, is_active, is_synced, created_by, updated_by)
SELECT v.setting_key, v.setting_value, v.setting_type, v.description, v.environment, true, false, 'system', 'system'
FROM (VALUES
  ('C3_WIZARD_BASE_URL', 'https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1', 'URL',
   'Base URL for all C3-Wizard edge functions (wiz-admin-api, c3-config-sync, sync-se-wages)', 'Dev'),
  ('C3_WIZARD_BASE_URL', 'https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1', 'URL',
   'Base URL for all C3-Wizard edge functions (wiz-admin-api, c3-config-sync, sync-se-wages)', 'Production'),
  ('OUTBOUND_ADMIN_API_KEY', 'uiop906754drd35fvg', 'OUTBOUND_AUTH',
   'Sent as x-admin-api-key when calling Wizard wiz-admin-api', 'Dev'),
  ('OUTBOUND_ADMIN_API_KEY', 'uiop906754drd35fvg', 'OUTBOUND_AUTH',
   'Sent as x-admin-api-key when calling Wizard wiz-admin-api', 'Production'),
  ('OUTBOUND_SYNC_API_KEY', '', 'OUTBOUND_AUTH',
   'Sent as x-sync-api-key when calling Wizard c3-config-sync and sync-se-wages (mirror of edge secret C3_CONFIG_SYNC_API_KEY)', 'Dev'),
  ('OUTBOUND_SYNC_API_KEY', '', 'OUTBOUND_AUTH',
   'Sent as x-sync-api-key when calling Wizard c3-config-sync and sync-se-wages (mirror of edge secret C3_CONFIG_SYNC_API_KEY)', 'Production'),
  ('INBOUND_ADMIN_API_KEY', 'uiop906754drd35fvg', 'INBOUND_AUTH',
   'Wizard validates incoming x-admin-api-key against this value', 'Dev'),
  ('INBOUND_ADMIN_API_KEY', 'uiop906754drd35fvg', 'INBOUND_AUTH',
   'Wizard validates incoming x-admin-api-key against this value', 'Production'),
  ('INBOUND_SYNC_API_KEY', '', 'INBOUND_AUTH',
   'Wizard validates incoming x-sync-api-key against this value', 'Dev'),
  ('INBOUND_SYNC_API_KEY', '', 'INBOUND_AUTH',
   'Wizard validates incoming x-sync-api-key against this value', 'Production')
) AS v(setting_key, setting_value, setting_type, description, environment)
WHERE NOT EXISTS (
  SELECT 1 FROM public.c3_site_settings s
  WHERE s.setting_key = v.setting_key
    AND s.environment = v.environment
    AND COALESCE(s.is_deleted, false) = false
);

-- ============================================================
-- Section 3: date_married trigger (re-apply of 20260417181129)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_date_married_ge_dob()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.date_married IS NOT NULL AND NEW.dob IS NOT NULL THEN
    IF NEW.date_married < NEW.dob THEN
      RAISE EXCEPTION 'Date Married (%) cannot be earlier than Date of Birth (%)', NEW.date_married, NEW.dob
        USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_date_married_ip_master ON public.ip_master;
CREATE TRIGGER trg_validate_date_married_ip_master
BEFORE INSERT OR UPDATE OF date_married, dob
ON public.ip_master
FOR EACH ROW
EXECUTE FUNCTION public.validate_date_married_ge_dob();

CREATE OR REPLACE FUNCTION public.validate_app_date_married_ge_dob()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_dob DATE;
  v_dm DATE;
BEGIN
  BEGIN v_dob := (to_jsonb(NEW) ->> 'date_of_birth')::date; EXCEPTION WHEN OTHERS THEN v_dob := NULL; END;
  IF v_dob IS NULL THEN
    BEGIN v_dob := (to_jsonb(NEW) ->> 'dob')::date; EXCEPTION WHEN OTHERS THEN v_dob := NULL; END;
  END IF;
  BEGIN v_dm := (to_jsonb(NEW) ->> 'date_married')::date; EXCEPTION WHEN OTHERS THEN v_dm := NULL; END;

  IF v_dm IS NOT NULL AND v_dob IS NOT NULL AND v_dm < v_dob THEN
    RAISE EXCEPTION 'Date Married (%) cannot be earlier than Date of Birth (%)', v_dm, v_dob
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ip_applications') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_validate_date_married_ip_applications ON public.ip_applications';
    EXECUTE 'CREATE TRIGGER trg_validate_date_married_ip_applications
             BEFORE INSERT OR UPDATE ON public.ip_applications
             FOR EACH ROW EXECUTE FUNCTION public.validate_app_date_married_ge_dob()';
  END IF;
END $$;