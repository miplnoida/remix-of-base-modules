
-- Move "Compliance Geography" under Settings, rename to "Geography"
UPDATE app_modules 
SET parent_id = 'ca000000-0000-0000-0000-000000000100',
    display_name = 'Geography',
    sort_order = 20,
    updated_at = now()
WHERE id = 'ca000000-0000-0000-0000-000000000120';

-- Move "Compliance Staff" under Settings, rename to "Staff"
UPDATE app_modules 
SET parent_id = 'ca000000-0000-0000-0000-000000000100',
    display_name = 'Staff',
    sort_order = 30,
    updated_at = now()
WHERE id = 'ca000000-0000-0000-0000-000000000130';
