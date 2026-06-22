
ALTER TABLE public.legal_complainant_settings
  ADD COLUMN IF NOT EXISTS default_workbasket_code     varchar(64),
  ADD COLUMN IF NOT EXISTS default_team_code           varchar(64),
  ADD COLUMN IF NOT EXISTS default_assignment_strategy varchar(32) NOT NULL DEFAULT 'WORKBASKET_ONLY',
  ADD COLUMN IF NOT EXISTS default_priority_code       varchar(32) NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS allow_manual_override       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_assign_on_referral     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_assign_on_manual_case  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalate_unassigned_days    integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS department_name             text;

COMMENT ON COLUMN public.legal_complainant_settings.default_officer IS
  'DEPRECATED — free-text officer name no longer used. Use routing policy + lg_case_assignment instead.';
COMMENT ON COLUMN public.legal_complainant_settings.default_priority IS
  'DEPRECATED — replaced by default_priority_code (LG_PRIORITY reference value).';

DO $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id INTO v_group_id FROM public.core_reference_group WHERE group_code = 'LG_WORKBASKET';
  IF v_group_id IS NULL THEN
    INSERT INTO public.core_reference_group (group_code, group_name, module_code, is_active, is_system)
    VALUES ('LG_WORKBASKET', 'Legal Workbaskets', 'LEGAL', true, true)
    RETURNING id INTO v_group_id;
  END IF;

  INSERT INTO public.core_reference_value (group_id, value_code, value_label, sort_order, is_active, is_system, description)
  VALUES
    (v_group_id, 'LEGAL_REFERRAL_REVIEW',      'Legal Referral Review',       10, true, true, 'Inbox for compliance referrals awaiting triage'),
    (v_group_id, 'LEGAL_CASE_ASSIGNMENT',      'Legal Case Assignment',       20, true, true, 'New manual cases needing officer assignment'),
    (v_group_id, 'LEGAL_HEARING_PREPARATION',  'Legal Hearing Preparation',   30, true, true, 'Cases at hearing-prep stage'),
    (v_group_id, 'LEGAL_SETTLEMENT_REVIEW',    'Legal Settlement Review',     40, true, true, 'Settlement offers awaiting approval'),
    (v_group_id, 'LEGAL_FEE_POSTING',          'Legal Fee Posting',           50, true, true, 'Cases awaiting fee posting'),
    (v_group_id, 'LEGAL_ENFORCEMENT',          'Legal Enforcement',           60, true, true, 'Enforcement stage workbasket')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_group_id FROM public.core_reference_group WHERE group_code = 'LG_ASSIGNMENT_STRATEGY';
  IF v_group_id IS NULL THEN
    INSERT INTO public.core_reference_group (group_code, group_name, module_code, is_active, is_system)
    VALUES ('LG_ASSIGNMENT_STRATEGY', 'Legal Assignment Strategies', 'LEGAL', true, true)
    RETURNING id INTO v_group_id;
  END IF;

  INSERT INTO public.core_reference_value (group_id, value_code, value_label, sort_order, is_active, is_system, description)
  VALUES
    (v_group_id, 'WORKBASKET_ONLY',   'Workbasket only (no officer)',     10, true, true, 'Cases sit in workbasket until picked up'),
    (v_group_id, 'MANUAL_ASSIGNMENT', 'Manual assignment by manager',     20, true, true, 'Legal manager assigns officer manually'),
    (v_group_id, 'ROUND_ROBIN',       'Round-robin across legal officers',30, true, true, 'Distribute evenly across eligible officers'),
    (v_group_id, 'BY_WORKLOAD',       'By workload (lowest open cases)',  40, true, true, 'Pick officer with fewest open cases'),
    (v_group_id, 'BY_CASE_TYPE',      'By case type specialisation',      50, true, true, 'Route to officer skilled in that case type'),
    (v_group_id, 'BY_PRIORITY',       'By priority band',                 60, true, true, 'Higher priority routes to senior officers'),
    (v_group_id, 'BY_STAGE',          'By case stage',                    70, true, true, 'Stage-based assignment')
  ON CONFLICT DO NOTHING;
END $$;
