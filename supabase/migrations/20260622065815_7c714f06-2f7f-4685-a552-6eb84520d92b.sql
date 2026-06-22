
-- ============================================================
-- 1. lg_stage_template_mapping
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lg_stage_template_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'KN',
  case_type_code TEXT NOT NULL DEFAULT 'ANY',
  stage_code TEXT NOT NULL,
  template_id UUID NOT NULL REFERENCES public.core_template(id) ON DELETE CASCADE,
  template_version_id UUID NULL REFERENCES public.core_template_version(id) ON DELETE SET NULL,
  trigger_event TEXT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  auto_generate_allowed BOOLEAN NOT NULL DEFAULT false,
  approval_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, case_type_code, stage_code, template_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_stage_template_mapping TO authenticated;
GRANT ALL ON public.lg_stage_template_mapping TO service_role;
CREATE INDEX IF NOT EXISTS ix_lg_stm_stage ON public.lg_stage_template_mapping (country_code, case_type_code, stage_code, is_active);

-- 2. lg_stage_reference_mapping
CREATE TABLE IF NOT EXISTS public.lg_stage_reference_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'KN',
  case_type_code TEXT NOT NULL DEFAULT 'ANY',
  stage_code TEXT NOT NULL,
  legal_reference_id UUID NOT NULL REFERENCES public.core_legal_reference(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 100,
  usage_note TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, case_type_code, stage_code, legal_reference_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_stage_reference_mapping TO authenticated;
GRANT ALL ON public.lg_stage_reference_mapping TO service_role;
CREATE INDEX IF NOT EXISTS ix_lg_srm_stage ON public.lg_stage_reference_mapping (country_code, case_type_code, stage_code, is_active);

-- 3. lg_stage_action_rule
CREATE TABLE IF NOT EXISTS public.lg_stage_action_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'KN',
  case_type_code TEXT NOT NULL DEFAULT 'ANY',
  stage_code TEXT NOT NULL,
  action_code TEXT NOT NULL,
  action_label TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  required_role TEXT NULL,
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, case_type_code, stage_code, action_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_stage_action_rule TO authenticated;
GRANT ALL ON public.lg_stage_action_rule TO service_role;

-- 4. lg_stage_document_rule
CREATE TABLE IF NOT EXISTS public.lg_stage_document_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'KN',
  case_type_code TEXT NOT NULL DEFAULT 'ANY',
  stage_code TEXT NOT NULL,
  doc_type_code TEXT NOT NULL,
  doc_label TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, case_type_code, stage_code, doc_type_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_stage_document_rule TO authenticated;
GRANT ALL ON public.lg_stage_document_rule TO service_role;

-- 5. lg_stage_transition_rule
CREATE TABLE IF NOT EXISTS public.lg_stage_transition_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'KN',
  case_type_code TEXT NOT NULL DEFAULT 'ANY',
  from_stage_code TEXT NOT NULL,
  to_stage_code TEXT NOT NULL,
  rule_severity TEXT NOT NULL DEFAULT 'WARN', -- WARN | BLOCK
  require_all_required_templates BOOLEAN NOT NULL DEFAULT true,
  require_all_required_documents BOOLEAN NOT NULL DEFAULT true,
  require_all_required_references BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, case_type_code, from_stage_code, to_stage_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_stage_transition_rule TO authenticated;
GRANT ALL ON public.lg_stage_transition_rule TO service_role;

-- updated_at trigger (reuse if exists)
CREATE OR REPLACE FUNCTION public.lg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql SET search_path = public;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['lg_stage_template_mapping','lg_stage_reference_mapping','lg_stage_action_rule','lg_stage_document_rule','lg_stage_transition_rule']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at()', t, t);
  END LOOP;
END $$;

-- ============================================================
-- Seed stage-template mappings using existing core_template codes
-- ============================================================
DO $$
DECLARE
  rec RECORD;
  tid UUID;
  sort_n INT;
  mappings JSONB := '[
    {"stage":"REFERRAL_RECEIVED","codes":["LEGAL_REFERRAL_ACCEPTANCE","LEGAL_REFERRAL_RETURN_FOR_INFORMATION","LEGAL_CASE_ASSIGNMENT_MEMO"],"required":["LEGAL_REFERRAL_ACCEPTANCE"]},
    {"stage":"LEGAL_REVIEW","codes":["REQUEST_FOR_ADDITIONAL_INFORMATION","LEGAL_REVIEW_MEMO","INTERNAL_LEGAL_OPINION"],"required":[]},
    {"stage":"INFORMATION_REQUESTED","codes":["REQUEST_FOR_ADDITIONAL_INFORMATION"],"required":["REQUEST_FOR_ADDITIONAL_INFORMATION"]},
    {"stage":"DEMAND_NOTICE","codes":["LEGAL_DEMAND_LETTER"],"required":["LEGAL_DEMAND_LETTER"]},
    {"stage":"FINAL_DEMAND","codes":["FINAL_DEMAND_LETTER","NOTICE_BEFORE_ACTION"],"required":["FINAL_DEMAND_LETTER"]},
    {"stage":"PAYMENT_PLAN_NEGOTIATION","codes":["PAYMENT_PLAN_LEGAL_CONFIRMATION","PAYMENT_ARRANGEMENT_BREACH_NOTICE"],"required":[]},
    {"stage":"SETTLEMENT_NEGOTIATION","codes":["SETTLEMENT_OFFER","SETTLEMENT_ACCEPTANCE","SETTLEMENT_REJECTION","SETTLEMENT_TERMS_CONFIRMATION"],"required":[]},
    {"stage":"COURT_PREPARATION","codes":["COURT_FILING_COVER_LETTER","EVIDENCE_SUBMISSION_COVER_LETTER","WITNESS_REQUEST_LETTER"],"required":["COURT_FILING_COVER_LETTER"]},
    {"stage":"COURT_FILING","codes":["COURT_FILING_COVER_LETTER","SUMMONS_COVER_LETTER"],"required":["COURT_FILING_COVER_LETTER"]},
    {"stage":"HEARING_SCHEDULED","codes":["HEARING_NOTICE","HEARING_REMINDER","ADJOURNMENT_NOTICE"],"required":["HEARING_NOTICE"]},
    {"stage":"HEARING_COMPLETED","codes":["HEARING_OUTCOME_NOTICE"],"required":["HEARING_OUTCOME_NOTICE"]},
    {"stage":"JUDGMENT_PENDING","codes":[],"required":[]},
    {"stage":"JUDGMENT_GRANTED","codes":["JUDGMENT_NOTICE","JUDGMENT_PAYMENT_INSTRUCTION"],"required":["JUDGMENT_NOTICE"]},
    {"stage":"ENFORCEMENT","codes":["ENFORCEMENT_NOTICE","GARNISHMENT_NOTICE","EXECUTION_ACTION_NOTICE","RECOVERY_ACTION_NOTICE"],"required":["ENFORCEMENT_NOTICE"]},
    {"stage":"RECOVERY_MONITORING","codes":[],"required":[]},
    {"stage":"SATISFIED","codes":["JUDGMENT_SATISFACTION_NOTICE","MATTER_RESOLVED_NOTICE"],"required":["JUDGMENT_SATISFACTION_NOTICE"]},
    {"stage":"WITHDRAWN","codes":["WITHDRAWAL_NOTICE"],"required":[]},
    {"stage":"CLOSED","codes":["LEGAL_CASE_CLOSURE_MEMO","WITHDRAWAL_NOTICE"],"required":["LEGAL_CASE_CLOSURE_MEMO"]}
  ]'::jsonb;
  m JSONB;
  c TEXT;
