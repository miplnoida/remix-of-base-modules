
-- Swap wages_paid6 <-> wages_paid7 and paid_code6 <-> paid_code7 in ip_wages
-- to correct the mapping: wages_paid6 = Holiday Pay, wages_paid7 = Bonus Pay
-- This is safe and idempotent via the guard column check.

-- Add a guard column to prevent re-running the swap
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ip_wages' AND column_name = 'bonus_holiday_swapped'
  ) THEN
    ALTER TABLE public.ip_wages ADD COLUMN bonus_holiday_swapped BOOLEAN DEFAULT false;

    -- Perform the swap on all existing rows
    UPDATE public.ip_wages
    SET
      wages_paid6 = wages_paid7,
      wages_paid7 = wages_paid6,
      paid_code6 = paid_code7,
      paid_code7 = paid_code6,
      bonus_holiday_swapped = true;
  END IF;
END $$;

-- Add a comment for documentation
COMMENT ON COLUMN public.ip_wages.wages_paid6 IS 'Holiday Pay amount';
COMMENT ON COLUMN public.ip_wages.wages_paid7 IS 'Bonus Pay amount';
COMMENT ON COLUMN public.ip_wages.paid_code6 IS 'Holiday Pay paid code (1=paid, 0=not)';
COMMENT ON COLUMN public.ip_wages.paid_code7 IS 'Bonus Pay paid code (1=paid, 0=not)';
