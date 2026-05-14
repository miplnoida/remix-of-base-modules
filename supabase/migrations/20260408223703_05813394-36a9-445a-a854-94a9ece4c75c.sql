-- Create storage bucket for audit document assets (logos, branding)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-assets', 'audit-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload assets
CREATE POLICY "Authenticated users can upload audit assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audit-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update audit assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'audit-assets');

-- Allow public read access for document generation
CREATE POLICY "Public read access for audit assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'audit-assets');

-- Allow authenticated users to delete assets
CREATE POLICY "Authenticated users can delete audit assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'audit-assets');