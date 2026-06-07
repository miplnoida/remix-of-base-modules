
CREATE UNIQUE INDEX IF NOT EXISTS ux_bn_claim_transition_rule_action_from_to
  ON public.bn_claim_transition_rule (
    action_code,
    from_status,
    to_status,
    COALESCE(product_category, ''),
    COALESCE(country_code, '')
  );

INSERT INTO public.bn_claim_transition_rule
  (action_code, action_label, from_status, to_status, allowed_roles,
   requires_narrative, requires_reason, requires_evidence_complete,
   requires_eligibility_pass, requires_calculation, sort_order, is_active, entered_by)
VALUES
  ('START_REVIEW',     'Start Review',        'SUBMITTED',         'INTAKE_REVIEW',     ARRAY['bn_officer','bn_supervisor','Admin'], false, false, false, false, false, 10, true, 'SEED-PHASE2'),
  ('CHECK_ELIGIBILITY','Check Eligibility',   'INTAKE_REVIEW',     'ELIGIBILITY_CHECK', ARRAY['bn_officer','bn_supervisor','Admin'], false, false, false, false, false, 20, true, 'SEED-PHASE2'),
  ('REQUEST_EVIDENCE', 'Request Evidence',    'INTAKE_REVIEW',     'EVIDENCE_REVIEW',   ARRAY['bn_officer','bn_supervisor','Admin'], true,  false, false, false, false, 25, true, 'SEED-PHASE2'),
  ('REQUEST_EVIDENCE', 'Request Evidence',    'ELIGIBILITY_CHECK', 'EVIDENCE_REVIEW',   ARRAY['bn_officer','bn_supervisor','Admin'], true,  false, false, false, false, 25, true, 'SEED-PHASE2'),
  ('RUN_CALCULATION',  'Run Calculation',     'ELIGIBILITY_CHECK', 'CALCULATION',       ARRAY['bn_officer','bn_supervisor','Admin'], false, false, false, true,  false, 30, true, 'SEED-PHASE2'),
  ('RUN_CALCULATION',  'Run Calculation',     'EVIDENCE_REVIEW',   'CALCULATION',       ARRAY['bn_officer','bn_supervisor','Admin'], false, false, false, true,  false, 30, true, 'SEED-PHASE2'),
  ('SUBMIT_DECISION',  'Submit for Decision', 'CALCULATION',       'DECISION',          ARRAY['bn_officer','bn_supervisor','Admin'], false, false, false, false, true,  40, true, 'SEED-PHASE2'),
  ('REQUEST_INFO',     'Request Info',        'INTAKE_REVIEW',     'PENDING_INFO',      ARRAY['bn_officer','bn_supervisor','Admin'], true,  false, false, false, false, 50, true, 'SEED-PHASE2'),
  ('REQUEST_INFO',     'Request Info',        'ELIGIBILITY_CHECK', 'PENDING_INFO',      ARRAY['bn_officer','bn_supervisor','Admin'], true,  false, false, false, false, 50, true, 'SEED-PHASE2'),
  ('REQUEST_INFO',     'Request Info',        'EVIDENCE_REVIEW',   'PENDING_INFO',      ARRAY['bn_officer','bn_supervisor','Admin'], true,  false, false, false, false, 50, true, 'SEED-PHASE2'),
  ('REQUEST_INFO',     'Request Info',        'CALCULATION',       'PENDING_INFO',      ARRAY['bn_officer','bn_supervisor','Admin'], true,  false, false, false, false, 50, true, 'SEED-PHASE2'),
  ('REQUEST_INFO',     'Request Info',        'DECISION',          'PENDING_INFO',      ARRAY['bn_officer','bn_supervisor','Admin'], true,  false, false, false, false, 50, true, 'SEED-PHASE2'),
  ('SUSPEND',          'Suspend',             'SUBMITTED',         'SUSPENDED',         ARRAY['bn_supervisor','bn_manager','Admin'], true,  true,  false, false, false, 60, true, 'SEED-PHASE2'),
  ('SUSPEND',          'Suspend',             'INTAKE_REVIEW',     'SUSPENDED',         ARRAY['bn_supervisor','bn_manager','Admin'], true,  true,  false, false, false, 60, true, 'SEED-PHASE2'),
  ('SUSPEND',          'Suspend',             'ELIGIBILITY_CHECK', 'SUSPENDED',         ARRAY['bn_supervisor','bn_manager','Admin'], true,  true,  false, false, false, 60, true, 'SEED-PHASE2'),
  ('SUSPEND',          'Suspend',             'EVIDENCE_REVIEW',   'SUSPENDED',         ARRAY['bn_supervisor','bn_manager','Admin'], true,  true,  false, false, false, 60, true, 'SEED-PHASE2'),
  ('SUSPEND',          'Suspend',             'CALCULATION',       'SUSPENDED',         ARRAY['bn_supervisor','bn_manager','Admin'], true,  true,  false, false, false, 60, true, 'SEED-PHASE2'),
  ('SUSPEND',          'Suspend',             'DECISION',          'SUSPENDED',         ARRAY['bn_supervisor','bn_manager','Admin'], true,  true,  false, false, false, 60, true, 'SEED-PHASE2'),
  ('REOPEN',           'Reopen',              'SUSPENDED',         'INTAKE_REVIEW',     ARRAY['bn_supervisor','bn_manager','Admin'], true,  true,  false, false, false, 70, true, 'SEED-PHASE2'),
  ('REOPEN',           'Reopen',              'CLOSED',            'INTAKE_REVIEW',     ARRAY['bn_supervisor','bn_manager','Admin'], true,  true,  false, false, false, 70, true, 'SEED-PHASE2'),
  ('REOPEN',           'Reopen',              'PENDING_INFO',      'INTAKE_REVIEW',     ARRAY['bn_supervisor','bn_manager','Admin'], true,  true,  false, false, false, 70, true, 'SEED-PHASE2'),
  ('WITHDRAW',         'Withdraw',            'INTAKE_REVIEW',     'WITHDRAWN',         ARRAY['bn_officer','bn_supervisor','Admin'], true,  true,  false, false, false, 80, true, 'SEED-PHASE2'),
  ('WITHDRAW',         'Withdraw',            'PENDING_INFO',      'WITHDRAWN',         ARRAY['bn_officer','bn_supervisor','Admin'], true,  true,  false, false, false, 80, true, 'SEED-PHASE2'),
  ('CLOSE',            'Close',               'APPROVED',          'CLOSED',            ARRAY['bn_supervisor','bn_manager','Admin'], false, false, false, false, false, 90, true, 'SEED-PHASE2'),
  ('CLOSE',            'Close',               'DENIED',            'CLOSED',            ARRAY['bn_supervisor','bn_manager','Admin'], false, false, false, false, false, 90, true, 'SEED-PHASE2'),
  ('CLOSE',            'Close',               'IN_PAYMENT',        'CLOSED',            ARRAY['bn_supervisor','bn_manager','Admin'], false, false, false, false, false, 90, true, 'SEED-PHASE2'),
  ('CLOSE',            'Close',               'WITHDRAWN',         'CLOSED',            ARRAY['bn_supervisor','bn_manager','Admin'], false, false, false, false, false, 90, true, 'SEED-PHASE2')
ON CONFLICT (action_code, from_status, to_status, COALESCE(product_category, ''), COALESCE(country_code, '')) DO NOTHING;

INSERT INTO public.workflow_definitions (name, description, process_type, is_active, version, maker_checker_enabled)
VALUES ('BN — Benefit Claim Lifecycle',
        'Canonical lifecycle for benefit claims. Transitions driven by bn_claim_transition_rule; runtime mirrors each action into workflow_instances and workflow_logs.',
        'Benefit Management',
        true,
        1,
        false)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = true;
