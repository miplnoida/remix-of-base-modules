-- Allow standalone audit-communication events (e.g. pre-visit intimation
-- exception recorded before any communication exists) by making
-- communication_id nullable. The FK remains and continues to enforce
-- referential integrity when a communication_id IS supplied.
ALTER TABLE public.ce_audit_communication_events
  ALTER COLUMN communication_id DROP NOT NULL;

-- Helpful partial index for querying standalone (visit-level) events.
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_events_standalone
  ON public.ce_audit_communication_events (event_type, created_at DESC)
  WHERE communication_id IS NULL;