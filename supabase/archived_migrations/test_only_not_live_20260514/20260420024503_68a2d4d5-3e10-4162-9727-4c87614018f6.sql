-- Phase 5: surface matched policy + review-routing snapshot on ack rows
ALTER TABLE public.ce_audit_report_acknowledgments
  ADD COLUMN IF NOT EXISTS portal_matched_policy_id uuid NULL,
  ADD COLUMN IF NOT EXISTS portal_resolved_review_json jsonb NULL;

COMMENT ON COLUMN public.ce_audit_report_acknowledgments.portal_matched_policy_id IS
  'Phase 5: id of the ce_online_response_policy that resolved at send time. Frozen alongside permissions.';
COMMENT ON COLUMN public.ce_audit_report_acknowledgments.portal_resolved_review_json IS
  'Phase 5: review/workflow routing snapshot (workflow_id, review flags) frozen at send time.';

-- Audit-trail table: every employer portal submission lands here with its
-- resolved policy + review routing context, for officer dashboards & legal
-- defensibility, independent of the response/dispute table specifics.
CREATE TABLE IF NOT EXISTS public.ce_online_response_submission_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acknowledgment_id uuid NULL REFERENCES public.ce_audit_report_acknowledgments(id) ON DELETE SET NULL,
  communication_id uuid NULL,
  inspection_id uuid NULL,
  report_id uuid NULL,
  submission_kind text NOT NULL CHECK (submission_kind IN ('acknowledgment','response','dispute','upload','clarification','corrective_action','payment')),
  submission_id uuid NULL,
  submitter_name text NULL,
  submitter_email text NULL,
  resolved_mode text NULL,
  matched_policy_id uuid NULL,
  resolved_permissions_json jsonb NULL,
  resolved_review_json jsonb NULL,
  workflow_instance_id uuid NULL,
  ip_address text NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_online_resp_audit_inspection ON public.ce_online_response_submission_audit(inspection_id);
CREATE INDEX IF NOT EXISTS idx_ce_online_resp_audit_ack ON public.ce_online_response_submission_audit(acknowledgment_id);
CREATE INDEX IF NOT EXISTS idx_ce_online_resp_audit_policy ON public.ce_online_response_submission_audit(matched_policy_id);

COMMENT ON TABLE public.ce_online_response_submission_audit IS
  'Phase 6: append-only audit log for every employer portal submission, capturing the frozen policy snapshot in force when the employer acted.';