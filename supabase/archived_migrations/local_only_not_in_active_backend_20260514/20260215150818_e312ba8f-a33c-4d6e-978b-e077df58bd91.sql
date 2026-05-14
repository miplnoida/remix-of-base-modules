
-- 1. Add second_middle_name to ip_master
ALTER TABLE public.ip_master ADD COLUMN IF NOT EXISTS second_middle_name varchar(25) NULL;

-- 2. Add employer fields to ip_master
ALTER TABLE public.ip_master ADD COLUMN IF NOT EXISTS employer_name varchar(50) NULL;
ALTER TABLE public.ip_master ADD COLUMN IF NOT EXISTS employer_address varchar(200) NULL;
ALTER TABLE public.ip_master ADD COLUMN IF NOT EXISTS employer_phone varchar(10) NULL;
ALTER TABLE public.ip_master ADD COLUMN IF NOT EXISTS employer_town varchar(50) NULL;

-- 3. Widen ip_depend address fields from varchar(30) to varchar(50)
ALTER TABLE public.ip_depend ALTER COLUMN depend_addr1 TYPE varchar(50);
ALTER TABLE public.ip_depend ALTER COLUMN depend_addr2 TYPE varchar(50);
