
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
  -- Check Employer (er_master.regno)
  RETURN QUERY
  SELECT 
    'ER'::text AS entity_type,
    em.regno::text AS entity_id,
    em.name::text AS entity_name,
    em.status::text AS entity_status
  FROM er_master em
  WHERE em.regno = p_identifier;

  -- Check Insured Person (ip_master.ssn)
  RETURN QUERY
  SELECT 
    CASE WHEN im.vol_contrib = 'Y' THEN 'IP_VC'::text ELSE 'IP'::text END AS entity_type,
    im.ssn::text AS entity_id,
    COALESCE(TRIM(BOTH FROM CONCAT(im.firstname, ' ', im.surname)), '')::text AS entity_name,
    im.status::text AS entity_status
  FROM ip_master im
  WHERE im.ssn = p_identifier;

  -- Check Self-Employed (ip_self_employ.self_ref_no)
  RETURN QUERY
  SELECT 
    'SE'::text AS entity_type,
    se.self_ref_no::text AS entity_id,
    COALESCE(
      (SELECT TRIM(BOTH FROM CONCAT(im2.firstname, ' ', im2.surname)) FROM ip_master im2 WHERE im2.ssn = se.ssn),
      ''
    )::text AS entity_name,
    se.status::text AS entity_status
  FROM ip_self_employ se
  WHERE se.self_ref_no = p_identifier;

  RETURN;
END;
$$;

-- Specific check: Is this an Employer?
CREATE OR REPLACE FUNCTION public.is_employer(p_regno text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM er_master WHERE regno = p_regno);
$$;

-- Specific check: Is this an Insured Person?
CREATE OR REPLACE FUNCTION public.is_insured_person(p_ssn text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM ip_master WHERE ssn = p_ssn);
$$;

-- Specific check: Is this a Self-Employed person?
CREATE OR REPLACE FUNCTION public.is_self_employed(p_self_ref_no text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM ip_self_employ WHERE self_ref_no = p_self_ref_no);
$$;

-- Specific check: Is this a Voluntary Contributor?
CREATE OR REPLACE FUNCTION public.is_voluntary_contributor(p_ssn text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM ip_master WHERE ssn = p_ssn AND vol_contrib = 'Y');
$$;

-- Validate entity: confirm identifier belongs to expected type
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
      WHERE se.self_ref_no = p_identifier;
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
