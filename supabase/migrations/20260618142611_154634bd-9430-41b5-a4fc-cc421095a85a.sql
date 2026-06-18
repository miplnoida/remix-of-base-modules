
-- Helper: upsert reference group and return id
DO $$
DECLARE
  v_group_id uuid;
  rec RECORD;
  i int;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('BN_PARTICIPANT_ROLE_CATEGORY','Participant Role Category', ARRAY['CLAIMANT|Claimant','INSURED|Insured','BENEFICIARY|Beneficiary','EMPLOYER|Employer','PROVIDER|Provider','OFFICER|Officer','THIRD_PARTY|Third Party']),
      ('BN_PROOF_REQUIREMENT_CATEGORY','Proof Requirement Category', ARRAY['IDENTITY|Identity','RELATIONSHIP|Relationship','AUTHORITY|Authority','MEDICAL|Medical','EMPLOYMENT|Employment','FINANCIAL|Financial','RESIDENCE|Residence','OTHER|Other']),
      ('BN_ONLINE_ACCESS_RULE','Online Access Rule', ARRAY['NOT_ALLOWED|Not Allowed','REGISTER_AND_ACCESS|Register and Access','VIEW_ONLY|View Only','LINKED_ONLY|Linked Only']),
      ('BN_RELATIONSHIP_CATEGORY','Relationship Category', ARRAY['SPOUSE|Spouse','CHILD|Child','PARENT|Parent','SIBLING|Sibling','DEPENDANT|Dependant','OTHER|Other']),
      ('BN_AUTHORITY_CATEGORY','Authority Category', ARRAY['GUARDIAN|Guardian','POWER_OF_ATTORNEY|Power of Attorney','EXECUTOR|Executor','COURT_ORDER|Court Order','EMPLOYER_REP|Employer Representative','OTHER|Other']),
      ('BN_VERIFICATION_METHOD','Verification Method', ARRAY['NONE|None','ID_DOCUMENT|ID Document','BIOMETRIC|Biometric','IN_PERSON|In Person','KBA|Knowledge-Based','EMAIL|Email OTP','PHONE_OTP|Phone OTP']),
      ('BN_COMMUNICATION_ELIGIBILITY','Communication Eligibility', ARRAY['NONE|None','EMAIL_ONLY|Email Only','SMS_ONLY|SMS Only','EMAIL_AND_SMS|Email and SMS','POSTAL|Postal','ALL|All Channels']),
      ('BN_PAYMENT_ELIGIBILITY','Payment Eligibility', ARRAY['NONE|None','BANK_TRANSFER|Bank Transfer','CHEQUE|Cheque','CASH|Cash','MOBILE_WALLET|Mobile Wallet'])
    ) AS t(gcode, gname, vals)
  LOOP
    INSERT INTO bn_reference_group (group_code, group_name, module_code, is_system, is_active)
    VALUES (rec.gcode, rec.gname, 'BN', true, true)
    ON CONFLICT (group_code) DO UPDATE SET group_name = EXCLUDED.group_name
    RETURNING id INTO v_group_id;

    i := 0;
    FOR i IN 1 .. array_length(rec.vals, 1) LOOP
      INSERT INTO bn_reference_value (group_id, value_code, value_label, sort_order, is_system, is_active)
      VALUES (
        v_group_id,
        split_part(rec.vals[i], '|', 1),
        split_part(rec.vals[i], '|', 2),
        i * 10,
        true,
        true
      )
      ON CONFLICT (group_id, value_code) DO UPDATE SET value_label = EXCLUDED.value_label, is_active = true;
    END LOOP;
  END LOOP;

  -- Add missing participant types
  SELECT id INTO v_group_id FROM bn_reference_group WHERE group_code = 'BN_PARTICIPANT_TYPE';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO bn_reference_value (group_id, value_code, value_label, sort_order, is_system, is_active) VALUES
      (v_group_id, 'DEPENDENT', 'Dependent', 110, true, true),
      (v_group_id, 'MEDICAL_PROVIDER', 'Medical Provider', 120, true, true),
      (v_group_id, 'FUNERAL_ARRANGER', 'Funeral Arranger', 130, true, true),
      (v_group_id, 'EXECUTOR_OR_ESTATE', 'Executor / Estate', 140, true, true)
    ON CONFLICT (group_id, value_code) DO NOTHING;
  END IF;
END $$;
