
CREATE TABLE IF NOT EXISTS public.finance_master_crosswalk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_code  text NOT NULL,
  canonical_domain text NOT NULL,
  canonical_table  text NOT NULL,
  canonical_code   text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_table, source_code, canonical_table)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_master_crosswalk TO authenticated;
GRANT ALL ON public.finance_master_crosswalk TO service_role;

COMMENT ON TABLE public.finance_master_crosswalk IS
  'Non-destructive mapping between legacy Master Data finance/payment tables (tb_*) and canonical Financial Reference (ssp_*). Never a source of truth by itself.';
