-- =============================================================================
-- BN-SEC-S1C  Award Suspension Proposal & Approval Backend
-- =============================================================================
-- No RLS. All privileged writes flow through SECURITY DEFINER RPCs.
-- Does NOT change bn_award.status, payments, communication, or claim tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Pre-migration assertions (guard against unexpected live vocabulary)
-- -----------------------------------------------------------------------------
DO $pre$
DECLARE
  bad_count integer;
BEGIN
  SELECT count(*) INTO bad_count
  FROM public.bn_award_suspension_event
  WHERE status IS NOT NULL
    AND status NOT IN ('ACTIVE','RESUMED','PROPOSED','APPROVED','REJECTED','WITHDRAWN');
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'BN-SEC-S1C aborted: % suspension rows carry an unknown status', bad_count;
  END IF;
END
$pre$;

-- -----------------------------------------------------------------------------
-- 1. Extend bn_award_suspension_event  (extend-first — no parallel table)
-- -----------------------------------------------------------------------------
ALTER TABLE public.bn_award_suspension_event
  ADD COLUMN IF NOT EXISTS proposed_by_user_id  uuid,
  ADD COLUMN IF NOT EXISTS workflow_instance_id uuid REFERENCES public.core_workflow_instance(id),
  ADD COLUMN IF NOT EXISTS correlation_id       text,
  ADD COLUMN IF NOT EXISTS row_version          integer NOT NULL DEFAULT 1;

-- Controlled vocabulary: keep operational values valid, add lifecycle values.
ALTER TABLE public.bn_award_suspension_event
  DROP CONSTRAINT IF EXISTS bn_award_suspension_event_status_chk;
ALTER TABLE public.bn_award_suspension_event
  ADD  CONSTRAINT bn_award_suspension_event_status_chk
  CHECK (status IN ('PROPOSED','APPROVED','REJECTED','WITHDRAWN','ACTIVE','RESUMED'));

-- One open suspension case per award (proposal / approved but not-yet-applied).
CREATE UNIQUE INDEX IF NOT EXISTS ux_bn_award_suspension_open_case
  ON public.bn_award_suspension_event(bn_award_id)
  WHERE status IN ('PROPOSED','APPROVED');

