
ALTER TABLE public.module_legal_reference_mapping
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(32),
  ADD COLUMN IF NOT EXISTS usage_context TEXT,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

UPDATE public.module_legal_reference_mapping
SET entity_type = UPPER(REGEXP_REPLACE(entity_table, '^(lg_|bn_|ce_|core_)', ''))
WHERE entity_type IS NULL;

CREATE OR REPLACE VIEW public.core_legal_reference AS
SELECT id, country_code, jurisdiction AS jurisdiction_name, ref_code, ref_type, short_title,
       act_name, chapter, section, subsection, regulation, full_reference_text, ref_url,
       effective_from, effective_to, status, version_number, supersedes_id, tags, notes,
       is_active, created_by, created_at, updated_by, updated_at
FROM public.legal_reference;

CREATE OR REPLACE VIEW public.core_module_legal_reference AS
SELECT id, legal_reference_id, module_code,
       COALESCE(entity_type, UPPER(REGEXP_REPLACE(entity_table, '^(lg_|bn_|ce_|core_)', ''))) AS entity_type,
       entity_table, entity_id,
       COALESCE(usage_context, role) AS usage_context,
       role, is_required, is_default, notes, created_by, created_at, updated_by, updated_at
FROM public.module_legal_reference_mapping;

GRANT SELECT ON public.core_legal_reference TO authenticated, anon;
GRANT SELECT ON public.core_module_legal_reference TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.sync_legal_reference_to_bn()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.bn_country_legal_ref
      (id, country_code, ref_code, ref_title, ref_section, ref_url,
       effective_from, effective_to, version_number, supersedes_id, notes, is_active,
       created_by, created_at, updated_by, updated_at)
    VALUES
      (NEW.id, NEW.country_code, NEW.ref_code, COALESCE(NEW.short_title, NEW.ref_code),
       NEW.section, NEW.ref_url, NEW.effective_from, NEW.effective_to,
       NEW.version_number, NEW.supersedes_id, NEW.notes, NEW.is_active,
       NEW.created_by, NEW.created_at, NEW.updated_by, NEW.updated_at)
    ON CONFLICT (country_code, ref_code, version_number) DO NOTHING;
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE public.bn_country_legal_ref SET
      ref_title = COALESCE(NEW.short_title, NEW.ref_code),
      ref_section = NEW.section,
      ref_url = NEW.ref_url,
      effective_from = NEW.effective_from,
      effective_to = NEW.effective_to,
      supersedes_id = NEW.supersedes_id,
      notes = NEW.notes,
      is_active = NEW.is_active,
      updated_by = NEW.updated_by,
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_sync_legal_to_bn ON public.legal_reference;
CREATE TRIGGER trg_sync_legal_to_bn
AFTER INSERT OR UPDATE ON public.legal_reference
FOR EACH ROW EXECUTE FUNCTION public.sync_legal_reference_to_bn();

INSERT INTO public.legal_reference
  (country_code, ref_code, ref_type, short_title, act_name, section, full_reference_text, effective_from, status, version_number, is_active, tags, created_by)
