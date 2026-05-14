-- Create master table for Risk Categories used by /audit/risk-assessment
CREATE TABLE IF NOT EXISTS public.ia_risk_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  name_norm     text GENERATED ALWAYS AS (lower(btrim(name))) STORED,
  description   text,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    varchar(50),
  updated_by    varchar(50),
  source_screen text
);

-- DB-level case-insensitive uniqueness => safe under concurrent inserts
CREATE UNIQUE INDEX IF NOT EXISTS ia_risk_categories_name_norm_uniq
  ON public.ia_risk_categories (name_norm) WHERE is_active = true;

-- Seed: existing distinct values from assessments + original hardcoded list
INSERT INTO public.ia_risk_categories (name, created_by, updated_by, source_screen)
SELECT v, 'SEED-SYSTEM', 'SEED-SYSTEM', 'audit/risk-assessment'
FROM (VALUES
  ('Operational'),('Financial'),('Compliance'),('IT'),('Strategic'),('Reputational'),
  ('Data Integrity'),('Governance'),('People'),('Procurement'),('Technology')
) AS s(v)
ON CONFLICT (name_norm) WHERE is_active = true DO NOTHING;

-- Enable realtime so newly created rows appear in all open sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.ia_risk_categories;