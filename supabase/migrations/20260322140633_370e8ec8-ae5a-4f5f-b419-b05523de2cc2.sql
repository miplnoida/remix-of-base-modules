
-- preview_payment_allocation: Dry-run allocation for both C3 and Invoice payment flows
-- Returns a JSONB array of allocation lines showing how methods map to components
CREATE OR REPLACE FUNCTION public.preview_payment_allocation(
  p_mode TEXT,           -- 'c3' or 'invoice'
  p_components JSONB,    -- For c3: [{payment_code, fund_code, amount}], for invoice: ignored (fetched from invoice lines)
  p_methods JSONB,       -- [{mop_code, currency_code, original_amount}]
  p_invoice_ids INTEGER[] DEFAULT NULL  -- For invoice mode only
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comp_arr JSONB[];
  v_meth_arr JSONB[];
  v_base_currency TEXT;
  v_method_currency TEXT;
  v_method_rate NUMERIC;
  v_meth JSONB;
  v_line RECORD;
  v_comp_idx INTEGER;
  v_meth_idx INTEGER;
  v_comp_remaining NUMERIC;
  v_meth_remaining NUMERIC;
  v_alloc NUMERIC;
  v_result JSONB := '[]'::jsonb;
BEGIN
  -- Resolve base currency
  SELECT currency_code INTO v_base_currency
  FROM public.tb_currencies
  WHERE is_main_currency = true AND is_active = true
  LIMIT 1;
  IF v_base_currency IS NULL THEN
    RAISE EXCEPTION 'No active main currency configured';
  END IF;

  -- Build component array
  v_comp_arr := ARRAY[]::jsonb[];

  IF p_mode = 'c3' THEN
    -- Use provided components directly
    FOR v_line IN SELECT * FROM jsonb_to_recordset(p_components)
      AS x(payment_code text, fund_code text, amount numeric, sort_order int)
      ORDER BY COALESCE(sort_order, 0)
    LOOP
      v_comp_arr := v_comp_arr || jsonb_build_object(
        'payment_code', v_line.payment_code,
        'fund_code', COALESCE(v_line.fund_code, ''),
        'amount', v_line.amount,
        'description', COALESCE(
          (SELECT payment_type_description FROM public.tb_payment_type WHERE payment_code = v_line.payment_code LIMIT 1),
          v_line.payment_code
        )
      );
    END LOOP;
  ELSIF p_mode = 'invoice' THEN
    -- Fetch from invoice lines
    IF p_invoice_ids IS NULL OR array_length(p_invoice_ids, 1) IS NULL THEN
      RAISE EXCEPTION 'invoice_ids required for invoice mode';
    END IF;
    FOR v_line IN
      SELECT il.payment_code, COALESCE(pt.fund_code, '') AS fund_code,
             il.amount_base AS amount,
             COALESCE(pt.payment_type_description, il.payment_code) AS description
      FROM public.cn_invoice_lines il
      LEFT JOIN public.tb_payment_type pt ON pt.payment_code = il.payment_code
      WHERE il.invoice_id = ANY(p_invoice_ids)
      ORDER BY il.invoice_id, COALESCE(il.sort_order, 0)
    LOOP
      v_comp_arr := v_comp_arr || jsonb_build_object(
        'payment_code', v_line.payment_code,
        'fund_code', v_line.fund_code,
        'amount', v_line.amount,
        'description', v_line.description
      );
    END LOOP;
  ELSE
    RAISE EXCEPTION 'Invalid mode: %. Use c3 or invoice.', p_mode;
  END IF;

  IF array_length(v_comp_arr, 1) IS NULL OR array_length(v_comp_arr, 1) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Build method array with server-side rates
  v_meth_arr := ARRAY[]::jsonb[];
  FOR v_meth IN SELECT * FROM jsonb_array_elements(p_methods)
  LOOP
    v_method_currency := COALESCE(v_meth->>'currency_code', v_base_currency);
    SELECT exchange_rate INTO v_method_rate
    FROM public.tb_currencies
    WHERE currency_code = v_method_currency AND is_active = true
    LIMIT 1;
    IF v_method_rate IS NULL THEN
      RAISE EXCEPTION 'Currency "%" not found or inactive', v_method_currency;
    END IF;

    v_meth_arr := v_meth_arr || jsonb_build_object(
      'mop_code', v_meth->>'mop_code',
      'mop_desc', COALESCE(
        (SELECT short_description FROM public.tb_method_of_payment WHERE mop_code = v_meth->>'mop_code' LIMIT 1),
        v_meth->>'mop_code'
      ),
      'currency_code', v_method_currency,
      'original_amount', (v_meth->>'original_amount')::numeric,
      'exchange_rate', v_method_rate,
      'base_amount', ROUND((v_meth->>'original_amount')::numeric * v_method_rate, 2)
    );
  END LOOP;

  IF array_length(v_meth_arr, 1) IS NULL OR array_length(v_meth_arr, 1) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Sequential allocation (identical to create_c3_payment_with_receipt / pay_invoices_with_receipt)
  v_comp_idx := 1;
  v_meth_idx := 1;
  v_comp_remaining := (v_comp_arr[1]->>'amount')::numeric;
  v_meth_remaining := (v_meth_arr[1]->>'base_amount')::numeric;

  WHILE v_comp_idx <= array_length(v_comp_arr, 1) AND v_meth_idx <= array_length(v_meth_arr, 1)
  LOOP
    v_alloc := LEAST(v_comp_remaining, v_meth_remaining);

    IF v_alloc > 0 THEN
      v_result := v_result || jsonb_build_object(
        'component', v_comp_arr[v_comp_idx]->>'description',
        'payment_code', v_comp_arr[v_comp_idx]->>'payment_code',
        'fund_code', v_comp_arr[v_comp_idx]->>'fund_code',
        'method', v_meth_arr[v_meth_idx]->>'mop_desc',
        'mop_code', v_meth_arr[v_meth_idx]->>'mop_code',
        'allocated_amount', v_alloc,
        'currency', v_base_currency
      );
    END IF;

    v_comp_remaining := v_comp_remaining - v_alloc;
    v_meth_remaining := v_meth_remaining - v_alloc;

    IF v_comp_remaining <= 0 THEN
      v_comp_idx := v_comp_idx + 1;
      IF v_comp_idx <= array_length(v_comp_arr, 1) THEN
        v_comp_remaining := (v_comp_arr[v_comp_idx]->>'amount')::numeric;
      END IF;
    END IF;

    IF v_meth_remaining <= 0 THEN
      v_meth_idx := v_meth_idx + 1;
      IF v_meth_idx <= array_length(v_meth_arr, 1) THEN
        v_meth_remaining := (v_meth_arr[v_meth_idx]->>'base_amount')::numeric;
      END IF;
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;
