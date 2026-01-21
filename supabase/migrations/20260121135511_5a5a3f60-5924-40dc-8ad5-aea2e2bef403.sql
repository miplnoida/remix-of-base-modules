-- Drop the existing foreign key constraint
ALTER TABLE public.ip_depend DROP CONSTRAINT IF EXISTS fk_ip_depend_ssn;

-- Re-add with ON UPDATE CASCADE so when ip_master.ssn changes, ip_depend.ssn follows
ALTER TABLE public.ip_depend 
ADD CONSTRAINT fk_ip_depend_ssn 
FOREIGN KEY (ssn) REFERENCES ip_master(ssn) 
ON UPDATE CASCADE 
ON DELETE CASCADE;