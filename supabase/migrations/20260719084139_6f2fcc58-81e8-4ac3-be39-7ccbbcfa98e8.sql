
DO $$
DECLARE v_mod_id uuid;
BEGIN
  SELECT id INTO v_mod_id FROM public.app_modules WHERE name = 'bn_appeals';
  IF v_mod_id IS NULL THEN
    RAISE EXCEPTION 'bn_appeals module missing';
  END IF;

  INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
  SELECT v_mod_id, a.action_name, a.display_name, a.description, true
  FROM (VALUES
    ('read',                     'View Appeals',                'Read appeal cases within permitted scope'),
    ('write',                    'Register Appeals',            'Create or update appeal records (staff)'),
    ('decide',                   'Decide Appeals',              'Approve or reject appeal outcomes'),
    ('admin',                    'Configure Appeals',           'Manage categories, SLAs, workbaskets, templates'),
    ('claimant_submit',          'Claimant Appeal Submission',  'Submit an appeal against a decision the claimant owns'),
    ('admissibility_review',     'Admissibility Review',        'Review whether an appeal is admissible'),
    ('assign',                   'Assign Appeals',              'Assign appeals to staff or workbaskets'),
    ('recommend',                'Recommend Outcome',           'Propose an appeal outcome (maker)'),
    ('implement',                'Implement Outcome',           'Apply an approved appeal outcome to source records'),
    ('refer_legal',              'Refer to Legal',              'Escalate an appeal to the Legal module')
  ) AS a(action_name, display_name, description)
  ON CONFLICT DO NOTHING;
END $$;

CREATE TABLE IF NOT EXISTS public.bn_appeal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_number text NOT NULL UNIQUE,
  bn_claim_id                uuid NULL,
  bn_award_id                uuid NULL,
  bn_overpayment_id          uuid NULL,
  source_module_code         text NOT NULL,
  source_decision_id         text NULL,
  source_decision_date       date NULL,
  source_decision_notified_at date NULL,
  appeal_type_code           text NOT NULL,
  appeal_channel             text NOT NULL DEFAULT 'STAFF',
  is_late_submission         boolean NOT NULL DEFAULT false,
  late_reason                text NULL,
  claimant_person_id         uuid NULL,
  submitted_by_user_id       uuid NULL,
  submitted_by_user_code     text NULL,
  assigned_to_user_id        uuid NULL,
  assigned_workbasket        text NULL,
  status                     text NOT NULL DEFAULT 'DRAFT',
  outcome                    text NULL,
  outcome_effective_date     date NULL,
  statutory_filing_days      integer NULL,
  filing_deadline_date       date NULL,
  submitted_at               timestamptz NULL,
  acknowledged_at            timestamptz NULL,
  decided_at                 timestamptz NULL,
  implemented_at             timestamptz NULL,
  closed_at                  timestamptz NULL,
  reason_summary             text NULL,
  row_version                bigint NOT NULL DEFAULT 1,
  correlation_id             uuid NULL,
  entered_by                 text NULL,
  entered_at                 timestamptz NOT NULL DEFAULT now(),
  modified_by                text NULL,
  modified_at                timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_appeal TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_appeal TO anon;
