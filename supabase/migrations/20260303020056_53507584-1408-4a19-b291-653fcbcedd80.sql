CREATE OR REPLACE FUNCTION public.process_ready_to_print_card(p_unique_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_config RECORD;
  v_perm_card_date date;
  v_card_expiration date;
BEGIN
  SELECT * INTO v_record FROM ip_master WHERE unique_uuid = p_unique_uuid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insured person not found');
  END IF;

  IF v_record.status <> 'V' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insured person status must be Verified (V) to print card. Current status: ' || v_record.status);
  END IF;

  SELECT * INTO v_config FROM ip_card_config WHERE is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'IP Card configuration not found. Please configure card settings in Admin.');
  END IF;

  IF v_config.date_source = 'registered_date' THEN
    IF v_record.registration_date IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Registration date is not set for this insured person.');
    END IF;
    v_perm_card_date := v_record.registration_date;
  ELSE
    v_perm_card_date := CURRENT_DATE;
  END IF;

  v_card_expiration := v_perm_card_date + (v_config.card_validity_years || ' years')::interval;

  UPDATE ip_master
  SET status = 'A',
      perm_card_date = v_perm_card_date,
      card_expiration = v_card_expiration,
      date_modified = now()
  WHERE unique_uuid = p_unique_uuid;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Card ready. Status updated to Active.',
    'perm_card_date', v_perm_card_date,
    'card_expiration', v_card_expiration,
    'date_source', v_config.date_source,
    'validity_years', v_config.card_validity_years
  );
END;
$$;