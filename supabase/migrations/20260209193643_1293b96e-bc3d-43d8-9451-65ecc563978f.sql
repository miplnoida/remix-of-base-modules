
-- Create ip_self_category if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ip_self_category (
    ssn varchar(6) NOT NULL,
    self_ref_no varchar(6) NOT NULL,
    activity_seq_no varchar(6) NOT NULL,
    effective_start_date timestamp(3) NOT NULL,
    effective_end_date timestamp(3),
    wage_category numeric(10,2),
    PRIMARY KEY (ssn, self_ref_no, activity_seq_no, effective_start_date)
);

ALTER TABLE public.ip_self_category ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ip_self_category' AND policyname = 'Allow all access to ip_self_category') THEN
    CREATE POLICY "Allow all access to ip_self_category" ON public.ip_self_category FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
