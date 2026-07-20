-- BN-AP-01 Slice 2A.G — Enterprise Appeals child model (additive)
-- All tables service-boundary only (no anon/authenticated grants).
-- RLS remains OFF per docs/ARCHITECTURE-NO-RLS-RULE.md; authorisation is enforced
-- by the bn-benefits-query and bn-appeals-* edge functions.
--
-- Convention: appeal_id FK to bn_appeal(id) with ON DELETE RESTRICT / ON UPDATE NO ACTION.
-- Mutable child rows carry row_version + modified_at + modified_by.
-- Recommendation/decision versions are append-only (no UPDATE/DELETE at the service boundary).

------------------------------------------------------------
-- Shared updated_at trigger (idempotent create)
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bn_appeal_child_touch_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.modified_at = now();
  NEW.row_version = COALESCE(OLD.row_version, 0) + 1;
  RETURN NEW;
END;
$$;

------------------------------------------------------------
-- 1. bn_appeal_party — appellants, representatives, respondents
------------------------------------------------------------
CREATE TABLE public.bn_appeal_party (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id             UUID NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  party_role            TEXT NOT NULL CHECK (party_role IN ('APPELLANT','REPRESENTATIVE','RESPONDENT','WITNESS','OTHER')),
  party_type            TEXT NOT NULL CHECK (party_type IN ('INDIVIDUAL','ORGANISATION','STAFF','LEGAL_COUNSEL')),
  identifier_type_code  TEXT,
  masked_identifier     TEXT,
  display_name          TEXT NOT NULL,
  contact_channel_code  TEXT,
  contact_reference     TEXT,
  is_primary            BOOLEAN NOT NULL DEFAULT false,
  effective_from        DATE,
  effective_to          DATE,
  external_reference    TEXT,
  notes                 TEXT,
  row_version           INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID,
  modified_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by           UUID
);
CREATE INDEX idx_bn_appeal_party_appeal ON public.bn_appeal_party(appeal_id);
CREATE INDEX idx_bn_appeal_party_primary ON public.bn_appeal_party(appeal_id) WHERE is_primary;
CREATE TRIGGER trg_bn_appeal_party_touch BEFORE UPDATE ON public.bn_appeal_party
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_child_touch_row();
GRANT ALL ON public.bn_appeal_party TO service_role;

------------------------------------------------------------
-- 2. bn_appeal_issue — appeal issues raised
------------------------------------------------------------
CREATE TABLE public.bn_appeal_issue (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id           UUID NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  issue_seq           INTEGER NOT NULL,
  issue_code          TEXT NOT NULL,
  issue_summary       TEXT NOT NULL,
  issue_detail        TEXT,
  status              TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','UNDER_REVIEW','RESOLVED','WITHDRAWN','DISMISSED')),
  resolution_summary  TEXT,
  resolved_at         TIMESTAMPTZ,
  row_version         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID,
  modified_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by         UUID,
  UNIQUE (appeal_id, issue_seq)
);
CREATE INDEX idx_bn_appeal_issue_appeal ON public.bn_appeal_issue(appeal_id);
CREATE TRIGGER trg_bn_appeal_issue_touch BEFORE UPDATE ON public.bn_appeal_issue
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_child_touch_row();
GRANT ALL ON public.bn_appeal_issue TO service_role;

------------------------------------------------------------
-- 3. bn_appeal_deadline — SLA / statutory deadlines
------------------------------------------------------------
CREATE TABLE public.bn_appeal_deadline (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id           UUID NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  deadline_code       TEXT NOT NULL,
  deadline_kind       TEXT NOT NULL CHECK (deadline_kind IN ('STATUTORY','SLA','INTERNAL','COURT')),
  due_at              TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','MET','MISSED','WAIVED','SUPERSEDED')),
  met_at              TIMESTAMPTZ,
  waiver_reason       TEXT,
  row_version         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID,
  modified_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by         UUID
);
CREATE INDEX idx_bn_appeal_deadline_appeal ON public.bn_appeal_deadline(appeal_id);
CREATE INDEX idx_bn_appeal_deadline_due ON public.bn_appeal_deadline(due_at) WHERE status = 'PENDING';
CREATE TRIGGER trg_bn_appeal_deadline_touch BEFORE UPDATE ON public.bn_appeal_deadline
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_child_touch_row();
GRANT ALL ON public.bn_appeal_deadline TO service_role;

