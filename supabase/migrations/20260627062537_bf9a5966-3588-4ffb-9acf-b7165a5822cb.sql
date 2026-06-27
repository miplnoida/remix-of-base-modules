
CREATE POLICY "comm_assets_authenticated_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'comm-assets');
CREATE POLICY "comm_assets_authenticated_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'comm-assets');
CREATE POLICY "comm_assets_authenticated_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'comm-assets') WITH CHECK (bucket_id = 'comm-assets');
CREATE POLICY "comm_assets_authenticated_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'comm-assets');
