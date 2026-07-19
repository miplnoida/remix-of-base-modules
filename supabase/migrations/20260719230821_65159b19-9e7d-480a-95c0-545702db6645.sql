
-- =========================================================================
-- Mortality corrective migration (additive; no drops of existing data).
-- =========================================================================

-- 1. Drop permissive policies -------------------------------------------------
DROP POLICY IF EXISTS "mortality_event read authenticated"      ON public.bn_mortality_event;
DROP POLICY IF EXISTS "mortality_event insert authenticated"    ON public.bn_mortality_event;
DROP POLICY IF EXISTS "mortality_event update authenticated"    ON public.bn_mortality_event;
DROP POLICY IF EXISTS "mortality_event delete authenticated"    ON public.bn_mortality_event;

DROP POLICY IF EXISTS "mortality_history read authenticated"    ON public.bn_mortality_event_history;
DROP POLICY IF EXISTS "mortality_history insert authenticated"  ON public.bn_mortality_event_history;

DROP POLICY IF EXISTS "mortality_impact read authenticated"     ON public.bn_mortality_award_impact;
DROP POLICY IF EXISTS "mortality_impact insert authenticated"   ON public.bn_mortality_award_impact;
DROP POLICY IF EXISTS "mortality_impact update authenticated"   ON public.bn_mortality_award_impact;
DROP POLICY IF EXISTS "mortality_impact delete authenticated"   ON public.bn_mortality_award_impact;

DROP POLICY IF EXISTS "mortality_referral read authenticated"   ON public.bn_mortality_referral;
DROP POLICY IF EXISTS "mortality_referral insert authenticated" ON public.bn_mortality_referral;
DROP POLICY IF EXISTS "mortality_referral update authenticated" ON public.bn_mortality_referral;
DROP POLICY IF EXISTS "mortality_referral delete authenticated" ON public.bn_mortality_referral;

-- 2. Disable RLS on all four tables (project-wide architecture policy) --------
ALTER TABLE public.bn_mortality_event         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bn_mortality_event_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bn_mortality_award_impact  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bn_mortality_referral      DISABLE ROW LEVEL SECURITY;

-- 3. Revoke write privileges from authenticated; retain SELECT ---------------
REVOKE INSERT, UPDATE, DELETE ON public.bn_mortality_event         FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bn_mortality_event_history FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bn_mortality_award_impact  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bn_mortality_referral      FROM authenticated;

GRANT  SELECT ON public.bn_mortality_event         TO authenticated;
GRANT  SELECT ON public.bn_mortality_event_history TO authenticated;
GRANT  SELECT ON public.bn_mortality_award_impact  TO authenticated;
GRANT  SELECT ON public.bn_mortality_referral      TO authenticated;

GRANT  ALL    ON public.bn_mortality_event         TO service_role;
GRANT  ALL    ON public.bn_mortality_event_history TO service_role;
GRANT  ALL    ON public.bn_mortality_award_impact  TO service_role;
GRANT  ALL    ON public.bn_mortality_referral      TO service_role;

REVOKE ALL ON public.bn_mortality_event         FROM anon;
REVOKE ALL ON public.bn_mortality_event_history FROM anon;
REVOKE ALL ON public.bn_mortality_award_impact  FROM anon;
REVOKE ALL ON public.bn_mortality_referral      FROM anon;

-- 4. Replace CASCADE FKs with RESTRICT so the audit chain cannot be nuked -----
ALTER TABLE public.bn_mortality_event_history
  DROP CONSTRAINT IF EXISTS bn_mortality_event_history_event_id_fkey;
ALTER TABLE public.bn_mortality_event_history
  ADD  CONSTRAINT bn_mortality_event_history_event_id_fkey
       FOREIGN KEY (event_id) REFERENCES public.bn_mortality_event(id) ON DELETE RESTRICT;

ALTER TABLE public.bn_mortality_award_impact
  DROP CONSTRAINT IF EXISTS bn_mortality_award_impact_event_id_fkey;
ALTER TABLE public.bn_mortality_award_impact
  ADD  CONSTRAINT bn_mortality_award_impact_event_id_fkey
       FOREIGN KEY (event_id) REFERENCES public.bn_mortality_event(id) ON DELETE RESTRICT;

ALTER TABLE public.bn_mortality_referral
  DROP CONSTRAINT IF EXISTS bn_mortality_referral_event_id_fkey;
ALTER TABLE public.bn_mortality_referral
  ADD  CONSTRAINT bn_mortality_referral_event_id_fkey
       FOREIGN KEY (event_id) REFERENCES public.bn_mortality_event(id) ON DELETE RESTRICT;

