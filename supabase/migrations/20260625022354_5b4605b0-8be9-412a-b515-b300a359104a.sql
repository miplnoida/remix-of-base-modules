
CREATE OR REPLACE FUNCTION public.validate_legal_referrals()
RETURNS TABLE (
  referral_id          uuid,
  referral_no          text,
  source_module        text,
  status               text,
  legal_case_id        uuid,
  info_request_id      uuid,
  issue_code           text,
  issue_severity       text,
  issue_message        text,
  repair_action        text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.referral_no, r.source_module, r.status, r.legal_case_id,
         NULL::uuid, 'NO_OPEN_INFO_REQUEST', 'high',
         'Referral status is INFO_REQUESTED but no open info request exists.',
         'RESYNC_STATUS'
  FROM legal_referral r
  WHERE r.status = 'INFO_REQUESTED'
    AND NOT EXISTS (SELECT 1 FROM legal_referral_info_request ir
                    WHERE ir.legal_referral_id = r.id AND ir.status = 'PENDING_SOURCE_RESPONSE')

  UNION ALL
  SELECT r.id, r.referral_no, r.source_module, r.status, r.legal_case_id,
         ir.id, 'MISSING_SOURCE_TASK', 'high',
         'Pending info request has no source-module work item.', 'CREATE_SOURCE_TASK'
  FROM legal_referral_info_request ir
  JOIN legal_referral r ON r.id = ir.legal_referral_id
  WHERE ir.status = 'PENDING_SOURCE_RESPONSE'
    AND NOT EXISTS (SELECT 1 FROM legal_referral_source_task st WHERE st.info_request_id = ir.id)

  UNION ALL
  SELECT r.id, r.referral_no, r.source_module, r.status, r.legal_case_id,
         ir.id, 'MISSING_NOTIFICATION', 'medium',
         'Open source task has no in-app notification.', 'RECREATE_NOTIFICATION'
  FROM legal_referral_source_task st
  JOIN legal_referral_info_request ir ON ir.id = st.info_request_id
  JOIN legal_referral r ON r.id = st.legal_referral_id
  WHERE st.status IN ('OPEN','IN_PROGRESS')
    AND NOT EXISTS (
      SELECT 1 FROM in_app_notifications n
      WHERE n.related_record_id = r.id::text
        AND COALESCE(n.metadata->>'info_request_no', '') = ir.request_no
    )

  UNION ALL
  SELECT r.id, r.referral_no, r.source_module, r.status, r.legal_case_id,
         ir.id, 'RESPONSE_NOT_SYNCED', 'high',
         'Info request was responded but referral status was not advanced.', 'RESYNC_STATUS'
  FROM legal_referral_info_request ir
  JOIN legal_referral r ON r.id = ir.legal_referral_id
  WHERE ir.status = 'RESPONDED'
    AND r.status NOT IN ('INFO_RESPONDED','UNDER_LEGAL_REVIEW','ACCEPTED','LEGAL_CASE_CREATED','REJECTED','CLOSED')

  UNION ALL
  SELECT r.id, r.referral_no, r.source_module, r.status, r.legal_case_id,
         ir.id, 'STALE_SOURCE_TASK', 'medium',
         'Source task is still open after info request was responded.', 'CLOSE_STALE_TASKS'
  FROM legal_referral_source_task st
  JOIN legal_referral_info_request ir ON ir.id = st.info_request_id
  JOIN legal_referral r ON r.id = st.legal_referral_id
  WHERE ir.status = 'RESPONDED' AND st.status IN ('OPEN','IN_PROGRESS')

  UNION ALL
  SELECT r.id, r.referral_no, r.source_module, r.status, r.legal_case_id,
         NULL::uuid, 'SOURCE_MODULE_MISSING', 'high',
         'Referral has no source_module value.', 'MANUAL_FIX'
  FROM legal_referral r
  WHERE r.source_module IS NULL OR r.source_module = ''

  UNION ALL
  SELECT r.id, r.referral_no, r.source_module, r.status, r.legal_case_id,
         ir.id, 'ROUTING_MISSING', 'high',
         'Info request has no workbasket, team or user assignment.', 'MANUAL_FIX'
  FROM legal_referral_info_request ir
  JOIN legal_referral r ON r.id = ir.legal_referral_id
  WHERE ir.status = 'PENDING_SOURCE_RESPONSE'
    AND ir.requested_to_workbasket_code IS NULL
    AND ir.requested_to_team_code IS NULL
    AND ir.requested_to_user IS NULL

  UNION ALL
  SELECT r.id, r.referral_no, r.source_module, r.status, r.legal_case_id,
         dl.info_request_id, 'DOC_MISSING_DMS_ID', 'medium',
         'Linked document has neither a DMS id nor storage path: ' || COALESCE(dl.file_name, dl.id::text),
         'MANUAL_FIX'
  FROM legal_referral_document_link dl
  JOIN legal_referral r ON r.id = dl.legal_referral_id
  WHERE dl.dms_document_id IS NULL AND dl.dms_file_id IS NULL AND dl.storage_path IS NULL

  UNION ALL
  SELECT r.id, r.referral_no, r.source_module, r.status, ci.lg_case_id,
         NULL::uuid, 'CASE_NOT_LINKED', 'high',
         'Legal case ' || COALESCE(ci.lg_case_id::text,'?') || ' was created from intake but referral.legal_case_id is empty.',
         'RELINK_CASE'
  FROM legal_referral r
  JOIN lg_case_intake ci ON ci.id = r.lg_intake_id
  WHERE ci.lg_case_id IS NOT NULL AND r.legal_case_id IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.validate_legal_referrals() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.repair_legal_referral_create_source_task(
  p_info_request_id uuid, p_actor text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ir  legal_referral_info_request%ROWTYPE;
  v_ref legal_referral%ROWTYPE;
  v_task_id uuid;
BEGIN
  SELECT * INTO v_ir FROM legal_referral_info_request WHERE id = p_info_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Info request % not found', p_info_request_id; END IF;
  SELECT * INTO v_ref FROM legal_referral WHERE id = v_ir.legal_referral_id;
  IF EXISTS (SELECT 1 FROM legal_referral_source_task WHERE info_request_id = p_info_request_id) THEN
    RAISE EXCEPTION 'Source task already exists for info request %', p_info_request_id;
  END IF;

  INSERT INTO legal_referral_source_task (
    legal_referral_id, info_request_id, task_type, source_module,
    assigned_workbasket_code, assigned_team_code, assigned_user,
    priority, due_date, status
  ) VALUES (
    v_ref.id, v_ir.id, 'INFO_REQUEST_RESPONSE', v_ref.source_module,
    COALESCE(v_ir.requested_to_workbasket_code, v_ref.submitted_workbasket_code),
    COALESCE(v_ir.requested_to_team_code, v_ref.submitted_team_code),
    COALESCE(v_ir.requested_to_user, v_ref.submitted_by),
    'NORMAL', v_ir.due_date,
    CASE WHEN v_ir.status = 'PENDING_SOURCE_RESPONSE' THEN 'OPEN' ELSE 'COMPLETED' END
  ) RETURNING id INTO v_task_id;

  INSERT INTO legal_referral_audit (legal_referral_id, info_request_id, event_code, event_module, actor, notes, metadata)
  VALUES (v_ref.id, v_ir.id, 'REPAIR_CREATE_SOURCE_TASK', 'ADMIN', p_actor,
          'Admin recreated missing source task.', jsonb_build_object('task_id', v_task_id));
  RETURN v_task_id;
END $$;
GRANT EXECUTE ON FUNCTION public.repair_legal_referral_create_source_task(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.repair_legal_referral_resync_status(
  p_referral_id uuid, p_actor text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ref legal_referral%ROWTYPE;
  v_open int; v_resp int; v_new text;
BEGIN
  SELECT * INTO v_ref FROM legal_referral WHERE id = p_referral_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral % not found', p_referral_id; END IF;
  SELECT count(*) INTO v_open FROM legal_referral_info_request
    WHERE legal_referral_id = p_referral_id AND status = 'PENDING_SOURCE_RESPONSE';
  SELECT count(*) INTO v_resp FROM legal_referral_info_request
    WHERE legal_referral_id = p_referral_id AND status = 'RESPONDED';
  IF v_open > 0 THEN v_new := 'INFO_REQUESTED';
  ELSIF v_resp > 0 AND v_ref.status NOT IN ('ACCEPTED','LEGAL_CASE_CREATED','REJECTED','CLOSED','UNDER_LEGAL_REVIEW')
    THEN v_new := 'INFO_RESPONDED';
  ELSE v_new := v_ref.status; END IF;

  UPDATE legal_referral SET status = v_new,
       pending_info_request_count = v_open, last_status_at = now()
   WHERE id = p_referral_id;

  INSERT INTO legal_referral_audit (legal_referral_id, event_code, event_module, actor, notes, metadata)
  VALUES (p_referral_id, 'REPAIR_RESYNC_STATUS', 'ADMIN', p_actor,
          'Admin resynced referral status from info-request state.',
          jsonb_build_object('from', v_ref.status, 'to', v_new, 'open_info_requests', v_open, 'responded', v_resp));
  RETURN v_new;
END $$;
GRANT EXECUTE ON FUNCTION public.repair_legal_referral_resync_status(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.repair_legal_referral_close_stale_tasks(
  p_info_request_id uuid, p_actor text
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref_id uuid; v_count int;
BEGIN
  SELECT legal_referral_id INTO v_ref_id FROM legal_referral_info_request WHERE id = p_info_request_id;
  IF v_ref_id IS NULL THEN RAISE EXCEPTION 'Info request % not found', p_info_request_id; END IF;
  WITH upd AS (
    UPDATE legal_referral_source_task
       SET status='COMPLETED', completed_by=p_actor, completed_at=now()
     WHERE info_request_id = p_info_request_id AND status IN ('OPEN','IN_PROGRESS')
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM upd;
  INSERT INTO legal_referral_audit (legal_referral_id, info_request_id, event_code, event_module, actor, notes, metadata)
  VALUES (v_ref_id, p_info_request_id, 'REPAIR_CLOSE_STALE_TASKS', 'ADMIN', p_actor,
          'Admin closed stale source tasks after response.', jsonb_build_object('closed_count', v_count));
  RETURN v_count;
END $$;
GRANT EXECUTE ON FUNCTION public.repair_legal_referral_close_stale_tasks(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.repair_legal_referral_relink_case(
  p_referral_id uuid, p_actor text, p_lg_case_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref legal_referral%ROWTYPE; v_case uuid;
BEGIN
  SELECT * INTO v_ref FROM legal_referral WHERE id = p_referral_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral % not found', p_referral_id; END IF;
  v_case := p_lg_case_id;
  IF v_case IS NULL AND v_ref.lg_intake_id IS NOT NULL THEN
    SELECT lg_case_id INTO v_case FROM lg_case_intake WHERE id = v_ref.lg_intake_id;
  END IF;
  IF v_case IS NULL THEN RAISE EXCEPTION 'No legal case id available to relink referral %', p_referral_id; END IF;
  UPDATE legal_referral
     SET legal_case_id = v_case,
         status = CASE WHEN status IN ('REJECTED','CLOSED') THEN status ELSE 'LEGAL_CASE_CREATED' END,
         last_status_at = now()
   WHERE id = p_referral_id;
  INSERT INTO legal_referral_audit (legal_referral_id, event_code, event_module, actor, notes, metadata)
  VALUES (p_referral_id, 'REPAIR_RELINK_CASE', 'ADMIN', p_actor,
          'Admin relinked legal case to referral.', jsonb_build_object('legal_case_id', v_case));
  RETURN v_case;
END $$;
GRANT EXECUTE ON FUNCTION public.repair_legal_referral_relink_case(uuid, text, uuid) TO authenticated, service_role;
