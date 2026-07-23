
DROP FUNCTION IF EXISTS public.reserve_comm_hub_controlled_live_grant(uuid, uuid);
DROP FUNCTION IF EXISTS public.consume_comm_hub_controlled_live_grant(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.revoke_comm_hub_controlled_live_grant(uuid, uuid, text);

-- (Residual #1) preview evidence predicate
CREATE OR REPLACE FUNCTION public.check_comm_hub_preview_runtime_evidence(
  p_snapshot_id uuid, p_approval_id uuid, p_module_code text, p_event_code text
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_snap record; v_appr record; v_blockers jsonb := '[]'::jsonb;
BEGIN
  SELECT id,status,module_code,event_code,channel,raw_placeholder_scanner_version,raw_placeholder_total_count
    INTO v_snap FROM public.communication_preview_snapshot WHERE id=p_snapshot_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','preview_snapshot_missing','message','Preview snapshot not found')));
  END IF;
  IF v_snap.status NOT IN ('APPROVED','PREPARED') THEN
    v_blockers := v_blockers || jsonb_build_object('code','preview_snapshot_not_active','message','Preview snapshot is not active','detail',jsonb_build_object('status',v_snap.status));
  END IF;
  IF v_snap.module_code IS DISTINCT FROM p_module_code OR v_snap.event_code IS DISTINCT FROM p_event_code THEN
    v_blockers := v_blockers || jsonb_build_object('code','preview_snapshot_context_mismatch','message','Snapshot does not match requested module/event');
  END IF;
  IF COALESCE(v_snap.raw_placeholder_scanner_version,'') NOT LIKE 'comm-hub-raw-placeholder-scanner/v2%' THEN
    v_blockers := v_blockers || jsonb_build_object('code','preview_snapshot_scanner_stale','message','Snapshot not certified by scanner v2');
  END IF;
  IF COALESCE(v_snap.raw_placeholder_total_count,0) <> 0 THEN
    v_blockers := v_blockers || jsonb_build_object('code','preview_snapshot_placeholder_residue','message','Snapshot still contains raw placeholders');
  END IF;
  IF p_approval_id IS NOT NULL THEN
    SELECT id,snapshot_id,status,expires_at INTO v_appr FROM public.communication_preview_approval WHERE id=p_approval_id;
    IF NOT FOUND THEN
      v_blockers := v_blockers || jsonb_build_object('code','preview_approval_missing','message','Preview approval not found');
    ELSE
      IF v_appr.snapshot_id IS DISTINCT FROM p_snapshot_id THEN
        v_blockers := v_blockers || jsonb_build_object('code','preview_approval_snapshot_mismatch','message','Approval does not belong to snapshot');
      END IF;
      IF v_appr.status IS DISTINCT FROM 'ACTIVE' THEN
        v_blockers := v_blockers || jsonb_build_object('code','preview_approval_not_active','message','Approval is not active','detail',jsonb_build_object('status',v_appr.status));
      END IF;
      IF v_appr.expires_at IS NOT NULL AND v_appr.expires_at <= now() THEN
        v_blockers := v_blockers || jsonb_build_object('code','preview_approval_expired','message','Approval has expired');
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('allowed', jsonb_array_length(v_blockers)=0, 'blockers', v_blockers);
END; $fn$;
REVOKE ALL ON FUNCTION public.check_comm_hub_preview_runtime_evidence(uuid,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_preview_runtime_evidence(uuid,uuid,text,text) TO authenticated, service_role;

-- (Residual #2) approval binding predicate
CREATE OR REPLACE FUNCTION public.check_comm_hub_preview_approval_binding(
  p_approval_id uuid, p_dry_run_certification_id uuid, p_execution_id uuid
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_cert record; v_blockers jsonb := '[]'::jsonb;
BEGIN
  IF p_dry_run_certification_id IS NULL THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','dry_run_certification_required','message','A certified dry run is required')));
  END IF;
  SELECT id,preview_approval_id,status,expires_at INTO v_cert FROM public.communication_dry_run_certification WHERE id=p_dry_run_certification_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','dry_run_certification_missing','message','Dry-run certification not found')));
  END IF;
  IF v_cert.status IS DISTINCT FROM 'CERTIFIED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_not_active','message','Not active','detail',jsonb_build_object('status',v_cert.status));
  END IF;
  IF v_cert.expires_at IS NOT NULL AND v_cert.expires_at <= now() THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_expired','message','Expired');
  END IF;
  IF p_approval_id IS NOT NULL AND v_cert.preview_approval_id IS DISTINCT FROM p_approval_id THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_approval_mismatch','message','Not produced from this approval');
  END IF;
  RETURN jsonb_build_object('allowed',jsonb_array_length(v_blockers)=0,'blockers',v_blockers,'execution_id',p_execution_id);
END; $fn$;
REVOKE ALL ON FUNCTION public.check_comm_hub_preview_approval_binding(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_preview_approval_binding(uuid,uuid,uuid) TO authenticated, service_role;

-- (Residual #3) durable denial wrapper
CREATE OR REPLACE FUNCTION public.check_comm_hub_runtime_transition_safe(
  p_action text, p_context jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_result jsonb;
BEGIN
  BEGIN v_result := public.assert_comm_hub_runtime_transition(p_action, p_context);
  EXCEPTION WHEN OTHERS THEN
    v_result := jsonb_build_object('allowed',false,'denied_reasons',
      jsonb_build_array(jsonb_build_object('code','runtime_gate_error','message',SQLERRM,'sqlstate',SQLSTATE)));
  END;
  RETURN v_result;
END; $fn$;
REVOKE ALL ON FUNCTION public.check_comm_hub_runtime_transition_safe(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_runtime_transition_safe(text,jsonb) TO authenticated, service_role;
COMMENT ON FUNCTION public.check_comm_hub_runtime_transition_safe(text,jsonb) IS
'Return-not-raise wrapper. Denial log rows survive caller RETURN. Callers MUST return blocked payload rather than RAISE.';

-- (Residual #4) service-operation allowlist
CREATE TABLE IF NOT EXISTS public.comm_hub_service_operation_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_account text NOT NULL,
  operation text NOT NULL,
  reason text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (service_account, operation)
);
GRANT SELECT ON public.comm_hub_service_operation_allowlist TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.comm_hub_service_operation_allowlist TO service_role;
ALTER TABLE public.comm_hub_service_operation_allowlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comm_hub_svc_allowlist_admin_read" ON public.comm_hub_service_operation_allowlist;
CREATE POLICY "comm_hub_svc_allowlist_admin_read" ON public.comm_hub_service_operation_allowlist
  FOR SELECT TO authenticated USING (public.is_comm_hub_operator_admin(auth.uid()));
DROP POLICY IF EXISTS "comm_hub_svc_allowlist_service_all" ON public.comm_hub_service_operation_allowlist;
CREATE POLICY "comm_hub_svc_allowlist_service_all" ON public.comm_hub_service_operation_allowlist
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.comm_hub_service_operation_allowlist (service_account, operation, reason) VALUES
  ('comm-hub-dispatch','DISPATCH_CONTROLLED_STUB','Async dispatcher claims and finalises controlled-stub messages'),
  ('comm-hub-controlled-live-test','CREATE_TARGETED_MESSAGE','Controlled-live test EF creates stub message'),
  ('comm-hub-controlled-live-test','CLAIM_TARGETED_MESSAGE','Controlled-live test EF claims stub message'),
  ('comm-hub-controlled-live-test','CERTIFY_CONTROLLED_STUB','Controlled-live test EF certifies stub outcome'),
  ('comm-hub-dry-run','START_DRY_RUN','Dry-run EF opens executions from approved preview'),
  ('comm-hub-dry-run','CERTIFY_DRY_RUN','Dry-run EF certifies dry-run executions')
ON CONFLICT (service_account, operation) DO NOTHING;

CREATE OR REPLACE FUNCTION public.assert_comm_hub_service_operation(
  p_service_account text, p_operation text
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_ok boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.comm_hub_service_operation_allowlist
    WHERE service_account=p_service_account AND operation=p_operation AND active=true) INTO v_ok;
  IF v_ok THEN RETURN jsonb_build_object('allowed',true); END IF;
  RETURN jsonb_build_object('allowed',false,'blockers',
    jsonb_build_array(jsonb_build_object('code','service_operation_not_allowlisted',
      'message', format('Service account %I is not allowlisted for %I', p_service_account, p_operation))));
END; $fn$;
REVOKE ALL ON FUNCTION public.assert_comm_hub_service_operation(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_comm_hub_service_operation(text,text) TO authenticated, service_role;

-- (Residual #5) atomic grant lifecycle helpers
CREATE FUNCTION public.reserve_comm_hub_controlled_live_grant(
  p_grant_id uuid, p_reserved_by uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_row public.communication_controlled_live_grant;
BEGIN
  UPDATE public.communication_controlled_live_grant g
     SET status='RESERVED', reserved_at=COALESCE(g.reserved_at,now()), updated_at=now(),
         audit_metadata=COALESCE(g.audit_metadata,'{}'::jsonb) || jsonb_build_object('reserved_by',p_reserved_by)
   WHERE g.id=p_grant_id AND g.status='ISSUED' AND (g.expires_at IS NULL OR g.expires_at > now())
   RETURNING g.* INTO v_row;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','grant_not_reservable','message','Grant is not in ISSUED state or has expired')));
  END IF;
  RETURN jsonb_build_object('allowed',true,'grant_id',v_row.id,'status',v_row.status);
END; $fn$;

CREATE FUNCTION public.consume_comm_hub_controlled_live_grant(
  p_grant_id uuid, p_consumed_by uuid, p_message_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_row public.communication_controlled_live_grant;
BEGIN
  UPDATE public.communication_controlled_live_grant g
     SET status='CONSUMED', consumed_at=now(), updated_at=now(),
         audit_metadata=COALESCE(g.audit_metadata,'{}'::jsonb)
                        || jsonb_build_object('consumed_by',p_consumed_by,'consumed_message_id',p_message_id)
   WHERE g.id=p_grant_id AND g.status='RESERVED'
   RETURNING g.* INTO v_row;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','grant_not_consumable','message','Grant must be RESERVED before it can be consumed')));
  END IF;
  RETURN jsonb_build_object('allowed',true,'grant_id',v_row.id,'status',v_row.status);
END; $fn$;

CREATE FUNCTION public.revoke_comm_hub_controlled_live_grant(
  p_grant_id uuid, p_revoked_by uuid, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_row public.communication_controlled_live_grant;
BEGIN
  UPDATE public.communication_controlled_live_grant g
     SET status='REVOKED', revoked_at=now(), revocation_reason=p_reason, updated_at=now(),
         audit_metadata=COALESCE(g.audit_metadata,'{}'::jsonb) || jsonb_build_object('revoked_by',p_revoked_by)
   WHERE g.id=p_grant_id AND g.status IN ('ISSUED','RESERVED')
   RETURNING g.* INTO v_row;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','grant_not_revocable','message','Grant must be ISSUED or RESERVED to be revoked')));
  END IF;
  RETURN jsonb_build_object('allowed',true,'grant_id',v_row.id,'status',v_row.status);
END; $fn$;

REVOKE ALL ON FUNCTION public.reserve_comm_hub_controlled_live_grant(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_comm_hub_controlled_live_grant(uuid,uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_comm_hub_controlled_live_grant(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_comm_hub_controlled_live_grant(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_comm_hub_controlled_live_grant(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_comm_hub_controlled_live_grant(uuid,uuid,text) TO authenticated, service_role;

-- (Residual #6) partial-unique indexes (baseline confirmed zero dupes)
CREATE UNIQUE INDEX IF NOT EXISTS communication_dry_run_execution_idem_uk
  ON public.communication_dry_run_execution (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS communication_dry_run_certification_idem_uk
  ON public.communication_dry_run_certification (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS communication_controlled_live_execution_idem_uk
  ON public.communication_controlled_live_execution (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS communication_controlled_live_grant_exec_active_uk
  ON public.communication_controlled_live_grant (execution_id) WHERE status IN ('ISSUED','RESERVED');
CREATE UNIQUE INDEX IF NOT EXISTS communication_controlled_live_certification_exec_active_uk
  ON public.communication_controlled_live_certification (execution_id) WHERE status='CERTIFIED';
CREATE UNIQUE INDEX IF NOT EXISTS communication_message_ctrl_exec_grant_uk
  ON public.communication_message (controlled_live_execution_id, controlled_live_grant_id)
  WHERE controlled_live_execution_id IS NOT NULL AND controlled_live_grant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS communication_delivery_attempt_msg_no_uk
  ON public.communication_delivery_attempt (message_id, attempt_no);

CREATE OR REPLACE FUNCTION public.tg_comm_hub_svc_allowlist_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_comm_hub_svc_allowlist_touch ON public.comm_hub_service_operation_allowlist;
CREATE TRIGGER trg_comm_hub_svc_allowlist_touch BEFORE UPDATE ON public.comm_hub_service_operation_allowlist
  FOR EACH ROW EXECUTE FUNCTION public.tg_comm_hub_svc_allowlist_touch();