-- Self-reference for duplicate_of_event_id
ALTER TABLE public.bn_mortality_event
  DROP CONSTRAINT IF EXISTS bn_mortality_event_duplicate_of_fkey;
ALTER TABLE public.bn_mortality_event
  ADD  CONSTRAINT bn_mortality_event_duplicate_of_fkey
       FOREIGN KEY (duplicate_of_event_id) REFERENCES public.bn_mortality_event(id) ON DELETE RESTRICT;

ALTER TABLE public.bn_mortality_event
  DROP CONSTRAINT IF EXISTS bn_mortality_event_no_self_duplicate;
ALTER TABLE public.bn_mortality_event
  ADD  CONSTRAINT bn_mortality_event_no_self_duplicate
       CHECK (duplicate_of_event_id IS NULL OR duplicate_of_event_id <> id);

-- 5. Immutability guard for event_history + delete guard for event ------------
CREATE OR REPLACE FUNCTION public.bn_mortality_history_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'bn_mortality_event_history is append-only (blocked % on id=%)', TG_OP, COALESCE(OLD.id::text, NEW.id::text);
END;
$$;

DROP TRIGGER IF EXISTS tr_bn_mortality_history_no_update ON public.bn_mortality_event_history;
CREATE TRIGGER tr_bn_mortality_history_no_update
  BEFORE UPDATE ON public.bn_mortality_event_history
  FOR EACH ROW EXECUTE FUNCTION public.bn_mortality_history_immutable();

DROP TRIGGER IF EXISTS tr_bn_mortality_history_no_delete ON public.bn_mortality_event_history;
CREATE TRIGGER tr_bn_mortality_history_no_delete
  BEFORE DELETE ON public.bn_mortality_event_history
  FOR EACH ROW EXECUTE FUNCTION public.bn_mortality_history_immutable();

CREATE OR REPLACE FUNCTION public.bn_mortality_event_no_physical_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'bn_mortality_event cannot be physically deleted; transition to CANCELLED/DUPLICATE/REJECTED/REVERSED/CLOSED';
END;
$$;

DROP TRIGGER IF EXISTS tr_bn_mortality_event_no_delete ON public.bn_mortality_event;
CREATE TRIGGER tr_bn_mortality_event_no_delete
  BEFORE DELETE ON public.bn_mortality_event
  FOR EACH ROW EXECUTE FUNCTION public.bn_mortality_event_no_physical_delete();

-- 6. Add missing workflow columns (additive, nullable) ------------------------
ALTER TABLE public.bn_mortality_event
  ADD COLUMN IF NOT EXISTS assigned_to                  uuid,
  ADD COLUMN IF NOT EXISTS assigned_workbasket_id       uuid,
  ADD COLUMN IF NOT EXISTS reported_at                  timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_for_verification_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at                 timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at                 timestamptz,
  ADD COLUMN IF NOT EXISTS conflict_reason              text,
  ADD COLUMN IF NOT EXISTS reversal_reason              text,
  ADD COLUMN IF NOT EXISTS verification_source          text,
  ADD COLUMN IF NOT EXISTS verification_reference       text,
  ADD COLUMN IF NOT EXISTS verification_notes           text,
  ADD COLUMN IF NOT EXISTS metadata_json                jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.bn_mortality_award_impact
  ADD COLUMN IF NOT EXISTS original_award_status        text,
  ADD COLUMN IF NOT EXISTS original_award_amount        bigint,
  ADD COLUMN IF NOT EXISTS payment_frequency            text,
  ADD COLUMN IF NOT EXISTS hold_required                boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hold_status                  text    NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS hold_date                    date,
  ADD COLUMN IF NOT EXISTS termination_required         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS termination_status           text    NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS termination_effective_date   date,
  ADD COLUMN IF NOT EXISTS last_valid_payment_date      date,
  ADD COLUMN IF NOT EXISTS impact_decision              text    NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS impact_status                text    NOT NULL DEFAULT 'PENDING';

ALTER TABLE public.bn_mortality_referral
  ADD COLUMN IF NOT EXISTS target_reference             text,
  ADD COLUMN IF NOT EXISTS target_route                 text,
  ADD COLUMN IF NOT EXISTS referral_result              text,
  ADD COLUMN IF NOT EXISTS updated_by                   uuid;

-- 7. CHECK constraints aligned with the canonical state machine --------------
ALTER TABLE public.bn_mortality_event
  DROP CONSTRAINT IF EXISTS bn_mortality_event_status_ck;
