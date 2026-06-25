
-- 1. Storage RLS policies for the legal-referrals bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='legal-referrals authenticated read') THEN
    CREATE POLICY "legal-referrals authenticated read"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'legal-referrals');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='legal-referrals authenticated insert') THEN
    CREATE POLICY "legal-referrals authenticated insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'legal-referrals');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='legal-referrals authenticated update') THEN
    CREATE POLICY "legal-referrals authenticated update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'legal-referrals')
      WITH CHECK (bucket_id = 'legal-referrals');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='legal-referrals authenticated delete') THEN
    CREATE POLICY "legal-referrals authenticated delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'legal-referrals');
  END IF;
END $$;

-- 2. New sidebar menu entries for the submitted-referrals tracking screens
INSERT INTO public.app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES
  ('bb000001-0000-0000-0000-0000000007b1'::uuid, 'bn_legal_referrals_history', 'Legal Referrals',
   'Track legal referrals submitted from Benefits and respond to Legal info requests.',
   'Scale', '/bn/legal-referrals',
   'b72990ca-ff29-434c-8655-104621ba3a5e'::uuid, 91, true, true),
  ('cb000001-0000-0000-0000-0000000007b2'::uuid, 'ce_legal_referrals_history', 'Legal Referrals',
   'Track legal referrals submitted from Compliance and respond to Legal info requests.',
   'Scale', '/compliance/legal-referrals',
   'ca000000-0000-0000-0000-000000000070'::uuid, 10, true, true),
  ('1e9a1000-0000-0000-0000-0000000007b3'::uuid, 'lg_referrals_workbench', 'Referrals Workbench',
   'Central workbench for all referrals received by Legal from Benefits and Compliance.',
   'Scale', '/legal/referrals-workbench',
   '1e9a1000-0000-0000-0000-000000000001'::uuid, 5, true, true)
ON CONFLICT (id) DO NOTHING;

-- 3. View action for each new module
INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT m.id, 'view', 'View', true
FROM public.app_modules m
WHERE m.id IN (
  'bb000001-0000-0000-0000-0000000007b1'::uuid,
  'cb000001-0000-0000-0000-0000000007b2'::uuid,
  '1e9a1000-0000-0000-0000-0000000007b3'::uuid
)
AND NOT EXISTS (
  SELECT 1 FROM public.module_actions a WHERE a.module_id = m.id AND a.action_name = 'view'
);

-- 4. Grant Admin role permission to view each new module
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT 'bdec06a6-cfbd-4c4e-a2be-11d6b638b948'::uuid, a.module_id, a.id, true
FROM public.module_actions a
WHERE a.module_id IN (
  'bb000001-0000-0000-0000-0000000007b1'::uuid,
  'cb000001-0000-0000-0000-0000000007b2'::uuid,
  '1e9a1000-0000-0000-0000-0000000007b3'::uuid
)
AND a.action_name = 'view'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = 'bdec06a6-cfbd-4c4e-a2be-11d6b638b948'::uuid
    AND rp.module_id = a.module_id
    AND rp.action_id = a.id
);
