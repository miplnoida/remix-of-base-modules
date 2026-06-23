
-- Link legal cases with the court master configuration
ALTER TABLE public.lg_case
  ADD COLUMN IF NOT EXISTS court_code VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS court_division_code VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS court_venue_code VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS presiding_officer_code VARCHAR(40) NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lg_case_court_code_fkey') THEN
    ALTER TABLE public.lg_case
      ADD CONSTRAINT lg_case_court_code_fkey FOREIGN KEY (court_code)
      REFERENCES public.lg_court(court_code) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lg_case_court_division_code_fkey') THEN
    ALTER TABLE public.lg_case
      ADD CONSTRAINT lg_case_court_division_code_fkey FOREIGN KEY (court_division_code)
      REFERENCES public.lg_court_division(division_code) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lg_case_court_venue_code_fkey') THEN
    ALTER TABLE public.lg_case
      ADD CONSTRAINT lg_case_court_venue_code_fkey FOREIGN KEY (court_venue_code)
      REFERENCES public.lg_court_venue(venue_code) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lg_case_presiding_officer_code_fkey') THEN
    ALTER TABLE public.lg_case
      ADD CONSTRAINT lg_case_presiding_officer_code_fkey FOREIGN KEY (presiding_officer_code)
      REFERENCES public.lg_court_officer(officer_code) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lg_case_court_code ON public.lg_case(court_code);
CREATE INDEX IF NOT EXISTS idx_lg_case_court_division_code ON public.lg_case(court_division_code);
CREATE INDEX IF NOT EXISTS idx_lg_case_court_venue_code ON public.lg_case(court_venue_code);

-- Sync court_name from selected court for backward compatibility
CREATE OR REPLACE FUNCTION public.lg_case_sync_court_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF NEW.court_code IS NOT NULL AND (NEW.court_name IS NULL OR NEW.court_name = '' OR
      (TG_OP = 'UPDATE' AND NEW.court_code IS DISTINCT FROM OLD.court_code)) THEN
    SELECT court_name INTO v_name FROM public.lg_court WHERE court_code = NEW.court_code;
    IF v_name IS NOT NULL THEN
      NEW.court_name := v_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lg_case_sync_court_name ON public.lg_case;
CREATE TRIGGER trg_lg_case_sync_court_name
BEFORE INSERT OR UPDATE OF court_code, court_name ON public.lg_case
FOR EACH ROW EXECUTE FUNCTION public.lg_case_sync_court_name();
