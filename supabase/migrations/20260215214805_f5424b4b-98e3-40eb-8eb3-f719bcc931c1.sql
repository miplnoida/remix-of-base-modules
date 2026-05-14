
-- Fix 1: Widen eye_color column from varchar(3) to varchar(10) to accommodate codes like "Black", "Brown", "Green"
ALTER TABLE public.ip_master ALTER COLUMN eye_color TYPE character varying(10);

-- Fix 2: Also widen eyecolor column if it exists with same constraint
ALTER TABLE public.ip_master ALTER COLUMN eyecolor TYPE character varying(10);

-- Fix 3: Fix the check_ip_duplicates function - cast columns to match declared return types
CREATE OR REPLACE FUNCTION public.check_ip_duplicates(
  p_first_name text, 
  p_last_name text, 
  p_dob date, 
  p_gender text, 
  p_exclude_uuid uuid DEFAULT NULL::uuid
)
RETURNS TABLE(id uuid, ssn text, full_name text, date_of_birth date, gender text, match_score integer)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    im.id,
    im.ssn::text,
    CONCAT(im.first_name, ' ', COALESCE(im.middle_name, ''), ' ', im.last_name)::text as full_name,
    im.date_of_birth,
    im.gender::text,
    (
      CASE WHEN LOWER(im.first_name) = LOWER(p_first_name) THEN 30 ELSE 0 END +
      CASE WHEN LOWER(im.last_name) = LOWER(p_last_name) THEN 30 ELSE 0 END +
      CASE WHEN im.date_of_birth = p_dob THEN 25 ELSE 0 END +
      CASE WHEN LOWER(im.gender) = LOWER(p_gender) THEN 15 ELSE 0 END
    ) as match_score
  FROM ip_master im
  WHERE im.unique_uuid != COALESCE(p_exclude_uuid, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      (LOWER(im.first_name) = LOWER(p_first_name) AND LOWER(im.last_name) = LOWER(p_last_name))
      OR (im.date_of_birth = p_dob AND LOWER(im.gender) = LOWER(p_gender))
    )
  ORDER BY match_score DESC
  LIMIT 10;
END;
$function$;
