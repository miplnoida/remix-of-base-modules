
-- Trigger to force preview snapshot recipient_set_hash to match comm_hub_normalize_recipient_set
CREATE OR REPLACE FUNCTION public.comm_hub_snapshot_align_recipient_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_norm jsonb;
BEGIN
  v_norm := public.comm_hub_normalize_recipient_set(
    COALESCE(NEW.to_recipients, '[]'::jsonb),
    COALESCE(NEW.cc_recipients, '[]'::jsonb),
    COALESCE(NEW.bcc_recipients, '[]'::jsonb)
  );
  NEW.recipient_set_hash := v_norm->>'recipient_set_hash';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comm_hub_snapshot_align_recipient_hash
  ON public.communication_preview_snapshot;

CREATE TRIGGER trg_comm_hub_snapshot_align_recipient_hash
BEFORE INSERT ON public.communication_preview_snapshot
FOR EACH ROW
EXECUTE FUNCTION public.comm_hub_snapshot_align_recipient_hash();

-- Backfill existing PREPARED snapshots so operators don't need to regenerate.
UPDATE public.communication_preview_snapshot s
   SET recipient_set_hash = (
         public.comm_hub_normalize_recipient_set(
           COALESCE(s.to_recipients, '[]'::jsonb),
           COALESCE(s.cc_recipients, '[]'::jsonb),
           COALESCE(s.bcc_recipients, '[]'::jsonb)
         )->>'recipient_set_hash'
       )
 WHERE status = 'PREPARED';