BEGIN
  FOR m IN SELECT * FROM jsonb_array_elements(mappings) LOOP
    sort_n := 10;
    FOR c IN SELECT jsonb_array_elements_text(m->'codes') LOOP
      SELECT id INTO tid FROM public.core_template
        WHERE code = c OR code = ('LG-TPL-' || c) OR code ILIKE ('%' || c || '%')
        ORDER BY (CASE WHEN code = c THEN 0 WHEN code = ('LG-TPL-' || c) THEN 1 ELSE 2 END)
        LIMIT 1;
      IF tid IS NOT NULL THEN
        INSERT INTO public.lg_stage_template_mapping (
          country_code, case_type_code, stage_code, template_id,
          is_required, is_default, auto_generate_allowed, approval_required, sort_order, created_by
        ) VALUES (
          'KN','ANY',(m->>'stage'),tid,
          (m->'required' ? c),
          (sort_n = 10),
          true, false, sort_n, 'SEED-LG-STAGE'
        )
        ON CONFLICT (country_code, case_type_code, stage_code, template_id) DO NOTHING;
      END IF;
      sort_n := sort_n + 10;
    END LOOP;
  END LOOP;
END $$;

-- Default transition rule: WARN for all stages
INSERT INTO public.lg_stage_transition_rule (country_code, case_type_code, from_stage_code, to_stage_code, rule_severity, notes)
SELECT 'KN','ANY', s.from_stage, s.to_stage, 'WARN', 'Default seeded rule'
FROM (VALUES
  ('REFERRAL_RECEIVED','LEGAL_REVIEW'),
  ('LEGAL_REVIEW','INFORMATION_REQUESTED'),
  ('LEGAL_REVIEW','DEMAND_NOTICE'),
  ('INFORMATION_REQUESTED','DEMAND_NOTICE'),
  ('DEMAND_NOTICE','FINAL_DEMAND'),
  ('FINAL_DEMAND','PAYMENT_PLAN_NEGOTIATION'),
  ('FINAL_DEMAND','SETTLEMENT_NEGOTIATION'),
  ('FINAL_DEMAND','COURT_PREPARATION'),
  ('COURT_PREPARATION','COURT_FILING'),
  ('COURT_FILING','HEARING_SCHEDULED'),
  ('HEARING_SCHEDULED','HEARING_COMPLETED'),
  ('HEARING_COMPLETED','JUDGMENT_PENDING'),
  ('JUDGMENT_PENDING','JUDGMENT_GRANTED'),
  ('JUDGMENT_GRANTED','ENFORCEMENT'),
  ('ENFORCEMENT','RECOVERY_MONITORING'),
  ('RECOVERY_MONITORING','SATISFIED'),
  ('SATISFIED','CLOSED'),
  ('WITHDRAWN','CLOSED')
) AS s(from_stage, to_stage)
ON CONFLICT DO NOTHING;

