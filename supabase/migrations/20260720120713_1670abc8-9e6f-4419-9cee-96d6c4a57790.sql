
-- =============================================================================
-- BN-AP-00 — Appeals & Disputes: security baseline, canonical route and menu
-- =============================================================================
-- 1) Revoke direct browser access to every bn_appeal* aggregate table.
-- 2) Replace ON DELETE CASCADE with RESTRICT on all child FKs to preserve
--    audit and decision chains.
-- 3) Block physical deletion of bn_appeal.
-- 4) Make bn_appeal_event append-only.
-- 5) Make bn_appeal_decision_snapshot immutable after insert.
-- 6) Row-version + modified_at controlled through a trigger, not the client.
-- 7) Prevent duplicate active appeals per (claim, appeal_type_code).
-- 8) Reparent bn_appeals under bn_operations, canonicalise the route,
--    set actions_enabled=false (staff commands not yet implemented) and
--    rollout_state='internal_pilot'. Claimant submission remains reachable
--    through its dedicated ownership-controlled edge function which does
--    NOT gate on actions_enabled.
-- 9) Extend bn_gap_idempotency with payload_hash for replay-mismatch detection.
-- =============================================================================

-- 1. Revoke direct browser access ---------------------------------------------
DO $mig$
DECLARE
  t text;
  tables text[] := ARRAY[
    'bn_appeal',
    'bn_appeal_ground',
    'bn_appeal_evidence',
    'bn_appeal_event',
    'bn_appeal_hearing_link',
    'bn_appeal_decision_snapshot'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', t);
    EXECUTE format('GRANT ALL  ON public.%I TO service_role', t);
  END LOOP;
END $mig$;

-- 2. Replace CASCADE with RESTRICT on child FKs -------------------------------
ALTER TABLE public.bn_appeal_decision_snapshot
  DROP CONSTRAINT IF EXISTS bn_appeal_decision_snapshot_appeal_id_fkey;
ALTER TABLE public.bn_appeal_decision_snapshot
  ADD CONSTRAINT bn_appeal_decision_snapshot_appeal_id_fkey
  FOREIGN KEY (appeal_id) REFERENCES public.bn_appeal(id) ON DELETE RESTRICT;

ALTER TABLE public.bn_appeal_event
  DROP CONSTRAINT IF EXISTS bn_appeal_event_appeal_id_fkey;
ALTER TABLE public.bn_appeal_event
  ADD CONSTRAINT bn_appeal_event_appeal_id_fkey
  FOREIGN KEY (appeal_id) REFERENCES public.bn_appeal(id) ON DELETE RESTRICT;

ALTER TABLE public.bn_appeal_evidence
  DROP CONSTRAINT IF EXISTS bn_appeal_evidence_appeal_id_fkey;
ALTER TABLE public.bn_appeal_evidence
  ADD CONSTRAINT bn_appeal_evidence_appeal_id_fkey
  FOREIGN KEY (appeal_id) REFERENCES public.bn_appeal(id) ON DELETE RESTRICT;

ALTER TABLE public.bn_appeal_ground
  DROP CONSTRAINT IF EXISTS bn_appeal_ground_appeal_id_fkey;
ALTER TABLE public.bn_appeal_ground
  ADD CONSTRAINT bn_appeal_ground_appeal_id_fkey
  FOREIGN KEY (appeal_id) REFERENCES public.bn_appeal(id) ON DELETE RESTRICT;

ALTER TABLE public.bn_appeal_hearing_link
  DROP CONSTRAINT IF EXISTS bn_appeal_hearing_link_appeal_id_fkey;
ALTER TABLE public.bn_appeal_hearing_link
  ADD CONSTRAINT bn_appeal_hearing_link_appeal_id_fkey
  FOREIGN KEY (appeal_id) REFERENCES public.bn_appeal(id) ON DELETE RESTRICT;

-- 3. Block physical DELETE on bn_appeal ---------------------------------------
CREATE OR REPLACE FUNCTION public.bn_appeal_prevent_delete()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'BN_APPEAL_DELETE_FORBIDDEN: appeals must be closed or withdrawn, not deleted'
    USING ERRCODE = '42501';
END;
$fn$;

DROP TRIGGER IF EXISTS bn_appeal_no_delete ON public.bn_appeal;
CREATE TRIGGER bn_appeal_no_delete
  BEFORE DELETE ON public.bn_appeal
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_prevent_delete();

-- 4. Append-only bn_appeal_event ---------------------------------------------
CREATE OR REPLACE FUNCTION public.bn_appeal_event_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'BN_APPEAL_EVENT_APPEND_ONLY: bn_appeal_event is immutable audit history'
    USING ERRCODE = '42501';
END;
$fn$;

DROP TRIGGER IF EXISTS bn_appeal_event_no_update ON public.bn_appeal_event;
CREATE TRIGGER bn_appeal_event_no_update
  BEFORE UPDATE ON public.bn_appeal_event
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_event_append_only();

DROP TRIGGER IF EXISTS bn_appeal_event_no_delete ON public.bn_appeal_event;
CREATE TRIGGER bn_appeal_event_no_delete
  BEFORE DELETE ON public.bn_appeal_event
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_event_append_only();

-- 5. Immutable bn_appeal_decision_snapshot ------------------------------------
CREATE OR REPLACE FUNCTION public.bn_appeal_decision_snapshot_immutable()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'BN_APPEAL_DECISION_SNAPSHOT_IMMUTABLE: the disputed decision snapshot is immutable'
    USING ERRCODE = '42501';
END;
$fn$;

DROP TRIGGER IF EXISTS bn_appeal_decision_snapshot_no_update ON public.bn_appeal_decision_snapshot;
CREATE TRIGGER bn_appeal_decision_snapshot_no_update
  BEFORE UPDATE ON public.bn_appeal_decision_snapshot
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_decision_snapshot_immutable();

DROP TRIGGER IF EXISTS bn_appeal_decision_snapshot_no_delete ON public.bn_appeal_decision_snapshot;
CREATE TRIGGER bn_appeal_decision_snapshot_no_delete
  BEFORE DELETE ON public.bn_appeal_decision_snapshot
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_decision_snapshot_immutable();

-- 6. Row-version + modified_at trigger on bn_appeal ---------------------------
CREATE OR REPLACE FUNCTION public.bn_appeal_row_version_touch()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.row_version := COALESCE(OLD.row_version, 0) + 1;
  NEW.modified_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS bn_appeal_row_version ON public.bn_appeal;
CREATE TRIGGER bn_appeal_row_version
  BEFORE UPDATE ON public.bn_appeal
  FOR EACH ROW EXECUTE FUNCTION public.bn_appeal_row_version_touch();

-- 7. Prevent duplicate active appeal per (claim, appeal_type) -----------------
CREATE UNIQUE INDEX IF NOT EXISTS ux_bn_appeal_active_per_claim_type
  ON public.bn_appeal (bn_claim_id, appeal_type_code)
  WHERE bn_claim_id IS NOT NULL
    AND status NOT IN ('WITHDRAWN','CLOSED','INADMISSIBLE');

-- 8. Canonical route + menu placement + rollout gating ------------------------
UPDATE public.app_modules
   SET parent_id      = 'b72990ca-ff29-434c-8655-104621ba3a5e', -- bn_operations
       route          = '/bn/appeals',
       actions_enabled= false,
       rollout_state  = 'internal_pilot',
       show_in_menu   = true,
       is_enabled     = true,
       icon           = COALESCE(NULLIF(icon, ''), 'Gavel'),
       sort_order     = 40,
       updated_at     = now()
 WHERE name = 'bn_appeals';

-- 9. Extend gap idempotency with payload_hash ---------------------------------
ALTER TABLE public.bn_gap_idempotency
  ADD COLUMN IF NOT EXISTS payload_hash text;
