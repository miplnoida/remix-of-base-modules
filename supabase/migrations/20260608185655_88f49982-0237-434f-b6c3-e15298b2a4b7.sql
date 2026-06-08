
ALTER TABLE public.bn_eligibility_rule
  ADD COLUMN IF NOT EXISTS statutory_basis text,
  ADD COLUMN IF NOT EXISTS legislative_reference text,
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_section text,
  ADD COLUMN IF NOT EXISTS source_document text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS confidence_status varchar(40) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date,
  ADD COLUMN IF NOT EXISTS configured_by varchar(50),
  ADD COLUMN IF NOT EXISTS approved_by varchar(50),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bn_eligibility_rule_confidence_chk') THEN
    ALTER TABLE public.bn_eligibility_rule
      ADD CONSTRAINT bn_eligibility_rule_confidence_chk
      CHECK (confidence_status IN ('CONFIRMED','NEEDS_LEGAL_CONFIRMATION','DRAFT'));
  END IF;
END $$;

ALTER TABLE public.bn_rule_catalogue
  ADD COLUMN IF NOT EXISTS statutory_basis text,
  ADD COLUMN IF NOT EXISTS legislative_reference text,
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_section text,
  ADD COLUMN IF NOT EXISTS source_document text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS confidence_status varchar(40) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS approved_by varchar(50),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bn_rule_catalogue_confidence_chk') THEN
    ALTER TABLE public.bn_rule_catalogue
      ADD CONSTRAINT bn_rule_catalogue_confidence_chk
      CHECK (confidence_status IN ('CONFIRMED','NEEDS_LEGAL_CONFIRMATION','DRAFT'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bn_eligibility_rule_confidence ON public.bn_eligibility_rule(confidence_status);
CREATE INDEX IF NOT EXISTS idx_bn_rule_catalogue_confidence ON public.bn_rule_catalogue(confidence_status);
