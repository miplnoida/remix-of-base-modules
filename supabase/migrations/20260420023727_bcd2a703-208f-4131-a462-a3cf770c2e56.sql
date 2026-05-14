ALTER TABLE public.ce_audit_communications
  ADD COLUMN IF NOT EXISTS portal_resolved_review_json jsonb,
  ADD COLUMN IF NOT EXISTS portal_matched_policy_id uuid;

CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_portal_policy
  ON public.ce_audit_communications(portal_matched_policy_id)
  WHERE portal_matched_policy_id IS NOT NULL;