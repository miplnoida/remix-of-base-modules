
DO $$
DECLARE
  rec RECORD;
  tid UUID;
  pairs JSONB := '[
    {"stage":"REFERRAL_RECEIVED","items":[
      {"code":"LG-TPL-REF-ACCEPT","required":true,"default":true},
      {"code":"LG-TPL-REF-RETURN","required":false,"default":false},
      {"code":"LG-TPL-CASE-ASSIGNMENT","required":false,"default":false}
    ]},
    {"stage":"LEGAL_REVIEW","items":[
      {"code":"LG-TPL-LEGAL-MEMO","required":false,"default":true},
      {"code":"LG-TPL-INVESTIGATION","required":false,"default":false}
    ]},
    {"stage":"INFORMATION_REQUESTED","items":[
      {"code":"LG-TPL-INVESTIGATION","required":false,"default":true}
    ]},
    {"stage":"DEMAND_NOTICE","items":[
      {"code":"LG-TPL-DEMAND-LETTER","required":true,"default":true}
    ]},
    {"stage":"FINAL_DEMAND","items":[
      {"code":"LG-TPL-FINAL-DEMAND","required":true,"default":true},
      {"code":"LG-TPL-NBA","required":false,"default":false}
    ]},
    {"stage":"PAYMENT_PLAN_NEGOTIATION","items":[
      {"code":"LG-TPL-PAYPLAN-LEGAL","required":false,"default":true},
      {"code":"LG-TPL-ARR-BREACH","required":false,"default":false},
      {"code":"LG-TPL-PAYMENT-DEFAULT","required":false,"default":false}
    ]},
    {"stage":"SETTLEMENT_NEGOTIATION","items":[
      {"code":"LG-TPL-SETTLEMENT-OFFER","required":false,"default":true},
      {"code":"LG-TPL-SETTLE-ACCEPT","required":false,"default":false},
      {"code":"LG-TPL-SETTLE-REJECT","required":false,"default":false},
      {"code":"LG-TPL-SETTLE-TERMS","required":false,"default":false}
    ]},
    {"stage":"COURT_PREPARATION","items":[
      {"code":"LG-TPL-HEARING-PREP","required":false,"default":true},
      {"code":"LG-TPL-COURT-COVER","required":true,"default":false},
      {"code":"LG-TPL-EVIDENCE-COVER","required":false,"default":false},
      {"code":"LG-TPL-WITNESS-REQUEST","required":false,"default":false}
    ]},
    {"stage":"COURT_FILING","items":[
      {"code":"LG-TPL-COURT-COVER","required":true,"default":true},
      {"code":"LG-TPL-SUMMONS-COVER","required":false,"default":false}
    ]},
    {"stage":"HEARING_SCHEDULED","items":[
      {"code":"LG-TPL-HEARING-NOTICE","required":true,"default":true},
      {"code":"LG-TPL-HEARING-REMINDER","required":false,"default":false},
      {"code":"LG-TPL-ADJOURNMENT","required":false,"default":false},
      {"code":"LG-TPL-HEARING-RESCHEDULE","required":false,"default":false},
      {"code":"LG-TPL-HEARING-CANCEL","required":false,"default":false}
    ]},
    {"stage":"HEARING_COMPLETED","items":[
      {"code":"LG-TPL-PRELIM-DECISION","required":false,"default":true},
      {"code":"LG-TPL-FINAL-DECISION","required":false,"default":false}
    ]},
    {"stage":"JUDGMENT_PENDING","items":[
      {"code":"LG-TPL-INTERIM-ORDER","required":false,"default":true}
    ]},
    {"stage":"JUDGMENT_GRANTED","items":[
      {"code":"LG-TPL-JUDGMENT","required":true,"default":true},
      {"code":"LG-TPL-FINAL-ORDER","required":false,"default":false}
    ]},
    {"stage":"ENFORCEMENT","items":[
      {"code":"LG-TPL-ENFORCEMENT","required":true,"default":true},
      {"code":"LG-TPL-GARNISHMENT","required":false,"default":false},
      {"code":"LG-TPL-EXECUTION","required":false,"default":false},
      {"code":"LG-TPL-RECOVERY-NOTICE","required":false,"default":false}
    ]},
    {"stage":"RECOVERY_MONITORING","items":[
      {"code":"LG-TPL-RECOVERY-NOTICE","required":false,"default":true}
    ]},
    {"stage":"SATISFIED","items":[
      {"code":"LG-TPL-JUDG-SATISFIED","required":true,"default":true},
      {"code":"LG-TPL-MATTER-RESOLVED","required":false,"default":false}
    ]},
    {"stage":"WITHDRAWN","items":[
      {"code":"LG-TPL-WITHDRAWAL-NOTICE","required":false,"default":true}
    ]},
    {"stage":"CLOSED","items":[
      {"code":"LG-TPL-CASE-CLOSURE","required":true,"default":true},
      {"code":"LG-TPL-WITHDRAWAL-NOTICE","required":false,"default":false}
    ]}
  ]'::jsonb;
  m JSONB; item JSONB; sort_n INT;
BEGIN
  -- Clean previously partial seed rows to avoid duplicates
  DELETE FROM public.lg_stage_template_mapping WHERE created_by = 'SEED-LG-STAGE';

  FOR m IN SELECT * FROM jsonb_array_elements(pairs) LOOP
    sort_n := 10;
    FOR item IN SELECT * FROM jsonb_array_elements(m->'items') LOOP
      SELECT id INTO tid FROM public.core_template
        WHERE code = (item->>'code') AND module_code = 'LEGAL'
        ORDER BY created_at ASC LIMIT 1;
      IF tid IS NOT NULL THEN
        INSERT INTO public.lg_stage_template_mapping (
          country_code, case_type_code, stage_code, template_id,
          is_required, is_default, auto_generate_allowed, approval_required, sort_order, created_by
        ) VALUES (
          'KN','ANY',(m->>'stage'),tid,
          COALESCE((item->>'required')::boolean,false),
          COALESCE((item->>'default')::boolean,false),
          true, false, sort_n, 'SEED-LG-STAGE'
        )
        ON CONFLICT (country_code, case_type_code, stage_code, template_id) DO NOTHING;
      END IF;
      sort_n := sort_n + 10;
    END LOOP;
  END LOOP;
END $$;
