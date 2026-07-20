
ALTER TABLE public.bn_appeal
  ADD COLUMN IF NOT EXISTS case_kind                 text,
  ADD COLUMN IF NOT EXISTS review_level_code         text,
  ADD COLUMN IF NOT EXISTS country_code              text        NOT NULL DEFAULT 'KN',
  ADD COLUMN IF NOT EXISTS language_code             text        NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS workflow_instance_id      uuid,
  ADD COLUMN IF NOT EXISTS current_stage_code        text,
  ADD COLUMN IF NOT EXISTS priority_code             text        NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS confidentiality_code      text        NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS requires_hearing          boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hearing_waived            boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_filing_status        text,
  ADD COLUMN IF NOT EXISTS late_filing_decided_by    uuid,
  ADD COLUMN IF NOT EXISTS late_filing_decided_at    timestamptz,
  ADD COLUMN IF NOT EXISTS late_filing_reason_code   text,
  ADD COLUMN IF NOT EXISTS admissibility_status      text,
  ADD COLUMN IF NOT EXISTS admissibility_decided_by  uuid,
  ADD COLUMN IF NOT EXISTS admissibility_decided_at  timestamptz,
  ADD COLUMN IF NOT EXISTS admissibility_reason_code text,
  ADD COLUMN IF NOT EXISTS decision_served_at        timestamptz,
  ADD COLUMN IF NOT EXISTS implementation_status     text,
  ADD COLUMN IF NOT EXISTS closed_reason_code        text,
  ADD COLUMN IF NOT EXISTS reopened_count            integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reopened_at          timestamptz,
  ADD COLUMN IF NOT EXISTS last_transition_at        timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by_user_id        uuid;

COMMENT ON COLUMN public.bn_appeal.case_kind IS
  'BN-AP-01: FIRST_LEVEL | INTERNAL_REVIEW | APPEAL_TRIBUNAL | JUDICIAL_REFERRAL. Set by bn_appeal_type_config.';
COMMENT ON COLUMN public.bn_appeal.review_level_code IS
  'BN-AP-01: L1 | L2 | TRIBUNAL. Set by bn_appeal_type_config.';
COMMENT ON COLUMN public.bn_appeal.implementation_status IS
  'BN-AP-01: NOT_APPLICABLE | PENDING | PARTIALLY_IMPLEMENTED | IMPLEMENTED | WAIVED.';

DROP INDEX IF EXISTS public.ux_bn_appeal_active_per_claim_type;

CREATE TABLE IF NOT EXISTS public.bn_appeal_source_decision (
  id                        uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appeal_id                 uuid        NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT,
  source_module_code        text        NOT NULL,
  source_entity_type        text        NOT NULL,
  source_entity_id          uuid,
  source_decision_type_code text,
  source_decision_id        text,
  source_reference_no       text,
  source_decision_date      date,
  source_notified_at        date,
  source_status_at_filing   text,
  source_row_version        bigint,
  relationship_type         text        NOT NULL DEFAULT 'PRIMARY',
  is_primary                boolean     NOT NULL DEFAULT false,
  created_by_user_id        uuid,
  created_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_bn_appeal_source_decision_relationship
    CHECK (relationship_type IN ('PRIMARY','RELATED','CONSOLIDATED','SUBSEQUENT_DECISION')),
  CONSTRAINT ck_bn_appeal_source_decision_primary_flag
    CHECK ((relationship_type = 'PRIMARY') = is_primary)
);

