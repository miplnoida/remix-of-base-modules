
-- Fix: Map ia_departments to tb_office using code (text), not UUID
ALTER TABLE public.ia_departments 
ADD COLUMN IF NOT EXISTS tb_office_code TEXT REFERENCES public.tb_office(code);

CREATE INDEX IF NOT EXISTS idx_ia_departments_tb_office_code ON public.ia_departments(tb_office_code);
