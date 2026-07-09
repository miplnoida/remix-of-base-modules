
-- Phase 1C-B8-B — Live eligibility window hardening.

-- 1) Add columns to communication_hub_control_settings.
ALTER TABLE public.communication_hub_control_settings
  ADD COLUMN IF NOT EXISTS live_eligible_after timestamptz,
  ADD COLUMN IF NOT EXISTS live_eligible_max_age_minutes integer NOT NULL DEFAULT 30;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_live_max_age' AND conrelid = 'public.communication_hub_control_settings'::regclass
  ) THEN
    ALTER TABLE public.communication_hub_control_settings
      ADD CONSTRAINT chk_live_max_age
      CHECK (live_eligible_max_age_minutes BETWEEN 1 AND 1440);
  END IF;
END $$;

-- 2) Update trigger function: auto-set live_eligible_after on false→true transition.
CREATE OR REPLACE FUNCTION public.chk_comm_hub_control_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email_live_enabled = true
     AND (NEW.allowed_email_addresses IS NULL OR array_length(NEW.allowed_email_addresses, 1) IS NULL)
     AND (NEW.allowed_email_domains IS NULL OR array_length(NEW.allowed_email_domains, 1) IS NULL)
  THEN
    RAISE EXCEPTION 'email_live_enabled requires at least one allowed_email_addresses or allowed_email_domains entry';
  END IF;

  -- Auto-set live_eligible_after when email_live_enabled transitions false -> true
  -- and caller has not explicitly provided a new value.
  IF TG_OP = 'UPDATE'
     AND OLD.email_live_enabled IS DISTINCT FROM NEW.email_live_enabled
     AND NEW.email_live_enabled = true
     AND NEW.live_eligible_after IS NULL
  THEN
    NEW.live_eligible_after := now();
  END IF;

  -- Never auto-clear live_eligible_after on true -> false; keep for audit history.
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- 3) Replace claim_comm_hub_messages with live-eligibility-aware version.
DROP FUNCTION IF EXISTS public.claim_comm_hub_messages(integer, text, boolean);

CREATE OR REPLACE FUNCTION public.claim_comm_hub_messages(
  p_batch_size integer,
  p_worker_id text,
  p_include_live boolean,
  p_live_eligible_after timestamptz DEFAULT NULL,
  p_live_max_age_minutes integer DEFAULT 30
)
RETURNS SETOF public.communication_message
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_batch int := GREATEST(1, LEAST(COALESCE(p_batch_size, 25), 200));
  v_max_age int := GREATEST(1, LEAST(COALESCE(p_live_max_age_minutes, 30), 1440));
  v_live_ok boolean := p_include_live IS TRUE AND p_live_eligible_after IS NOT NULL;
BEGIN
  RETURN QUERY
  WITH cte AS (
    SELECT id
    FROM public.communication_message
    WHERE origin = 'comm_hub'
      AND channel = 'email'
      AND status = 'queued'
      AND (next_attempt_at IS NULL OR next_attempt_at <= now())
      AND (locked_at IS NULL OR locked_at < now() - interval '10 minutes')
      AND (
        test_mode IS TRUE
        OR (
          v_live_ok
          AND test_mode IS FALSE
          AND created_at >= p_live_eligible_after
          AND created_at >= now() - make_interval(mins => v_max_age)
        )
      )
    ORDER BY created_at
    LIMIT v_batch
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.communication_message m
  SET status = 'sending',
      locked_at = now(),
      locked_by = p_worker_id,
      attempt_count = m.attempt_count + 1,
      last_attempt_at = now(),
      updated_at = now()
  FROM cte
  WHERE m.id = cte.id
  RETURNING m.*;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_comm_hub_messages(integer, text, boolean, timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_comm_hub_messages(integer, text, boolean, timestamptz, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_comm_hub_messages(integer, text, boolean, timestamptz, integer) TO service_role;

-- 4) Live-window status RPC — admin-only, read-only.
CREATE OR REPLACE FUNCTION public.get_comm_hub_live_window_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_settings record;
  v_outside int := 0;
  v_inside int := 0;
  v_preview jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'Admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT dispatch_enabled, dry_run_only, email_live_enabled,
         live_eligible_after, live_eligible_max_age_minutes
    INTO v_settings
    FROM public.communication_hub_control_settings
    ORDER BY created_at ASC
    LIMIT 1;

  SELECT COUNT(*) INTO v_inside
    FROM public.communication_message
    WHERE origin = 'comm_hub' AND channel = 'email' AND status = 'queued'
      AND test_mode IS FALSE
      AND v_settings.live_eligible_after IS NOT NULL
      AND created_at >= v_settings.live_eligible_after
      AND created_at >= now() - make_interval(mins => v_settings.live_eligible_max_age_minutes);

  SELECT COUNT(*) INTO v_outside
    FROM public.communication_message
    WHERE origin = 'comm_hub' AND channel = 'email' AND status = 'queued'
      AND test_mode IS FALSE
      AND (
        v_settings.live_eligible_after IS NULL
        OR created_at < v_settings.live_eligible_after
        OR created_at < now() - make_interval(mins => v_settings.live_eligible_max_age_minutes)
      );

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_preview
  FROM (
    SELECT m.id,
           r.request_no,
           m.created_at,
           m.status,
           m.test_mode,
           m.subject,
           CASE
             WHEN rc.email IS NULL THEN NULL
             ELSE regexp_replace(rc.email, '^(.{1,2}).*(@.*)$', '\1***\2')
           END AS recipient_masked,
           'Outside current live eligibility window' AS reason
    FROM public.communication_message m
    LEFT JOIN public.communication_request r ON r.id = m.request_id
    LEFT JOIN public.communication_recipient rc ON rc.id = m.recipient_id
    WHERE m.origin = 'comm_hub' AND m.channel = 'email' AND m.status = 'queued'
      AND m.test_mode IS FALSE
      AND (
        v_settings.live_eligible_after IS NULL
        OR m.created_at < v_settings.live_eligible_after
        OR m.created_at < now() - make_interval(mins => v_settings.live_eligible_max_age_minutes)
      )
    ORDER BY m.created_at DESC
    LIMIT 50
  ) t;

  RETURN jsonb_build_object(
    'live_eligible_after', v_settings.live_eligible_after,
    'live_eligible_max_age_minutes', v_settings.live_eligible_max_age_minutes,
    'db_dispatch_enabled', v_settings.dispatch_enabled,
    'db_dry_run_only', v_settings.dry_run_only,
    'db_email_live_enabled', v_settings.email_live_enabled,
    'queued_live_inside_window', v_inside,
    'queued_live_outside_window', v_outside,
    'outside_window_preview', v_preview,
    'generated_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_comm_hub_live_window_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_comm_hub_live_window_status() TO authenticated;
