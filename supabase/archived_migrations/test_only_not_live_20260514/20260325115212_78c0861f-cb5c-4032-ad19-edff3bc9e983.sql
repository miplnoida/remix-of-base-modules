CREATE OR REPLACE FUNCTION public.get_c3_records_filtered(
  p_payer_type text DEFAULT NULL,
  p_payer_id text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_entered_by text DEFAULT NULL,
  p_verified_by text DEFAULT NULL,
  p_period_month integer DEFAULT NULL,
  p_period_year integer DEFAULT NULL,
  p_date_received text DEFAULT NULL,
  p_date_entered text DEFAULT NULL,
  p_schedule_no integer DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25,
  p_exclude_deleted boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset integer;
  v_result json;
  v_total bigint;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  SELECT count(*) INTO v_total
  FROM cn_c3_reported c
  WHERE
    (p_payer_type IS NULL OR c.payer_type = p_payer_type)
    AND (p_payer_id IS NULL OR c.payer_id ILIKE '%' || p_payer_id || '%')
    AND (
      (p_status IS NOT NULL AND c.posting_status = p_status)
      OR
      (p_status IS NULL AND c.posting_status IN ('DFT', 'PEN'))
    )
    AND (p_entered_by IS NULL OR c.entered_by = p_entered_by)
    AND (p_verified_by IS NULL OR c.verified_by = p_verified_by)
    AND (p_period_month IS NULL OR EXTRACT(MONTH FROM c.period) = p_period_month)
    AND (p_period_year IS NULL OR EXTRACT(YEAR FROM c.period) = p_period_year)
    AND (p_date_received IS NULL OR c.date_received::date = p_date_received::date)
    AND (p_date_entered IS NULL OR c.date_entered::date = p_date_entered::date)
    AND (p_schedule_no IS NULL OR c.sequence_no = p_schedule_no)
    AND (
      p_exclude_deleted = false
      OR (c.posting_status IS DISTINCT FROM 'DEL' AND c.posting_status IS DISTINCT FROM 'D')
    );

  SELECT json_build_object(
    'data', COALESCE((
      SELECT json_agg(row_to_json(r))
      FROM (
        SELECT c.*
        FROM cn_c3_reported c
        WHERE
          (p_payer_type IS NULL OR c.payer_type = p_payer_type)
          AND (p_payer_id IS NULL OR c.payer_id ILIKE '%' || p_payer_id || '%')
          AND (
            (p_status IS NOT NULL AND c.posting_status = p_status)
            OR
            (p_status IS NULL AND c.posting_status IN ('DFT', 'PEN'))
          )
          AND (p_entered_by IS NULL OR c.entered_by = p_entered_by)
          AND (p_verified_by IS NULL OR c.verified_by = p_verified_by)
          AND (p_period_month IS NULL OR EXTRACT(MONTH FROM c.period) = p_period_month)
          AND (p_period_year IS NULL OR EXTRACT(YEAR FROM c.period) = p_period_year)
          AND (p_date_received IS NULL OR c.date_received::date = p_date_received::date)
          AND (p_date_entered IS NULL OR c.date_entered::date = p_date_entered::date)
          AND (p_schedule_no IS NULL OR c.sequence_no = p_schedule_no)
          AND (
            p_exclude_deleted = false
            OR (c.posting_status IS DISTINCT FROM 'DEL' AND c.posting_status IS DISTINCT FROM 'D')
          )
        ORDER BY c.period DESC, c.date_entered DESC
        LIMIT p_page_size OFFSET v_offset
      ) r
    ), '[]'::json),
    'total', v_total
  ) INTO v_result;

  RETURN v_result;
END;
$$;