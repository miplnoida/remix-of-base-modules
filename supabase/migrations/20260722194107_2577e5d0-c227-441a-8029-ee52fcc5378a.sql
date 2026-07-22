
-- =====================================================================
-- Slice 2 Part 1: Additive schema for targeted-dispatch classification
-- =====================================================================

-- communication_request minimal fields
ALTER TABLE public.communication_request
  ADD COLUMN IF NOT EXISTS targeted_dispatch_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS controlled_action text,
  ADD COLUMN IF NOT EXISTS controlled_live_execution_id uuid,
  ADD COLUMN IF NOT EXISTS controlled_live_grant_id uuid;

ALTER TABLE public.communication_request
  DROP CONSTRAINT IF EXISTS communication_request_targeted_fk_execution,
  ADD CONSTRAINT communication_request_targeted_fk_execution
    FOREIGN KEY (controlled_live_execution_id)
    REFERENCES public.communication_controlled_live_execution(id)
    ON DELETE RESTRICT;

ALTER TABLE public.communication_request
  DROP CONSTRAINT IF EXISTS communication_request_targeted_fk_grant,
  ADD CONSTRAINT communication_request_targeted_fk_grant
    FOREIGN KEY (controlled_live_grant_id)
    REFERENCES public.communication_controlled_live_grant(id)
    ON DELETE RESTRICT;

ALTER TABLE public.communication_request
  DROP CONSTRAINT IF EXISTS communication_request_targeted_action_chk,
  ADD CONSTRAINT communication_request_targeted_action_chk
    CHECK (controlled_action IS NULL OR controlled_action IN ('RUN_CONTROLLED_STUB','SEND_ONE_REAL_EMAIL'));

ALTER TABLE public.communication_request
  DROP CONSTRAINT IF EXISTS communication_request_targeted_completeness_chk,
  ADD CONSTRAINT communication_request_targeted_completeness_chk
    CHECK (
      NOT targeted_dispatch_only
      OR (
        controlled_action IS NOT NULL
        AND controlled_live_execution_id IS NOT NULL
        AND controlled_live_grant_id IS NOT NULL
      )
    );

CREATE UNIQUE INDEX IF NOT EXISTS ux_comm_request_targeted_execution_action
  ON public.communication_request (controlled_live_execution_id, controlled_action)
  WHERE targeted_dispatch_only = true;

CREATE INDEX IF NOT EXISTS ix_comm_request_targeted_execution
  ON public.communication_request (controlled_live_execution_id)
  WHERE targeted_dispatch_only = true;

-- communication_message authoritative fields
ALTER TABLE public.communication_message
  ADD COLUMN IF NOT EXISTS targeted_dispatch_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS controlled_action text,
  ADD COLUMN IF NOT EXISTS controlled_live_execution_id uuid,
  ADD COLUMN IF NOT EXISTS controlled_live_grant_id uuid,
  ADD COLUMN IF NOT EXISTS preview_snapshot_id uuid,
  ADD COLUMN IF NOT EXISTS preview_approval_id uuid,
  ADD COLUMN IF NOT EXISTS dry_run_certification_id uuid,
  ADD COLUMN IF NOT EXISTS governance_certification_id uuid,
  ADD COLUMN IF NOT EXISTS certified_dependency_hash text,
  ADD COLUMN IF NOT EXISTS recipient_set_hash text,
  ADD COLUMN IF NOT EXISTS subject_hash text,
  ADD COLUMN IF NOT EXISTS body_hash text,
  ADD COLUMN IF NOT EXISTS content_hash text;

