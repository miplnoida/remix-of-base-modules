REVOKE ALL ON FUNCTION public.begin_comm_hub_dry_run(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.begin_comm_hub_dry_run(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.begin_comm_hub_dry_run(jsonb) TO service_role;