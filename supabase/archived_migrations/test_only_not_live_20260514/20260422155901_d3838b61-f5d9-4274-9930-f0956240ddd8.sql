-- ============================================================================
-- Planner Action Approval Workflow
-- ============================================================================
-- Tracks Supervisor+ approval for convert_exception and merge_duplicate
-- planner actions. Supports magic-link approve/reject, SLA escalation,
-- maker-checker enforcement, and full audit trail.
-- ============================================================================

-- 1. Approval requests table -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ce_planner_action_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.ce_planner_candidate_actions(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  inspector_id UUID NULL,
  employer_id TEXT NOT NULL,
  audit_program TEXT NULL,
  zone_id TEXT NULL,
  action_type TEXT NOT NULL,
  exception_category TEXT NULL,
  exception_justification TEXT NULL,
  capacity_impact_hours NUMERIC NOT NULL DEFAULT 0,

  requested_by_user_code TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED','ESCALATED','EXPIRED','CANCELLED')),
  decision_notes TEXT NULL,
  decided_by_user_code TEXT NULL,
  decided_at TIMESTAMPTZ NULL,
  decided_via TEXT NULL CHECK (decided_via IN ('email_link','inbox_ui','api','auto_escalation') OR decided_via IS NULL),

  sla_due_at TIMESTAMPTZ NOT NULL,
  escalated_at TIMESTAMPTZ NULL,
  escalation_count INT NOT NULL DEFAULT 0,
  reminder_sent_count INT NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ NULL,

  approver_user_codes TEXT[] NOT NULL DEFAULT '{}',
  approver_emails TEXT[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_approvals_status ON public.ce_planner_action_approvals(status);
CREATE INDEX IF NOT EXISTS idx_pa_approvals_action ON public.ce_planner_action_approvals(action_id);
CREATE INDEX IF NOT EXISTS idx_pa_approvals_week ON public.ce_planner_action_approvals(week_start_date);
CREATE INDEX IF NOT EXISTS idx_pa_approvals_sla ON public.ce_planner_action_approvals(sla_due_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_pa_approvals_requested_by ON public.ce_planner_action_approvals(requested_by_user_code);

-- 2. Magic-link tokens (one-click approve/reject from email) ----------------
CREATE TABLE IF NOT EXISTS public.ce_planner_approval_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_id UUID NOT NULL REFERENCES public.ce_planner_action_approvals(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  approver_user_code TEXT NOT NULL,
  approver_email TEXT NOT NULL,
  intent TEXT NOT NULL CHECK (intent IN ('approve','reject','view')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  used_ip INET NULL,
  used_user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pa_tokens_hash ON public.ce_planner_approval_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_pa_tokens_approval ON public.ce_planner_approval_tokens(approval_id);

-- 3. Audit trail (every notification + decision logged) ---------------------
CREATE TABLE IF NOT EXISTS public.ce_planner_approval_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_id UUID NOT NULL REFERENCES public.ce_planner_action_approvals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  -- e.g. 'submitted', 'email_sent', 'reminder_sent', 'approved', 'rejected',
  -- 'escalated', 'expired', 'magic_link_used', 'maker_checker_blocked'
  actor_user_code TEXT NULL,
  recipient_email TEXT NULL,
  channel TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pa_audit_approval ON public.ce_planner_approval_audit(approval_id);
CREATE INDEX IF NOT EXISTS idx_pa_audit_event ON public.ce_planner_approval_audit(event_type);

-- 4. Updated_at trigger -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_pa_approvals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_pa_approvals_updated_at ON public.ce_planner_action_approvals;
CREATE TRIGGER trg_pa_approvals_updated_at
  BEFORE UPDATE ON public.ce_planner_action_approvals
  FOR EACH ROW EXECUTE FUNCTION public.tg_pa_approvals_updated_at();

-- 5. Maker-checker enforcement at DB level ---------------------------------
CREATE OR REPLACE FUNCTION public.tg_pa_block_self_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('APPROVED','REJECTED')
     AND NEW.decided_by_user_code IS NOT NULL
     AND NEW.decided_by_user_code = NEW.requested_by_user_code THEN
    RAISE EXCEPTION 'maker_checker_violation: requester cannot approve own action (user_code=%)', NEW.requested_by_user_code
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_pa_block_self_approval ON public.ce_planner_action_approvals;
CREATE TRIGGER trg_pa_block_self_approval
  BEFORE UPDATE ON public.ce_planner_action_approvals
  FOR EACH ROW EXECUTE FUNCTION public.tg_pa_block_self_approval();
