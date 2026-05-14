CREATE OR REPLACE FUNCTION public.generate_meeting_reference()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_ref TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(meeting_reference FROM 10 FOR 6) AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM meetings
  WHERE meeting_reference LIKE 'MTG-' || v_year || '-%';
  
  v_ref := 'MTG-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  
  RETURN v_ref;
END;
$$;