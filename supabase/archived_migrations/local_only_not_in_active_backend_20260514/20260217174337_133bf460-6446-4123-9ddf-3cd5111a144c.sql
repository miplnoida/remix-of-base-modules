
-- Add contact_person_name column
ALTER TABLE public.meetings ADD COLUMN contact_person_name character varying(255);

-- Backfill existing records from profiles
UPDATE public.meetings m
SET contact_person_name = p.full_name
FROM public.profiles p
WHERE m.contact_person IS NOT NULL
  AND m.contact_person = p.user_code;

-- Create trigger function to auto-populate contact_person_name
CREATE OR REPLACE FUNCTION public.set_meeting_contact_person_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_person IS NOT NULL AND (
    TG_OP = 'INSERT' OR OLD.contact_person IS DISTINCT FROM NEW.contact_person
  ) THEN
    SELECT full_name INTO NEW.contact_person_name
    FROM public.profiles
    WHERE user_code = NEW.contact_person
    LIMIT 1;
  END IF;
  
  IF NEW.contact_person IS NULL THEN
    NEW.contact_person_name := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
CREATE TRIGGER trg_set_meeting_contact_person_name
BEFORE INSERT OR UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.set_meeting_contact_person_name();
