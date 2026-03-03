
-- IP Card Configuration table
CREATE TABLE public.ip_card_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_validity_years integer NOT NULL DEFAULT 10,
  date_source text NOT NULL DEFAULT 'registered_date' CHECK (date_source IN ('registered_date', 'card_print_date')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

-- Insert default config row
INSERT INTO public.ip_card_config (card_validity_years, date_source, is_active)
VALUES (10, 'registered_date', true);

-- RPC: process_ready_to_print_card
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
  -- 1. Fetch IP record
  SELECT * INTO v_record FROM ip_master WHERE unique_uuid = p_unique_uuid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insured person not found');
  END IF;

  -- 2. Validate status is V
  IF v_record.status <> 'V' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insured person status must be Verified (V) to print card. Current status: ' || v_record.status);
  END IF;

  -- 3. Fetch active config
  SELECT * INTO v_config FROM ip_card_config WHERE is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'IP Card configuration not found. Please configure card settings in Admin.');
  END IF;

  -- 4. Determine perm_card_date based on config
  IF v_config.date_source = 'registered_date' THEN
    IF v_record.registration_date IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Registration date is not set for this insured person.');
    END IF;
    v_perm_card_date := v_record.registration_date::date;
  ELSE
    -- card_print_date = current server date
    v_perm_card_date := CURRENT_DATE;
  END IF;

  -- 5. Calculate card_expiration
  v_card_expiration := v_perm_card_date + (v_config.card_validity_years || ' years')::interval;

  -- 6. Update ip_master
  UPDATE ip_master
  SET status = 'A',
      perm_card_date = v_perm_card_date::text,
      card_expiration = v_card_expiration::text,
      date_modified = now()::text
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
