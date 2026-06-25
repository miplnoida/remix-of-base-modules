-- Backfill any lg_case_intake rows whose linked legal_referral is INFO_RESPONDED
-- but the intake is still showing INFO_REQUESTED (or stuck on PENDING_REVIEW after a response).
UPDATE public.lg_case_intake ci
SET intake_status = 'INFO_RESPONDED'
FROM public.legal_referral lr
WHERE lr.lg_intake_id = ci.id
  AND lr.status = 'INFO_RESPONDED'
  AND ci.intake_status = 'INFO_REQUESTED';