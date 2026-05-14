
ALTER TABLE public.workflow_meeting_departments
  ADD CONSTRAINT workflow_meeting_departments_office_code_fkey
  FOREIGN KEY (office_code) REFERENCES public.tb_office(code);
