
CREATE OR REPLACE FUNCTION public.get_comm_hub_cron_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_job record;
  v_runs jsonb;
BEGIN
  IF v_uid IS NULL OR NOT (public.is_admin(v_uid) OR public.has_permission(v_uid, 'system_administration', 'view')) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT jobid, jobname, schedule, active
    INTO v_job
    FROM cron.job
   WHERE jobname = 'comm-hub-dispatch-every-minute'
   LIMIT 1;

  IF v_job.jobid IS NULL THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
           'runid', runid,
           'status', status,
           'return_message', LEFT(COALESCE(return_message,''), 200),
           'start_time', start_time,
           'end_time', end_time
         ) ORDER BY start_time DESC)
    INTO v_runs
    FROM (
      SELECT runid, status, return_message, start_time, end_time
        FROM cron.job_run_details
       WHERE jobid = v_job.jobid
       ORDER BY start_time DESC
       LIMIT 20
    ) r;

  RETURN jsonb_build_object(
    'exists', true,
    'jobid', v_job.jobid,
    'jobname', v_job.jobname,
    'schedule', v_job.schedule,
    'active', v_job.active,
    'recent_runs', COALESCE(v_runs, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_comm_hub_cron_status() FROM public;
GRANT EXECUTE ON FUNCTION public.get_comm_hub_cron_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_comm_hub_safety_counts(window_minutes integer DEFAULT 1440)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_since timestamptz := now() - make_interval(mins => COALESCE(window_minutes, 1440));
  v_stale_before timestamptz := now() - interval '10 minutes';
  v_result jsonb;
BEGIN
  IF v_uid IS NULL OR NOT (public.is_admin(v_uid) OR public.has_permission(v_uid, 'system_administration', 'view')) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT jsonb_build_object(
    'queued_test', (SELECT count(*) FROM communication_message WHERE status='queued' AND test_mode=true),
    'queued_live', (SELECT count(*) FROM communication_message WHERE status='queued' AND test_mode=false),
    'sending', (SELECT count(*) FROM communication_message WHERE status='sending'),
    'stale_locks', (SELECT count(*) FROM communication_message WHERE status='sending' AND locked_at IS NOT NULL AND locked_at < v_stale_before),
    'failed_24h', (SELECT count(*) FROM communication_message WHERE status='failed' AND updated_at >= now() - interval '24 hours'),
    'suppressed_24h', (SELECT count(*) FROM communication_message WHERE status='suppressed' AND updated_at >= now() - interval '24 hours'),
    'accidental_live_sends_24h', (SELECT count(*) FROM communication_message WHERE test_mode=false AND provider_message_id IS NOT NULL AND provider_message_id NOT LIKE 'dry-run%' AND updated_at >= now() - interval '24 hours'),
    'legacy_notification_queue_window', (SELECT count(*) FROM notification_queue WHERE created_at >= v_since),
    'legacy_notification_logs_window', (SELECT count(*) FROM notification_logs WHERE created_at >= v_since),
    'window_minutes', window_minutes
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_comm_hub_safety_counts(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_comm_hub_safety_counts(integer) TO authenticated;