ALTER TABLE public.communication_message
  DROP CONSTRAINT IF EXISTS comm_msg_targeted_fk_execution,
  ADD CONSTRAINT comm_msg_targeted_fk_execution
    FOREIGN KEY (controlled_live_execution_id)
    REFERENCES public.communication_controlled_live_execution(id) ON DELETE RESTRICT,
  DROP CONSTRAINT IF EXISTS comm_msg_targeted_fk_grant,
  ADD CONSTRAINT comm_msg_targeted_fk_grant
    FOREIGN KEY (controlled_live_grant_id)
    REFERENCES public.communication_controlled_live_grant(id) ON DELETE RESTRICT,
  DROP CONSTRAINT IF EXISTS comm_msg_targeted_fk_snapshot,
  ADD CONSTRAINT comm_msg_targeted_fk_snapshot
    FOREIGN KEY (preview_snapshot_id)
    REFERENCES public.communication_preview_snapshot(id) ON DELETE RESTRICT,
  DROP CONSTRAINT IF EXISTS comm_msg_targeted_fk_approval,
  ADD CONSTRAINT comm_msg_targeted_fk_approval
    FOREIGN KEY (preview_approval_id)
    REFERENCES public.communication_preview_approval(id) ON DELETE RESTRICT,
  DROP CONSTRAINT IF EXISTS comm_msg_targeted_fk_dry_run,
  ADD CONSTRAINT comm_msg_targeted_fk_dry_run
    FOREIGN KEY (dry_run_certification_id)
    REFERENCES public.communication_dry_run_certification(id) ON DELETE RESTRICT,
  DROP CONSTRAINT IF EXISTS comm_msg_targeted_fk_governance,
  ADD CONSTRAINT comm_msg_targeted_fk_governance
    FOREIGN KEY (governance_certification_id)
    REFERENCES public.comm_hub_certification(id) ON DELETE RESTRICT;

ALTER TABLE public.communication_message
  DROP CONSTRAINT IF EXISTS comm_msg_targeted_action_chk,
  ADD CONSTRAINT comm_msg_targeted_action_chk
    CHECK (controlled_action IS NULL OR controlled_action IN ('RUN_CONTROLLED_STUB','SEND_ONE_REAL_EMAIL'));

ALTER TABLE public.communication_message
  DROP CONSTRAINT IF EXISTS comm_msg_targeted_completeness_chk,
  ADD CONSTRAINT comm_msg_targeted_completeness_chk
    CHECK (
      NOT targeted_dispatch_only
      OR (
        controlled_action IS NOT NULL
        AND controlled_live_execution_id IS NOT NULL
        AND controlled_live_grant_id IS NOT NULL
        AND preview_snapshot_id IS NOT NULL
        AND preview_approval_id IS NOT NULL
        AND dry_run_certification_id IS NOT NULL
        AND send_context = 'controlled_live'
        AND origin = 'comm_hub'
        AND channel = 'email'
        AND template_version_id IS NOT NULL
        AND sender_profile_id IS NOT NULL
        AND recipient_set_hash IS NOT NULL
        AND subject_hash IS NOT NULL
        AND body_hash IS NOT NULL
        AND content_hash IS NOT NULL
      )
    );

-- Uniqueness protection for targeted rows
CREATE UNIQUE INDEX IF NOT EXISTS ux_comm_msg_targeted_execution_action_channel
  ON public.communication_message (controlled_live_execution_id, controlled_action, channel)
  WHERE targeted_dispatch_only = true;

CREATE UNIQUE INDEX IF NOT EXISTS ux_comm_msg_targeted_grant
  ON public.communication_message (controlled_live_grant_id)
  WHERE targeted_dispatch_only = true;

CREATE INDEX IF NOT EXISTS ix_comm_msg_targeted_execution_status
  ON public.communication_message (controlled_live_execution_id, status)
  WHERE targeted_dispatch_only = true;

CREATE INDEX IF NOT EXISTS ix_comm_msg_targeted_candidate
  ON public.communication_message (status, next_attempt_at)
  WHERE targeted_dispatch_only = true;

-- =====================================================================
-- Slice 2 Part 2: Immutability trigger for targeted classification
-- =====================================================================

