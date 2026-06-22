
INSERT INTO public.core_dms_document_type (module_code, document_type_code, document_type_name, description, sort_order, is_confidential_default)
VALUES
  ('LEGAL','COMPLIANCE_CASE_FILE','Compliance Case File','Source compliance file referred to Legal',10,false),
  ('LEGAL','CONTRIBUTION_ASSESSMENT','Contribution Assessment','Contribution assessment evidence',11,false),
  ('LEGAL','INSPECTION_REPORT','Inspection Report','Field inspection report',12,false),
  ('LEGAL','PAYMENT_ARRANGEMENT_REF','Payment Arrangement (Referral)','Existing arrangement attached to referral',13,false),
  ('LEGAL','BREACH_REPORT','Breach Report','Breach of arrangement report',14,false),
  ('LEGAL','EMPLOYER_CORRESPONDENCE','Employer Correspondence','Letters/emails to/from the employer',20,false),
  ('LEGAL','PAYMENT_EVIDENCE','Payment Evidence','Proof of payments / receipts',21,false),
  ('LEGAL','CONTRIBUTION_RECORD','Contribution Record','Contribution ledger extract',22,false),
  ('LEGAL','EMPLOYEE_RECORD','Employee Record','Employee/employment record',23,false),
  ('LEGAL','WITNESS_STATEMENT','Witness Statement','Witness statement',24,true),
  ('LEGAL','AFFIDAVIT','Affidavit','Sworn affidavit',25,true),
  ('LEGAL','SUPPORTING_EVIDENCE','Supporting Evidence','Generic supporting evidence',26,false),
  ('LEGAL','CLAIM_FORM','Claim Form','Court claim form',30,false),
  ('LEGAL','SUMMONS','Summons','Court summons',31,false),
  ('LEGAL','ADJOURNMENT_NOTICE','Adjournment Notice','Hearing adjournment notice',32,false),
  ('LEGAL','COURT_MINUTES','Court Minutes','Minutes of court proceedings',33,false),
  ('LEGAL','WARRANT_OR_EXECUTION_DOCUMENT','Warrant / Execution Document','Warrant or writ of execution',34,true),
  ('LEGAL','PAYMENT_PLAN_LEGAL','Legal Payment Plan','Court-ordered or legal payment plan',40,false),
  ('LEGAL','DEFAULT_NOTICE','Default Notice','Default notice issued',41,false),
  ('LEGAL','RECOVERY_NOTICE','Recovery Notice','Recovery action notice',42,false),
  ('LEGAL','ENFORCEMENT_NOTICE','Enforcement Notice','Enforcement notice',43,false),
  ('LEGAL','GARNISHMENT_NOTICE','Garnishment Notice','Wage / bank garnishment notice',44,true),
  ('LEGAL','FEE_WAIVER_REQUEST','Fee Waiver Request','Fee waiver application',50,false),
  ('LEGAL','FEE_WAIVER_APPROVAL','Fee Waiver Approval','Approved fee waiver',51,false),
  ('LEGAL','FEE_WAIVER_REJECTION','Fee Waiver Rejection','Rejected fee waiver',52,false),
  ('LEGAL','FINAL_DEMAND','Final Demand','Final demand letter (generated)',60,false),
  ('LEGAL','HEARING_LETTER','Hearing Letter','Hearing notification letter (generated)',61,false),
  ('LEGAL','JUDGMENT_NOTICE','Judgment Notice','Judgment notification (generated)',62,false),
  ('LEGAL','CLOSURE_MEMO','Closure Memo','Case closure memo (generated)',63,false),
  ('LEGAL','LEGAL_REVIEW_NOTE','Legal Review Note','Internal review note',70,true),
  ('LEGAL','LEGAL_OPINION','Legal Opinion','Internal legal opinion',71,true),
  ('LEGAL','CASE_ASSIGNMENT_MEMO','Case Assignment Memo','Case assignment memo',72,true),
  ('LEGAL','CLOSURE_RECOMMENDATION','Closure Recommendation','Closure recommendation',73,true)
ON CONFLICT (module_code, document_type_code) DO NOTHING;

DO $$
DECLARE
  v_module_id uuid := '1e9a1000-0000-0000-0000-000000000120';
  v_action_codes text[] := ARRAY[
    'LEGAL_DOCUMENT_VIEW','LEGAL_DOCUMENT_UPLOAD','LEGAL_DOCUMENT_LINK',
    'LEGAL_DOCUMENT_UNLINK','LEGAL_DOCUMENT_CONFIDENTIAL_VIEW','LEGAL_DOCUMENT_MARK_COURT_FILED'
  ];
  v_code text;
  v_action_id uuid;
  v_role_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_role_ids
  FROM public.roles
  WHERE role_name IN ('LEGAL_ADMIN','LEGAL_MANAGER','LEGAL_OFFICER','LEGAL_READ_ONLY','Admin','Application Admin');

  FOREACH v_code IN ARRAY v_action_codes LOOP
    INSERT INTO public.module_actions (id, module_id, action_name, display_name, is_enabled)
    VALUES (gen_random_uuid(), v_module_id, v_code, initcap(replace(v_code,'_',' ')), true)
    ON CONFLICT (module_id, action_name) DO NOTHING;

    SELECT id INTO v_action_id FROM public.module_actions
      WHERE module_id = v_module_id AND action_name = v_code LIMIT 1;

    IF v_action_id IS NOT NULL AND v_role_ids IS NOT NULL THEN
      INSERT INTO public.role_permissions (id, role_id, module_id, action_id, is_granted)
      SELECT gen_random_uuid(), unnest(v_role_ids), v_module_id, v_action_id, true
      ON CONFLICT (role_id, module_id, action_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.app_modules (id, name, display_name, route, icon, sort_order, is_enabled, show_in_menu)
VALUES (
  '1e9a1000-0000-0000-0000-0000000001a0',
  'admin_dms_api_test',
  'DMS API Test Harness',
  '/admin/dms-api-test',
  'TestTube',
  920,
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_module_id uuid := '1e9a1000-0000-0000-0000-0000000001a0';
  v_action_id uuid;
  v_role_ids uuid[];
BEGIN
  INSERT INTO public.module_actions (id, module_id, action_name, display_name, is_enabled)
  VALUES (gen_random_uuid(), v_module_id, 'view', 'View', true)
  ON CONFLICT (module_id, action_name) DO NOTHING;

  SELECT id INTO v_action_id FROM public.module_actions
    WHERE module_id = v_module_id AND action_name = 'view' LIMIT 1;

  SELECT array_agg(id) INTO v_role_ids FROM public.roles
    WHERE role_name IN ('Admin','Application Admin','LEGAL_ADMIN');

  IF v_action_id IS NOT NULL AND v_role_ids IS NOT NULL THEN
    INSERT INTO public.role_permissions (id, role_id, module_id, action_id, is_granted)
    SELECT gen_random_uuid(), unnest(v_role_ids), v_module_id, v_action_id, true
    ON CONFLICT (role_id, module_id, action_id) DO NOTHING;
  END IF;
END $$;
