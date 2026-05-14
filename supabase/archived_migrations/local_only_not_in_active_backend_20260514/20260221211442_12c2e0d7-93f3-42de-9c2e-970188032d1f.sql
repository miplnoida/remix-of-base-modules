
-- Add DMS transfer tracking columns to ip_application_documents
ALTER TABLE public.ip_application_documents
  ADD COLUMN IF NOT EXISTS transfer_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS dms_document_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS transfer_error TEXT NULL,
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS transferred_by VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS transfer_attempts INT NOT NULL DEFAULT 0;

-- Add index for efficient lookup during transfer
CREATE INDEX IF NOT EXISTS idx_ip_app_docs_transfer_status 
  ON public.ip_application_documents(ssn, transfer_status);

-- Add check constraint for valid transfer statuses
ALTER TABLE public.ip_application_documents
  ADD CONSTRAINT chk_transfer_status 
  CHECK (transfer_status IN ('Pending', 'Transferred', 'Failed'));
