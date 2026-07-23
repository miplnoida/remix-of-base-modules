
-- ============================================================
-- A/B. Semantic format validation
-- ============================================================
CREATE OR REPLACE FUNCTION public._comm_hub_is_valid_date(p_value text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_d date; v_iso text;
BEGIN
  IF p_value IS NULL OR NOT (p_value ~ '^\d{4}-\d{2}-\d{2}$') THEN RETURN false; END IF;
  BEGIN
    v_d := to_date(p_value,'YYYY-MM-DD');
  EXCEPTION WHEN OTHERS THEN RETURN false; END;
  -- reject silent normalisation such as 2026-02-30 -> 2026-03-02
  v_iso := to_char(v_d,'YYYY-MM-DD');
  RETURN v_iso = p_value;
END; $$;

CREATE OR REPLACE FUNCTION public._comm_hub_is_valid_datetime(p_value text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_date_part text; v_time_part text; v_tz_part text; v_hh int; v_mm int; v_ss int;
  v_off_sign text; v_off_h int; v_off_m int;
BEGIN
  IF p_value IS NULL THEN RETURN false; END IF;
  -- Strict RFC 3339: date T time [.frac] (Z|(+|-)HH:MM); no whitespace, no locale.
  IF NOT (p_value ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$') THEN
    RETURN false;
  END IF;
  v_date_part := substr(p_value,1,10);
  IF NOT public._comm_hub_is_valid_date(v_date_part) THEN RETURN false; END IF;
  v_time_part := substr(p_value,12,8);
  v_hh := substr(v_time_part,1,2)::int;
  v_mm := substr(v_time_part,4,2)::int;
  v_ss := substr(v_time_part,7,2)::int;
  -- No leap-second support: 00-59 only. Documented in supported-keyword-profile.
  IF v_hh > 23 OR v_mm > 59 OR v_ss > 59 THEN RETURN false; END IF;
  -- Extract timezone tail
  v_tz_part := substring(p_value from '(Z|[+-]\d{2}:\d{2})$');
  IF v_tz_part <> 'Z' THEN
    v_off_sign := substr(v_tz_part,1,1);
    v_off_h := substr(v_tz_part,2,2)::int;
    v_off_m := substr(v_tz_part,5,2)::int;
    IF v_off_h > 14 OR v_off_m > 59 THEN RETURN false; END IF;
  END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public._comm_hub_is_valid_email(p_value text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_value IS NOT NULL
     AND p_value !~ '\s'
     AND p_value ~ '^[^@\s]+@[^@\s]+\.[^@\s.]+$'
$$;

CREATE OR REPLACE FUNCTION public._comm_hub_is_valid_uuid(p_value text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  -- Canonical hyphenated form; both lower- and upper-case hex accepted.
  -- Normalisation (lowercasing) must occur OUTSIDE the immutable payload hash.
  SELECT p_value IS NOT NULL
     AND p_value ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
$$;

CREATE OR REPLACE FUNCTION public._comm_hub_jval_format(p_format text, p_value text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_format
    WHEN 'date'      THEN public._comm_hub_is_valid_date(p_value)
    WHEN 'date-time' THEN public._comm_hub_is_valid_datetime(p_value)
    WHEN 'email'     THEN public._comm_hub_is_valid_email(p_value)
    WHEN 'uuid'      THEN public._comm_hub_is_valid_uuid(p_value)
    ELSE NULL
  END
$$;

-- ============================================================
-- E. Scenario governance guards
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_comm_hub_scenario_govern() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_new text; v_walk uuid; v_hops int := 0;
BEGIN
  -- Reject self-supersession
  IF NEW.supersedes_scenario_id IS NOT NULL AND NEW.supersedes_scenario_id = NEW.id THEN
    RAISE EXCEPTION 'scenario_self_supersession_not_allowed' USING ERRCODE='22023';
  END IF;
  -- Cycle prevention (bounded walk)
  IF NEW.supersedes_scenario_id IS NOT NULL THEN
    v_walk := NEW.supersedes_scenario_id;
    WHILE v_walk IS NOT NULL AND v_hops < 100 LOOP
      IF v_walk = NEW.id THEN
        RAISE EXCEPTION 'scenario_supersession_cycle_detected' USING ERRCODE='22023';
      END IF;
      SELECT supersedes_scenario_id INTO v_walk
        FROM public.communication_hub_event_test_scenario WHERE id=v_walk;
      v_hops := v_hops + 1;
    END LOOP;
  END IF;

  v_new := public.comm_hub_compute_scenario_hash(NEW.id);
  NEW.scenario_hash := v_new;
  IF NEW.scenario_version IS NULL THEN NEW.scenario_version := 1; END IF;
  IF TG_OP='UPDATE' AND OLD.scenario_hash IS DISTINCT FROM v_new THEN
    NEW.scenario_version := COALESCE(OLD.scenario_version,1)+1;
  END IF;
  RETURN NEW;
END; $$;

-- ============================================================
-- F. Protect platform test context from unrestricted mutation
-- ============================================================
DROP POLICY IF EXISTS "platform_test_context_admin_read" ON public.comm_hub_platform_test_context;
CREATE POLICY "platform_test_context_admin_read"
  ON public.comm_hub_platform_test_context
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'Admin'::app_role));
-- No INSERT/UPDATE/DELETE policies => only service_role bypasses RLS.

CREATE OR REPLACE FUNCTION public.tg_comm_hub_platform_test_context_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Any UPDATE that changes semantic content must bump version and refresh hash.
  IF TG_OP='UPDATE' THEN
    IF (OLD.recipient_context, OLD.request_context, OLD.system_context, OLD.sender_context)
       IS DISTINCT FROM
       (NEW.recipient_context, NEW.request_context, NEW.system_context, NEW.sender_context)
       AND NEW.version = OLD.version THEN
      RAISE EXCEPTION 'platform_test_context_change_requires_new_version' USING ERRCODE='22023';
    END IF;
    -- Any semantic change SUPERSEDES prior CURRENT evidence built on it.
    IF (OLD.recipient_context, OLD.request_context, OLD.system_context, OLD.sender_context)
       IS DISTINCT FROM
       (NEW.recipient_context, NEW.request_context, NEW.system_context, NEW.sender_context)
    THEN
      UPDATE public.comm_hub_fixture_compatibility_evidence
         SET status='STALE'
       WHERE platform_test_context_id = NEW.id AND status='CURRENT';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_comm_hub_platform_test_context_guard
  ON public.comm_hub_platform_test_context;
CREATE TRIGGER trg_comm_hub_platform_test_context_guard
  BEFORE UPDATE ON public.comm_hub_platform_test_context
  FOR EACH ROW EXECUTE FUNCTION public.tg_comm_hub_platform_test_context_guard();

-- ============================================================
-- L. Evidence lifecycle: at most one CURRENT per scope
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_hub_fce_one_current_per_scope
  ON public.comm_hub_fixture_compatibility_evidence
     (module_code,event_code,channel,template_version_id,scenario_id)
  WHERE status='CURRENT';

-- Block direct writes by non-service roles (authoritative evidence only via SECURITY DEFINER writer)
CREATE OR REPLACE FUNCTION public.tg_comm_hub_fce_writer_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT pg_has_role('service_role','USAGE') THEN
    RAISE EXCEPTION 'authoritative_evidence_write_denied' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_comm_hub_fce_writer_guard
  ON public.comm_hub_fixture_compatibility_evidence;
CREATE TRIGGER trg_comm_hub_fce_writer_guard
  BEFORE INSERT OR UPDATE OR DELETE
  ON public.comm_hub_fixture_compatibility_evidence
  FOR EACH ROW EXECUTE FUNCTION public.tg_comm_hub_fce_writer_guard();

-- ============================================================
-- Re-run govern trigger over existing scenarios to recompute hashes
-- against the now-strict validator (idempotent).
-- ============================================================
UPDATE public.communication_hub_event_test_scenario
   SET scenario_hash = public.comm_hub_compute_scenario_hash(id)
 WHERE scenario_hash IS NOT NULL;
