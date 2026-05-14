
-- Add email and phone columns to tb_office
ALTER TABLE public.tb_office ADD COLUMN IF NOT EXISTS office_email VARCHAR(100);
ALTER TABLE public.tb_office ADD COLUMN IF NOT EXISTS office_phone VARCHAR(30);