------------------------------------------------------------
-- 4. bn_appeal_evidence_request — outstanding info/evidence requests
------------------------------------------------------------
CREATE TABLE public.bn_appeal_evidence_request (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id               UUID NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  request_reference       TEXT,
  requested_from_party_id UUID REFERENCES public.bn_appeal_party(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  requested_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at                  TIMESTAMPTZ,
  status                  TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','SENT','ACKNOWLEDGED','FULFILLED','OVERDUE','CANCELLED')),
  subject                 TEXT NOT NULL,
  description             TEXT,
  fulfilled_at            TIMESTAMPTZ,
  fulfilled_evidence_id   UUID,
  row_version             INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID,
  modified_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by             UUID
);
CREATE INDEX idx_bn_appeal_evreq_appeal ON public.bn_appeal_evidence_request(appeal_id);
CREATE TRIGGER trg_bn_appeal_evreq_touch BEFORE UPDATE ON public.bn_appeal_evidence_request
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_child_touch_row();
GRANT ALL ON public.bn_appeal_evidence_request TO service_role;

------------------------------------------------------------
-- 5. bn_appeal_stay — stays / interim relief
------------------------------------------------------------
CREATE TABLE public.bn_appeal_stay (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id           UUID NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  stay_type           TEXT NOT NULL CHECK (stay_type IN ('PAYMENT_HOLD','RECOVERY_HOLD','FULL_STAY','PARTIAL_STAY','OTHER')),
  granted_at          TIMESTAMPTZ,
  effective_from      DATE,
  effective_to        DATE,
  status              TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','ACTIVE','LIFTED','EXPIRED','REFUSED')),
  reason              TEXT,
  lifted_at           TIMESTAMPTZ,
  row_version         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID,
  modified_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by         UUID
);
CREATE INDEX idx_bn_appeal_stay_appeal ON public.bn_appeal_stay(appeal_id);
CREATE TRIGGER trg_bn_appeal_stay_touch BEFORE UPDATE ON public.bn_appeal_stay
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_child_touch_row();
GRANT ALL ON public.bn_appeal_stay TO service_role;

------------------------------------------------------------
-- 6. bn_appeal_note — free-form notes (append-only from service boundary)
------------------------------------------------------------
CREATE TABLE public.bn_appeal_note (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id     UUID NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  note_kind     TEXT NOT NULL DEFAULT 'GENERAL',
  visibility    TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (visibility IN ('INTERNAL','APPELLANT_VISIBLE')),
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID
);
CREATE INDEX idx_bn_appeal_note_appeal ON public.bn_appeal_note(appeal_id);
GRANT ALL ON public.bn_appeal_note TO service_role;

------------------------------------------------------------
-- 7. bn_appeal_hearing — hearing schedule
------------------------------------------------------------
CREATE TABLE public.bn_appeal_hearing (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id           UUID NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  hearing_seq         INTEGER NOT NULL,
  scheduled_at        TIMESTAMPTZ,
  venue_code          TEXT,
  venue_detail        TEXT,
  hearing_mode        TEXT CHECK (hearing_mode IN ('IN_PERSON','VIRTUAL','HYBRID','PAPER')),
  status              TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','RESCHEDULED','HELD','ADJOURNED','CANCELLED','COMPLETED')),
  panel_reference     TEXT,
  outcome_summary     TEXT,
  external_hearing_ref UUID,
  row_version         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID,
  modified_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by         UUID,
  UNIQUE (appeal_id, hearing_seq)
);
CREATE INDEX idx_bn_appeal_hearing_appeal ON public.bn_appeal_hearing(appeal_id);
CREATE TRIGGER trg_bn_appeal_hearing_touch BEFORE UPDATE ON public.bn_appeal_hearing
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_child_touch_row();
GRANT ALL ON public.bn_appeal_hearing TO service_role;

------------------------------------------------------------
-- 8. bn_appeal_hearing_participant
------------------------------------------------------------
CREATE TABLE public.bn_appeal_hearing_participant (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_id        UUID NOT NULL REFERENCES public.bn_appeal_hearing(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  appeal_id         UUID NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  party_id          UUID REFERENCES public.bn_appeal_party(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  participant_role  TEXT NOT NULL CHECK (participant_role IN ('APPELLANT','REPRESENTATIVE','WITNESS','PANEL_MEMBER','SECRETARIAT','OBSERVER','INTERPRETER')),
  display_name      TEXT NOT NULL,
  attendance_status TEXT NOT NULL DEFAULT 'EXPECTED' CHECK (attendance_status IN ('EXPECTED','ATTENDED','ABSENT','EXCUSED')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID
);
CREATE INDEX idx_bn_appeal_hp_hearing ON public.bn_appeal_hearing_participant(hearing_id);
CREATE INDEX idx_bn_appeal_hp_appeal ON public.bn_appeal_hearing_participant(appeal_id);
GRANT ALL ON public.bn_appeal_hearing_participant TO service_role;

------------------------------------------------------------
-- 9. bn_appeal_recommendation — append-only versioned recommendations
------------------------------------------------------------
CREATE TABLE public.bn_appeal_recommendation (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id             UUID NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  recommendation_seq    INTEGER NOT NULL,
  recommended_outcome   TEXT NOT NULL,
  rationale             TEXT NOT NULL,
  recommended_by        UUID,
  recommended_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded_at         TIMESTAMPTZ,
  superseded_by_id      UUID REFERENCES public.bn_appeal_recommendation(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  supporting_evidence   JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appeal_id, recommendation_seq)
);
CREATE INDEX idx_bn_appeal_reco_appeal ON public.bn_appeal_recommendation(appeal_id);
GRANT ALL ON public.bn_appeal_recommendation TO service_role;

-- Recommendations are append-only: block UPDATE/DELETE at the DB level.
CREATE OR REPLACE FUNCTION public.bn_appeal_recommendation_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'bn_appeal_recommendation is append-only (delete blocked)';
  END IF;
  -- Only supersession columns may be updated.
  IF (NEW.appeal_id, NEW.recommendation_seq, NEW.recommended_outcome, NEW.rationale, NEW.recommended_by, NEW.recommended_at)
     IS DISTINCT FROM
     (OLD.appeal_id, OLD.recommendation_seq, OLD.recommended_outcome, OLD.rationale, OLD.recommended_by, OLD.recommended_at) THEN
    RAISE EXCEPTION 'bn_appeal_recommendation core fields are immutable';
  END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_bn_appeal_reco_immutable
  BEFORE UPDATE OR DELETE ON public.bn_appeal_recommendation
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_recommendation_immutable();

------------------------------------------------------------
-- 10. bn_appeal_decision — append-only versioned formal decisions
------------------------------------------------------------
CREATE TABLE public.bn_appeal_decision (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id           UUID NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  decision_seq        INTEGER NOT NULL,
  outcome_code        TEXT NOT NULL,
  decision_summary    TEXT NOT NULL,
  decided_by          UUID,
  decided_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by         UUID,
  approved_at         TIMESTAMPTZ,
  effective_from      DATE,
  superseded_at       TIMESTAMPTZ,
  superseded_by_id    UUID REFERENCES public.bn_appeal_decision(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  legal_reference     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appeal_id, decision_seq)
);
CREATE INDEX idx_bn_appeal_dec_appeal ON public.bn_appeal_decision(appeal_id);
GRANT ALL ON public.bn_appeal_decision TO service_role;

CREATE OR REPLACE FUNCTION public.bn_appeal_decision_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'bn_appeal_decision is append-only (delete blocked)';
  END IF;
  IF (NEW.appeal_id, NEW.decision_seq, NEW.outcome_code, NEW.decision_summary, NEW.decided_by, NEW.decided_at)
     IS DISTINCT FROM
     (OLD.appeal_id, OLD.decision_seq, OLD.outcome_code, OLD.decision_summary, OLD.decided_by, OLD.decided_at) THEN
    RAISE EXCEPTION 'bn_appeal_decision core fields are immutable';
  END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_bn_appeal_dec_immutable
  BEFORE UPDATE OR DELETE ON public.bn_appeal_decision
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_decision_immutable();

------------------------------------------------------------
-- 11. bn_appeal_decision_item — orders within a decision
------------------------------------------------------------
CREATE TABLE public.bn_appeal_decision_item (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id         UUID NOT NULL REFERENCES public.bn_appeal_decision(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  appeal_id           UUID NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  item_seq            INTEGER NOT NULL,
  item_kind           TEXT NOT NULL,
  target_module       TEXT,
  target_entity_type  TEXT,
  target_entity_id    UUID,
  remedy_code         TEXT,
  amount              NUMERIC(18,2),
  currency_code       TEXT,
  instruction         TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (decision_id, item_seq)
);
CREATE INDEX idx_bn_appeal_dec_item_appeal ON public.bn_appeal_decision_item(appeal_id);
GRANT ALL ON public.bn_appeal_decision_item TO service_role;

------------------------------------------------------------
-- 12. bn_appeal_implementation_action — implementation ledger
------------------------------------------------------------
CREATE TABLE public.bn_appeal_implementation_action (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id           UUID NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  decision_id         UUID REFERENCES public.bn_appeal_decision(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  decision_item_id    UUID REFERENCES public.bn_appeal_decision_item(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  action_seq          INTEGER NOT NULL,
  action_kind         TEXT NOT NULL,
  target_module       TEXT,
  target_reference    TEXT,
  status              TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','FAILED','CANCELLED')),
  scheduled_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  failure_reason      TEXT,
  correlation_id      UUID,
  row_version         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID,
  modified_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by         UUID,
  UNIQUE (appeal_id, action_seq)
);
CREATE INDEX idx_bn_appeal_impl_appeal ON public.bn_appeal_implementation_action(appeal_id);
CREATE INDEX idx_bn_appeal_impl_status ON public.bn_appeal_implementation_action(status) WHERE status IN ('PENDING','IN_PROGRESS');
CREATE TRIGGER trg_bn_appeal_impl_touch BEFORE UPDATE ON public.bn_appeal_implementation_action
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_child_touch_row();
GRANT ALL ON public.bn_appeal_implementation_action TO service_role;

------------------------------------------------------------
-- 13. bn_appeal_link — cross-references to other appeals / cases
------------------------------------------------------------
CREATE TABLE public.bn_appeal_link (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id             UUID NOT NULL REFERENCES public.bn_appeal(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  link_kind             TEXT NOT NULL CHECK (link_kind IN ('RELATED_APPEAL','CONSOLIDATED_WITH','SUPERSEDES','SUPERSEDED_BY','LEGAL_MATTER','WORKFLOW_TASK','COMMUNICATION','OTHER')),
  target_module         TEXT NOT NULL,
  target_entity_type    TEXT,
  target_entity_id      UUID,
  target_reference      TEXT,
  relationship_summary  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID
);
CREATE INDEX idx_bn_appeal_link_appeal ON public.bn_appeal_link(appeal_id);
GRANT ALL ON public.bn_appeal_link TO service_role;

------------------------------------------------------------
-- 14. bn_appeal_ground_config — configurable ground catalogue
------------------------------------------------------------
CREATE TABLE public.bn_appeal_ground_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ground_code         TEXT NOT NULL UNIQUE,
  ground_name         TEXT NOT NULL,
  description         TEXT,
  applies_to_types    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active           BOOLEAN NOT NULL DEFAULT true,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  effective_from      DATE,
  effective_to        DATE,
  row_version         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID,
  modified_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by         UUID
);
CREATE TRIGGER trg_bn_appeal_gc_touch BEFORE UPDATE ON public.bn_appeal_ground_config
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_child_touch_row();
GRANT ALL ON public.bn_appeal_ground_config TO service_role;

------------------------------------------------------------
-- 15. bn_appeal_remedy_config — configurable remedy catalogue
------------------------------------------------------------
CREATE TABLE public.bn_appeal_remedy_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remedy_code         TEXT NOT NULL UNIQUE,
  remedy_name         TEXT NOT NULL,
  description         TEXT,
  applies_to_types    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  requires_amount     BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  effective_from      DATE,
  effective_to        DATE,
  row_version         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID,
  modified_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by         UUID
);
CREATE TRIGGER trg_bn_appeal_rc_touch BEFORE UPDATE ON public.bn_appeal_remedy_config
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_child_touch_row();
GRANT ALL ON public.bn_appeal_remedy_config TO service_role;

------------------------------------------------------------
-- Explicitly revoke public / anon / authenticated access on new tables.
------------------------------------------------------------
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'bn_appeal_party','bn_appeal_issue','bn_appeal_deadline','bn_appeal_evidence_request',
    'bn_appeal_stay','bn_appeal_note','bn_appeal_hearing','bn_appeal_hearing_participant',
    'bn_appeal_recommendation','bn_appeal_decision','bn_appeal_decision_item',
    'bn_appeal_implementation_action','bn_appeal_link','bn_appeal_ground_config','bn_appeal_remedy_config'
  ])
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated, PUBLIC;', tbl);
  END LOOP;
END $$;