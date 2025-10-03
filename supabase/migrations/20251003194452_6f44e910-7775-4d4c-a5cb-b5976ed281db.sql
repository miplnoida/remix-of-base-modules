-- Add additional columns to legal_documents for enhanced features
ALTER TABLE legal_documents
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ocr_text text,
ADD COLUMN IF NOT EXISTS template_id uuid,
ADD COLUMN IF NOT EXISTS esign_status text DEFAULT 'Not Sent' CHECK (esign_status IN ('Not Sent', 'Sent', 'Partially Signed', 'Fully Signed', 'Declined')),
ADD COLUMN IF NOT EXISTS esign_provider text,
ADD COLUMN IF NOT EXISTS esign_envelope_id text,
ADD COLUMN IF NOT EXISTS marked_as_evidence boolean DEFAULT false;

-- Create table for shared document links
CREATE TABLE IF NOT EXISTS legal_document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  access_token text NOT NULL UNIQUE,
  watermark_text text,
  access_count integer DEFAULT 0,
  max_access_count integer,
  is_active boolean DEFAULT true
);

-- Create table for document saved searches
CREATE TABLE IF NOT EXISTS legal_document_saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_default boolean DEFAULT false
);

-- Enable RLS on new tables
ALTER TABLE legal_document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_document_saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS policies for document shares
CREATE POLICY "Authorized users can create shares"
ON legal_document_shares FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));

CREATE POLICY "Authorized users can view shares"
ON legal_document_shares FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['Clerk'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));

CREATE POLICY "Authorized users can update shares"
ON legal_document_shares FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));

-- RLS policies for saved searches
CREATE POLICY "Users can manage own saved searches"
ON legal_document_saved_searches FOR ALL
USING (auth.uid() = user_id);

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_legal_documents_tags ON legal_documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_legal_documents_ocr_text ON legal_documents USING gin(to_tsvector('english', ocr_text));
CREATE INDEX IF NOT EXISTS idx_legal_documents_esign_status ON legal_documents(esign_status);
CREATE INDEX IF NOT EXISTS idx_legal_document_shares_token ON legal_document_shares(access_token);

-- Add timeline event for document actions
CREATE OR REPLACE FUNCTION log_document_action()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO legal_timeline_events (case_id, type, actor_id, actor_name, description)
    VALUES (
      NEW.case_id,
      'Document',
      NEW.uploaded_by,
      (SELECT full_name FROM profiles WHERE id = NEW.uploaded_by),
      'Uploaded document: ' || NEW.name || ' (' || NEW.type || ')'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.version > OLD.version THEN
    INSERT INTO legal_timeline_events (case_id, type, actor_id, actor_name, description)
    VALUES (
      NEW.case_id,
      'Document',
      auth.uid(),
      (SELECT full_name FROM profiles WHERE id = auth.uid()),
      'New version of document: ' || NEW.name || ' (v' || NEW.version || ')'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER document_timeline_trigger
AFTER INSERT OR UPDATE ON legal_documents
FOR EACH ROW
EXECUTE FUNCTION log_document_action();