VALUES
  ('SKN','SSA_S46_RECOVERY','ACT','Recovery of Contributions','Social Security Act, Cap 329','46','Social Security Act, Cap 329, Section 46 — Recovery of unpaid contributions from employers','2020-01-01','ACTIVE',1,true,ARRAY['legal','employer','recovery'],'SEED'),
  ('SKN','SSA_S20_REG','ACT','Failure to Register','Social Security Act, Cap 329','20','Social Security Act, Cap 329, Section 20 — Obligation of employers to register','2020-01-01','ACTIVE',1,true,ARRAY['legal','employer','registration'],'SEED'),
  ('SKN','SSA_S26_REMIT','ACT','Failure to Remit Contributions','Social Security Act, Cap 329','26','Social Security Act, Cap 329, Section 26 — Duty to remit deducted contributions','2020-01-01','ACTIVE',1,true,ARRAY['legal','employer','remittance'],'SEED'),
  ('SKN','SSA_S48_ARREARS','ACT','Arrears and Late Payment','Social Security Act, Cap 329','48','Social Security Act, Cap 329, Section 48 — Arrears recovery and late-payment surcharge','2020-01-01','ACTIVE',1,true,ARRAY['legal','arrears'],'SEED'),
  ('SKN','SSA_S49_PENALTY','ACT','Penalties and Interest','Social Security Act, Cap 329','49','Social Security Act, Cap 329, Section 49 — Penalties and interest on overdue contributions','2020-01-01','ACTIVE',1,true,ARRAY['legal','penalty','interest'],'SEED'),
  ('SKN','SSA_S55_INSPECT','ACT','Inspection and Compliance Enforcement','Social Security Act, Cap 329','55','Social Security Act, Cap 329, Section 55 — Inspectors powers of entry, examination and enforcement','2020-01-01','ACTIVE',1,true,ARRAY['legal','inspection'],'SEED'),
  ('SKN','SSA_S60_PROSECUTE','ACT','Prosecution / Legal Action','Social Security Act, Cap 329','60','Social Security Act, Cap 329, Section 60 — Offences and prosecution','2020-01-01','ACTIVE',1,true,ARRAY['legal','prosecution'],'SEED'),
  ('SKN','SSR_PAY_ARR','REGULATION','Payment Arrangement','Social Security Regulations','12','Social Security Regulations, Reg 12 — Approved payment arrangements','2020-01-01','ACTIVE',1,true,ARRAY['legal','payment-plan'],'SEED'),
  ('SKN','SSR_PAY_BREACH','REGULATION','Breach of Payment Arrangement','Social Security Regulations','12A','Social Security Regulations, Reg 12A — Consequences of breach of payment arrangement','2020-01-01','ACTIVE',1,true,ARRAY['legal','payment-plan','breach'],'SEED'),
  ('SKN','COURT_ORDER_PAY','RULE','Court-Ordered Payment Plan','Magistrates Court Rules','Order 45','Magistrates Court Rules, Order 45 — Court-ordered installment payments','2020-01-01','ACTIVE',1,true,ARRAY['legal','court','payment'],'SEED'),
  ('SKN','SETTLE_AGREE','POLICY','Settlement Agreement','SSB Legal Policy','SET-01','SSB Legal Policy SET-01 — Settlement agreement framework','2020-01-01','ACTIVE',1,true,ARRAY['legal','settlement'],'SEED'),
  ('SKN','MCA_FILE_CLAIM','ACT','Filing of Claim','Magistrates Code of Procedure Act','11','Magistrates Code of Procedure Act, Section 11 — Filing of civil claims','2020-01-01','ACTIVE',1,true,ARRAY['legal','court','filing'],'SEED'),
  ('SKN','MCA_SUMMONS','ACT','Summons / Hearing Notice','Magistrates Code of Procedure Act','17','Magistrates Code of Procedure Act, Section 17 — Issuance of summons and hearing notices','2020-01-01','ACTIVE',1,true,ARRAY['legal','court','hearing'],'SEED'),
  ('SKN','MCA_ADJOURN','ACT','Adjournment Notice','Magistrates Code of Procedure Act','22','Magistrates Code of Procedure Act, Section 22 — Adjournment of proceedings','2020-01-01','ACTIVE',1,true,ARRAY['legal','court','adjournment'],'SEED'),
  ('SKN','MCA_JUDGMENT','ACT','Judgment','Magistrates Code of Procedure Act','40','Magistrates Code of Procedure Act, Section 40 — Entry of judgment','2020-01-01','ACTIVE',1,true,ARRAY['legal','court','judgment'],'SEED'),
  ('SKN','MCA_ENFORCE','ACT','Enforcement of Judgment','Magistrates Code of Procedure Act','55','Magistrates Code of Procedure Act, Section 55 — Enforcement of judgment','2020-01-01','ACTIVE',1,true,ARRAY['legal','court','enforcement'],'SEED'),
  ('SKN','MCA_GARNISH','ACT','Garnishment / Attachment','Magistrates Code of Procedure Act','62','Magistrates Code of Procedure Act, Section 62 — Garnishee proceedings and attachment of debts','2020-01-01','ACTIVE',1,true,ARRAY['legal','court','garnishment'],'SEED'),
  ('SKN','SSA_S70_APPEAL','ACT','Benefit Appeal','Social Security Act, Cap 329','70','Social Security Act, Cap 329, Section 70 — Right of appeal against benefit decision','2020-01-01','ACTIVE',1,true,ARRAY['legal','ip','appeal'],'SEED'),
  ('SKN','SSA_S72_OVERPAY','ACT','Overpayment Recovery','Social Security Act, Cap 329','72','Social Security Act, Cap 329, Section 72 — Recovery of overpaid benefit','2020-01-01','ACTIVE',1,true,ARRAY['legal','ip','overpayment'],'SEED'),
  ('SKN','SSA_S75_FRAUD','ACT','Fraud or Misrepresentation','Social Security Act, Cap 329','75','Social Security Act, Cap 329, Section 75 — Offences of fraud and misrepresentation','2020-01-01','ACTIVE',1,true,ARRAY['legal','ip','fraud'],'SEED'),
  ('SKN','SSA_S78_ESTATE','ACT','Recovery from Estate','Social Security Act, Cap 329','78','Social Security Act, Cap 329, Section 78 — Recovery from estate of deceased contributor','2020-01-01','ACTIVE',1,true,ARRAY['legal','ip','estate'],'SEED'),
  ('SKN','FEE_COURT_FILING','POLICY','Court Filing Cost','SSB Legal Fee Schedule','FEE-01','SSB Legal Fee Schedule FEE-01 — Court filing cost recovery','2020-01-01','ACTIVE',1,true,ARRAY['legal','fee','filing'],'SEED'),
  ('SKN','FEE_LEGAL_PROC','POLICY','Legal Processing Fee','SSB Legal Fee Schedule','FEE-02','SSB Legal Fee Schedule FEE-02 — Legal processing fee','2020-01-01','ACTIVE',1,true,ARRAY['legal','fee','processing'],'SEED'),
  ('SKN','FEE_SERVICE','POLICY','Service Fee','SSB Legal Fee Schedule','FEE-03','SSB Legal Fee Schedule FEE-03 — Service of process fee','2020-01-01','ACTIVE',1,true,ARRAY['legal','fee','service'],'SEED'),
  ('SKN','FEE_ENFORCE','POLICY','Judgment / Enforcement Cost','SSB Legal Fee Schedule','FEE-04','SSB Legal Fee Schedule FEE-04 — Judgment and enforcement cost recovery','2020-01-01','ACTIVE',1,true,ARRAY['legal','fee','enforcement'],'SEED'),
  ('SKN','FEE_WAIVER','POLICY','Waiver / Adjustment Authority','SSB Legal Fee Schedule','FEE-05','SSB Legal Fee Schedule FEE-05 — Authority to waive or adjust legal fees','2020-01-01','ACTIVE',1,true,ARRAY['legal','fee','waiver'],'SEED')