-- ============================================================
-- RPC: validate transition for a case to a target stage
-- ============================================================
CREATE OR REPLACE FUNCTION public.lg_validate_stage_transition(p_case_id UUID, p_target_stage TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case RECORD;
  v_rule RECORD;
  v_missing_tpls TEXT[] := '{}';
  v_missing_docs TEXT[] := '{}';
  v_missing_refs TEXT[] := '{}';
  v_severity TEXT := 'WARN';
  v_blocked BOOLEAN := false;
BEGIN
  SELECT * INTO v_case FROM public.lg_case WHERE id = p_case_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'case_not_found');
  END IF;

  SELECT * INTO v_rule FROM public.lg_stage_transition_rule
    WHERE country_code = 'KN' AND case_type_code IN ('ANY', COALESCE(v_case.case_type_code,'ANY'))
      AND from_stage_code = COALESCE(v_case.stage_code, 'ANY')
      AND to_stage_code = p_target_stage AND is_active
    ORDER BY (case_type_code='ANY') ASC LIMIT 1;

  IF FOUND THEN v_severity := v_rule.rule_severity; END IF;

  -- Required templates not yet generated at current stage
  SELECT COALESCE(array_agg(ct.code), '{}') INTO v_missing_tpls
  FROM public.lg_stage_template_mapping m
  JOIN public.core_template ct ON ct.id = m.template_id
  WHERE m.country_code='KN' AND m.is_active AND m.is_required
    AND m.stage_code = COALESCE(v_case.stage_code,'')
    AND m.case_type_code IN ('ANY', COALESCE(v_case.case_type_code,'ANY'))
    AND NOT EXISTS (
      SELECT 1 FROM public.core_generated_document g
      WHERE g.entity_type='lg_case' AND g.entity_id = p_case_id
        AND g.template_id = m.template_id
        AND g.case_stage_code = v_case.stage_code
    );

  -- Required documents not linked
  SELECT COALESCE(array_agg(d.doc_type_code), '{}') INTO v_missing_docs
  FROM public.lg_stage_document_rule d
  WHERE d.country_code='KN' AND d.is_active AND d.is_required
    AND d.stage_code = COALESCE(v_case.stage_code,'')
    AND d.case_type_code IN ('ANY', COALESCE(v_case.case_type_code,'ANY'))
    AND NOT EXISTS (
      SELECT 1 FROM public.lg_document_link l
      WHERE l.case_id = p_case_id AND l.doc_type_code = d.doc_type_code
    );

  -- Required references missing for current stage
  SELECT COALESCE(array_agg(r.legal_reference_id::text), '{}') INTO v_missing_refs
  FROM public.lg_stage_reference_mapping r
  WHERE r.country_code='KN' AND r.is_active AND r.is_required
    AND r.stage_code = COALESCE(v_case.stage_code,'')
    AND r.case_type_code IN ('ANY', COALESCE(v_case.case_type_code,'ANY'));

  v_blocked := v_severity = 'BLOCK' AND (
    (COALESCE(v_rule.require_all_required_templates, true) AND array_length(v_missing_tpls,1) IS NOT NULL) OR
    (COALESCE(v_rule.require_all_required_documents, true) AND array_length(v_missing_docs,1) IS NOT NULL) OR
    (COALESCE(v_rule.require_all_required_references, false) AND array_length(v_missing_refs,1) IS NOT NULL)
  );

  RETURN jsonb_build_object(
    'ok', NOT v_blocked,
    'severity', v_severity,
    'from_stage', v_case.stage_code,
    'to_stage', p_target_stage,
    'missing_templates', to_jsonb(v_missing_tpls),
    'missing_documents', to_jsonb(v_missing_docs),
    'missing_references', to_jsonb(v_missing_refs)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.lg_validate_stage_transition(UUID, TEXT) TO authenticated, service_role;