GRANT ALL ON public.bn_appeal TO service_role;
CREATE INDEX IF NOT EXISTS ix_bn_appeal_claim   ON public.bn_appeal(bn_claim_id) WHERE bn_claim_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_bn_appeal_person  ON public.bn_appeal(claimant_person_id) WHERE claimant_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_bn_appeal_status  ON public.bn_appeal(status);
CREATE INDEX IF NOT EXISTS ix_bn_appeal_submitted_by ON public.bn_appeal(submitted_by_user_id) WHERE submitted_by_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.bn_appeal_ground (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id uuid NOT NULL REFERENCES public.bn_appeal(id) ON DELETE CASCADE,
  ground_code text NOT NULL,
  ground_text text NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  entered_by text NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_appeal_ground TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_appeal_ground TO anon;
GRANT ALL ON public.bn_appeal_ground TO service_role;
CREATE INDEX IF NOT EXISTS ix_bn_appeal_ground_appeal ON public.bn_appeal_ground(appeal_id);

CREATE TABLE IF NOT EXISTS public.bn_appeal_decision_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id uuid NOT NULL REFERENCES public.bn_appeal(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL DEFAULT now(),
  source_module_code text NOT NULL,
  source_decision_id text NULL,
  source_decision_date date NULL,
  snapshot_json jsonb NOT NULL,
  snapshot_hash text NULL
);
GRANT SELECT, INSERT ON public.bn_appeal_decision_snapshot TO authenticated;
GRANT SELECT, INSERT ON public.bn_appeal_decision_snapshot TO anon;
GRANT ALL ON public.bn_appeal_decision_snapshot TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bn_appeal_decision_snapshot ON public.bn_appeal_decision_snapshot(appeal_id);

CREATE TABLE IF NOT EXISTS public.bn_appeal_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id uuid NOT NULL REFERENCES public.bn_appeal(id) ON DELETE CASCADE,
  dms_document_id uuid NULL,
  document_type text NULL,
  file_name text NULL,
  content_type text NULL,
  size_bytes bigint NULL,
  entered_by text NULL,
  entered_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_appeal_evidence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_appeal_evidence TO anon;
GRANT ALL ON public.bn_appeal_evidence TO service_role;
CREATE INDEX IF NOT EXISTS ix_bn_appeal_evidence_appeal ON public.bn_appeal_evidence(appeal_id);

CREATE TABLE IF NOT EXISTS public.bn_appeal_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id uuid NOT NULL REFERENCES public.bn_appeal(id) ON DELETE CASCADE,
  event_code text NOT NULL,
  from_status text NULL,
  to_status text NULL,
  outcome text NULL,
  reason_code text NULL,
  notes text NULL,
  correlation_id uuid NULL,
  command_id uuid NULL,
  actor_user_id uuid NULL,
  actor_user_code text NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bn_appeal_event TO authenticated;
GRANT SELECT, INSERT ON public.bn_appeal_event TO anon;
GRANT ALL ON public.bn_appeal_event TO service_role;
CREATE INDEX IF NOT EXISTS ix_bn_appeal_event_appeal_time ON public.bn_appeal_event(appeal_id, occurred_at);

CREATE TABLE IF NOT EXISTS public.bn_appeal_hearing_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id uuid NOT NULL REFERENCES public.bn_appeal(id) ON DELETE CASCADE,
  hearing_source text NOT NULL,
  external_hearing_id text NOT NULL,
  scheduled_for timestamptz NULL,
  notes text NULL,
  entered_by text NULL,
  entered_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_appeal_hearing_link TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_appeal_hearing_link TO anon;
GRANT ALL ON public.bn_appeal_hearing_link TO service_role;

CREATE SEQUENCE IF NOT EXISTS public.bn_appeal_seq START 1;
GRANT USAGE ON SEQUENCE public.bn_appeal_seq TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.bn_appeal_submit_claimant(
  p_actor_user_id       uuid,
  p_actor_user_code     text,
  p_correlation_id      uuid,
  p_command_id          uuid,
  p_bn_claim_id         uuid,
  p_appeal_type_code    text,
  p_reason_summary      text,
  p_grounds             jsonb,
  p_decision_snapshot   jsonb
) RETURNS TABLE (appeal_id uuid, appeal_number text, row_version bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owned          boolean;
  v_claim_status   text;
  v_appeal_id      uuid := gen_random_uuid();
  v_appeal_no      text;
  v_year           text := to_char(now(), 'YYYY');
  v_seq            bigint;
  v_now            timestamptz := now();
  v_source_dec_dt  date;
  v_deadline_days  integer := 30;
  v_ground         jsonb;
  v_person_id      uuid;
BEGIN
  IF p_actor_user_id IS NULL OR p_bn_claim_id IS NULL OR p_appeal_type_code IS NULL THEN
    RAISE EXCEPTION 'BN_APPEAL_SUBMIT_MISSING_INPUT';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.external_user_person_link l
    JOIN public.bn_claim c ON c.ip_person_id = l.ip_person_id
    WHERE l.user_id = p_actor_user_id
      AND c.id = p_bn_claim_id
      AND COALESCE(l.link_status, 'active') = 'active'
  ) INTO v_owned;

  IF NOT v_owned THEN
    RAISE EXCEPTION 'BN_APPEAL_CLAIM_NOT_OWNED';
  END IF;

  SELECT c.status, c.decision_date, c.ip_person_id
    INTO v_claim_status, v_source_dec_dt, v_person_id
  FROM public.bn_claim c
  WHERE c.id = p_bn_claim_id;

  v_seq := nextval('public.bn_appeal_seq');
  v_appeal_no := 'AP-' || v_year || '-' || lpad(v_seq::text, 6, '0');

  INSERT INTO public.bn_appeal (
    id, appeal_number, bn_claim_id, source_module_code, source_decision_date,
    appeal_type_code, appeal_channel,
    claimant_person_id, submitted_by_user_id, submitted_by_user_code,
    status, statutory_filing_days, filing_deadline_date, submitted_at,
    reason_summary, correlation_id, entered_by, entered_at, modified_by, modified_at
  )
  VALUES (
    v_appeal_id, v_appeal_no, p_bn_claim_id, 'bn_claim', v_source_dec_dt,
    p_appeal_type_code, 'CLAIMANT_PORTAL',
    v_person_id, p_actor_user_id, p_actor_user_code,
    'SUBMITTED', v_deadline_days,
    (COALESCE(v_source_dec_dt, current_date) + v_deadline_days * INTERVAL '1 day')::date,
    v_now,
    p_reason_summary, p_correlation_id, p_actor_user_code, v_now, p_actor_user_code, v_now
  );

  INSERT INTO public.bn_appeal_decision_snapshot (appeal_id, source_module_code, snapshot_json)
  VALUES (v_appeal_id, 'bn_claim', COALESCE(p_decision_snapshot, jsonb_build_object('claim_id', p_bn_claim_id, 'status', v_claim_status)));

  IF p_grounds IS NOT NULL AND jsonb_typeof(p_grounds) = 'array' THEN
    FOR v_ground IN SELECT * FROM jsonb_array_elements(p_grounds) LOOP
      INSERT INTO public.bn_appeal_ground (appeal_id, ground_code, ground_text, entered_by)
      VALUES (
        v_appeal_id,
        COALESCE(v_ground->>'ground_code', 'GENERAL'),
        COALESCE(v_ground->>'ground_text', ''),
        p_actor_user_code
      );
    END LOOP;
  END IF;

  INSERT INTO public.bn_appeal_event (
    appeal_id, event_code, from_status, to_status, correlation_id, command_id,
    actor_user_id, actor_user_code, notes
  ) VALUES (
    v_appeal_id, 'SUBMITTED', 'DRAFT', 'SUBMITTED', p_correlation_id, p_command_id,
    p_actor_user_id, p_actor_user_code, 'Claimant portal submission'
  );

  RETURN QUERY SELECT v_appeal_id, v_appeal_no, 1::bigint;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bn_appeal_submit_claimant(uuid, text, uuid, uuid, uuid, text, text, jsonb, jsonb) TO authenticated, service_role;

UPDATE public.app_modules
   SET actions_enabled = true,
       show_in_menu = true,
       rollout_state = 'internal_pilot'
 WHERE name = 'bn_appeals';
