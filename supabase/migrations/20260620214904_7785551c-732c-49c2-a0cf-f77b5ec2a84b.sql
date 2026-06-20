
ALTER TABLE public.core_template_usage
  ADD COLUMN IF NOT EXISTS case_type_code TEXT,
  ADD COLUMN IF NOT EXISTS stage_code TEXT,
  ADD COLUMN IF NOT EXISTS usage_context TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_generate_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_core_template_usage_stage
  ON public.core_template_usage(module_code, stage_code);

ALTER TABLE public.core_generated_document
  ADD COLUMN IF NOT EXISTS case_stage_code TEXT,
  ADD COLUMN IF NOT EXISTS case_type_code TEXT,
  ADD COLUMN IF NOT EXISTS legal_reference_version_id UUID;

DELETE FROM public.core_template_usage
 WHERE module_code = 'LEGAL'
   AND stage_code IS NOT NULL;

WITH src (code, stage_code, sort_order, is_default, is_required, auto_generate_allowed, approval_required, usage_context) AS (
  VALUES
  ('LG-TPL-REF-ACCEPT',      'REFERRAL_RECEIVED',       10, true,  true,  true,  false, 'STAGE_LETTER'),
  ('LG-TPL-REF-RETURN',      'REFERRAL_RECEIVED',       20, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-CASE-ASSIGNMENT', 'REFERRAL_RECEIVED',       30, false, false, true,  false, 'STAGE_LETTER'),
  ('LG-TPL-CASE-CREATION',   'REFERRAL_RECEIVED',       40, false, false, true,  false, 'STAGE_LETTER'),

  ('LG-TPL-LEGAL-MEMO',      'LEGAL_REVIEW',            10, true,  true,  false, true,  'STAGE_LETTER'),
  ('LG-TPL-INVESTIGATION',   'LEGAL_REVIEW',            20, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-SHOW-CAUSE',      'LEGAL_REVIEW',            30, false, false, false, true,  'STAGE_LETTER'),

  ('LG-TPL-DEMAND-LETTER',   'DEMAND_NOTICE',           10, true,  true,  true,  false, 'STAGE_LETTER'),
  ('LG-TPL-FINAL-DEMAND',    'DEMAND_NOTICE',           20, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-NBA',             'DEMAND_NOTICE',           30, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-PAYMENT-DEFAULT', 'DEMAND_NOTICE',           40, false, false, false, false, 'STAGE_LETTER'),

  ('LG-TPL-SETTLEMENT-OFFER','SETTLEMENT_NEGOTIATION',  10, true,  false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-SETTLE-ACCEPT',   'SETTLEMENT_NEGOTIATION',  20, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-SETTLE-REJECT',   'SETTLEMENT_NEGOTIATION',  30, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-SETTLE-TERMS',    'SETTLEMENT_NEGOTIATION',  40, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-PAYPLAN-LEGAL',   'SETTLEMENT_NEGOTIATION',  50, false, false, false, true,  'STAGE_LETTER'),

  ('LG-TPL-COURT-COVER',     'COURT_FILING',            10, true,  true,  false, true,  'STAGE_LETTER'),
  ('LG-TPL-SUMMONS-COVER',   'COURT_FILING',            20, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-EVIDENCE-COVER',  'COURT_FILING',            30, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-WITNESS-REQUEST', 'COURT_FILING',            40, false, false, false, true,  'STAGE_LETTER'),

  ('LG-TPL-HEARING-NOTICE',  'HEARING',                 10, true,  true,  true,  false, 'STAGE_LETTER'),
  ('LG-TPL-HEARING-REMINDER','HEARING',                 20, false, false, true,  false, 'STAGE_LETTER'),
  ('LG-TPL-ADJOURNMENT',     'HEARING',                 30, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-HEARING-RESCHEDULE','HEARING',               40, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-HEARING-CANCEL',  'HEARING',                 50, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-HEARING-PREP',    'HEARING',                 60, false, false, true,  false, 'STAGE_LETTER'),

  ('LG-TPL-JUDGMENT',        'JUDGMENT',                10, true,  true,  false, true,  'STAGE_LETTER'),
  ('LG-TPL-FINAL-ORDER',     'JUDGMENT',                20, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-JUDG-SATISFIED',  'JUDGMENT',                30, false, false, false, true,  'STAGE_LETTER'),

  ('LG-TPL-ENFORCEMENT',     'ENFORCEMENT',             10, true,  true,  false, true,  'STAGE_LETTER'),
  ('LG-TPL-GARNISHMENT',     'ENFORCEMENT',             20, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-EXECUTION',       'ENFORCEMENT',             30, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-RECOVERY-NOTICE', 'ENFORCEMENT',             40, false, false, false, true,  'STAGE_LETTER'),

  ('LG-TPL-FEE-NOTICE',      'FEES_AND_WAIVERS',        10, true,  false, true,  false, 'ANY_STAGE'),
  ('LG-TPL-FEE-WAIVER-ACK',  'FEES_AND_WAIVERS',        20, false, false, true,  false, 'ANY_STAGE'),
  ('LG-TPL-WAIVER-APPROVE',  'FEES_AND_WAIVERS',        30, false, false, false, true,  'ANY_STAGE'),
  ('LG-TPL-WAIVER-REJECT',   'FEES_AND_WAIVERS',        40, false, false, false, true,  'ANY_STAGE'),

  ('LG-TPL-CASE-CLOSURE',    'CLOSED',                  10, true,  true,  false, true,  'STAGE_LETTER'),
  ('LG-TPL-WITHDRAWAL-NOTICE','CLOSED',                 20, false, false, false, true,  'STAGE_LETTER'),
  ('LG-TPL-MATTER-RESOLVED', 'CLOSED',                  30, false, false, false, true,  'STAGE_LETTER')
)
INSERT INTO public.core_template_usage
  (template_id, template_version_id, module_code, feature_area, screen_code, workflow_code,
   trigger_event, entity_type, stage_code, case_type_code, usage_context,
   is_default, is_required, auto_generate_allowed, approval_required, sort_order, is_active, notes)
SELECT t.id, t.active_version_id, 'LEGAL', 'CASE_CORRESPONDENCE', 'LgCaseDetail', 'LG_CASE',
       'MANUAL_GENERATE', 'lg_case', s.stage_code, NULL, s.usage_context,
       s.is_default, s.is_required, s.auto_generate_allowed, s.approval_required,
       s.sort_order, true, 'SEED'
  FROM src s
  JOIN public.core_template t ON t.code = s.code;

CREATE OR REPLACE FUNCTION public.legal_stage_template_completeness()
RETURNS TABLE (
  stage_code TEXT,
  total_required BIGINT,
  total_mapped BIGINT,
  missing_required TEXT[]
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH stages AS (
    SELECT UNNEST(ARRAY[
      'REFERRAL_RECEIVED','LEGAL_REVIEW','DEMAND_NOTICE','SETTLEMENT_NEGOTIATION',
      'COURT_FILING','HEARING','JUDGMENT','ENFORCEMENT','FEES_AND_WAIVERS','CLOSED'
    ]) AS stage_code
  ),
  mapped AS (
    SELECT u.stage_code,
           COUNT(*) FILTER (WHERE u.is_required) AS req,
           COUNT(*) AS total,
           ARRAY_AGG(t.code) FILTER (WHERE u.is_required AND t.active_version_id IS NULL) AS missing
      FROM public.core_template_usage u
      JOIN public.core_template t ON t.id = u.template_id
     WHERE u.module_code = 'LEGAL' AND u.is_active
     GROUP BY u.stage_code
  )
  SELECT s.stage_code,
         COALESCE(m.req, 0)   AS total_required,
         COALESCE(m.total, 0) AS total_mapped,
         COALESCE(m.missing, ARRAY[]::TEXT[]) AS missing_required
    FROM stages s
    LEFT JOIN mapped m ON m.stage_code = s.stage_code
    ORDER BY s.stage_code;
$$;

GRANT EXECUTE ON FUNCTION public.legal_stage_template_completeness() TO authenticated, service_role;
