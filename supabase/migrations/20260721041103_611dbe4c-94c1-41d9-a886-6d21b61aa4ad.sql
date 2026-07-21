
CREATE OR REPLACE FUNCTION public.comm_hub_dry_run_scope_hash(
  p_actor uuid, p_module text, p_event text, p_channel text,
  p_snapshot uuid, p_recipient_hash text
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(sha256(convert_to(
    coalesce(p_actor::text,'') || '|' || coalesce(p_module,'') || '|' ||
    coalesce(p_event,'') || '|' || coalesce(p_channel,'') || '|' ||
    coalesce(p_snapshot::text,'') || '|' || coalesce(p_recipient_hash,''),
    'UTF8')), 'hex')
$$;
