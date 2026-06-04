
ALTER TABLE public.bn_calc_legacy_snapshot
  ADD COLUMN IF NOT EXISTS bn_claim_id uuid,
  ADD COLUMN IF NOT EXISTS legacy_claim_number text,
  ADD COLUMN IF NOT EXISTS legacy_claim_seq integer,
  ADD COLUMN IF NOT EXISTS benefit_code text,
  ADD COLUMN IF NOT EXISTS legacy_amount numeric(18,2),
  ADD COLUMN IF NOT EXISTS bn_amount numeric(18,2),
  ADD COLUMN IF NOT EXISTS difference_amount numeric(18,2),
  ADD COLUMN IF NOT EXISTS difference_percent numeric(9,4),
  ADD COLUMN IF NOT EXISTS comparison_status text,
  ADD COLUMN IF NOT EXISTS comparison_notes text,
  ADD COLUMN IF NOT EXISTS raw_legacy_json jsonb,
  ADD COLUMN IF NOT EXISTS raw_bn_json jsonb,
  ADD COLUMN IF NOT EXISTS entered_by text,
  ADD COLUMN IF NOT EXISTS entered_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS modified_by text,
  ADD COLUMN IF NOT EXISTS modified_at timestamptz NOT NULL DEFAULT now();

-- Backfill bn_claim_id from existing claim_id where present
UPDATE public.bn_calc_legacy_snapshot SET bn_claim_id = claim_id WHERE bn_claim_id IS NULL AND claim_id IS NOT NULL;

-- Backfill raw_legacy_json from legacy_raw_output for legacy records
UPDATE public.bn_calc_legacy_snapshot SET raw_legacy_json = legacy_raw_output WHERE raw_legacy_json IS NULL AND legacy_raw_output IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bn_calc_legacy_snapshot_bn_claim_id
  ON public.bn_calc_legacy_snapshot(bn_claim_id);
CREATE INDEX IF NOT EXISTS idx_bn_calc_legacy_snapshot_legacy_claim
  ON public.bn_calc_legacy_snapshot(legacy_claim_number, legacy_claim_seq);

-- modified_at trigger
CREATE OR REPLACE FUNCTION public.bn_calc_legacy_snapshot_set_modified()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.modified_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bn_calc_legacy_snapshot_modified ON public.bn_calc_legacy_snapshot;
CREATE TRIGGER trg_bn_calc_legacy_snapshot_modified
  BEFORE UPDATE ON public.bn_calc_legacy_snapshot
  FOR EACH ROW EXECUTE FUNCTION public.bn_calc_legacy_snapshot_set_modified();

GRANT SELECT, INSERT, UPDATE ON public.bn_calc_legacy_snapshot TO authenticated;
GRANT ALL ON public.bn_calc_legacy_snapshot TO service_role;
