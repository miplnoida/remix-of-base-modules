
-- Add missing DMS transfer tracking columns to ip_application_documents
ALTER TABLE public.ip_application_documents
  ADD COLUMN IF NOT EXISTS transfer_attempted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS transfer_http_status INTEGER NULL,
  ADD COLUMN IF NOT EXISTS transfer_response_snippet TEXT NULL,
  ADD COLUMN IF NOT EXISTS transfer_request_id VARCHAR(255) NULL;

-- Drop the old CHECK constraint that only allows Pending/Transferred/Failed
-- and replace with one that also allows InProgress
ALTER TABLE public.ip_application_documents DROP CONSTRAINT IF EXISTS chk_transfer_status;
ALTER TABLE public.ip_application_documents
  ADD CONSTRAINT chk_transfer_status 
  CHECK (transfer_status IN ('Pending', 'InProgress', 'Transferred', 'Failed'));

-- Add UPDATE RLS policy so edge functions (service role) and authenticated users can update
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ip_application_documents' AND policyname='Authenticated users can update ip_application_documents') THEN
    CREATE POLICY "Authenticated users can update ip_application_documents"
      ON public.ip_application_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
