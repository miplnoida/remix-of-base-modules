-- Create tb_levy_slabs table
CREATE TABLE public.tb_levy_slabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(5) DEFAULT '',
  created_on TIMESTAMPTZ DEFAULT NOW(),
  modified_by VARCHAR(5) DEFAULT '',
  modified_on TIMESTAMPTZ DEFAULT NOW()
);

-- Create tb_levy_slab_details table
CREATE TABLE public.tb_levy_slab_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slab_id UUID NOT NULL REFERENCES public.tb_levy_slabs(id) ON DELETE CASCADE,
  pay_period VARCHAR(10),
  over_amt NUMERIC(18, 3),
  base_amt NUMERIC(18, 3),
  tax_rate NUMERIC(18, 3),
  order_no INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(5) DEFAULT '',
  created_on TIMESTAMPTZ DEFAULT NOW(),
  modified_by VARCHAR(5) DEFAULT '',
  modified_on TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tb_levy_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_levy_slab_details ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated read access on tb_levy_slabs"
  ON public.tb_levy_slabs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access on tb_levy_slab_details"
  ON public.tb_levy_slab_details FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on tb_levy_slabs"
  ON public.tb_levy_slabs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated insert on tb_levy_slab_details"
  ON public.tb_levy_slab_details FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on tb_levy_slabs"
  ON public.tb_levy_slabs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated update on tb_levy_slab_details"
  ON public.tb_levy_slab_details FOR UPDATE TO authenticated USING (true);

-- Create indexes
CREATE INDEX idx_levy_slabs_dates ON public.tb_levy_slabs(start_date, end_date);
CREATE INDEX idx_levy_slab_details_slab_id ON public.tb_levy_slab_details(slab_id);
CREATE INDEX idx_levy_slab_details_pay_period ON public.tb_levy_slab_details(pay_period);

-- Insert initial slab and details using a DO block
DO $$
DECLARE
  v_slab_id UUID;
BEGIN
  -- Insert the main slab record
  INSERT INTO public.tb_levy_slabs (start_date, end_date)
  VALUES ('2025-01-01', '2030-12-31')
  RETURNING id INTO v_slab_id;

  -- Insert all slab details
  INSERT INTO public.tb_levy_slab_details (slab_id, pay_period, over_amt, base_amt, tax_rate, order_no) VALUES
    (v_slab_id, '2M', 1126.680, 39.434, 0.035, 1),
    (v_slab_id, '2M', 6500.010, 227.500, 0.100, 2),
    (v_slab_id, '2M', 8000.010, 377.500, 0.120, 3),
    (v_slab_id, 'A', 27040.010, 946.400, 0.035, 1),
    (v_slab_id, 'E2W', 1040.010, 36.400, 0.035, 1),
    (v_slab_id, 'E2W', 6500.010, 227.500, 0.100, 2),
    (v_slab_id, 'E2W', 8000.010, 377.500, 0.120, 3),
    (v_slab_id, 'M', 2253.340, 78.867, 0.035, 1),
    (v_slab_id, 'M', 6500.010, 227.500, 0.100, 2),
    (v_slab_id, 'M', 8000.010, 377.500, 0.120, 3),
    (v_slab_id, 'W', 520.010, 18.200, 0.035, 1),
    (v_slab_id, 'W', 6500.010, 227.500, 0.100, 2),
    (v_slab_id, 'W', 8000.010, 377.500, 0.120, 3);
END $$;