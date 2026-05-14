
CREATE OR REPLACE FUNCTION public.bn_get_contribution_summary(
  p_ssn TEXT,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (total_weeks BIGINT, total_wages NUMERIC, avg_weekly_wages NUMERIC)
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(total_wages), 0),
    CASE WHEN COUNT(*) > 0 THEN ROUND(COALESCE(SUM(total_wages), 0) / COUNT(*), 2) ELSE 0 END
  FROM public.ip_wages
  WHERE ssn = p_ssn
    AND (p_from_date IS NULL OR period >= p_from_date)
    AND (p_to_date IS NULL OR period <= p_to_date);
$$;
