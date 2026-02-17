
-- Schema Change Approvals audit log
CREATE TABLE IF NOT EXISTS public.schema_change_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  change_description TEXT NOT NULL,
  table_name TEXT NOT NULL,
  change_type TEXT NOT NULL, -- e.g. ADD_COLUMN, DROP_COLUMN, ALTER_TYPE, MODIFY_RLS, etc.
  current_schema_snapshot JSONB,
  proposed_change JSONB,
  impacted_modules TEXT[], -- e.g. {'frontend','workflows','RLS','reports'}
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low','medium','high')),
  rollback_script TEXT,
  data_loss_risk TEXT,
  environment TEXT NOT NULL DEFAULT 'development' CHECK (environment IN ('development','staging','production')),
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  approver_identity TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  migration_file_reference TEXT,
  notes TEXT
);

ALTER TABLE public.schema_change_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view schema change approvals"
  ON public.schema_change_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'Admin'
    )
  );

CREATE POLICY "Only admins can insert schema change approvals"
  ON public.schema_change_approvals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'Admin'
    )
  );