ON CONFLICT (country_code, ref_code, version_number) DO NOTHING;

INSERT INTO public.module_legal_reference_mapping
  (module_code, entity_table, entity_id, legal_reference_id, role, entity_type, usage_context, is_required, is_default, created_by)
SELECT 'LEGAL', 'lg_case', v.cat, lr.id, 'PRIMARY', 'CASE', v.ctx, false, true, 'SEED'
FROM (VALUES
  ('SSA_S46_RECOVERY','employer_recovery','Employer contribution recovery cases'),
  ('SSA_S20_REG','employer_failure_register','Cases against employers failing to register'),
  ('SSA_S26_REMIT','employer_failure_remit','Cases for failure to remit contributions'),
  ('SSA_S48_ARREARS','employer_arrears','Late payment / arrears recovery cases'),
  ('SSA_S49_PENALTY','employer_penalty','Penalty and interest cases'),
  ('SSA_S55_INSPECT','inspection_enforcement','Inspection / compliance enforcement cases'),
  ('SSA_S60_PROSECUTE','prosecution','Prosecution / legal action cases'),
  ('SSA_S70_APPEAL','ip_appeal','Insured person benefit appeal cases'),
  ('SSA_S72_OVERPAY','ip_overpayment','Insured person overpayment recovery cases'),
  ('SSA_S75_FRAUD','ip_fraud','Fraud / misrepresentation cases'),
  ('SSA_S78_ESTATE','ip_estate','Recovery from estate cases')
) v(ref, cat, ctx)
JOIN public.legal_reference lr ON lr.ref_code=v.ref AND lr.country_code='SKN'
ON CONFLICT DO NOTHING;

INSERT INTO public.module_legal_reference_mapping
  (module_code, entity_table, entity_id, legal_reference_id, role, entity_type, usage_context, is_required, is_default, created_by)
