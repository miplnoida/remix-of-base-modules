-- Fix ip_notes foreign key to cascade on SSN update
ALTER TABLE public.ip_notes DROP CONSTRAINT IF EXISTS fk_ip_notes_ssn;

ALTER TABLE public.ip_notes 
ADD CONSTRAINT fk_ip_notes_ssn 
FOREIGN KEY (ssn) REFERENCES ip_master(ssn) 
ON UPDATE CASCADE 
ON DELETE CASCADE;