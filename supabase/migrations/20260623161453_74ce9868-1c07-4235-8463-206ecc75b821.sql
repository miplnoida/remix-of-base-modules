UPDATE public.app_modules
SET parent_id = 'aab5fcb8-51fb-4a5c-8a87-6cef31068b47',
    display_name = 'Document Repository',
    description = 'Configure document storage provider (local vs central DMS), providers, types and mappings.',
    sort_order = COALESCE(sort_order, 50),
    show_in_menu = true,
    is_enabled = true
WHERE name = 'core_dms_admin';