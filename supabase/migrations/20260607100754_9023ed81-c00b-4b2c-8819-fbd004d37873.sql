
-- 1. Office settings table
CREATE TABLE IF NOT EXISTS public.system_office_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code varchar(40) NOT NULL UNIQUE,
  office_name varchar(200) NOT NULL,
  department_name varchar(200),
  address_line_1 varchar(200),
  address_line_2 varchar(200),
  city varchar(100),
  state varchar(100),
  postal_code varchar(40),
  country varchar(100) DEFAULT 'Saint Kitts and Nevis',
  phone varchar(60),
  email varchar(200),
  logo_url text,
  signature_block text,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(50),
  updated_by varchar(50)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_office_settings TO authenticated;
GRANT ALL ON public.system_office_settings TO service_role;

-- 2. Reference sequence table
CREATE TABLE IF NOT EXISTS public.system_reference_sequence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code varchar(40) NOT NULL,
  module_code varchar(40) NOT NULL,
  document_type varchar(60) NOT NULL,
  prefix_pattern varchar(120) NOT NULL DEFAULT '{MODULE}/{DOC_TYPE}/{YYYY}/{SEQ}',
  current_number bigint NOT NULL DEFAULT 0,
  padding int NOT NULL DEFAULT 6,
  financial_year int NOT NULL DEFAULT date_part('year', now())::int,
  active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_reference_sequence_unique UNIQUE (module_code, department_code, document_type, financial_year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_reference_sequence TO authenticated;
GRANT ALL ON public.system_reference_sequence TO service_role;

-- 3. Atomic next-number function
CREATE OR REPLACE FUNCTION public.next_reference_number(
  p_module_code varchar,
  p_department_code varchar,
  p_document_type varchar,
  p_financial_year int DEFAULT NULL
) RETURNS TABLE(reference_number text, sequence_id uuid, current_number bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fy int := COALESCE(p_financial_year, date_part('year', now())::int);
  v_row public.system_reference_sequence%ROWTYPE;
  v_formatted text;
BEGIN
  -- Auto-create sequence if missing (still allows admin to update padding/pattern later)
  UPDATE public.system_reference_sequence
     SET current_number = current_number + 1,
         updated_at = now()
   WHERE module_code = p_module_code
     AND department_code = p_department_code
     AND document_type = p_document_type
     AND financial_year = v_fy
     AND active = true
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    INSERT INTO public.system_reference_sequence
      (department_code, module_code, document_type, financial_year, current_number)
    VALUES (p_department_code, p_module_code, p_document_type, v_fy, 1)
    ON CONFLICT (module_code, department_code, document_type, financial_year)
    DO UPDATE SET current_number = system_reference_sequence.current_number + 1,
                  updated_at = now()
    RETURNING * INTO v_row;
  END IF;

  v_formatted := replace(v_row.prefix_pattern, '{MODULE}', v_row.module_code);
  v_formatted := replace(v_formatted, '{DEPT}', v_row.department_code);
  v_formatted := replace(v_formatted, '{DOC_TYPE}', v_row.document_type);
  v_formatted := replace(v_formatted, '{YYYY}', v_row.financial_year::text);
  v_formatted := replace(v_formatted, '{SEQ}', lpad(v_row.current_number::text, v_row.padding, '0'));

  reference_number := v_formatted;
  sequence_id := v_row.id;
  current_number := v_row.current_number;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_reference_number(varchar,varchar,varchar,int) TO authenticated, service_role;

-- 4. Extend bn_letter
ALTER TABLE public.bn_letter
  ADD COLUMN IF NOT EXISTS reference_number varchar(80),
  ADD COLUMN IF NOT EXISTS department_code varchar(40),
  ADD COLUMN IF NOT EXISTS document_type varchar(60),
  ADD COLUMN IF NOT EXISTS issued_by_office uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bn_letter_reference_number
  ON public.bn_letter(reference_number) WHERE reference_number IS NOT NULL;