SELECT 'LEGAL', 'lg_hearing', v.cat, lr.id, 'PRIMARY', 'HEARING', v.ctx, false, true, 'SEED'
FROM (VALUES
  ('MCA_FILE_CLAIM','filing_claim','Filing of claim'),
  ('MCA_SUMMONS','summons','Summons / hearing notice'),
  ('MCA_ADJOURN','adjournment','Adjournment notice'),
  ('MCA_JUDGMENT','judgment','Judgment'),
  ('MCA_ENFORCE','enforcement','Enforcement of judgment'),
  ('MCA_GARNISH','garnishment','Garnishment / attachment / execution')
) v(ref, cat, ctx)
JOIN public.legal_reference lr ON lr.ref_code=v.ref AND lr.country_code='SKN'
ON CONFLICT DO NOTHING;

INSERT INTO public.module_legal_reference_mapping
  (module_code, entity_table, entity_id, legal_reference_id, role, entity_type, usage_context, is_required, is_default, created_by)
SELECT 'LEGAL', 'lg_payment_arrangement_link', v.cat, lr.id, 'PRIMARY', 'ORDER', v.ctx, false, true, 'SEED'
FROM (VALUES
  ('SSR_PAY_ARR','payment_arrangement_default','Default payment arrangement'),
  ('SSR_PAY_BREACH','payment_arrangement_breach','Breach of payment arrangement'),
  ('COURT_ORDER_PAY','court_ordered_payment','Court-ordered payment plan'),
  ('SETTLE_AGREE','settlement_agreement','Settlement agreement')
) v(ref, cat, ctx)
JOIN public.legal_reference lr ON lr.ref_code=v.ref AND lr.country_code='SKN'
ON CONFLICT DO NOTHING;

INSERT INTO public.module_legal_reference_mapping
  (module_code, entity_table, entity_id, legal_reference_id, role, entity_type, usage_context, is_required, is_default, created_by)
SELECT 'LEGAL', 'lg_fee_charge', v.cat, lr.id, 'PRIMARY', 'FEE', v.ctx, false, true, 'SEED'
FROM (VALUES
  ('FEE_COURT_FILING','court_filing_cost','Court filing cost'),
  ('FEE_LEGAL_PROC','legal_processing_fee','Legal processing fee'),
  ('FEE_SERVICE','service_fee','Service fee'),
  ('FEE_ENFORCE','enforcement_cost','Judgment / enforcement cost'),
  ('FEE_WAIVER','waiver_authority','Waiver / adjustment authority')
) v(ref, cat, ctx)
JOIN public.legal_reference lr ON lr.ref_code=v.ref AND lr.country_code='SKN'
ON CONFLICT DO NOTHING;

INSERT INTO public.module_legal_reference_mapping
  (module_code, entity_table, entity_id, legal_reference_id, role, entity_type, usage_context, is_required, is_default, created_by)
SELECT 'LEGAL', 'legal_templates', v.tpl, lr.id, 'PRIMARY', 'TEMPLATE', v.ctx, false, true, 'SEED'
FROM (VALUES
  ('DEMAND_LETTER','SSA_S48_ARREARS','Demand Letter — arrears reference'),
  ('FINAL_DEMAND','SSA_S49_PENALTY','Final Demand Letter — penalties'),
  ('NOTICE_BEFORE_ACTION','SSA_S60_PROSECUTE','Notice Before Action — prosecution warning'),
  ('HEARING_NOTICE','MCA_SUMMONS','Hearing notice — summons'),
  ('COURT_FILING_COVER','MCA_FILE_CLAIM','Court filing cover letter'),
  ('PAYMENT_DEFAULT_NOTICE','SSR_PAY_BREACH','Payment default notice'),
  ('SETTLEMENT_OFFER','SETTLE_AGREE','Settlement offer'),
  ('JUDGMENT_NOTICE','MCA_JUDGMENT','Judgment notice'),
  ('ENFORCEMENT_NOTICE','MCA_ENFORCE','Enforcement notice'),
  ('LEGAL_FEE_NOTICE','FEE_LEGAL_PROC','Legal fee notice')
) v(tpl, ref, ctx)
JOIN public.legal_reference lr ON lr.ref_code=v.ref AND lr.country_code='SKN'
ON CONFLICT DO NOTHING;

INSERT INTO public.module_legal_reference_mapping
  (module_code, entity_table, entity_id, legal_reference_id, role, entity_type, usage_context, is_required, is_default, created_by)
SELECT 'BENEFITS', 'bn_country_legal_ref', lr.country_code, lr.id, 'PRIMARY', 'COUNTRY_PACK', 'Country pack legal reference', false, false, 'SEED'
FROM public.legal_reference lr
WHERE lr.country_code='SKN'
ON CONFLICT DO NOTHING;