CREATE OR REPLACE FUNCTION public.communication_message_targeted_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_allowed text := current_setting('comm_hub.allow_targeted_update', true);
BEGIN
  IF v_allowed IS DISTINCT FROM 'true' THEN
    -- Reject any mutation of targeted classification fields
    IF NEW.targeted_dispatch_only IS DISTINCT FROM OLD.targeted_dispatch_only
       OR NEW.controlled_action IS DISTINCT FROM OLD.controlled_action
       OR NEW.controlled_live_execution_id IS DISTINCT FROM OLD.controlled_live_execution_id
       OR NEW.controlled_live_grant_id IS DISTINCT FROM OLD.controlled_live_grant_id
       OR NEW.preview_snapshot_id IS DISTINCT FROM OLD.preview_snapshot_id
       OR NEW.preview_approval_id IS DISTINCT FROM OLD.preview_approval_id
       OR NEW.dry_run_certification_id IS DISTINCT FROM OLD.dry_run_certification_id
       OR NEW.governance_certification_id IS DISTINCT FROM OLD.governance_certification_id
       OR NEW.certified_dependency_hash IS DISTINCT FROM OLD.certified_dependency_hash
       OR NEW.recipient_set_hash IS DISTINCT FROM OLD.recipient_set_hash
       OR NEW.subject_hash IS DISTINCT FROM OLD.subject_hash
       OR NEW.body_hash IS DISTINCT FROM OLD.body_hash
       OR NEW.content_hash IS DISTINCT FROM OLD.content_hash THEN
      RAISE EXCEPTION 'targeted classification is immutable (message %)', OLD.id
        USING ERRCODE = '42501';
    END IF;
    -- For targeted rows, also protect send_context/template_version_id/sender_profile_id/frozen sender fields
    IF OLD.targeted_dispatch_only THEN
      IF NEW.send_context IS DISTINCT FROM OLD.send_context
         OR NEW.template_version_id IS DISTINCT FROM OLD.template_version_id
         OR NEW.sender_profile_id IS DISTINCT FROM OLD.sender_profile_id
         OR NEW.from_email IS DISTINCT FROM OLD.from_email
         OR NEW.from_display_name IS DISTINCT FROM OLD.from_display_name
         OR NEW.reply_to_email IS DISTINCT FROM OLD.reply_to_email
         OR NEW.origin IS DISTINCT FROM OLD.origin
         OR NEW.channel IS DISTINCT FROM OLD.channel
         OR NEW.request_id IS DISTINCT FROM OLD.request_id
         OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id THEN
        RAISE EXCEPTION 'frozen evidence fields are immutable on targeted messages (message %)', OLD.id
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comm_message_targeted_immutability ON public.communication_message;
CREATE TRIGGER trg_comm_message_targeted_immutability
  BEFORE UPDATE ON public.communication_message
  FOR EACH ROW EXECUTE FUNCTION public.communication_message_targeted_immutability();

-- Analogous immutability for request targeted fields
CREATE OR REPLACE FUNCTION public.communication_request_targeted_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_allowed text := current_setting('comm_hub.allow_targeted_update', true);
BEGIN
  IF v_allowed IS DISTINCT FROM 'true' THEN
    IF NEW.targeted_dispatch_only IS DISTINCT FROM OLD.targeted_dispatch_only
       OR NEW.controlled_action IS DISTINCT FROM OLD.controlled_action
       OR NEW.controlled_live_execution_id IS DISTINCT FROM OLD.controlled_live_execution_id
       OR NEW.controlled_live_grant_id IS DISTINCT FROM OLD.controlled_live_grant_id THEN
      RAISE EXCEPTION 'targeted classification is immutable (request %)', OLD.id
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comm_request_targeted_immutability ON public.communication_request;
CREATE TRIGGER trg_comm_request_targeted_immutability
  BEFORE UPDATE ON public.communication_request
  FOR EACH ROW EXECUTE FUNCTION public.communication_request_targeted_immutability();

-- =====================================================================
-- Slice 2 Part 3: Reject reserved targeted fields in generic send
-- =====================================================================

CREATE OR REPLACE FUNCTION public._comm_hub_reject_reserved_targeted_fields(payload jsonb)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_reserved text[] := ARRAY[
    'targeted_dispatch_only','targetedDispatchOnly',
    'controlled_action','controlledAction',
    'controlled_live_execution_id','controlledLiveExecutionId',
    'controlled_live_grant_id','controlledLiveGrantId',
    'preview_snapshot_id','previewSnapshotId',
    'preview_approval_id','previewApprovalId',
    'dry_run_certification_id','dryRunCertificationId',
    'governance_certification_id','governanceCertificationId',
    'certified_dependency_hash','certifiedDependencyHash',
    'recipient_set_hash','recipientSetHash',
    'subject_hash','subjectHash',
    'body_hash','bodyHash',
    'content_hash','contentHash',
    'sender_profile_id','senderProfileId'
  ];
  v_k text;
