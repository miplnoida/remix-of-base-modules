
CREATE OR REPLACE FUNCTION public.fail_comm_hub_dry_run(
  p_execution_id uuid,
  p_state text,
  p_failure_stage text,
  p_blockers jsonb DEFAULT '[]'::jsonb,
  p_warnings jsonb DEFAULT '[]'::jsonb,
  p_technical_summary text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exec public.communication_dry_run_execution%ROWTYPE;
BEGIN
  IF p_state NOT IN ('BLOCKED','FAILED') THEN
    RETURN jsonb_build_object('ok', false, 'code','invalid_terminal_state');
  END IF;
  IF p_failure_stage NOT IN ('BEGIN','MARK_DISPATCHING','TARGETED_DISPATCH',
                              'DISPATCH_RESPONSE_VALIDATION','FINALIZE','UNEXPECTED') THEN
    RETURN jsonb_build_object('ok', false, 'code','invalid_failure_stage');
  END IF;

  SELECT * INTO v_exec FROM public.communication_dry_run_execution WHERE id = p_execution_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code','execution_not_found'); END IF;

  IF v_exec.state IN ('CERTIFIED','BLOCKED','FAILED') THEN
    RETURN jsonb_build_object('ok', true, 'code','already_terminal', 'state', v_exec.state);
  END IF;

  UPDATE public.communication_dry_run_execution
     SET state = p_state,
         failure_stage = p_failure_stage,
         blockers = coalesce(p_blockers,'[]'::jsonb),
         warnings = warnings || coalesce(p_warnings,'[]'::jsonb),
         audit_metadata = audit_metadata
           || jsonb_build_object('failure_summary', coalesce(p_technical_summary, ''))
   WHERE id = p_execution_id;

  RETURN jsonb_build_object('ok', true, 'state', p_state, 'failure_stage', p_failure_stage);
END; $$;

REVOKE ALL ON FUNCTION public.fail_comm_hub_dry_run(uuid, text, text, jsonb, jsonb, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_comm_hub_dry_run(uuid, text, text, jsonb, jsonb, text) TO service_role;
