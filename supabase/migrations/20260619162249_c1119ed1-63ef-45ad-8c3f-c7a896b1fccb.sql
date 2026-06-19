
ALTER TABLE public.lg_document_link
  ADD COLUMN IF NOT EXISTS linked_stage_code varchar(80),
  ADD COLUMN IF NOT EXISTS hearing_id uuid REFERENCES public.lg_hearing(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.lg_order(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS settlement_id uuid REFERENCES public.lg_settlement(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_no integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS court_filed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS filed_date date,
  ADD COLUMN IF NOT EXISTS confidential boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS uploaded_by varchar(50),
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_lg_doclink_hearing ON public.lg_document_link(hearing_id);
CREATE INDEX IF NOT EXISTS idx_lg_doclink_order ON public.lg_document_link(order_id);
CREATE INDEX IF NOT EXISTS idx_lg_doclink_settlement ON public.lg_document_link(settlement_id);

ALTER TABLE public.lg_notice
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS generated_document_id uuid REFERENCES public.lg_document_link(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_party_id uuid REFERENCES public.lg_case_party(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS generated_by varchar(50),
  ADD COLUMN IF NOT EXISTS generated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS sent_by varchar(50),
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_lg_notice_template ON public.lg_notice(template_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_document_link TO authenticated;
GRANT ALL ON public.lg_document_link TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_notice TO authenticated;
GRANT ALL ON public.lg_notice TO service_role;

INSERT INTO public.lg_reference_value (group_code, code, label, sort_order, is_active)
VALUES
  ('LG_NOTICE_TYPE','NOTICE_BEFORE_ACTION','Notice Before Action',10,true),
  ('LG_NOTICE_TYPE','COURT_FILING_COVER','Court Filing Cover Letter',20,true),
  ('LG_NOTICE_TYPE','SETTLEMENT_OFFER','Settlement Offer',30,true),
  ('LG_NOTICE_TYPE','PAYMENT_DEFAULT','Payment Default Notice',40,true),
  ('LG_NOTICE_TYPE','JUDGMENT','Judgment Notice',50,true),
  ('LG_NOTICE_TYPE','ENFORCEMENT','Enforcement Notice',60,true)
ON CONFLICT (group_code, code) DO NOTHING;

INSERT INTO public.lg_reference_group (code, name, description)
VALUES ('LG_DOCUMENT_CATEGORY','Legal Document Category','Categories for documents linked to legal cases')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.lg_reference_value (group_code, code, label, sort_order, is_active)
VALUES
  ('LG_DOCUMENT_CATEGORY','EVIDENCE','Evidence',10,true),
  ('LG_DOCUMENT_CATEGORY','CORRESPONDENCE','Correspondence',20,true),
  ('LG_DOCUMENT_CATEGORY','COURT_FILING','Court Filing',30,true),
  ('LG_DOCUMENT_CATEGORY','ORDER','Court Order',40,true),
  ('LG_DOCUMENT_CATEGORY','JUDGMENT','Judgment',50,true),
  ('LG_DOCUMENT_CATEGORY','SETTLEMENT','Settlement Document',60,true),
  ('LG_DOCUMENT_CATEGORY','NOTICE','Notice',70,true),
  ('LG_DOCUMENT_CATEGORY','AFFIDAVIT','Affidavit',80,true),
  ('LG_DOCUMENT_CATEGORY','EXHIBIT','Exhibit',90,true),
  ('LG_DOCUMENT_CATEGORY','OTHER','Other',100,true)
ON CONFLICT (group_code, code) DO NOTHING;

DO $mig$
DECLARE
  tpl record;
  placeholders_json jsonb := '["legal.case_no","legal.case_type","legal.stage","legal.next_hearing_date","legal.court_case_no","employer.name","employer.account_no","compliance.case_no","payment_arrangement.reference","payment_arrangement.outstanding_amount","legal_reference.full"]'::jsonb;
BEGIN
  FOR tpl IN
    SELECT * FROM (VALUES
      ('LG_DEMAND_LETTER','Legal — Demand Letter',E'Dear {{employer.name}} (Account {{employer.account_no}}),\n\nOur records (Legal Case {{legal.case_no}}, Compliance Case {{compliance.case_no}}) show an outstanding amount of {{payment_arrangement.outstanding_amount}} under payment arrangement {{payment_arrangement.reference}}.\n\nYou are hereby formally requested to settle this amount within fourteen (14) days from the date of this letter, failing which further legal action will be initiated under {{legal_reference.full}}.\n\nYours faithfully,\nLegal Department'),
      ('LG_FINAL_DEMAND','Legal — Final Demand',E'Dear {{employer.name}},\n\nThis is the FINAL DEMAND in respect of Legal Case {{legal.case_no}}. The outstanding sum of {{payment_arrangement.outstanding_amount}} (arrangement {{payment_arrangement.reference}}) remains unpaid.\n\nUnless payment is received within seven (7) days, court proceedings will commence without further notice in accordance with {{legal_reference.full}}.'),
      ('LG_NOTICE_BEFORE_ACTION','Legal — Notice Before Action',E'Dear {{employer.name}},\n\nTake notice that unless the matter referenced in Legal Case {{legal.case_no}} (current stage: {{legal.stage}}) is resolved within fourteen (14) days, formal legal proceedings will be filed against {{employer.name}} (Account {{employer.account_no}}).\n\nLegal authority: {{legal_reference.full}}.'),
      ('LG_HEARING_NOTICE','Legal — Hearing Notice',E'Notice of Hearing\n\nCase: {{legal.case_no}} ({{legal.case_type}})\nCourt Case No: {{legal.court_case_no}}\nNext Hearing: {{legal.next_hearing_date}}\n\nAll parties to {{legal.case_no}} are required to attend on the date set above.'),
      ('LG_COURT_FILING_COVER','Legal — Court Filing Cover Letter',E'The Registrar,\n\nPlease find enclosed the documents for filing in respect of Court Case {{legal.court_case_no}} (Internal Reference {{legal.case_no}}, type {{legal.case_type}}).\n\nFiled pursuant to {{legal_reference.full}}.'),
      ('LG_SETTLEMENT_OFFER','Legal — Settlement Offer',E'Dear {{employer.name}},\n\nWithout prejudice, in respect of Legal Case {{legal.case_no}} we offer to settle the outstanding amount of {{payment_arrangement.outstanding_amount}} (under arrangement {{payment_arrangement.reference}}) on terms attached.\n\nThis offer remains open for fourteen (14) days.'),
      ('LG_PAYMENT_DEFAULT','Legal — Payment Default Notice',E'Dear {{employer.name}},\n\nPayment arrangement {{payment_arrangement.reference}} (Legal Case {{legal.case_no}}) is in default. Outstanding balance: {{payment_arrangement.outstanding_amount}}.\n\nFailure to cure within seven (7) days will result in the arrangement being cancelled and the full balance accelerated under {{legal_reference.full}}.'),
      ('LG_JUDGMENT_NOTICE','Legal — Judgment Notice',E'Dear {{employer.name}},\n\nJudgment has been entered in Court Case {{legal.court_case_no}} (Legal Case {{legal.case_no}}) against {{employer.name}} (Account {{employer.account_no}}).\n\nYou are required to comply with the terms of the judgment forthwith.'),
      ('LG_ENFORCEMENT_NOTICE','Legal — Enforcement Notice',E'Dear {{employer.name}},\n\nFollowing the judgment entered in Court Case {{legal.court_case_no}} (Legal Case {{legal.case_no}}), enforcement proceedings will be commenced under {{legal_reference.full}} to recover {{payment_arrangement.outstanding_amount}}.\n\nThis is your final notice prior to enforcement.')
    ) AS t(code,name,body)
  LOOP
    INSERT INTO public.notification_templates (template_code, name, channel, subject, body, placeholders, category, description, is_enabled)
    VALUES (tpl.code, tpl.name, 'email'::notification_channel, tpl.name, tpl.body, placeholders_json, 'legal', 'Standard legal notice template', true)
    ON CONFLICT (template_code) DO UPDATE
      SET name = EXCLUDED.name,
          body = EXCLUDED.body,
          subject = EXCLUDED.subject,
          placeholders = EXCLUDED.placeholders,
          category = EXCLUDED.category,
          updated_at = now();
  END LOOP;
END
$mig$;
