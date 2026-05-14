
CREATE OR REPLACE FUNCTION public.bn_get_contribution_summary(
  p_ssn TEXT,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_weeks BIGINT,
  total_wages NUMERIC,
  avg_weekly_wages NUMERIC
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*)::BIGINT AS total_weeks,
    COALESCE(SUM(total_wages), 0) AS total_wages,
    COALESCE(AVG(total_wages), 0) AS avg_weekly_wages
  FROM public.ip_wages
  WHERE ssn = p_ssn
    AND (p_from_date IS NULL OR period >= p_from_date)
    AND (p_to_date IS NULL OR period <= p_to_date);
$$;