ALTER TABLE public.bn_mortality_event
  ADD  CONSTRAINT bn_mortality_event_status_ck CHECK (status IN (
    'DRAFT','REPORTED','MATCHED','VERIFICATION_PENDING','PROVISIONALLY_HELD',
    'VERIFIED','IMPACT_REVIEW','APPROVAL_PENDING','CONFIRMED',
    'FOLLOW_ON_PROCESSING','COMPLETED','CLOSED',
    'DUPLICATE','REJECTED','CONFLICT','CANCELLED','REVERSED'
  ));

ALTER TABLE public.bn_mortality_event
  DROP CONSTRAINT IF EXISTS bn_mortality_event_source_ck;
ALTER TABLE public.bn_mortality_event
  ADD  CONSTRAINT bn_mortality_event_source_ck CHECK (source IN (
    'REGISTRAR_FEED','IP_MODULE','FAMILY_NOTIFICATION',
    'HOSPITAL_NOTICE','STAFF_ENTRY','OTHER'
  ));

ALTER TABLE public.bn_mortality_event
  DROP CONSTRAINT IF EXISTS bn_mortality_event_verification_confidence_ck;
ALTER TABLE public.bn_mortality_event
  ADD  CONSTRAINT bn_mortality_event_verification_confidence_ck CHECK (
    verification_confidence IS NULL OR verification_confidence IN
    ('UNVERIFIED','CORROBORATED','AUTHORITATIVE')
  );

ALTER TABLE public.bn_mortality_award_impact
  DROP CONSTRAINT IF EXISTS bn_mortality_award_impact_action_ck;
ALTER TABLE public.bn_mortality_award_impact
  ADD  CONSTRAINT bn_mortality_award_impact_action_ck CHECK (action IN (
    'NONE','HOLD','TERMINATE','PRORATE','PAD_RECOVERY','WRITE_OFF'
  ));

ALTER TABLE public.bn_mortality_award_impact
  DROP CONSTRAINT IF EXISTS bn_mortality_award_impact_approval_state_ck;
ALTER TABLE public.bn_mortality_award_impact
  ADD  CONSTRAINT bn_mortality_award_impact_approval_state_ck CHECK (approval_state IN (
    'PENDING','APPROVED','REJECTED','WITHDRAWN'
  ));

ALTER TABLE public.bn_mortality_award_impact
  DROP CONSTRAINT IF EXISTS bn_mortality_award_impact_decision_ck;
ALTER TABLE public.bn_mortality_award_impact
  ADD  CONSTRAINT bn_mortality_award_impact_decision_ck CHECK (impact_decision IN (
    'PENDING','HOLD_ONLY','TERMINATE','WRITE_OFF','RECOVER'
  ));

ALTER TABLE public.bn_mortality_award_impact
  DROP CONSTRAINT IF EXISTS bn_mortality_award_impact_status_ck;
ALTER TABLE public.bn_mortality_award_impact
  ADD  CONSTRAINT bn_mortality_award_impact_status_ck CHECK (impact_status IN (
    'PENDING','APPLIED','REVERSED','FAILED'
  ));

ALTER TABLE public.bn_mortality_award_impact
  DROP CONSTRAINT IF EXISTS bn_mortality_award_impact_hold_status_ck;
ALTER TABLE public.bn_mortality_award_impact
  ADD  CONSTRAINT bn_mortality_award_impact_hold_status_ck CHECK (hold_status IN (
    'NOT_REQUIRED','PENDING','APPLIED','RELEASED'
  ));

ALTER TABLE public.bn_mortality_award_impact
  DROP CONSTRAINT IF EXISTS bn_mortality_award_impact_termination_status_ck;
ALTER TABLE public.bn_mortality_award_impact
  ADD  CONSTRAINT bn_mortality_award_impact_termination_status_ck CHECK (termination_status IN (
    'NOT_REQUIRED','PENDING','APPLIED','REVERSED'
  ));

ALTER TABLE public.bn_mortality_referral
  DROP CONSTRAINT IF EXISTS bn_mortality_referral_type_ck;
ALTER TABLE public.bn_mortality_referral
  ADD  CONSTRAINT bn_mortality_referral_type_ck CHECK (referral_type IN (
    'SURVIVOR','FUNERAL','ESTATE','LEGAL','OVERPAYMENT','COMM_HUB'
  ));

ALTER TABLE public.bn_mortality_referral
  DROP CONSTRAINT IF EXISTS bn_mortality_referral_status_ck;
ALTER TABLE public.bn_mortality_referral
  ADD  CONSTRAINT bn_mortality_referral_status_ck CHECK (status IN (
    'PENDING','DISPATCHED','ACCEPTED','REJECTED','COMPLETED','CANCELLED'
  ));

-- 8. Row-version touch triggers already exist for event/impact/referral;
--    NONE on event_history (append-only). Verified via information_schema.
