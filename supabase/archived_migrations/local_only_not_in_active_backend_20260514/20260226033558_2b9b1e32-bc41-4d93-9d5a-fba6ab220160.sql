-- Add bonus and holiday metadata columns to ip_wages
ALTER TABLE public.ip_wages 
  ADD COLUMN IF NOT EXISTS bonus_date date,
  ADD COLUMN IF NOT EXISTS bonus_exempt_levy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS holiday_start_date date,
  ADD COLUMN IF NOT EXISTS holiday_end_date date;