CREATE OR REPLACE FUNCTION public.ce_mobile_get_officer_context(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'user_id', p.id,
    'user_code', p.user_code,
    'full_name', p.full_name,
    'email', p.email,
    'role_name', ur.role,
    'role_id', r.id,
    'is_active', COALESCE(p.is_active, false),
    'territory', p.office_code
  )
  INTO v_result
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT role
    FROM public.user_roles
    WHERE user_id = p.id
    ORDER BY created_at ASC NULLS LAST, role ASC
    LIMIT 1
  ) ur ON true
  LEFT JOIN public.roles r ON r.role_name = ur.role
  WHERE p.id = p_user_id
  LIMIT 1;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;