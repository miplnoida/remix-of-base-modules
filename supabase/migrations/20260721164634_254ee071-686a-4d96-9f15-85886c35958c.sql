
-- Fill configuration_version and recipient_policy_version at snapshot creation
CREATE OR REPLACE FUNCTION public.comm_hub_preview_snapshot_bind_versions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.configuration_version IS NULL THEN
    SELECT configuration_version INTO NEW.configuration_version
      FROM public.communication_hub_control_settings
      WHERE singleton_guard = 'primary';
  END IF;
  IF NEW.recipient_policy_version IS NULL THEN
    SELECT policy_version INTO NEW.recipient_policy_version
      FROM public.communication_hub_recipient_policy
      WHERE singleton_guard = 'primary';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comm_hub_preview_snapshot_bind_versions
  ON public.communication_preview_snapshot;

CREATE TRIGGER trg_comm_hub_preview_snapshot_bind_versions
BEFORE INSERT ON public.communication_preview_snapshot
FOR EACH ROW
EXECUTE FUNCTION public.comm_hub_preview_snapshot_bind_versions();

-- Backfill live PREPARED snapshots so operators do not have to Refresh Preview.
UPDATE public.communication_preview_snapshot s
   SET configuration_version = COALESCE(
         s.configuration_version,
         (SELECT configuration_version FROM public.communication_hub_control_settings WHERE singleton_guard='primary')
       ),
       recipient_policy_version = COALESCE(
         s.recipient_policy_version,
         (SELECT policy_version FROM public.communication_hub_recipient_policy WHERE singleton_guard='primary')
       )
 WHERE s.status = 'PREPARED'
   AND (s.configuration_version IS NULL OR s.recipient_policy_version IS NULL);
