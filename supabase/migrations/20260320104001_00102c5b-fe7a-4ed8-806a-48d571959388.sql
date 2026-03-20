
-- Add response_attachment column to ia_audit_queries
ALTER TABLE public.ia_audit_queries ADD COLUMN IF NOT EXISTS response_attachment TEXT;

-- Create storage bucket for audit attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('audit-attachments', 'audit-attachments', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies for authenticated users
CREATE POLICY "Authenticated users can upload audit attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audit-attachments');
CREATE POLICY "Authenticated users can read audit attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'audit-attachments');
CREATE POLICY "Authenticated users can update audit attachments" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'audit-attachments');
CREATE POLICY "Authenticated users can delete audit attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'audit-attachments');
