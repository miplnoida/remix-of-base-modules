
CREATE OR REPLACE FUNCTION public.restore_comm_hub_operating_mode_after_controlled_live(
  p_execution_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_prior   public.communication_operating_mode;
  v_current public.communication_operating_mode;
  v_actor   uuid;
  v_err     text;
BEGIN
  SELECT prior_operating_mode, requested_by
    INTO v_prior, v_actor
    FROM public.communication_controlled_live_execution
   WHERE id = p_execution_id;

  IF v_prior IS NULL THEN
    UPDATE public.communication_controlled_live_execution
       SET restored_operating_mode = NULL,
           cleanup_state = COALESCE(cleanup_state,'no_restore_needed'),
           updated_at = now()
     WHERE id = p_execution_id;
    RETURN jsonb_build_object('ok', true, 'restored', false);
  END IF;

  SELECT operating_mode INTO v_current
    FROM public.communication_hub_control_settings
   WHERE singleton_guard = 'primary';

  BEGIN
    IF v_current IS DISTINCT FROM v_prior THEN
      PERFORM public._apply_comm_hub_mode_transition_core(
                v_prior,
                'restore_after_controlled_live_execution:' || p_execution_id::text,
                NULL,
                v_actor,
                'restore_after_controlled_live');
    END IF;
    UPDATE public.communication_controlled_live_execution
       SET restored_operating_mode = v_prior,
           cleanup_state = 'restored',
           updated_at = now()
     WHERE id = p_execution_id;
    RETURN jsonb_build_object('ok', true, 'restored', true,
                              'operating_mode', v_prior,
                              'automation_state', 'STANDBY');
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    BEGIN
      PERFORM public._apply_comm_hub_mode_transition_core(
                'EMERGENCY_STOP'::public.communication_operating_mode,
                'fail_safe_after_restore_failure:' || p_execution_id::text,
                NULL, v_actor, 'restore_fail_safe');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    UPDATE public.communication_controlled_live_execution
       SET cleanup_state = 'restore_failed_emergency_stop_engaged',
           cleanup_error = v_err,
           updated_at = now()
     WHERE id = p_execution_id;
    RETURN jsonb_build_object('ok', false, 'restored', false,
                              'fail_safe_engaged', true, 'error', v_err);
  END;
END;
$function$;
