-- Update resolve_entity_type: SE lookup by ssn instead of self_ref_no
CREATE OR REPLACE FUNCTION public.resolve_entity_type(p_identifier text)
RETURNS TABLE(
  entity_type text,
  entity_id text,
  entity_name text,
  entity_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 'ER'::text, em.regno::text, em.name::text, em.status::text
  FROM er_master em WHERE em.regno = p_identifier;

  RETURN QUERY
  SELECT 
    CASE WHEN im.vol_contrib = 'Y' THEN 'IP_VC'::text ELSE 'IP'::text END,
    im.ssn::text,
    COALESCE(TRIM(BOTH FROM CONCAT(im.firstname, ' ', im.surname)), '')::text,
    im.status::text
  FROM ip_master im WHERE im.ssn = p_identifier;

  RETURN QUERY
  SELECT DISTINCT 'SE'::text, se.ssn::text,
    COALESCE(
      (SELECT TRIM(BOTH FROM CONCAT(im2.firstname, ' ', im2.surname)) FROM ip_master im2 WHERE im2.ssn = se.ssn),
      ''
    )::text,
    se.status::text
  FROM ip_self_employ se
  WHERE se.ssn = p_identifier
    AND se.ssn IS NOT NULL
    AND TRIM(se.ssn) <> '';

  RETURN;
END;
$$;

-- Update validate_entity: SE case uses ssn
CREATE OR REPLACE FUNCTION public.validate_entity(p_identifier text, p_expected_type text)
RETURNS TABLE(
  is_valid boolean,
  entity_name text,
  entity_status text,
  error_message text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_status text;
  v_found boolean := false;
BEGIN
  CASE UPPER(p_expected_type)
    WHEN 'ER' THEN
      SELECT em.name, em.status INTO v_name, v_status
      FROM er_master em WHERE em.regno = p_identifier;
      v_found := FOUND;
    WHEN 'IP' THEN
      SELECT TRIM(BOTH FROM CONCAT(im.firstname, ' ', im.surname)), im.status INTO v_name, v_status
      FROM ip_master im WHERE im.ssn = p_identifier;
      v_found := FOUND;
    WHEN 'SE' THEN
      SELECT TRIM(BOTH FROM CONCAT(im2.firstname, ' ', im2.surname)), se.status INTO v_name, v_status
      FROM ip_self_employ se
      LEFT JOIN ip_master im2 ON im2.ssn = se.ssn
      WHERE se.ssn = p_identifier
        AND se.ssn IS NOT NULL
        AND TRIM(se.ssn) <> ''
      LIMIT 1;
      v_found := FOUND;
    WHEN 'VC' THEN
      SELECT TRIM(BOTH FROM CONCAT(im.firstname, ' ', im.surname)), im.status INTO v_name, v_status
      FROM ip_master im WHERE im.ssn = p_identifier AND im.vol_contrib = 'Y';
      v_found := FOUND;
    ELSE
      RETURN QUERY SELECT false, ''::text, ''::text, ('Unknown entity type: ' || p_expected_type)::text;
      RETURN;
  END CASE;

  IF v_found THEN
    RETURN QUERY SELECT true, COALESCE(v_name, '')::text, COALESCE(v_status, '')::text, NULL::text;
  ELSE
    RETURN QUERY SELECT false, ''::text, ''::text, 
      ('No ' || p_expected_type || ' found with identifier: ' || p_identifier)::text;
  END IF;
  RETURN;
END;
$$;