GRANT SELECT ON public.bn_appeal_source_decision TO service_role;
GRANT ALL    ON public.bn_appeal_source_decision TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS ux_bn_appeal_source_decision_one_primary
  ON public.bn_appeal_source_decision(appeal_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS ix_bn_appeal_source_decision_appeal
  ON public.bn_appeal_source_decision(appeal_id);

CREATE INDEX IF NOT EXISTS ix_bn_appeal_source_decision_source
  ON public.bn_appeal_source_decision(source_module_code, source_entity_type, source_entity_id)
  WHERE source_entity_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.bn_appeal_source_decision_no_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  RAISE EXCEPTION 'BN_APPEAL_SOURCE_DECISION_DELETE_FORBIDDEN';
END;
$fn$;

DROP TRIGGER IF EXISTS bn_appeal_source_decision_no_delete ON public.bn_appeal_source_decision;
CREATE TRIGGER bn_appeal_source_decision_no_delete
  BEFORE DELETE ON public.bn_appeal_source_decision
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_source_decision_no_delete();

COMMENT ON TABLE public.bn_appeal_source_decision IS
  'BN-AP-01 §C: Canonical source-decision spine. Exactly one PRIMARY row per Appeal.';

CREATE TABLE IF NOT EXISTS public.bn_appeal_type_config (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appeal_type_code         text        NOT NULL,
  display_name             text        NOT NULL,
  case_kind                text        NOT NULL DEFAULT 'FIRST_LEVEL',
  review_level_code        text        NOT NULL DEFAULT 'L1',
  source_module_code       text        NOT NULL,
  source_entity_type       text,
  statutory_filing_days    integer     NOT NULL DEFAULT 30,
  deadline_basis           text        NOT NULL DEFAULT 'DECISION_NOTIFIED',
  requires_hearing         boolean     NOT NULL DEFAULT false,
  allows_hearing_waiver    boolean     NOT NULL DEFAULT true,
  allows_late_filing       boolean     NOT NULL DEFAULT true,
  automatic_stay_policy    text        NOT NULL DEFAULT 'NONE',
  workflow_code            text,
  country_code             text        NOT NULL DEFAULT 'KN',
  effective_from           date        NOT NULL DEFAULT current_date,
  effective_to             date,
  is_active                boolean     NOT NULL DEFAULT true,
  row_version              bigint      NOT NULL DEFAULT 1,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_bn_appeal_type_config_deadline_basis
    CHECK (deadline_basis IN ('DECISION_NOTIFIED','DECISION_DATE','SUBMISSION','SERVICE')),
  CONSTRAINT ck_bn_appeal_type_config_stay_policy
    CHECK (automatic_stay_policy IN ('NONE','ON_ADMISSION','ON_SUBMISSION'))
);

GRANT SELECT ON public.bn_appeal_type_config TO service_role;
GRANT ALL    ON public.bn_appeal_type_config TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS ux_bn_appeal_type_config_active
  ON public.bn_appeal_type_config(appeal_type_code, country_code)
  WHERE is_active = true;

INSERT INTO public.bn_appeal_type_config
  (appeal_type_code, display_name, case_kind, review_level_code, source_module_code, source_entity_type, statutory_filing_days, requires_hearing)
VALUES
  ('CLAIM_DENIED',            'Claim denied',                       'FIRST_LEVEL',    'L1', 'bn_claim',       'bn_claim_decision',       30, false),
  ('RATE_DISPUTE',            'Rate / calculation dispute',         'FIRST_LEVEL',    'L1', 'bn_claim',       'bn_claim_calculation',    30, false),
  ('ELIGIBILITY_DISPUTE',     'Eligibility determination',          'FIRST_LEVEL',    'L1', 'bn_claim',       'bn_claim_eligibility',    30, false),
  ('AWARD_SUSPENDED',         'Award suspended / stopped',          'FIRST_LEVEL',    'L1', 'bn_award',       'bn_award_suspension_event', 30, false),
  ('AWARD_REDUCED',           'Award reduced',                      'FIRST_LEVEL',    'L1', 'bn_award',       'bn_award_rate_history',   30, false),
  ('OVERPAYMENT_DISPUTE',     'Overpayment challenge',              'FIRST_LEVEL',    'L1', 'bn_overpayment', 'bn_overpayment',          30, false),
  ('MEDICAL_ASSESSMENT',      'Medical assessment challenge',       'FIRST_LEVEL',    'L1', 'bn_medical',     'bn_medical_review_schedule', 30, true),
  ('MEANS_TEST_OUTCOME',      'Means-test outcome',                 'FIRST_LEVEL',    'L1', 'bn_means_test',  'bn_means_test',           30, false),
  ('PROCEDURAL_FAIRNESS',     'Procedural fairness',                'INTERNAL_REVIEW','L2', 'bn_claim',       NULL,                      30, true),
  ('OTHER',                   'Other',                              'FIRST_LEVEL',    'L1', 'bn_claim',       NULL,                      30, false)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.bn_appeal_detect_duplicate_source_decision(
  p_source_module_code text,
  p_source_entity_type text,
  p_source_entity_id   uuid,
  p_source_decision_id text
) RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT a.id
  FROM public.bn_appeal a
  JOIN public.bn_appeal_source_decision sd
    ON sd.appeal_id = a.id AND sd.is_primary = true
  WHERE a.status NOT IN ('WITHDRAWN','CANCELLED','CLOSED','INADMISSIBLE')
    AND sd.source_module_code = p_source_module_code
    AND sd.source_entity_type = p_source_entity_type
    AND (
      (sd.source_entity_id IS NOT NULL AND sd.source_entity_id = p_source_entity_id)
      OR
      (sd.source_decision_id IS NOT NULL AND p_source_decision_id IS NOT NULL
        AND sd.source_decision_id = p_source_decision_id)
    )
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.bn_appeal_submit_claimant(
  uuid, text, uuid, uuid, uuid, text, text, jsonb, jsonb
);

CREATE OR REPLACE FUNCTION public.bn_appeal_submit_claimant(
  p_actor_user_id     uuid,
  p_actor_user_code   text,
  p_correlation_id    uuid,
  p_command_id        uuid,
  p_bn_claim_id       uuid,
  p_appeal_type_code  text,
  p_reason_summary    text,
  p_grounds           jsonb,
  p_client_snapshot   jsonb
) RETURNS TABLE(appeal_id uuid, appeal_number text, row_version bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_owned         boolean;
  v_claim_row     public.bn_claim%ROWTYPE;
  v_appeal_id     uuid := gen_random_uuid();
  v_appeal_no     text;
  v_year          text := to_char(now(), 'YYYY');
  v_seq           bigint;
  v_now           timestamptz := now();
  v_deadline_days integer;
  v_type_cfg      public.bn_appeal_type_config%ROWTYPE;
  v_dup_id        uuid;
  v_ground        jsonb;
  v_latest_dec    jsonb;
  v_latest_elig   jsonb;
  v_latest_calc   jsonb;
  v_snapshot      jsonb;
BEGIN
  IF p_actor_user_id IS NULL OR p_bn_claim_id IS NULL OR p_appeal_type_code IS NULL THEN
    RAISE EXCEPTION 'BN_APPEAL_SUBMIT_MISSING_INPUT';
  END IF;

  SELECT * INTO v_claim_row FROM public.bn_claim WHERE id = p_bn_claim_id;
  IF v_claim_row.id IS NULL THEN
    RAISE EXCEPTION 'BN_APPEAL_CLAIM_NOT_FOUND';
  END IF;

  SELECT * INTO v_type_cfg
    FROM public.bn_appeal_type_config
   WHERE appeal_type_code = p_appeal_type_code AND is_active = true
   ORDER BY effective_from DESC LIMIT 1;

  IF v_type_cfg.id IS NULL THEN
    RAISE EXCEPTION 'BN_APPEAL_TYPE_NOT_CONFIGURED';
  END IF;

  v_deadline_days := v_type_cfg.statutory_filing_days;

  SELECT EXISTS (
    SELECT 1 FROM public.external_user_person_link l
    WHERE l.user_id = p_actor_user_id
      AND l.ssn = v_claim_row.ssn
      AND COALESCE(l.verification_status, 'verified') IN ('verified','confirmed','active')
  ) INTO v_owned;

  IF NOT v_owned THEN
    RAISE EXCEPTION 'BN_APPEAL_CLAIM_NOT_OWNED';
  END IF;

  v_dup_id := public.bn_appeal_detect_duplicate_source_decision(
    'bn_claim',
    COALESCE(v_type_cfg.source_entity_type, 'bn_claim_decision'),
    p_bn_claim_id,
    NULL
  );
  IF v_dup_id IS NOT NULL THEN
    RAISE EXCEPTION 'BN_APPEAL_DUPLICATE_ACTIVE:%', v_dup_id;
  END IF;

  IF to_regclass('public.bn_claim_decision') IS NOT NULL THEN
    EXECUTE 'SELECT to_jsonb(d) FROM public.bn_claim_decision d
             WHERE d.bn_claim_id = $1
             ORDER BY COALESCE(d.decision_date, d.updated_at, d.created_at) DESC NULLS LAST
             LIMIT 1'
      INTO v_latest_dec USING p_bn_claim_id;
  END IF;

  IF to_regclass('public.bn_claim_eligibility') IS NOT NULL THEN
    EXECUTE 'SELECT to_jsonb(e) FROM public.bn_claim_eligibility e
             WHERE e.bn_claim_id = $1
             ORDER BY COALESCE(e.updated_at, e.created_at) DESC NULLS LAST
             LIMIT 1'
      INTO v_latest_elig USING p_bn_claim_id;
  END IF;

  IF to_regclass('public.bn_claim_calculation') IS NOT NULL THEN
    EXECUTE 'SELECT to_jsonb(c) FROM public.bn_claim_calculation c
             WHERE c.bn_claim_id = $1
             ORDER BY COALESCE(c.updated_at, c.created_at) DESC NULLS LAST
             LIMIT 1'
      INTO v_latest_calc USING p_bn_claim_id;
  END IF;

  v_snapshot := jsonb_build_object(
    'captured_by',            'BN_APPEAL_SUBMIT_CLAIMANT',
    'captured_at',            v_now,
    'claim',                  to_jsonb(v_claim_row) - 'ssn',
    'latest_decision',        v_latest_dec,
    'latest_eligibility',     v_latest_elig,
    'latest_calculation',     v_latest_calc,
    'claim_status_at_filing', v_claim_row.status,
    'source_decision_date',   v_claim_row.decision_date
  );

  v_seq := nextval('public.bn_appeal_seq');
  v_appeal_no := 'AP-' || v_year || '-' || lpad(v_seq::text, 6, '0');

  INSERT INTO public.bn_appeal (
    id, appeal_number, bn_claim_id, source_module_code, source_decision_date,
    appeal_type_code, appeal_channel,
    submitted_by_user_id, submitted_by_user_code,
    status, statutory_filing_days, filing_deadline_date, submitted_at,
    reason_summary, correlation_id, entered_by, entered_at, modified_by, modified_at,
    case_kind, review_level_code, country_code, priority_code, confidentiality_code,
    requires_hearing, created_by_user_id, last_transition_at
  )
  VALUES (
    v_appeal_id, v_appeal_no, p_bn_claim_id, v_type_cfg.source_module_code, v_claim_row.decision_date,
    p_appeal_type_code, 'CLAIMANT_PORTAL',
    p_actor_user_id, p_actor_user_code,
    'SUBMITTED', v_deadline_days,
    (COALESCE(v_claim_row.decision_date, current_date) + v_deadline_days * INTERVAL '1 day')::date,
    v_now,
    p_reason_summary, p_correlation_id, p_actor_user_code, v_now, p_actor_user_code, v_now,
    v_type_cfg.case_kind, v_type_cfg.review_level_code, v_type_cfg.country_code, 'NORMAL', 'STANDARD',
    v_type_cfg.requires_hearing, p_actor_user_id, v_now
  );

  INSERT INTO public.bn_appeal_source_decision (
    appeal_id, source_module_code, source_entity_type, source_entity_id,
    source_decision_type_code, source_decision_date, source_status_at_filing,
    relationship_type, is_primary, created_by_user_id
  ) VALUES (
    v_appeal_id,
    v_type_cfg.source_module_code,
    COALESCE(v_type_cfg.source_entity_type, 'bn_claim_decision'),
    p_bn_claim_id,
    p_appeal_type_code,
    v_claim_row.decision_date,
    v_claim_row.status,
    'PRIMARY', true, p_actor_user_id
  );

  INSERT INTO public.bn_appeal_decision_snapshot (
    appeal_id, source_module_code, source_decision_date, snapshot_json
  ) VALUES (
    v_appeal_id, v_type_cfg.source_module_code, v_claim_row.decision_date, v_snapshot
  );

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
    p_actor_user_id, p_actor_user_code, 'Claimant portal submission (AP-01 hardened)'
  );

  RETURN QUERY SELECT v_appeal_id, v_appeal_no, 1::bigint;
END;
$fn$;

COMMENT ON FUNCTION public.bn_appeal_submit_claimant IS
  'BN-AP-01 §A.4: Authoritative server-side snapshot capture. Rejects duplicates via bn_appeal_detect_duplicate_source_decision.';

INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT m.id, 'claimant_submit', 'Submit an appeal (claimant portal)', true
FROM public.app_modules m
WHERE m.name = 'bn_appeals'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_actions ma
     WHERE ma.module_id = m.id AND ma.action_name = 'claimant_submit'
  );

DO $$
DECLARE
  v_type_cfg_count int;
BEGIN
  SELECT count(*) INTO v_type_cfg_count FROM public.bn_appeal_type_config WHERE is_active = true;
  IF v_type_cfg_count < 10 THEN
    RAISE EXCEPTION 'BN-AP-01: expected at least 10 active appeal type config rows, found %', v_type_cfg_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.app_modules
      WHERE name = 'bn_appeals' AND is_enabled = true AND rollout_state = 'internal_pilot'
  ) THEN
    RAISE EXCEPTION 'BN-AP-01: bn_appeals must remain enabled in internal_pilot rollout_state.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.app_modules WHERE name = 'bn_appeals' AND actions_enabled = true
  ) THEN
    RAISE EXCEPTION 'BN-AP-01: bn_appeals actions_enabled MUST remain false in this slice.';
  END IF;

  RAISE NOTICE 'BN-AP-01 Slice 1 complete. Active type configs: %', v_type_cfg_count;
END $$;
