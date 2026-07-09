REVOKE EXECUTE ON FUNCTION public.send_communication_v1(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_communication_v1(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_communication_v1(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.send_communication_v1(jsonb) TO service_role;