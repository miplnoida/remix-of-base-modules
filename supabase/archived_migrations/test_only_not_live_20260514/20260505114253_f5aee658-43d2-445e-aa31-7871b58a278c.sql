
-- 1. Trigger: keep ia_departments name/office_code synced with master
CREATE OR REPLACE FUNCTION public.ia_departments_sync_from_master()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source_department_id IS NOT NULL THEN
    SELECT m.name, m.office_code
      INTO NEW.name, NEW.office_code
      FROM public.tb_office_departments m
     WHERE m.id = NEW.source_department_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ia_departments_sync_from_master ON public.ia_departments;
CREATE TRIGGER trg_ia_departments_sync_from_master
BEFORE INSERT OR UPDATE OF source_department_id ON public.ia_departments
FOR EACH ROW EXECUTE FUNCTION public.ia_departments_sync_from_master();

-- 2. Backfill existing rows from master
UPDATE public.ia_departments d
   SET name = m.name,
       office_code = m.office_code
  FROM public.tb_office_departments m
 WHERE d.source_department_id = m.id
   AND (d.name IS DISTINCT FROM m.name OR d.office_code IS DISTINCT FROM m.office_code);

-- 3. Unified view exposing the combined display label
CREATE OR REPLACE VIEW public.v_ia_departments AS
SELECT
  d.id,
  d.source_department_id,
  COALESCE(m.office_code, d.office_code)                AS office_code,
  COALESCE(m.name, d.name)                              AS name,
  COALESCE(m.name, d.name)
    || COALESCE(' (' || NULLIF(COALESCE(m.office_code, d.office_code), '') || ')', '') AS display_label,
  d.head,
  d.head_profile_id,
  d.email,
  d.phone,
  d.location,
  d.risk_rating,
  d.is_active,
  COALESCE(m.is_active, true)                           AS master_active,
  d.created_at,
  d.created_by,
  d.updated_at,
  d.updated_by,
  d.tb_office_code
FROM public.ia_departments d
LEFT JOIN public.tb_office_departments m ON m.id = d.source_department_id;

GRANT SELECT ON public.v_ia_departments TO anon, authenticated;

-- 4. Helper function returning the display label for a given ia_department id
CREATE OR REPLACE FUNCTION public.fn_ia_department_label(p_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT display_label FROM public.v_ia_departments WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION public.fn_ia_department_label(uuid) TO anon, authenticated;
