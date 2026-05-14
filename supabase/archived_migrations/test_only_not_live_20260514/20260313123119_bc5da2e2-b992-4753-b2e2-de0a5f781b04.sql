
-- Phase 4: Preparation tables
CREATE TABLE ia_preparation_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_audit_id UUID NOT NULL REFERENCES ia_department_audits(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  assigned_to UUID,
  category TEXT DEFAULT 'General',
  sort_order INT DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ia_preparation_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_audit_id UUID NOT NULL REFERENCES ia_department_audits(id) ON DELETE CASCADE,
  document_type TEXT DEFAULT 'General',
  file_url TEXT,
  file_name TEXT NOT NULL,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 5: Discussion tables
CREATE TABLE ia_discussion_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  subject TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ia_discussion_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES ia_discussion_threads(id) ON DELETE CASCADE,
  author_id UUID,
  author_name TEXT,
  content TEXT NOT NULL,
  mentioned_users UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE ia_discussion_comments;

-- Phase 6: Historical risk adjustment
ALTER TABLE ia_department_functions ADD COLUMN IF NOT EXISTS historical_risk_adjustment NUMERIC DEFAULT 0;
