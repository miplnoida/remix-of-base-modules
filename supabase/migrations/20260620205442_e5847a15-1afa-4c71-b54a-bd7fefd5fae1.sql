
CREATE OR REPLACE FUNCTION public.core_resolve_template(
  p_code text,
  p_country text DEFAULT 'KN'
)
RETURNS public.core_template
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.*
  FROM public.core_template t
  WHERE t.code = p_code
    AND t.is_active = true
    AND (
      (t.scope = 'COUNTRY' AND t.country_code = p_country)
      OR t.scope = 'GLOBAL'
    )
  ORDER BY CASE WHEN t.scope = 'COUNTRY' THEN 0 ELSE 1 END
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.core_resolve_template(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.core_resolve_template_version(
  p_code text,
  p_country text DEFAULT 'KN'
)
RETURNS public.core_template_version
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tpl public.core_template;
  v_ver public.core_template_version;
BEGIN
  SELECT * INTO v_tpl FROM public.core_resolve_template(p_code, p_country);
  IF v_tpl.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Try chosen template's active version
  IF v_tpl.active_version_id IS NOT NULL THEN
    SELECT * INTO v_ver FROM public.core_template_version
      WHERE id = v_tpl.active_version_id;
    IF v_ver.id IS NOT NULL THEN
      RETURN v_ver;
    END IF;
  END IF;

  -- Fall back to parent GLOBAL template's active version
  IF v_tpl.parent_template_id IS NOT NULL THEN
    SELECT v.* INTO v_ver
      FROM public.core_template_version v
      JOIN public.core_template p ON p.id = v_tpl.parent_template_id
     WHERE v.id = p.active_version_id;
    RETURN v_ver;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.core_resolve_template_version(text, text) TO authenticated, service_role;
