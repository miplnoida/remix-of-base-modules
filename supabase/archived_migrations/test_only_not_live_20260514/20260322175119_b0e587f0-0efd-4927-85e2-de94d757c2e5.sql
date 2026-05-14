
-- 1. Create idempotent upsert_cn_payer RPC
CREATE OR REPLACE FUNCTION public.upsert_cn_payer(
  p_payer_type VARCHAR,
  p_payer_id VARCHAR,
  p_payer_name VARCHAR,
  p_email VARCHAR DEFAULT NULL,
  p_phone VARCHAR DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cn_payer (payer_id, payer_type, payer_name, email, phone, address, created_by, created_at)
  VALUES (p_payer_id, p_payer_type, p_payer_name, p_email, p_phone, p_address, p_created_by, now())
  ON CONFLICT (payer_id, payer_type) DO UPDATE
    SET payer_name = EXCLUDED.payer_name,
        email = COALESCE(EXCLUDED.email, cn_payer.email),
        phone = COALESCE(EXCLUDED.phone, cn_payer.phone),
        address = COALESCE(EXCLUDED.address, cn_payer.address);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_cn_payer TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_cn_payer TO anon;

-- 2. Update submit_ip_registration to auto-create cn_payer with payer_type='IP'
CREATE OR REPLACE FUNCTION public.submit_ip_registration(p_unique_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record record;
  v_new_ssn text;
  v_attempt int;
  v_rowcount int;
  v_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_record
  FROM public.ip_master
  WHERE unique_uuid = p_unique_uuid
  FOR UPDATE;

  IF v_record IS NULL THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  IF v_record.status IS DISTINCT FROM 'Z' THEN
    RAISE EXCEPTION 'Only draft registrations can be submitted';
  END IF;

  IF v_record.ssn IS NOT NULL AND v_record.ssn ~ '^[0-9]{6}$' THEN
    v_new_ssn := v_record.ssn;
  ELSE
    v_new_ssn := NULL;
  END IF;

  v_attempt := 0;
  LOOP
    v_attempt := v_attempt + 1;
    IF v_new_ssn IS NULL THEN
      v_new_ssn := public.generate_ip_ssn();
    END IF;
    BEGIN
      UPDATE public.ip_master
      SET ssn = v_new_ssn, status = 'P',
          submitted_by = auth.uid(), submitted_at = now(),
          updated_by = auth.uid(), updated_at = now()
      WHERE unique_uuid = p_unique_uuid;

      GET DIAGNOSTICS v_rowcount = ROW_COUNT;
      IF v_rowcount <> 1 THEN
        RAISE EXCEPTION 'Failed to update registration status';
      END IF;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        v_new_ssn := NULL;
        IF v_attempt >= 10 THEN
          RAISE EXCEPTION 'Unable to generate a unique SSN after % attempts', v_attempt;
        END IF;
    END;
  END LOOP;

  -- Auto-create cn_payer record for IP
  v_name := TRIM(BOTH FROM CONCAT(v_record.firstname, ' ', v_record.surname));
  PERFORM public.upsert_cn_payer('IP', v_new_ssn, v_name, v_record.email_addr, v_record.phone);

  RETURN jsonb_build_object(
    'success', true,
    'unique_uuid', p_unique_uuid::text,
    'ssn', v_new_ssn,
    'status', 'P'
  );
END;
$$;

-- 3. Update submit_er_registration to auto-create cn_payer with payer_type='ER'
CREATE OR REPLACE FUNCTION public.submit_er_registration(p_temp_regno text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_new_regno TEXT;
  v_attempt INT;
  v_rowcount INT;
BEGIN
  SELECT * INTO v_record
  FROM public.er_master
  WHERE regno = p_temp_regno
  FOR UPDATE;

  IF v_record IS NULL THEN
    RAISE EXCEPTION 'Employer registration not found';
  END IF;

  IF v_record.status IS DISTINCT FROM 'Z' THEN
    RAISE EXCEPTION 'Only draft registrations can be submitted';
  END IF;

  IF v_record.regno IS NOT NULL AND v_record.regno ~ '^[0-9]{6}$' THEN
    v_new_regno := v_record.regno;
  ELSE
    v_new_regno := NULL;
  END IF;

  v_attempt := 0;
  LOOP
    v_attempt := v_attempt + 1;
    IF v_new_regno IS NULL THEN
      v_new_regno := public.generate_er_regno();
    END IF;
    BEGIN
      UPDATE public.er_master
      SET regno = v_new_regno, status = 'P', date_modified = NOW()
      WHERE regno = p_temp_regno;

      GET DIAGNOSTICS v_rowcount = ROW_COUNT;
      IF v_rowcount <> 1 THEN
        RAISE EXCEPTION 'Failed to update registration status';
      END IF;

      UPDATE public.er_owner SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_locations SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_notes SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_commence SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_visit SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_suit SET regno = v_new_regno WHERE regno = p_temp_regno;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        v_new_regno := NULL;
        IF v_attempt >= 10 THEN
          RAISE EXCEPTION 'Unable to generate a unique registration number after % attempts', v_attempt;
        END IF;
    END;
  END LOOP;

  -- Auto-create cn_payer record for ER
  PERFORM public.upsert_cn_payer('ER', v_new_regno, v_record.name, v_record.email, v_record.phone);

  RETURN jsonb_build_object(
    'success', true,
    'old_regno', p_temp_regno,
    'new_regno', v_new_regno,
    'status', 'P'
  );
END;
$$;

-- 4. Update register_voluntary_contributor to auto-create cn_payer with payer_type='VC'
-- We need the full current function definition; we'll wrap the existing logic
CREATE OR REPLACE FUNCTION public.register_voluntary_contributor(
  p_ssn character varying,
  p_date_registered date,
  p_date_commenced date,
  p_payment_interval character varying,
  p_due_date date,
  p_user_code character varying DEFAULT NULL::character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eligibility JSONB;
  v_wage_calc JSONB;
  v_config RECORD;
  v_avg_weekly_wage NUMERIC(15,2);
  v_contrib_amt NUMERIC(15,2);
  v_name TEXT;
BEGIN
  v_eligibility := public.check_vc_eligibility(p_ssn);
  
  IF NOT (v_eligibility->>'eligible')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Eligibility check failed',
      'details', v_eligibility->'errors'
    );
  END IF;

  SELECT * INTO v_config
  FROM public.tb_vc_eligibility_config
  WHERE is_active = true
    AND effstart <= p_date_registered
    AND (effend IS NULL OR effend >= p_date_registered)
  ORDER BY effstart DESC
  LIMIT 1;

  v_wage_calc := public.calculate_vc_avg_weekly_wage(p_ssn, p_date_registered);
  v_avg_weekly_wage := (v_wage_calc->>'weekly_avg')::NUMERIC;
  v_contrib_amt := ROUND(v_avg_weekly_wage * v_config.vc_contrib_pct / 100, 2);

  UPDATE public.ip_master
  SET vol_contrib = 'Y', updated_at = NOW()
  WHERE ssn = p_ssn;

  INSERT INTO public.ip_vol_contrib (
    ssn, date_registered, date_commenced, date_ceased,
    contrib_amt, payment_interval, due_date, avg_weekly_wage
  ) VALUES (
    p_ssn, p_date_registered, p_date_commenced, NULL,
    v_contrib_amt, p_payment_interval, p_due_date, v_avg_weekly_wage
  )
  ON CONFLICT (ssn, date_registered) DO UPDATE SET
    date_commenced = EXCLUDED.date_commenced,
    contrib_amt = EXCLUDED.contrib_amt,
    payment_interval = EXCLUDED.payment_interval,
    due_date = EXCLUDED.due_date,
    avg_weekly_wage = EXCLUDED.avg_weekly_wage;

  -- Auto-create cn_payer record for VC
  SELECT TRIM(BOTH FROM CONCAT(im.firstname, ' ', im.surname)) INTO v_name
  FROM public.ip_master im WHERE im.ssn = p_ssn;

  PERFORM public.upsert_cn_payer('VC', p_ssn, COALESCE(v_name, ''));

  RETURN jsonb_build_object(
    'success', true,
    'ssn', p_ssn,
    'date_registered', p_date_registered,
    'date_commenced', p_date_commenced,
    'payment_interval', p_payment_interval,
    'avg_weekly_wage', v_avg_weekly_wage,
    'contrib_amt', v_contrib_amt,
    'wage_calculation', v_wage_calc
  );
END;
$$;

-- 5. Create trigger on ip_self_employ to auto-create cn_payer with payer_type='SE'
CREATE OR REPLACE FUNCTION public.fn_auto_create_se_payer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF NEW.ssn IS NOT NULL AND TRIM(NEW.ssn) <> '' THEN
    SELECT TRIM(BOTH FROM CONCAT(im.firstname, ' ', im.surname)) INTO v_name
    FROM public.ip_master im WHERE im.ssn = NEW.ssn;

    PERFORM public.upsert_cn_payer('SE', NEW.ssn, COALESCE(v_name, ''));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_se_payer ON public.ip_self_employ;
CREATE TRIGGER trg_auto_create_se_payer
  AFTER INSERT ON public.ip_self_employ
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_create_se_payer();

-- 6. Update resolve_entity_type to support AP
CREATE OR REPLACE FUNCTION public.resolve_entity_type(p_identifier text)
RETURNS TABLE(entity_type text, entity_id text, entity_name text, entity_status text)
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

  -- AP: lookup from cn_payer
  RETURN QUERY
  SELECT 'AP'::text, cp.payer_id::text, COALESCE(cp.payer_name, '')::text, 'A'::text
  FROM cn_payer cp
  WHERE cp.payer_id = p_identifier AND cp.payer_type = 'AP';

  RETURN;
END;
$$;

-- 7. Update validate_entity to support AP
CREATE OR REPLACE FUNCTION public.validate_entity(p_identifier text, p_expected_type text)
RETURNS TABLE(is_valid boolean, entity_name text, entity_status text, error_message text)
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
    WHEN 'AP' THEN
      SELECT cp.payer_name, 'A' INTO v_name, v_status
      FROM cn_payer cp WHERE cp.payer_id = p_identifier AND cp.payer_type = 'AP';
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
