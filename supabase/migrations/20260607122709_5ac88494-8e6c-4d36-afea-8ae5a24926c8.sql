-- Extend bn_override_request status to support REVOKED and SUPERSEDED + add revoke metadata
ALTER TABLE public.bn_override_request DROP CONSTRAINT IF EXISTS bn_override_request_status_check;
ALTER TABLE public.bn_override_request ADD CONSTRAINT bn_override_request_status_check
  CHECK (status = ANY (ARRAY['DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','CANCELLED','EXPIRED','REVOKED','SUPERSEDED']::text[]));

ALTER TABLE public.bn_override_request
  ADD COLUMN IF NOT EXISTS revoked_by varchar(50),
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revocation_reason text;

CREATE INDEX IF NOT EXISTS idx_bn_override_request_active_approved
  ON public.bn_override_request (claim_id, policy_area, rule_code)
  WHERE status = 'APPROVED';