
-- Fix Organization Management menu alignment: distinct labels/routes per page.

-- 1) org_media_library was mislabeled "Communication Assets" (duplicating the sibling entry).
UPDATE public.app_modules
SET display_name = 'Media Library'
WHERE id = '34a8edb2-78a4-4cd7-bd7a-df48575080e9';

-- 2) Hide the legacy org_comm_assets redirect stub (superseded by admin_cde_comm_assets → /admin/communication).
UPDATE public.app_modules
SET show_in_menu = false
WHERE id = '6c550e74-7fdc-48bd-9fe6-f8a5c7ddf596';

-- 3) Hide legacy org_letterheads stub (superseded by admin_cde_letterheads → /admin/organization/letterheads renders LetterheadsPage).
UPDATE public.app_modules
SET show_in_menu = false
WHERE id = 'c6adaa6d-693e-46c1-b4cc-81262d7a8720';