BEGIN
  IF payload IS NULL THEN RETURN; END IF;
  FOREACH v_k IN ARRAY v_reserved LOOP
    IF payload ? v_k OR (payload->'metadata') ? v_k OR (payload->'message') ? v_k THEN
      RAISE EXCEPTION 'TARGETED_FIELDS_NOT_ALLOWED_IN_GENERIC_SEND: reserved field % must be created through create_comm_hub_controlled_stub_message', v_k
        USING ERRCODE = '42501';
    END IF;
  END LOOP;
  -- Explicitly reject controlled_live send_context from generic callers
  IF COALESCE(payload->>'sendContext', payload->>'send_context',
              payload->'metadata'->>'send_context', payload->'metadata'->>'sendContext') = 'controlled_live' THEN
    RAISE EXCEPTION 'TARGETED_FIELDS_NOT_ALLOWED_IN_GENERIC_SEND: send_context=controlled_live is reserved for the dedicated server-owned Controlled Stub operation'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Patch send_communication_v1 to reject reserved targeted fields early.
-- We do this by wrapping the existing behaviour: insert a guard call at the top
-- via CREATE OR REPLACE with a re-defined body that first invokes the guard.
-- Rather than duplicate the entire body we introduce a wrapper strategy:
-- rename the existing function then create a new outer function of same name.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='send_communication_v1_core'
  ) THEN
    -- already renamed
    NULL;
  ELSE
    ALTER FUNCTION public.send_communication_v1(jsonb)
      RENAME TO send_communication_v1_core;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.send_communication_v1(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public._comm_hub_reject_reserved_targeted_fields(payload);
  RETURN public.send_communication_v1_core(payload);
END;
$$;

-- =====================================================================
-- Slice 2 Part 4: Update normal claim functions to exclude targeted rows
-- =====================================================================

CREATE OR REPLACE FUNCTION public.claim_comm_hub_messages(
  p_batch_size integer,
  p_worker_id text,
  p_include_live boolean,
  p_live_eligible_after timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_live_max_age_minutes integer DEFAULT 30
)
RETURNS SETOF communication_message
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
      AND targeted_dispatch_only = false
      AND (send_context IS DISTINCT FROM 'controlled_live')
      AND controlled_live_execution_id IS NULL
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

CREATE OR REPLACE FUNCTION public.claim_comm_hub_message_by_id(
  p_message_id uuid,
  p_worker_id text,
  p_include_live boolean,
  p_live_eligible_after timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_live_max_age_minutes integer DEFAULT 30
)
RETURNS SETOF communication_message
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.communication_message;
  v_max_age int := COALESCE(p_live_max_age_minutes, 30);
BEGIN
  IF p_message_id IS NULL OR p_worker_id IS NULL OR length(p_worker_id) = 0 THEN
    RETURN;
  END IF;

  SELECT *
    INTO v_row
    FROM public.communication_message
   WHERE id = p_message_id
     AND origin = 'comm_hub'
     AND channel = 'email'
     AND status = 'queued'
     AND targeted_dispatch_only = false
     AND (send_context IS DISTINCT FROM 'controlled_live')
     AND controlled_live_execution_id IS NULL
     AND (next_attempt_at IS NULL OR next_attempt_at <= now())
     AND (locked_at IS NULL OR locked_at < now() - interval '10 minutes')
   FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_row.test_mode = false THEN
    IF NOT p_include_live THEN RETURN; END IF;
    IF p_live_eligible_after IS NULL THEN RETURN; END IF;
    IF v_row.created_at < p_live_eligible_after THEN RETURN; END IF;
    IF v_row.created_at < now() - make_interval(mins => v_max_age) THEN RETURN; END IF;
  END IF;

  UPDATE public.communication_message
     SET status = 'sending',
         attempt_count = attempt_count + 1,
         locked_at = now(),
         locked_by = p_worker_id,
         last_attempt_at = now(),
         updated_at = now()
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
  RETURN;
END;
$function$;

-- =====================================================================
-- Slice 2 Part 5: Server-owned Controlled Stub message creation
-- =====================================================================

CREATE OR REPLACE FUNCTION public.create_comm_hub_controlled_stub_message(
  p_execution_id uuid,
  p_grant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_execution  public.communication_controlled_live_execution%ROWTYPE;
  v_grant      public.communication_controlled_live_grant%ROWTYPE;
  v_approval   public.communication_preview_approval%ROWTYPE;
  v_snapshot   public.communication_preview_snapshot%ROWTYPE;
  v_dry_run    public.communication_dry_run_certification%ROWTYPE;
  v_governance public.comm_hub_certification;
  v_governance_id uuid;
  v_dep_hash   text;
  v_to_email   text;
  v_to_name    text;
  v_to_count   int;
  v_cc_count   int;
  v_bcc_count  int;
  v_sender     public.communication_hub_sender_profile%ROWTYPE;
  v_action     text := 'RUN_CONTROLLED_STUB';
  v_idem_key   text;
  v_request_id uuid;
  v_request_no text;
  v_recipient_id uuid;
  v_message_id uuid;
  v_existing_msg uuid;
BEGIN
  IF p_execution_id IS NULL OR p_grant_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'input_invalid',
      'message', 'execution_id and grant_id are required');
  END IF;

  -- Lock the execution and grant rows to prevent concurrent duplicates
  SELECT * INTO v_execution
    FROM public.communication_controlled_live_execution
   WHERE id = p_execution_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'execution_not_found');
  END IF;

  SELECT * INTO v_grant
    FROM public.communication_controlled_live_grant
   WHERE id = p_grant_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'grant_not_found');
  END IF;
  IF v_grant.execution_id <> v_execution.id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'grant_execution_mismatch');
  END IF;
  IF v_grant.status NOT IN ('ISSUED','RESERVED') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'grant_not_dispatchable',
      'grant_status', v_grant.status);
  END IF;
  IF v_grant.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'grant_expired');
  END IF;

  -- Deterministic idempotency: derive keys server-side
  v_idem_key := 'controlled-stub:request:' || v_execution.id::text || ':' || v_action;

  -- Idempotent replay path
  SELECT id INTO v_request_id
    FROM public.communication_request
   WHERE idempotency_key = v_idem_key;

  IF FOUND THEN
    SELECT id INTO v_existing_msg
      FROM public.communication_message
     WHERE request_id = v_request_id
       AND targeted_dispatch_only = true
       AND controlled_live_execution_id = v_execution.id
       AND controlled_live_grant_id = v_grant.id
       AND controlled_action = v_action;
    IF v_existing_msg IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'code', 'idempotency_conflict_incomplete',
        'message', 'request exists but authoritative message does not match');
    END IF;
    SELECT id INTO v_recipient_id
      FROM public.communication_recipient
     WHERE request_id = v_request_id AND role='to' LIMIT 1;
    RETURN jsonb_build_object(
      'ok', true, 'idempotent_replay', true, 'action', v_action,
      'request_id', v_request_id, 'message_id', v_existing_msg,
      'recipient_id', v_recipient_id,
      'execution_id', v_execution.id, 'grant_id', v_grant.id
    );
  END IF;

  -- Load and verify Preview Approval
  SELECT * INTO v_approval FROM public.communication_preview_approval
   WHERE id = v_execution.preview_approval_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'preview_approval_missing');
  END IF;
  IF v_approval.status NOT IN ('ACTIVE','RESERVED') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'preview_approval_not_usable',
      'approval_status', v_approval.status);
  END IF;
  IF v_approval.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'preview_approval_expired');
  END IF;
  IF v_grant.preview_approval_id <> v_approval.id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'grant_preview_mismatch');
  END IF;

  -- Load Snapshot
  SELECT * INTO v_snapshot FROM public.communication_preview_snapshot
   WHERE id = v_approval.snapshot_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'preview_snapshot_missing');
  END IF;
  IF v_snapshot.status <> 'PREPARED' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'preview_snapshot_not_prepared',
      'snapshot_status', v_snapshot.status);
  END IF;
  IF v_snapshot.expires_at IS NOT NULL AND v_snapshot.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'preview_snapshot_expired');
  END IF;
  IF v_snapshot.content_hash IS DISTINCT FROM v_approval.content_hash_at_approval THEN
    RETURN jsonb_build_object('ok', false, 'code', 'preview_content_hash_mismatch');
  END IF;

  -- Load Dry Run Certification
  SELECT * INTO v_dry_run FROM public.communication_dry_run_certification
   WHERE id = v_execution.dry_run_certification_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'dry_run_certification_missing');
  END IF;
  IF v_dry_run.status <> 'ACTIVE' OR v_dry_run.result <> 'DRY_RUN_PASSED' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'dry_run_certification_not_valid',
      'status', v_dry_run.status, 'result', v_dry_run.result);
  END IF;
  IF v_dry_run.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'dry_run_certification_expired');
  END IF;
  IF v_dry_run.preview_approval_id IS DISTINCT FROM v_approval.id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'dry_run_approval_mismatch');
  END IF;

  -- Governance certification (optional but preferred): use latest for the template version
  IF v_snapshot.template_version_id IS NOT NULL THEN
    SELECT * INTO v_governance
      FROM public.comm_hub_certification
     WHERE entity_type = 'TEMPLATE_VERSION'
       AND entity_id = v_snapshot.template_version_id
       AND result = 'PASSED'
       AND is_stale = false
     ORDER BY certified_at DESC
     LIMIT 1;
    IF FOUND THEN
      v_governance_id := v_governance.id;
      v_dep_hash := v_governance.dependency_hash;
    END IF;
  END IF;

  -- Recipient validation
  v_to_count := COALESCE(jsonb_array_length(v_snapshot.to_recipients), 0);
  v_cc_count := COALESCE(jsonb_array_length(v_snapshot.cc_recipients), 0);
  v_bcc_count := COALESCE(jsonb_array_length(v_snapshot.bcc_recipients), 0);
  IF v_to_count <> 1 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'recipient_count_invalid',
      'to_count', v_to_count);
  END IF;
  IF v_cc_count > 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'cc_not_allowed');
  END IF;
  IF v_bcc_count > 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'bcc_not_allowed');
  END IF;

  v_to_email := v_snapshot.to_recipients->0->>'email';
  v_to_name  := v_snapshot.to_recipients->0->>'name';
  IF v_to_email IS NULL OR v_to_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'recipient_email_missing');
  END IF;

  -- Frozen content presence
  IF v_snapshot.template_version_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'template_version_missing');
  END IF;
  IF v_snapshot.sender_profile_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'sender_profile_missing');
  END IF;
  IF v_snapshot.rendered_subject IS NULL OR btrim(v_snapshot.rendered_subject) = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'rendered_subject_missing');
  END IF;
  IF (v_snapshot.rendered_body_html IS NULL OR btrim(v_snapshot.rendered_body_html) = '')
     AND (v_snapshot.rendered_body_text IS NULL OR btrim(v_snapshot.rendered_body_text) = '') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'rendered_body_missing');
  END IF;
  IF v_snapshot.subject_hash IS NULL OR v_snapshot.body_hash IS NULL
     OR v_snapshot.content_hash IS NULL OR v_snapshot.recipient_set_hash IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'snapshot_hashes_missing');
  END IF;

  -- Sender profile (freeze from address)
  SELECT * INTO v_sender FROM public.communication_hub_sender_profile
   WHERE id = v_snapshot.sender_profile_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'sender_profile_not_found');
  END IF;

  -- Enable transaction-local flag to permit writing evidence.
  PERFORM set_config('comm_hub.allow_targeted_update', 'true', true);

  v_request_no := 'CS-' || to_char(now() AT TIME ZONE 'UTC','YYYYMMDDHH24MISS')
                        || '-' || upper(substr(md5(random()::text),1,6));

  BEGIN
    INSERT INTO public.communication_request(
      request_no, module_code, department_code, event_code,
      channels, priority, status,
      payload, context, idempotency_key, requested_by,
      original_decision_id, decision_send_context,
      configuration_version, recipient_policy_version,
      targeted_dispatch_only, controlled_action,
      controlled_live_execution_id, controlled_live_grant_id
    ) VALUES (
      v_request_no, v_execution.module_code, NULL, v_execution.event_code,
      ARRAY['email'], 'high', 'approved',
      COALESCE(v_snapshot.context_data, '{}'::jsonb),
      jsonb_build_object(
        'correlation_id', v_execution.id::text,
        'origin', 'comm_hub',
        'send_context', 'controlled_live',
        'source', 'create_comm_hub_controlled_stub_message'
      ),
      v_idem_key, v_execution.requested_by,
      v_execution.original_decision_id, 'controlled_live',
      v_execution.configuration_version, v_execution.recipient_policy_version::integer,
      true, v_action, v_execution.id, v_grant.id
    ) RETURNING id INTO v_request_id;
  EXCEPTION WHEN unique_violation THEN
    -- Concurrent creation; replay
    SELECT id INTO v_request_id
      FROM public.communication_request WHERE idempotency_key = v_idem_key;
    SELECT id INTO v_message_id
      FROM public.communication_message
     WHERE request_id = v_request_id AND targeted_dispatch_only = true;
    SELECT id INTO v_recipient_id
      FROM public.communication_recipient WHERE request_id = v_request_id AND role='to' LIMIT 1;
    RETURN jsonb_build_object(
      'ok', true, 'idempotent_replay', true, 'action', v_action,
      'request_id', v_request_id, 'message_id', v_message_id,
      'recipient_id', v_recipient_id,
      'execution_id', v_execution.id, 'grant_id', v_grant.id
    );
  END;

  INSERT INTO public.communication_recipient(
    request_id, role, recipient_type, name, email
  ) VALUES (
    v_request_id, 'to', 'email', v_to_name, v_to_email
  ) RETURNING id INTO v_recipient_id;

  INSERT INTO public.communication_message(
    request_id, recipient_id, channel, template_version_id,
    subject, body_text, body_html, status,
    origin, sender_profile_id, from_email, from_display_name, reply_to_email,
    original_decision_id, send_context, test_mode,
    targeted_dispatch_only, controlled_action,
    controlled_live_execution_id, controlled_live_grant_id,
    preview_snapshot_id, preview_approval_id, dry_run_certification_id,
    governance_certification_id, certified_dependency_hash,
    recipient_set_hash, subject_hash, body_hash, content_hash
  ) VALUES (
    v_request_id, v_recipient_id, 'email', v_snapshot.template_version_id,
    v_snapshot.rendered_subject, v_snapshot.rendered_body_text, v_snapshot.rendered_body_html,
    'queued',
    'comm_hub', v_snapshot.sender_profile_id,
    COALESCE(v_sender.from_email, v_sender.reply_to_email),
    v_sender.from_display_name, v_sender.reply_to_email,
    v_execution.original_decision_id, 'controlled_live', false,
    true, v_action, v_execution.id, v_grant.id,
    v_snapshot.id, v_approval.id, v_dry_run.id,
    v_governance_id, v_dep_hash,
    v_snapshot.recipient_set_hash, v_snapshot.subject_hash,
    v_snapshot.body_hash, v_snapshot.content_hash
  ) RETURNING id INTO v_message_id;

  -- Bind execution to the authoritative request/message
  UPDATE public.communication_controlled_live_execution
     SET request_id = v_request_id,
         message_id = v_message_id,
         updated_at = now()
   WHERE id = v_execution.id
     AND (request_id IS NULL OR request_id = v_request_id);

  RETURN jsonb_build_object(
    'ok', true, 'idempotent_replay', false, 'action', v_action,
    'request_id', v_request_id, 'request_no', v_request_no,
    'message_id', v_message_id, 'recipient_id', v_recipient_id,
    'execution_id', v_execution.id, 'grant_id', v_grant.id,
    'preview_snapshot_id', v_snapshot.id,
    'preview_approval_id', v_approval.id,
    'dry_run_certification_id', v_dry_run.id,
    'governance_certification_id', v_governance_id,
    'certified_dependency_hash', v_dep_hash,
    'recipient_set_hash', v_snapshot.recipient_set_hash,
    'subject_hash', v_snapshot.subject_hash,
    'body_hash', v_snapshot.body_hash,
    'content_hash', v_snapshot.content_hash,
    'template_version_id', v_snapshot.template_version_id,
    'sender_profile_id', v_snapshot.sender_profile_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_comm_hub_controlled_stub_message(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_comm_hub_controlled_stub_message(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.create_comm_hub_controlled_stub_message(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_comm_hub_controlled_stub_message(uuid, uuid) TO service_role;

-- =====================================================================
-- Slice 2 Part 6: Targeted claim function
-- =====================================================================

CREATE OR REPLACE FUNCTION public.claim_comm_hub_targeted_message(
  p_message_id uuid,
  p_execution_id uuid,
  p_grant_id uuid,
  p_action text,
  p_worker_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.communication_message;
  v_existing_attempt uuid;
BEGIN
  IF p_message_id IS NULL OR p_execution_id IS NULL OR p_grant_id IS NULL
     OR p_action IS NULL OR p_worker_id IS NULL OR length(p_worker_id) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'claimed', false,
      'code', 'input_invalid', 'message', 'all parameters are required');
  END IF;

  SELECT * INTO v_row
    FROM public.communication_message
   WHERE id = p_message_id
   FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'claimed', false,
      'code', 'targeted_message_locked',
      'message', 'message row is either missing or locked');
  END IF;

  IF v_row.targeted_dispatch_only IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'claimed', false,
      'code', 'targeted_dispatch_flag_missing');
  END IF;
  IF v_row.controlled_action IS DISTINCT FROM p_action THEN
    RETURN jsonb_build_object('ok', false, 'claimed', false,
      'code', 'targeted_action_mismatch',
      'expected', p_action, 'actual', v_row.controlled_action);
  END IF;
  IF v_row.controlled_live_execution_id IS DISTINCT FROM p_execution_id THEN
    RETURN jsonb_build_object('ok', false, 'claimed', false,
      'code', 'targeted_execution_mismatch');
  END IF;
  IF v_row.controlled_live_grant_id IS DISTINCT FROM p_grant_id THEN
    RETURN jsonb_build_object('ok', false, 'claimed', false,
      'code', 'targeted_grant_mismatch');
  END IF;
  IF v_row.send_context IS DISTINCT FROM 'controlled_live' THEN
    RETURN jsonb_build_object('ok', false, 'claimed', false,
      'code', 'targeted_context_mismatch');
  END IF;
  IF v_row.origin IS DISTINCT FROM 'comm_hub' OR v_row.channel IS DISTINCT FROM 'email' THEN
    RETURN jsonb_build_object('ok', false, 'claimed', false,
      'code', 'targeted_context_mismatch');
  END IF;
  IF v_row.status <> 'queued' THEN
    RETURN jsonb_build_object('ok', false, 'claimed', false,
      'code', 'targeted_message_not_queued',
      'status', v_row.status);
  END IF;
  IF v_row.locked_at IS NOT NULL AND v_row.locked_at > now() - interval '10 minutes' THEN
    RETURN jsonb_build_object('ok', false, 'claimed', false,
      'code', 'targeted_claim_conflict',
      'locked_by', v_row.locked_by, 'locked_at', v_row.locked_at);
  END IF;

  SELECT id INTO v_existing_attempt
    FROM public.communication_delivery_attempt
   WHERE message_id = v_row.id
     AND attempt_type = 'controlled_live'
     AND provider_call_attempted = true
   LIMIT 1;
  IF v_existing_attempt IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'claimed', false,
      'code', 'targeted_attempt_already_exists',
      'delivery_attempt_id', v_existing_attempt);
  END IF;

  PERFORM set_config('comm_hub.allow_targeted_update', 'true', true);

  UPDATE public.communication_message
     SET status = 'sending',
         attempt_count = attempt_count + 1,
         locked_at = now(),
         locked_by = p_worker_id,
         last_attempt_at = now(),
         updated_at = now()
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok', true, 'claimed', true, 'code', 'claimed',
    'message_id', v_row.id, 'request_id', v_row.request_id,
    'execution_id', v_row.controlled_live_execution_id,
    'grant_id', v_row.controlled_live_grant_id,
    'action', v_row.controlled_action,
    'status', v_row.status,
    'locked_at', v_row.locked_at,
    'locked_by', v_row.locked_by,
    'attempt_count', v_row.attempt_count,
    'preview_snapshot_id', v_row.preview_snapshot_id,
    'preview_approval_id', v_row.preview_approval_id,
    'dry_run_certification_id', v_row.dry_run_certification_id,
    'governance_certification_id', v_row.governance_certification_id,
    'certified_dependency_hash', v_row.certified_dependency_hash,
    'recipient_id', v_row.recipient_id,
    'template_version_id', v_row.template_version_id,
    'sender_profile_id', v_row.sender_profile_id,
    'from_email', v_row.from_email,
    'from_display_name', v_row.from_display_name,
    'reply_to_email', v_row.reply_to_email,
    'recipient_set_hash', v_row.recipient_set_hash,
    'subject_hash', v_row.subject_hash,
    'body_hash', v_row.body_hash,
    'content_hash', v_row.content_hash,
    'send_context', v_row.send_context,
    'origin', v_row.origin,
    'channel', v_row.channel,
    'test_mode', v_row.test_mode
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_comm_hub_targeted_message(uuid, uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_comm_hub_targeted_message(uuid, uuid, uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.claim_comm_hub_targeted_message(uuid, uuid, uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_comm_hub_targeted_message(uuid, uuid, uuid, text, text) TO service_role;

-- Ensure PostgREST notices new schema
NOTIFY pgrst, 'reload schema';
