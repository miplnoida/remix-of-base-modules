-- Phase F: Online employer submissions (responses & disputes) gated by ack link_token

-- ─── Online responses to findings ───
CREATE TABLE IF NOT EXISTS public.ce_audit_finding_response_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL,
  finding_id UUID NOT NULL,
  acknowledgment_id UUID REFERENCES public.ce_audit_report_acknowledgments(id) ON DELETE SET NULL,
  link_token VARCHAR(100) NOT NULL,
  submitter_name VARCHAR(200) NOT NULL,
  submitter_designation VARCHAR(150),
  submitter_email VARCHAR(150),
  response_text TEXT NOT NULL,
  attachment_url TEXT,
  ip_address VARCHAR(64),
  user_agent TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
  reviewed_by VARCHAR(50),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  /** Once accepted by an officer, the matching ce_management_responses row id. */
  linked_response_id UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ce_afrs_status_chk CHECK (status IN ('RECEIVED','UNDER_REVIEW','ACCEPTED','REJECTED','WITHDRAWN'))
);
CREATE INDEX IF NOT EXISTS ce_afrs_inspection_idx ON public.ce_audit_finding_response_submissions(inspection_id);
CREATE INDEX IF NOT EXISTS ce_afrs_finding_idx ON public.ce_audit_finding_response_submissions(finding_id);
CREATE INDEX IF NOT EXISTS ce_afrs_token_idx ON public.ce_audit_finding_response_submissions(link_token);
CREATE INDEX IF NOT EXISTS ce_afrs_status_idx ON public.ce_audit_finding_response_submissions(status);

-- ─── Online disputes against findings or violations ───
CREATE TABLE IF NOT EXISTS public.ce_audit_finding_dispute_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL,
  finding_id UUID,
  violation_id UUID,
  acknowledgment_id UUID REFERENCES public.ce_audit_report_acknowledgments(id) ON DELETE SET NULL,
  link_token VARCHAR(100) NOT NULL,
  submitter_name VARCHAR(200) NOT NULL,
  submitter_designation VARCHAR(150),
  submitter_email VARCHAR(150),
  dispute_reason VARCHAR(100) NOT NULL,
  dispute_details TEXT NOT NULL,
  evidence_url TEXT,
  ip_address VARCHAR(64),
  user_agent TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
  reviewed_by VARCHAR(50),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  /** Once accepted, links to the formal ce_violation_disputes row id. */
  linked_dispute_id UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ce_afds_status_chk CHECK (status IN ('RECEIVED','UNDER_REVIEW','UPHELD','REJECTED','WITHDRAWN')),
  CONSTRAINT ce_afds_target_chk CHECK (finding_id IS NOT NULL OR violation_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ce_afds_inspection_idx ON public.ce_audit_finding_dispute_submissions(inspection_id);
CREATE INDEX IF NOT EXISTS ce_afds_finding_idx ON public.ce_audit_finding_dispute_submissions(finding_id);
CREATE INDEX IF NOT EXISTS ce_afds_violation_idx ON public.ce_audit_finding_dispute_submissions(violation_id);
CREATE INDEX IF NOT EXISTS ce_afds_token_idx ON public.ce_audit_finding_dispute_submissions(link_token);
CREATE INDEX IF NOT EXISTS ce_afds_status_idx ON public.ce_audit_finding_dispute_submissions(status);