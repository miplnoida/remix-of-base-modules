
CREATE OR REPLACE FUNCTION public.comm_hub_normalize_recipient_set(p_to jsonb, p_cc jsonb, p_bcc jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_to  jsonb;
  v_cc  jsonb;
  v_bcc jsonb;
  v_hash text;
  v_norm text;
BEGIN
  SELECT coalesce(jsonb_agg(distinct lower(trim(x)) ORDER BY lower(trim(x))), '[]'::jsonb)
    INTO v_to FROM jsonb_array_elements_text(coalesce(p_to,'[]'::jsonb)) x WHERE trim(x) <> '';
  SELECT coalesce(jsonb_agg(distinct lower(trim(x)) ORDER BY lower(trim(x))), '[]'::jsonb)
    INTO v_cc FROM jsonb_array_elements_text(coalesce(p_cc,'[]'::jsonb)) x WHERE trim(x) <> '';
  SELECT coalesce(jsonb_agg(distinct lower(trim(x)) ORDER BY lower(trim(x))), '[]'::jsonb)
    INTO v_bcc FROM jsonb_array_elements_text(coalesce(p_bcc,'[]'::jsonb)) x WHERE trim(x) <> '';
  v_norm := 'TO:'||coalesce(v_to::text,'[]')||'|CC:'||coalesce(v_cc::text,'[]')||'|BCC:'||coalesce(v_bcc::text,'[]');
  v_hash := md5(v_norm);
  RETURN jsonb_build_object(
    'to', v_to, 'cc', v_cc, 'bcc', v_bcc,
    'hash', v_hash,
    'recipient_set_hash', v_hash
  );
END;
$function$;
