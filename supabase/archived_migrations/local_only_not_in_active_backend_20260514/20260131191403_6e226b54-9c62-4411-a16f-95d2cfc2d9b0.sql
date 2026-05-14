-- Allow ip_wages.posting_status to store 3-character workflow statuses
ALTER TABLE public.ip_wages
  ALTER COLUMN posting_status TYPE varchar(3)
  USING posting_status::varchar(3);

-- Replace legacy-only status constraint
ALTER TABLE public.ip_wages
  DROP CONSTRAINT IF EXISTS ip_wages_posting_status_check;

-- Migrate existing legacy statuses to the 3-character codes
UPDATE public.ip_wages
SET posting_status = CASE posting_status
  WHEN 'Z' THEN 'DFT'
  WHEN 'P' THEN 'PEN'
  WHEN 'V' THEN 'VAC'
  WHEN 'D' THEN 'DEL'
  ELSE posting_status
END
WHERE posting_status IN ('Z','P','V','D');

-- Enforce the new status set (allow NULLs)
ALTER TABLE public.ip_wages
  ADD CONSTRAINT ip_wages_posting_status_check
  CHECK (posting_status IS NULL OR posting_status IN ('DFT','PEN','VAC','REJ','DEL'));
