-- Add linked_module column to api_settings table for linking APIs to specific modules
ALTER TABLE public.api_settings 
ADD COLUMN linked_module TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.api_settings.linked_module IS 'The module key this API is linked to (e.g., insured-person-applications, employer-applications, doctor-applications)';