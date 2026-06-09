
ALTER TABLE public.bn_rule_catalogue
  ADD COLUMN IF NOT EXISTS governance_status      VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS legal_reference        TEXT,
  ADD COLUMN IF NOT EXISTS legal_notes            TEXT,
  ADD COLUMN IF NOT EXISTS jurisdiction_country   VARCHAR(10),
  ADD COLUMN IF NOT EXISTS effective_date         DATE,
  ADD COLUMN IF NOT EXISTS legal_approver_comment TEXT,
  ADD COLUMN IF NOT EXISTS legal_approved_by      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS legal_approved_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS technical_validated_by VARCHAR(50),
  ADD COLUMN IF NOT EXISTS technical_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS governance_updated_by  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS governance_updated_at  TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bn_rule_catalogue_governance_status_chk') THEN
    ALTER TABLE public.bn_rule_catalogue
      ADD CONSTRAINT bn_rule_catalogue_governance_status_chk
      CHECK (governance_status IN (
        'DRAFT','TECHNICAL_REVIEW','LEGAL_REVIEW','LEGAL_CONFIRMED',
        'READY_FOR_PRODUCT_USE','ACTIVE','RETIRED'
      ));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_bn_rule_catalogue_governance_status
  ON public.bn_rule_catalogue(governance_status);

UPDATE public.bn_rule_catalogue
SET governance_status = 'ACTIVE',
    legal_notes       = COALESCE(legal_notes, 'Backfilled from legacy status'),
    legal_approved_at = COALESCE(legal_approved_at, now()),
    legal_approved_by = COALESCE(legal_approved_by, 'SYSTEM-BACKFILL'),
    governance_updated_by = 'SYSTEM-BACKFILL',
    governance_updated_at = now()
WHERE governance_status = 'DRAFT'
  AND rule_status = 'PUBLISHED';

UPDATE public.bn_rule_catalogue
SET governance_status = 'READY_FOR_PRODUCT_USE',
    governance_updated_by = 'SYSTEM-BACKFILL',
    governance_updated_at = now()
WHERE governance_status = 'DRAFT'
  AND rule_status = 'READY';

UPDATE public.bn_rule_catalogue
SET governance_status = 'RETIRED',
    governance_updated_by = 'SYSTEM-BACKFILL',
    governance_updated_at = now()
WHERE governance_status = 'DRAFT'
  AND rule_status = 'RETIRED';
