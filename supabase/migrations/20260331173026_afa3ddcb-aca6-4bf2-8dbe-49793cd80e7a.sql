
-- Create office_ip_addresses table
CREATE TABLE public.office_ip_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code VARCHAR NOT NULL REFERENCES tb_office(code),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('single', 'range')),
  single_ip TEXT,
  range_start_ip TEXT,
  range_end_ip TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  entered_by VARCHAR,
  entered_at TIMESTAMPTZ DEFAULT now(),
  modified_by VARCHAR,
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- Create public_holidays table
CREATE TABLE public.public_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code VARCHAR NOT NULL REFERENCES tb_office(code),
  holiday_date DATE NOT NULL,
  holiday_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  entered_by VARCHAR,
  entered_at TIMESTAMPTZ DEFAULT now(),
  modified_by VARCHAR,
  modified_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(office_code, holiday_date)
);

-- Create resolve_office_by_ip RPC function
CREATE OR REPLACE FUNCTION public.resolve_office_by_ip(p_ip_address TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_office_code VARCHAR;
  v_office_desc VARCHAR;
  v_ip_parts TEXT[];
  v_ip_num BIGINT;
  v_start_parts TEXT[];
  v_end_parts TEXT[];
  v_start_num BIGINT;
  v_end_num BIGINT;
  v_rule RECORD;
BEGIN
  -- Parse client IP to numeric
  v_ip_parts := string_to_array(p_ip_address, '.');
  IF array_length(v_ip_parts, 1) != 4 THEN
    RETURN json_build_object('matched', false, 'reason', 'invalid_ip');
  END IF;
  v_ip_num := (v_ip_parts[1]::BIGINT * 16777216) + (v_ip_parts[2]::BIGINT * 65536) + (v_ip_parts[3]::BIGINT * 256) + v_ip_parts[4]::BIGINT;

  -- Check single IPs first
  SELECT oia.office_code, o.description
  INTO v_office_code, v_office_desc
  FROM office_ip_addresses oia
  JOIN tb_office o ON o.code = oia.office_code
  WHERE oia.is_active = true
    AND oia.rule_type = 'single'
    AND oia.single_ip = p_ip_address
  LIMIT 1;

  IF v_office_code IS NOT NULL THEN
    RETURN json_build_object('matched', true, 'office_code', v_office_code, 'office_description', v_office_desc);
  END IF;

  -- Check ranges
  FOR v_rule IN
    SELECT oia.office_code, oia.range_start_ip, oia.range_end_ip, o.description
    FROM office_ip_addresses oia
    JOIN tb_office o ON o.code = oia.office_code
    WHERE oia.is_active = true
      AND oia.rule_type = 'range'
      AND oia.range_start_ip IS NOT NULL
      AND oia.range_end_ip IS NOT NULL
  LOOP
    v_start_parts := string_to_array(v_rule.range_start_ip, '.');
    v_end_parts := string_to_array(v_rule.range_end_ip, '.');
    IF array_length(v_start_parts, 1) = 4 AND array_length(v_end_parts, 1) = 4 THEN
      v_start_num := (v_start_parts[1]::BIGINT * 16777216) + (v_start_parts[2]::BIGINT * 65536) + (v_start_parts[3]::BIGINT * 256) + v_start_parts[4]::BIGINT;
      v_end_num := (v_end_parts[1]::BIGINT * 16777216) + (v_end_parts[2]::BIGINT * 65536) + (v_end_parts[3]::BIGINT * 256) + v_end_parts[4]::BIGINT;
      IF v_ip_num >= v_start_num AND v_ip_num <= v_end_num THEN
        RETURN json_build_object('matched', true, 'office_code', v_rule.office_code, 'office_description', v_rule.description);
      END IF;
    END IF;
  END LOOP;

  RETURN json_build_object('matched', false);
END;
$$;
