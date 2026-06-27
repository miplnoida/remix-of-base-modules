DO $$
DECLARE pair RECORD;
BEGIN
  FOR pair IN SELECT * FROM (VALUES
    ('7b40b5f9-6c3a-4e98-a70f-56f55cc4427a'::uuid, 'e1a00000-0000-4000-8000-000000000001'::uuid),
    ('d7aae631-5057-4a12-8f4c-53aca7846b60'::uuid, 'e1a00000-0000-4000-8000-000000000003'::uuid),
    ('da5c87f0-1029-4a51-a286-a9a51800a1de'::uuid, 'e1a00000-0000-4000-8000-000000000007'::uuid)
  ) AS t(old_id, new_id)
  LOOP
    UPDATE public.app_modules SET parent_id = pair.new_id WHERE parent_id = pair.old_id;
    UPDATE public.app_modules
       SET show_in_menu = false,
           is_enabled   = false,
           display_name = display_name || ' (deprecated dup)'
     WHERE id = pair.old_id;
  END LOOP;
END $$;