-- EPIC-06D Terminology Alignment: rename "Recovery Operations" → "Legal Recovery"
UPDATE public.app_modules SET display_name = 'Legal Recovery',        updated_at = now() WHERE id = '1e9a2000-0000-0000-0000-0000000000e0';
UPDATE public.app_modules SET display_name = 'Legal Recovery Assignments', updated_at = now() WHERE id = '1e9a2000-0000-0000-0000-0000000000e1';
UPDATE public.app_modules SET display_name = 'My Legal Recoveries',   updated_at = now() WHERE id = '1e9a2000-0000-0000-0000-0000000000e2';
UPDATE public.app_modules SET display_name = 'Team Legal Recoveries', updated_at = now() WHERE id = '1e9a2000-0000-0000-0000-0000000000e3';
UPDATE public.app_modules SET display_name = 'Legal Recovery Campaigns', updated_at = now() WHERE id = '1e9a2000-0000-0000-0000-0000000000e4';
UPDATE public.app_modules SET display_name = 'Legal Recovery Admin',  updated_at = now() WHERE id = '1e9a2000-0000-0000-0000-0000000000e5';