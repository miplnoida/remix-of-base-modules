UPDATE app_modules
SET show_in_menu = false,
    is_enabled = false,
    updated_at = now()
WHERE name = 'lg_workbench' AND route = '/legal/workbench';