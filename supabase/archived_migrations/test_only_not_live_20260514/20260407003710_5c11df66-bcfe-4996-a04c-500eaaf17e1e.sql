
-- Fix generate_temp_er_regno() to produce 6-char values fitting varchar(6)
CREATE OR REPLACE FUNCTION public.generate_temp_er_regno()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'T' || LPAD(nextval('er_temp_regno_seq')::TEXT, 5, '0');
END;
$$;

-- Widen er_notes columns to capture full data without truncation
ALTER TABLE public.er_notes ALTER COLUMN note TYPE varchar(500);
ALTER TABLE public.er_notes ALTER COLUMN user_id TYPE varchar(50);
