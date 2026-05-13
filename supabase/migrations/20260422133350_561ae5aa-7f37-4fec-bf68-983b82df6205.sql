ALTER TYPE public.ce_comm_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE public.ce_comm_status ADD VALUE IF NOT EXISTS 'acknowledged';
ALTER TYPE public.ce_comm_status ADD VALUE IF NOT EXISTS 'responded';