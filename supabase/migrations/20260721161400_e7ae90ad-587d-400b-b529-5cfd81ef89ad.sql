ALTER FUNCTION public.begin_comm_hub_controlled_live(jsonb)
  SET search_path = public, extensions;

ALTER FUNCTION public.comm_hub_controlled_live_scope_hash(uuid, text, text, text, text, uuid, uuid)
  SET search_path = public, extensions;