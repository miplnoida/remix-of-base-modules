
-- Normalize Legal Cases country code to SSB canonical "SKN" (St. Christopher and Nevis)
-- and make sure legal references and courts are reachable from the wizard.
UPDATE public.lg_case SET country_code = 'SKN' WHERE country_code IS NULL OR country_code = 'KN' OR country_code = '';
UPDATE public.lg_court SET country_code = 'SKN' WHERE country_code IS NULL OR country_code = 'KN' OR country_code = '';

-- Remove the harness row left from earlier diagnostics, if any.
DELETE FROM public.lg_case WHERE lg_case_no = 'LG-TEST-001';