CREATE INDEX IF NOT EXISTS idx_bn_susp_event_workflow
  ON public.bn_award_suspension_event(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_bn_susp_event_correlation
  ON public.bn_award_suspension_event(correlation_id);

-- -----------------------------------------------------------------------------
-- 2. core_command_receipt — Platform-owned shared idempotency object
-- -----------------------------------------------------------------------------
-- OWNERSHIP: Platform / core. Reusable by every module command.
-- No RLS (project-wide rule). No direct table grants — accessible only
-- through SECURITY DEFINER helpers below.
CREATE TABLE IF NOT EXISTS public.core_command_receipt (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id     uuid NOT NULL,
  command_name      text NOT NULL,
  idempotency_key   text NOT NULL,
  payload_hash      text NOT NULL,
  response          jsonb,
  status            text NOT NULL DEFAULT 'SUCCESS'
                    CHECK (status IN ('SUCCESS','FAILED','IN_FLIGHT')),
  correlation_id    text,
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_core_command_receipt UNIQUE (actor_user_id, command_name, idempotency_key)
);

-- Deliberately do NOT grant to authenticated/anon — DEFINER helpers only.
GRANT ALL ON public.core_command_receipt TO service_role;
REVOKE ALL ON public.core_command_receipt FROM PUBLIC;

CREATE INDEX IF NOT EXISTS idx_core_command_receipt_actor
  ON public.core_command_receipt(actor_user_id, command_name);

-- -----------------------------------------------------------------------------
-- 3. Dark-launch guard — flip actions_enabled to false
-- -----------------------------------------------------------------------------
UPDATE public.app_modules
   SET actions_enabled = false
 WHERE name = 'bn_award_suspension'
   AND actions_enabled IS DISTINCT FROM false;

-- -----------------------------------------------------------------------------
-- 4. Seed BN_AWARD_SUSPENSION workflow definition (idempotent)
-- -----------------------------------------------------------------------------
DO $seed$
DECLARE
  def_id uuid;
BEGIN
  SELECT id INTO def_id FROM public.core_workflow_definition
   WHERE workflow_code = 'BN_AWARD_SUSPENSION';

  IF def_id IS NULL THEN
    INSERT INTO public.core_workflow_definition
      (workflow_code, workflow_name, description, module_code, domain_code,
       entity_type, version, workflow_status, start_step_code,
       requires_reason_on_reject, allow_withdrawal, allow_delegation,
       allow_reassignment, is_active)
    VALUES
      ('BN_AWARD_SUSPENSION',
       'Benefits Award Suspension Approval',
       'Proposal and approval lifecycle for suspending a benefits award. Does not apply the suspension.',
       'bn_award_suspension','benefits','bn_award_suspension_event',
       1,'ACTIVE','PROPOSED',
       true, true, true, true, true)
    RETURNING id INTO def_id;

    INSERT INTO public.core_workflow_step
      (workflow_definition_id, step_code, step_name, step_type,
       assigned_permission_key, is_start_step, is_end_step,
       allow_comments, requires_reason, display_order, is_active)
    VALUES
      (def_id,'PROPOSED','Proposal submitted','SUBMIT',
       'bn_award_suspension.propose', true, false, true, true, 10, true),
      (def_id,'PENDING_APPROVAL','Awaiting approval','APPROVAL',
       'bn_award_suspension.approve', false, false, true, false, 20, true),
      (def_id,'APPROVED','Approved','END',
       null, false, true, true, false, 30, true),
      (def_id,'REJECTED','Rejected','END',
       null, false, true, true, true, 40, true),
      (def_id,'WITHDRAWN','Withdrawn by proposer','END',
       null, false, true, true, true, 50, true);

    INSERT INTO public.core_workflow_transition
      (workflow_definition_id, from_step_code, to_step_code, transition_code,
       transition_name, action_type, required_permission_key,
       requires_reason, requires_comment, is_terminal, display_order, is_active)
    VALUES
      (def_id,'PROPOSED','PENDING_APPROVAL','SUBMIT','Submit for approval',
        'SUBMIT','bn_award_suspension.propose', false, false, false, 10, true),
      (def_id,'PENDING_APPROVAL','APPROVED','APPROVE','Approve suspension',
        'APPROVE','bn_award_suspension.approve', false, false, true, 20, true),
      (def_id,'PENDING_APPROVAL','REJECTED','REJECT','Reject suspension',
        'REJECT','bn_award_suspension.approve', true, true, true, 30, true),
      (def_id,'PROPOSED','WITHDRAWN','WITHDRAW','Withdraw proposal',
        'WITHDRAW','bn_award_suspension.propose', true, false, true, 40, true),
      (def_id,'PENDING_APPROVAL','WITHDRAWN','WITHDRAW','Withdraw proposal',
        'WITHDRAW','bn_award_suspension.propose', true, false, true, 41, true);
  END IF;
END
$seed$;

-- =============================================================================
-- 5. Private helper functions (SECURITY DEFINER)
-- =============================================================================

-- 5.1 Module rollout guard
CREATE OR REPLACE FUNCTION public._bn_susp_assert_module_enabled()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean;
BEGIN
  SELECT (is_enabled AND actions_enabled) INTO ok
    FROM public.app_modules
   WHERE name = 'bn_award_suspension';
  IF NOT COALESCE(ok, false) THEN
    RAISE EXCEPTION 'E_FEATURE_DISABLED' USING ERRCODE = 'P0001';
  END IF;
END
$$;

-- 5.2 Authenticated actor
CREATE OR REPLACE FUNCTION public._bn_susp_actor()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'E_UNAUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;
  RETURN uid;
END
$$;

-- 5.3 Idempotency check / store
CREATE OR REPLACE FUNCTION public._bn_susp_receipt_lookup(
  p_actor uuid, p_command text, p_key text, p_payload_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.core_command_receipt%ROWTYPE;
BEGIN
  IF p_key IS NULL OR btrim(p_key) = '' THEN
    RETURN NULL;
  END IF;
  SELECT * INTO r FROM public.core_command_receipt
   WHERE actor_user_id = p_actor
     AND command_name  = p_command
     AND idempotency_key = p_key;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF r.payload_hash <> p_payload_hash THEN
    RAISE EXCEPTION 'E_IDEMPOTENCY_PAYLOAD_MISMATCH' USING ERRCODE = 'P0001';
  END IF;
  RETURN r.response;
END
$$;

CREATE OR REPLACE FUNCTION public._bn_susp_receipt_store(
  p_actor uuid, p_command text, p_key text, p_payload_hash text,
  p_response jsonb, p_correlation text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_key IS NULL OR btrim(p_key) = '' THEN
    RETURN;
  END IF;
  INSERT INTO public.core_command_receipt
    (actor_user_id, command_name, idempotency_key, payload_hash,
     response, status, correlation_id)
  VALUES
    (p_actor, p_command, p_key, p_payload_hash, p_response, 'SUCCESS', p_correlation)
  ON CONFLICT (actor_user_id, command_name, idempotency_key) DO NOTHING;
END
$$;

-- 5.4 Central audit writer
CREATE OR REPLACE FUNCTION public._bn_susp_audit(
  p_actor uuid, p_event_code text, p_action text,
  p_entity_id text, p_before jsonb, p_after jsonb,
  p_correlation text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.core_audit_log
    (event_code, event_name, event_category, severity,
     actor_user_id, module_code, domain_code, entity_type, entity_id,
     action, outcome, before_value, after_value, reason,
     correlation_id, source, is_system_generated)
  VALUES
    (p_event_code, p_event_code, 'BENEFITS', 'INFO',
     p_actor, 'bn_award_suspension','benefits','bn_award_suspension_event', p_entity_id,
     p_action,'SUCCESS', p_before, p_after, p_reason,
     p_correlation, 'RPC', true);
END
$$;

-- =============================================================================
-- 6. Public RPCs
-- =============================================================================

-- 6.1 PROPOSE ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bn_award_suspension_propose_v1(
  p_award_id        uuid,
  p_reason_code     text,
  p_effective_from  date,
  p_narrative       text,
  p_idempotency_key text,
  p_correlation_id  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor       uuid;
  v_hash        text;
  v_cached      jsonb;
  v_award       public.bn_award%ROWTYPE;
  v_policy      public.bn_approval_policy%ROWTYPE;
  v_wf_def      public.core_workflow_definition%ROWTYPE;
  v_susp_id     uuid;
  v_wf_inst_id  uuid;
  v_task_id     uuid;
  v_result      jsonb;
BEGIN
  PERFORM public._bn_susp_assert_module_enabled();
  v_actor := public._bn_susp_actor();

  IF NOT (public.has_permission(v_actor,'bn_award_suspension','propose')
       OR public.is_admin(v_actor)) THEN
    RAISE EXCEPTION 'E_FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;

  v_hash := md5(coalesce(p_award_id::text,'')||'|'||coalesce(p_reason_code,'')||'|'||
                coalesce(p_effective_from::text,'')||'|'||coalesce(p_narrative,''));
  v_cached := public._bn_susp_receipt_lookup(v_actor,'bn_award_suspension_propose_v1',
                                             p_idempotency_key, v_hash);
  IF v_cached IS NOT NULL THEN RETURN v_cached; END IF;

  -- Lock the award to prevent conflicting proposals
  SELECT * INTO v_award FROM public.bn_award WHERE id = p_award_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_AWARD_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_award.status NOT IN ('ACTIVE') THEN
    RAISE EXCEPTION 'E_AWARD_NOT_ELIGIBLE' USING ERRCODE = 'P0001';
  END IF;

  -- Validate reason code
  IF NOT EXISTS (SELECT 1 FROM public.bn_reason_code WHERE code = p_reason_code) THEN
    RAISE EXCEPTION 'E_INVALID_REASON_CODE' USING ERRCODE = 'P0001';
  END IF;

  IF p_effective_from IS NULL OR p_effective_from < v_award.start_date THEN
    RAISE EXCEPTION 'E_INVALID_EFFECTIVE_DATE' USING ERRCODE = 'P0001';
  END IF;

  -- Approval policy must exist
  SELECT * INTO v_policy FROM public.bn_approval_policy
   WHERE policy_area = 'award_suspension'
     AND action_code = 'propose'
     AND is_enabled  = true
   ORDER BY level NULLS FIRST
   LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_POLICY_NOT_CONFIGURED' USING ERRCODE = 'P0001';
  END IF;

  -- Reject conflicting open case (belt-and-braces; unique index also enforces)
  IF EXISTS (SELECT 1 FROM public.bn_award_suspension_event
              WHERE bn_award_id = p_award_id
                AND status IN ('PROPOSED','APPROVED')) THEN
    RAISE EXCEPTION 'E_CONFLICTING_OPEN_CASE' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_wf_def FROM public.core_workflow_definition
   WHERE workflow_code = 'BN_AWARD_SUSPENSION' AND is_active;

  INSERT INTO public.core_workflow_instance
    (workflow_definition_id, workflow_code, workflow_version, module_code,
     entity_type, entity_id, current_step_code, status,
     submitted_by, submitted_at, priority, metadata)
  VALUES
    (v_wf_def.id,'BN_AWARD_SUSPENSION', v_wf_def.version,'bn_award_suspension',
     'bn_award_suspension_event', p_award_id::text, 'PENDING_APPROVAL','PENDING_APPROVAL',
     v_actor, now(),'NORMAL',
     jsonb_build_object('award_id',p_award_id,'reason_code',p_reason_code,
                        'correlation_id',p_correlation_id))
  RETURNING id INTO v_wf_inst_id;

  INSERT INTO public.bn_award_suspension_event
    (bn_award_id, suspension_type, suspended_from, reason_code, reason_text,
     status, entered_by, proposed_by_user_id, workflow_instance_id,
     correlation_id, row_version)
  VALUES
    (p_award_id,'STANDARD', p_effective_from, p_reason_code, p_narrative,
     'PROPOSED', v_actor::text, v_actor, v_wf_inst_id, p_correlation_id, 1)
  RETURNING id INTO v_susp_id;

  INSERT INTO public.core_workflow_task
    (workflow_instance_id, task_name, step_code, step_name,
     assigned_to_permission_key, task_status, priority)
  VALUES
    (v_wf_inst_id,'Approve award suspension','PENDING_APPROVAL','Awaiting approval',
     'bn_award_suspension.approve','OPEN','NORMAL')
  RETURNING id INTO v_task_id;

  INSERT INTO public.core_workflow_action_log
    (workflow_instance_id, workflow_task_id, action_type, action_name,
     from_step_code, to_step_code, actor_user_id, outcome, comments,
     before_status, after_status, metadata)
  VALUES
    (v_wf_inst_id, null,'SUBMIT','Propose suspension',
     null,'PENDING_APPROVAL', v_actor,'SUCCESS', p_narrative,
     null,'PENDING_APPROVAL',
     jsonb_build_object('suspension_id',v_susp_id,'correlation_id',p_correlation_id));

  PERFORM public._bn_susp_audit(v_actor,'BN.SUSPENSION.PROPOSED','propose',
    v_susp_id::text, null,
    jsonb_build_object('award_id',p_award_id,'reason_code',p_reason_code,
                       'effective_from',p_effective_from,'status','PROPOSED'),
    p_correlation_id, p_narrative);

  v_result := jsonb_build_object(
    'suspension_id', v_susp_id,
    'workflow_instance_id', v_wf_inst_id,
    'workflow_task_id', v_task_id,
    'status','PROPOSED',
    'row_version', 1);

  PERFORM public._bn_susp_receipt_store(v_actor,'bn_award_suspension_propose_v1',
    p_idempotency_key, v_hash, v_result, p_correlation_id);
  RETURN v_result;
END
$$;

-- 6.2 APPROVE ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bn_award_suspension_approve_v1(
  p_suspension_id   uuid,
  p_task_id         uuid,
  p_narrative       text,
  p_expected_row_version integer,
  p_idempotency_key text,
  p_correlation_id  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor    uuid;
  v_hash     text;
  v_cached   jsonb;
  v_susp     public.bn_award_suspension_event%ROWTYPE;
  v_task     public.core_workflow_task%ROWTYPE;
  v_result   jsonb;
BEGIN
  PERFORM public._bn_susp_assert_module_enabled();
  v_actor := public._bn_susp_actor();

  IF NOT (public.has_permission(v_actor,'bn_award_suspension','approve')
       OR public.is_admin(v_actor)) THEN
    RAISE EXCEPTION 'E_FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;

  v_hash := md5(coalesce(p_suspension_id::text,'')||'|'||coalesce(p_task_id::text,'')||'|'||coalesce(p_narrative,''));
  v_cached := public._bn_susp_receipt_lookup(v_actor,'bn_award_suspension_approve_v1',
                                             p_idempotency_key, v_hash);
  IF v_cached IS NOT NULL THEN RETURN v_cached; END IF;

  SELECT * INTO v_susp FROM public.bn_award_suspension_event
   WHERE id = p_suspension_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_SUSPENSION_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_susp.status <> 'PROPOSED' THEN
    RAISE EXCEPTION 'E_INVALID_STATE' USING ERRCODE = 'P0001';
  END IF;
  IF v_susp.row_version <> p_expected_row_version THEN
    RAISE EXCEPTION 'E_STALE_ROW_VERSION' USING ERRCODE = 'P0001';
  END IF;

  -- Maker-checker (admin NOT exempt)
  IF v_susp.proposed_by_user_id = v_actor THEN
    RAISE EXCEPTION 'E_SELF_APPROVAL_FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;

  -- Duplicate approver guard
  IF EXISTS (SELECT 1 FROM public.core_workflow_action_log
              WHERE workflow_instance_id = v_susp.workflow_instance_id
                AND action_type = 'APPROVE'
                AND actor_user_id = v_actor) THEN
    RAISE EXCEPTION 'E_DUPLICATE_APPROVER' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_task FROM public.core_workflow_task
   WHERE id = p_task_id AND workflow_instance_id = v_susp.workflow_instance_id
   FOR UPDATE;
  IF NOT FOUND OR v_task.task_status NOT IN ('OPEN','CLAIMED','IN_PROGRESS') THEN
    RAISE EXCEPTION 'E_TASK_NOT_ACTIONABLE' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.core_workflow_task
     SET task_status='COMPLETED', completed_by=v_actor, completed_at=now(),
         outcome='APPROVED', comments=p_narrative, is_active=false
   WHERE id = v_task.id;

  UPDATE public.core_workflow_instance
     SET status='APPROVED', current_step_code='APPROVED',
         completed_by=v_actor, completed_at=now()
   WHERE id = v_susp.workflow_instance_id;

  UPDATE public.bn_award_suspension_event
     SET status='APPROVED', row_version = row_version + 1,
         modified_by = v_actor::text, modified_at = now()
   WHERE id = p_suspension_id;

  INSERT INTO public.core_workflow_action_log
    (workflow_instance_id, workflow_task_id, action_type, action_name,
     from_step_code, to_step_code, actor_user_id, outcome, comments,
     before_status, after_status, metadata)
  VALUES
    (v_susp.workflow_instance_id, v_task.id,'APPROVE','Approve suspension',
     'PENDING_APPROVAL','APPROVED', v_actor,'SUCCESS', p_narrative,
     'PROPOSED','APPROVED',
     jsonb_build_object('suspension_id',p_suspension_id,'correlation_id',p_correlation_id));

  PERFORM public._bn_susp_audit(v_actor,'BN.SUSPENSION.APPROVED','approve',
    p_suspension_id::text,
    jsonb_build_object('status','PROPOSED'),
    jsonb_build_object('status','APPROVED'),
    p_correlation_id, p_narrative);

  v_result := jsonb_build_object(
    'suspension_id', p_suspension_id,
    'status','APPROVED',
    'row_version', v_susp.row_version + 1);

  PERFORM public._bn_susp_receipt_store(v_actor,'bn_award_suspension_approve_v1',
    p_idempotency_key, v_hash, v_result, p_correlation_id);
  RETURN v_result;
END
$$;

-- 6.3 REJECT -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bn_award_suspension_reject_v1(
  p_suspension_id   uuid,
  p_task_id         uuid,
  p_reason_code     text,
  p_narrative       text,
  p_expected_row_version integer,
  p_idempotency_key text,
  p_correlation_id  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor  uuid;
  v_hash   text;
  v_cached jsonb;
  v_susp   public.bn_award_suspension_event%ROWTYPE;
  v_task   public.core_workflow_task%ROWTYPE;
  v_result jsonb;
BEGIN
  PERFORM public._bn_susp_assert_module_enabled();
  v_actor := public._bn_susp_actor();

  IF NOT (public.has_permission(v_actor,'bn_award_suspension','approve')
       OR public.is_admin(v_actor)) THEN
    RAISE EXCEPTION 'E_FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;

  v_hash := md5(coalesce(p_suspension_id::text,'')||'|'||coalesce(p_reason_code,'')||'|'||coalesce(p_narrative,''));
  v_cached := public._bn_susp_receipt_lookup(v_actor,'bn_award_suspension_reject_v1',
                                             p_idempotency_key, v_hash);
  IF v_cached IS NOT NULL THEN RETURN v_cached; END IF;

  IF p_reason_code IS NULL OR btrim(p_reason_code)='' THEN
    RAISE EXCEPTION 'E_REASON_REQUIRED' USING ERRCODE='P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bn_reason_code WHERE code=p_reason_code) THEN
    RAISE EXCEPTION 'E_INVALID_REASON_CODE' USING ERRCODE='P0001';
  END IF;

  SELECT * INTO v_susp FROM public.bn_award_suspension_event
   WHERE id = p_suspension_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'E_SUSPENSION_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  IF v_susp.status <> 'PROPOSED' THEN RAISE EXCEPTION 'E_INVALID_STATE' USING ERRCODE='P0001'; END IF;
  IF v_susp.row_version <> p_expected_row_version THEN
    RAISE EXCEPTION 'E_STALE_ROW_VERSION' USING ERRCODE='P0001';
  END IF;
  IF v_susp.proposed_by_user_id = v_actor THEN
    RAISE EXCEPTION 'E_SELF_APPROVAL_FORBIDDEN' USING ERRCODE='P0001';
  END IF;

  SELECT * INTO v_task FROM public.core_workflow_task
   WHERE id = p_task_id AND workflow_instance_id = v_susp.workflow_instance_id
   FOR UPDATE;
  IF NOT FOUND OR v_task.task_status NOT IN ('OPEN','CLAIMED','IN_PROGRESS') THEN
    RAISE EXCEPTION 'E_TASK_NOT_ACTIONABLE' USING ERRCODE='P0001';
  END IF;

  UPDATE public.core_workflow_task
     SET task_status='COMPLETED', completed_by=v_actor, completed_at=now(),
         outcome='REJECTED', comments=p_narrative, is_active=false
   WHERE id = v_task.id;
  UPDATE public.core_workflow_instance
     SET status='REJECTED', current_step_code='REJECTED',
         completed_by=v_actor, completed_at=now()
   WHERE id = v_susp.workflow_instance_id;
  UPDATE public.bn_award_suspension_event
     SET status='REJECTED', row_version = row_version + 1,
         modified_by = v_actor::text, modified_at = now(),
         reason_text = coalesce(reason_text,'') || E'\nREJECTED: ' || coalesce(p_narrative,'')
   WHERE id = p_suspension_id;

  INSERT INTO public.core_workflow_action_log
    (workflow_instance_id, workflow_task_id, action_type, action_name,
     from_step_code, to_step_code, actor_user_id, outcome, reason, comments,
     before_status, after_status, metadata)
  VALUES
    (v_susp.workflow_instance_id, v_task.id,'REJECT','Reject suspension',
     'PENDING_APPROVAL','REJECTED', v_actor,'SUCCESS', p_reason_code, p_narrative,
     'PROPOSED','REJECTED',
     jsonb_build_object('suspension_id',p_suspension_id,'correlation_id',p_correlation_id));

  PERFORM public._bn_susp_audit(v_actor,'BN.SUSPENSION.REJECTED','reject',
    p_suspension_id::text,
    jsonb_build_object('status','PROPOSED'),
    jsonb_build_object('status','REJECTED','reason_code',p_reason_code),
    p_correlation_id, p_narrative);

  v_result := jsonb_build_object(
    'suspension_id', p_suspension_id,'status','REJECTED',
    'row_version', v_susp.row_version + 1);
  PERFORM public._bn_susp_receipt_store(v_actor,'bn_award_suspension_reject_v1',
    p_idempotency_key, v_hash, v_result, p_correlation_id);
  RETURN v_result;
END
$$;

-- 6.4 WITHDRAW -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bn_award_suspension_withdraw_v1(
  p_suspension_id   uuid,
  p_narrative       text,
  p_expected_row_version integer,
  p_idempotency_key text,
  p_correlation_id  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor  uuid;
  v_hash   text;
  v_cached jsonb;
  v_susp   public.bn_award_suspension_event%ROWTYPE;
  v_result jsonb;
BEGIN
  PERFORM public._bn_susp_assert_module_enabled();
  v_actor := public._bn_susp_actor();

  IF NOT (public.has_permission(v_actor,'bn_award_suspension','propose')
       OR public.is_admin(v_actor)) THEN
    RAISE EXCEPTION 'E_FORBIDDEN' USING ERRCODE='P0001';
  END IF;

  v_hash := md5(coalesce(p_suspension_id::text,'')||'|'||coalesce(p_narrative,''));
  v_cached := public._bn_susp_receipt_lookup(v_actor,'bn_award_suspension_withdraw_v1',
                                             p_idempotency_key, v_hash);
  IF v_cached IS NOT NULL THEN RETURN v_cached; END IF;

  SELECT * INTO v_susp FROM public.bn_award_suspension_event
   WHERE id = p_suspension_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'E_SUSPENSION_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  IF v_susp.status <> 'PROPOSED' THEN
    RAISE EXCEPTION 'E_ONLY_PROPOSED_MAY_WITHDRAW' USING ERRCODE='P0001';
  END IF;
  IF v_susp.row_version <> p_expected_row_version THEN
    RAISE EXCEPTION 'E_STALE_ROW_VERSION' USING ERRCODE='P0001';
  END IF;
  IF v_susp.proposed_by_user_id <> v_actor THEN
    RAISE EXCEPTION 'E_ONLY_PROPOSER_MAY_WITHDRAW' USING ERRCODE='P0001';
  END IF;

  UPDATE public.core_workflow_task
     SET task_status='CANCELLED', is_active=false,
         completed_by=v_actor, completed_at=now(), outcome='WITHDRAWN'
   WHERE workflow_instance_id = v_susp.workflow_instance_id
     AND task_status IN ('OPEN','CLAIMED','IN_PROGRESS');
  UPDATE public.core_workflow_instance
     SET status='WITHDRAWN', current_step_code='WITHDRAWN',
         cancelled_by=v_actor, cancelled_at=now(),
         cancellation_reason = p_narrative
   WHERE id = v_susp.workflow_instance_id;
  UPDATE public.bn_award_suspension_event
     SET status='WITHDRAWN', row_version = row_version + 1,
         modified_by = v_actor::text, modified_at = now()
   WHERE id = p_suspension_id;

  INSERT INTO public.core_workflow_action_log
    (workflow_instance_id, action_type, action_name,
     from_step_code, to_step_code, actor_user_id, outcome, comments,
     before_status, after_status, metadata)
  VALUES
    (v_susp.workflow_instance_id,'WITHDRAW','Withdraw proposal',
     'PROPOSED','WITHDRAWN', v_actor,'SUCCESS', p_narrative,
     'PROPOSED','WITHDRAWN',
     jsonb_build_object('suspension_id',p_suspension_id,'correlation_id',p_correlation_id));

  PERFORM public._bn_susp_audit(v_actor,'BN.SUSPENSION.WITHDRAWN','withdraw',
    p_suspension_id::text,
    jsonb_build_object('status','PROPOSED'),
    jsonb_build_object('status','WITHDRAWN'),
    p_correlation_id, p_narrative);

  v_result := jsonb_build_object(
    'suspension_id', p_suspension_id,'status','WITHDRAWN',
    'row_version', v_susp.row_version + 1);
  PERFORM public._bn_susp_receipt_store(v_actor,'bn_award_suspension_withdraw_v1',
    p_idempotency_key, v_hash, v_result, p_correlation_id);
  RETURN v_result;
END
$$;

-- =============================================================================
-- 7. Grants — authenticated may execute the public RPCs. Helpers stay private.
-- =============================================================================
REVOKE ALL ON FUNCTION public.bn_award_suspension_propose_v1(uuid,text,date,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bn_award_suspension_approve_v1(uuid,uuid,text,integer,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bn_award_suspension_reject_v1(uuid,uuid,text,text,integer,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bn_award_suspension_withdraw_v1(uuid,text,integer,text,text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.bn_award_suspension_propose_v1(uuid,text,date,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bn_award_suspension_approve_v1(uuid,uuid,text,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bn_award_suspension_reject_v1(uuid,uuid,text,text,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bn_award_suspension_withdraw_v1(uuid,text,integer,text,text) TO authenticated;

REVOKE ALL ON FUNCTION public._bn_susp_assert_module_enabled() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._bn_susp_actor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._bn_susp_receipt_lookup(uuid,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._bn_susp_receipt_store(uuid,text,text,text,jsonb,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._bn_susp_audit(uuid,text,text,text,jsonb,jsonb,text,text) FROM PUBLIC;
