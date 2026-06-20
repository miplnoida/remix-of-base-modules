
-- 1. Add structured blocks column to versions for the drag-drop builder
ALTER TABLE public.core_template_version
  ADD COLUMN IF NOT EXISTS template_structure JSONB,
  ADD COLUMN IF NOT EXISTS body_metadata JSONB;

-- 2. Helper to build the full standard body for a Legal template
CREATE OR REPLACE FUNCTION public.lg_build_standard_body(
  p_subject TEXT,
  p_intro   TEXT,
  p_action  TEXT,
  p_consequences TEXT DEFAULT 'Failure to comply with this notice within the stated deadline may result in further legal proceedings, additional penalties, garnishment, judgment enforcement and/or referral to court without further notice. All costs of enforcement may be charged to you.'
) RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
SELECT format($html$
<div class="lg-doc">
  <header class="lg-doc__header">
    <div class="lg-doc__brand">
      <strong>SOCIAL SECURITY BOARD</strong><br/>
      Saint Kitts and Nevis
    </div>
    <div class="lg-doc__ref">
      <div><strong>Reference No:</strong> {{document.reference_no}}</div>
      <div><strong>Date:</strong> {{document.generated_date}}</div>
      <div><strong>Case No:</strong> {{legal.case_no}}</div>
    </div>
  </header>

  <section class="lg-doc__recipient">
    <div>{{recipient.name}}</div>
    <div>{{recipient.address_line1}}</div>
    <div>{{recipient.address_line2}}</div>
    <div>{{recipient.city}}, {{recipient.country}}</div>
  </section>

  <h1 class="lg-doc__subject">%1$s</h1>

  <section class="lg-doc__body">
    <p>Dear {{recipient.salutation}} {{recipient.name}},</p>
    <p>%2$s</p>
  </section>

  <section class="lg-doc__legal-refs">
    <h3>Legal References</h3>
    <div data-block="legal_references">{{legal_references.list}}</div>
  </section>

  <section class="lg-doc__action">
    <h3>Action Required</h3>
    <p>%3$s</p>
    <p><strong>Deadline:</strong> {{legal.action_deadline}}</p>
  </section>

  <section class="lg-doc__consequences">
    <h3>Consequences of Non-Compliance</h3>
    <p>%4$s</p>
  </section>

  <section class="lg-doc__contact">
    <h3>Contact Details</h3>
    <p>
      Legal Department, Social Security Board<br/>
      Bay Road, Basseterre, St. Kitts<br/>
      Telephone: (869) 465-2535 &nbsp;|&nbsp; Email: legal@socialsecurity.kn<br/>
      Office Hours: Monday – Friday, 8:00 AM – 4:00 PM
    </p>
  </section>

  <section class="lg-doc__signature">
    <p>Yours faithfully,</p>
    <br/><br/>
    <div><strong>{{officer.name}}</strong></div>
    <div>{{officer.title}}</div>
    <div>Legal Department, Social Security Board</div>
  </section>

  <footer class="lg-doc__footer">
    This is an official communication of the Social Security Board of Saint Kitts and Nevis.
    Document Ref {{document.reference_no}} generated on {{document.generated_date}}.
    For verification, contact legal@socialsecurity.kn quoting the reference number above.
  </footer>
</div>
$html$, p_subject, p_intro, p_action, p_consequences);
$$;

-- 3. Helper to build the standard block JSON structure
CREATE OR REPLACE FUNCTION public.lg_build_standard_structure(
  p_subject TEXT,
  p_intro   TEXT,
  p_action  TEXT
) RETURNS JSONB
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
SELECT jsonb_build_array(
  jsonb_build_object('id','blk-header','type','header','props', jsonb_build_object('brand','Social Security Board','country','Saint Kitts and Nevis')),
  jsonb_build_object('id','blk-ref','type','reference_no','props', jsonb_build_object()),
  jsonb_build_object('id','blk-recipient','type','recipient','props', jsonb_build_object()),
  jsonb_build_object('id','blk-subject','type','heading','props', jsonb_build_object('level',1,'text',p_subject)),
  jsonb_build_object('id','blk-body','type','paragraph','props', jsonb_build_object('text',p_intro)),
  jsonb_build_object('id','blk-legal','type','legal_reference','props', jsonb_build_object()),
  jsonb_build_object('id','blk-action','type','heading','props', jsonb_build_object('level',3,'text','Action Required')),
  jsonb_build_object('id','blk-action-body','type','paragraph','props', jsonb_build_object('text', p_action)),
  jsonb_build_object('id','blk-deadline','type','paragraph','props', jsonb_build_object('text','Deadline: {{legal.action_deadline}}')),
  jsonb_build_object('id','blk-consequences','type','disclaimer','props', jsonb_build_object('text','Failure to comply may result in further legal proceedings, additional penalties, garnishment or court referral.')),
  jsonb_build_object('id','blk-contact','type','contact_details','props', jsonb_build_object()),
  jsonb_build_object('id','blk-signature','type','signature','props', jsonb_build_object()),
  jsonb_build_object('id','blk-footer','type','disclaimer','props', jsonb_build_object('text','This is an official communication of the Social Security Board. Ref {{document.reference_no}}.'))
);
$$;

-- 4. Catalogue of legal templates and per-template content
-- Build a temp table of all KN Legal templates with their copy.
DROP TABLE IF EXISTS tmp_lg_seed;
CREATE TEMP TABLE tmp_lg_seed (
  code        TEXT PRIMARY KEY,
  subject     TEXT,
  intro       TEXT,
  action      TEXT,
  sms_text    TEXT
);
INSERT INTO tmp_lg_seed VALUES
('LG-TPL-DEMAND-LETTER','Demand for Payment','We have on record an outstanding balance of {{finance.amount_due}} owed by you to the Social Security Board in respect of contributions and/or penalties for the period {{finance.period}}. This letter is a formal demand for full settlement.','Settle the full outstanding balance of {{finance.amount_due}} within fourteen (14) days from the date of this notice. Payment may be made at any Social Security Board office or via approved electronic channels.','SSB Notice: Outstanding amount {{finance.amount_due}} due. Ref {{document.reference_no}}. Pay within 14 days. Call 4652535.'),
('LG-TPL-FINAL-DEMAND','Final Demand for Payment','Despite previous notices, the Board has not received settlement of the outstanding amount of {{finance.amount_due}}. This is your FINAL demand before legal proceedings are commenced.','Pay the full outstanding amount of {{finance.amount_due}} within seven (7) days. Failure will result in immediate court action.','SSB FINAL DEMAND: {{finance.amount_due}} due. Ref {{document.reference_no}}. Pay in 7 days or face court action.'),
('LG-TPL-NBA','Notice Before Action','Take notice that unless the matters set out in this letter are addressed within the stated timeframe, the Social Security Board intends to commence legal proceedings against you without further reference.','Respond in writing and/or settle the amount of {{finance.amount_due}} within seven (7) days of receipt of this notice.','SSB NOTICE BEFORE ACTION: Ref {{document.reference_no}}. Respond within 7 days or court action follows.'),
('LG-TPL-PAYMENT-DEFAULT','Payment Default Notice','Our records indicate that your scheduled payment due on {{finance.due_date}} was not received. You are now in default of your payment arrangement with the Social Security Board.','Settle the missed installment of {{finance.amount_due}} immediately to avoid cancellation of your arrangement.','SSB: Payment default. Installment {{finance.amount_due}} unpaid. Ref {{document.reference_no}}.'),
('LG-TPL-ARR-BREACH','Payment Arrangement Breach Notice','You have breached the terms of payment arrangement {{payment_arrangement.reference}} dated {{payment_arrangement.start_date}}. The outstanding balance is {{payment_arrangement.outstanding_amount}}.','Cure the breach within five (5) business days by paying the missed installments, or the arrangement will be cancelled and the full outstanding amount will become immediately due.','SSB: Arrangement breach. {{payment_arrangement.outstanding_amount}} due. Ref {{document.reference_no}}.'),
('LG-TPL-RECOVERY-NOTICE','Recovery Action Notice','The Social Security Board has commenced recovery action against you for outstanding contributions and penalties totalling {{finance.amount_due}}.','Contact the Legal Department within seven (7) days to settle or to arrange a payment plan, failing which enforcement steps will proceed.','SSB Recovery Action: {{finance.amount_due}} due. Ref {{document.reference_no}}. Contact Legal Dept.'),
('LG-TPL-REF-ACCEPT','Legal Referral Acceptance','The Legal Department has accepted the referral of case {{legal.case_no}} for legal action.','No action required by the referring department. Updates will be provided through the case workflow.','SSB Legal: Referral case {{legal.case_no}} accepted.'),
('LG-TPL-REF-RETURN','Legal Referral – Return for Information','The Legal Department is returning case {{legal.case_no}} for additional information before it can be progressed.','Provide the missing information listed within ten (10) business days and re-submit the referral.','SSB Legal: Case {{legal.case_no}} returned for info. See email.'),
('LG-TPL-CASE-ASSIGNMENT','Legal Case Assignment Memo','Case {{legal.case_no}} has been assigned to {{officer.name}} of the Legal Department for handling.','No action required by the recipient. The assigned officer will lead all further activity on this case.','SSB Legal: Case {{legal.case_no}} assigned to {{officer.name}}.'),
('LG-TPL-CASE-CREATION','Case Creation Notice','A legal case has been formally created under reference {{legal.case_no}} arising from the matter previously referred to the Legal Department.','Acknowledge receipt of this notice within seven (7) days.','SSB Legal: Case {{legal.case_no}} created. Ref {{document.reference_no}}.'),
('LG-TPL-CASE-TRANSFER','Case Transfer Notice','Case {{legal.case_no}} has been transferred to a different officer for ongoing handling.','No action required from the recipient.','SSB Legal: Case {{legal.case_no}} transferred. New officer details to follow.'),
('LG-TPL-HEARING-NOTICE','Notice of Hearing','You are hereby required to attend a hearing in respect of case {{legal.case_no}} on {{hearing.date}} at {{hearing.time}} at {{hearing.venue}}.','Attend the hearing on the date and time specified and bring all relevant documents.','SSB Hearing: Case {{legal.case_no}} on {{hearing.date}} at {{hearing.time}}, {{hearing.venue}}.'),
('LG-TPL-HEARING-REMINDER','Hearing Reminder','This is a reminder that you are required to attend the hearing in case {{legal.case_no}} on {{hearing.date}}.','Attend the hearing on the scheduled date. If you cannot attend, notify the Legal Department immediately.','SSB Reminder: Hearing case {{legal.case_no}} on {{hearing.date}} at {{hearing.time}}.'),
('LG-TPL-HEARING-CANCEL','Hearing Cancellation Notice','The hearing previously scheduled for {{hearing.date}} in case {{legal.case_no}} has been cancelled.','No further action required at this time. A new date will be communicated separately.','SSB: Hearing on {{hearing.date}} (case {{legal.case_no}}) cancelled.'),
('LG-TPL-HEARING-RESCHEDULE','Hearing Reschedule Notice','The hearing in case {{legal.case_no}} has been rescheduled to {{hearing.date}} at {{hearing.time}}.','Attend the rescheduled hearing on the new date and time.','SSB: Hearing case {{legal.case_no}} rescheduled to {{hearing.date}} {{hearing.time}}.'),
('LG-TPL-ADJOURNMENT','Notice of Adjournment','The hearing in case {{legal.case_no}} has been adjourned by order of the tribunal.','Await the new hearing date which will be communicated in writing.','SSB: Hearing case {{legal.case_no}} adjourned. New date to follow.'),
('LG-TPL-HEARING-PREP','Hearing Preparation Checklist','Please use the following checklist to prepare for the upcoming hearing in case {{legal.case_no}} on {{hearing.date}}.','Review the checklist and submit any outstanding documents at least three (3) business days before the hearing.','SSB Hearing prep: Case {{legal.case_no}} on {{hearing.date}}. See checklist.'),
('LG-TPL-APPEAL-ACK','Appeal Acknowledgement','We acknowledge receipt of your appeal dated {{appeal.date}} in connection with case {{legal.case_no}}.','No action required at this stage. The Board will contact you with the appeal hearing date.','SSB: Appeal received for case {{legal.case_no}}. Acknowledged.'),
('LG-TPL-APPEAL-HEARING','Appeal Hearing Notice','Your appeal in case {{legal.case_no}} will be heard on {{hearing.date}} at {{hearing.time}}.','Attend the appeal hearing and bring all supporting documents.','SSB Appeal Hearing: Case {{legal.case_no}} on {{hearing.date}} {{hearing.time}}.'),
('LG-TPL-APPEAL-DECISION','Appeal Decision','The Appeals Tribunal has issued its decision in respect of your appeal in case {{legal.case_no}}.','Comply with the decision set out below within the stated timeframe.','SSB Appeal Decision: Case {{legal.case_no}} – see letter for outcome.'),
('LG-TPL-COURT-COVER','Court Filing Cover Letter','Please find enclosed the documents being filed in respect of case {{legal.case_no}}.','Process the enclosed documents and return a stamped copy to the Legal Department.','SSB: Court filing dispatched. Ref {{document.reference_no}}.'),
('LG-TPL-SUMMONS-COVER','Summons Cover Letter','Please find enclosed a summons in respect of case {{legal.case_no}} for personal service on the named party.','Serve the summons in accordance with the rules of court and return proof of service.','SSB: Summons enclosed. Case {{legal.case_no}}.'),
('LG-TPL-EVIDENCE-COVER','Evidence Submission Cover Letter','Please find enclosed evidence in support of the Board''s position in case {{legal.case_no}}.','Place the enclosed evidence on the court file and acknowledge receipt.','SSB: Evidence submitted for case {{legal.case_no}}.'),
('LG-TPL-WITNESS-REQUEST','Witness Request Letter','You are requested to attend court as a witness in case {{legal.case_no}} on {{hearing.date}}.','Confirm your attendance and bring all documents relevant to your evidence.','SSB Witness Request: Case {{legal.case_no}} on {{hearing.date}}.'),
('LG-TPL-SETTLEMENT-OFFER','Settlement Offer','Without prejudice, the Social Security Board offers to settle case {{legal.case_no}} on the terms set out below.','Indicate acceptance or rejection in writing within fourteen (14) days of this letter.','SSB Settlement Offer: Case {{legal.case_no}}. Respond in 14 days.'),
('LG-TPL-SETTLE-ACCEPT','Settlement Acceptance','The Board accepts the settlement proposal received in respect of case {{legal.case_no}}.','Comply with the agreed terms of settlement. The case will be closed upon completion of the agreed payments.','SSB: Settlement accepted for case {{legal.case_no}}.'),
('LG-TPL-SETTLE-REJECT','Settlement Rejection','The Board has considered the settlement proposal in case {{legal.case_no}} and is unable to accept it on the terms offered.','Submit a revised proposal or prepare for the hearing on the scheduled date.','SSB: Settlement offer for case {{legal.case_no}} rejected.'),
('LG-TPL-SETTLE-TERMS','Settlement Terms Confirmation','This letter confirms the agreed terms of settlement in case {{legal.case_no}}.','Comply with each of the settlement terms by the dates indicated.','SSB: Settlement terms confirmed for case {{legal.case_no}}.'),
('LG-TPL-JUDGMENT','Judgment Notice','Judgment has been entered against you in case {{legal.case_no}} in the sum of {{finance.amount_due}}.','Satisfy the judgment in full within fourteen (14) days or contact the Legal Department to agree a payment plan.','SSB Judgment: {{finance.amount_due}} entered. Case {{legal.case_no}}.'),
('LG-TPL-ENFORCEMENT','Enforcement Notice','As the judgment in case {{legal.case_no}} remains unsatisfied, enforcement proceedings will be commenced.','Pay the outstanding judgment debt of {{finance.amount_due}} within seven (7) days to avoid enforcement action.','SSB Enforcement Notice: {{finance.amount_due}}. Case {{legal.case_no}}.'),
('LG-TPL-GARNISHMENT','Garnishment Notice','A garnishment order has been issued against funds owed to you, in satisfaction of the judgment debt in case {{legal.case_no}}.','Contact the Legal Department immediately if you dispute this order.','SSB: Garnishment order issued. Case {{legal.case_no}}.'),
('LG-TPL-EXECUTION','Execution Action Notice','The Board has authorised execution against assets pursuant to the judgment in case {{legal.case_no}}.','Settle the judgment debt in full to halt execution proceedings.','SSB: Execution authorised. Case {{legal.case_no}}.'),
('LG-TPL-JUDG-SATISFIED','Judgment Satisfaction Notice','The Board confirms that the judgment debt in case {{legal.case_no}} has been fully satisfied.','No further action required. Retain this notice for your records.','SSB: Judgment satisfied for case {{legal.case_no}}.'),
('LG-TPL-WITHDRAWAL-NOTICE','Notice of Withdrawal','The Board hereby withdraws the proceedings in case {{legal.case_no}}.','No further action required. The matter is concluded.','SSB: Proceedings withdrawn. Case {{legal.case_no}}.'),
('LG-TPL-CASE-CLOSURE','Legal Case Closure Memo','Case {{legal.case_no}} is now closed in the Board''s legal register.','No further action required.','SSB Legal: Case {{legal.case_no}} closed.'),
('LG-TPL-MATTER-RESOLVED','Matter Resolved Notice','The Board confirms that the matter raised in case {{legal.case_no}} has been resolved.','Retain this notice for your records.','SSB: Matter resolved for case {{legal.case_no}}.'),
('LG-TPL-WARNING','Formal Warning','You are hereby issued with a formal warning regarding the matter set out in case {{legal.case_no}}.','Take immediate corrective action and confirm in writing within ten (10) days.','SSB Warning: See letter for case {{legal.case_no}}.'),
('LG-TPL-SHOW-CAUSE','Show Cause Notice','You are required to show cause within fourteen (14) days why the Board should not proceed with the action proposed in case {{legal.case_no}}.','Respond in writing within fourteen (14) days setting out reasons why no further action should be taken.','SSB Show Cause: Respond in 14 days. Case {{legal.case_no}}.'),
('LG-TPL-INVESTIGATION','Investigation Notice','The Board has commenced an investigation under case {{legal.case_no}}.','Co-operate fully with the investigation and provide all information reasonably requested.','SSB Investigation: Case {{legal.case_no}}.'),
('LG-TPL-PENALTY','Penalty Notice','A penalty of {{finance.amount_due}} has been imposed against you in case {{legal.case_no}}.','Settle the penalty within fourteen (14) days.','SSB Penalty: {{finance.amount_due}} imposed. Case {{legal.case_no}}.'),
('LG-TPL-FINE','Fine Notice','A fine of {{finance.amount_due}} has been imposed by order in case {{legal.case_no}}.','Pay the fine within fourteen (14) days.','SSB Fine: {{finance.amount_due}}. Case {{legal.case_no}}.'),
('LG-TPL-INTERIM-ORDER','Interim Order','An interim order has been made in case {{legal.case_no}} pending the final hearing.','Comply with the interim order until further notice.','SSB Interim Order issued. Case {{legal.case_no}}.'),
('LG-TPL-FINAL-ORDER','Final Order','The Board''s final order in case {{legal.case_no}} is set out in this notice.','Comply with the final order within the time stipulated.','SSB Final Order: Case {{legal.case_no}}. See letter.'),
('LG-TPL-FINAL-DECISION','Final Decision','The Board''s final decision in case {{legal.case_no}} has been issued.','Comply with the decision or lodge an appeal within the statutory period.','SSB Final Decision: Case {{legal.case_no}}.'),
('LG-TPL-PRELIM-DECISION','Preliminary Decision','The Board''s preliminary decision in case {{legal.case_no}} is set out below.','Provide any further representations within ten (10) business days.','SSB Preliminary Decision: Case {{legal.case_no}}.'),
('LG-TPL-REVOCATION-ORDER','Revocation Order','The Board has revoked the order/registration previously issued in case {{legal.case_no}}.','Cease all activity reliant on the revoked instrument and acknowledge in writing.','SSB Revocation Order: Case {{legal.case_no}}.'),
('LG-TPL-SUSPENSION-ORDER','Suspension Order','The Board has suspended the registration/permit referenced in case {{legal.case_no}}.','Cease the suspended activity immediately pending further notice.','SSB Suspension: Case {{legal.case_no}}.'),
('LG-TPL-CERT-COMPLIANCE','Compliance Certificate','This is to certify that {{recipient.name}} is in compliance with the contribution obligations under the Social Security Act as at the date of this certificate.','Retain this certificate for your records and produce it when required.','SSB: Compliance Certificate issued for {{recipient.name}}.'),
('LG-TPL-CERT-REGISTRATION','Registration Certificate','This is to certify that {{recipient.name}} is registered with the Social Security Board under registration number {{employer.regno}}.','Display this certificate at the place of business as required by law.','SSB: Registration Certificate issued for {{recipient.name}}.'),
('LG-TPL-FEE-NOTICE','Fee Notice','The following legal fees are payable in respect of case {{legal.case_no}}: {{finance.amount_due}}.','Pay the legal fees within thirty (30) days.','SSB Fee Notice: {{finance.amount_due}}. Case {{legal.case_no}}.'),
('LG-TPL-FEE-WAIVER-ACK','Fee Waiver Request Acknowledgement','We acknowledge receipt of your application for waiver of legal fees in case {{legal.case_no}}.','No action required pending the Board''s decision on your waiver application.','SSB: Fee waiver request received. Case {{legal.case_no}}.'),
('LG-TPL-WAIVER-APPROVE','Fee Waiver Approval','Your application for fee waiver in case {{legal.case_no}} has been approved.','Retain this notice for your records. No fees are payable.','SSB: Fee waiver approved. Case {{legal.case_no}}.'),
('LG-TPL-WAIVER-REJECT','Fee Waiver Rejection','Your application for fee waiver in case {{legal.case_no}} has been declined.','Pay the legal fees within fourteen (14) days.','SSB: Fee waiver declined. Case {{legal.case_no}}.'),
('LG-TPL-PAYPLAN-LEGAL','Payment Plan Legal Confirmation','The Board confirms the legal payment plan agreed in case {{legal.case_no}}.','Pay each installment by the agreed date. Any breach will result in cancellation of the plan.','SSB: Legal payment plan confirmed. Case {{legal.case_no}}.'),
('LG-TPL-LEGAL-MEMO','Legal Memo','Please see internal legal memo concerning case {{legal.case_no}}.','Review and respond as set out in the memo.','SSB Legal Memo: Case {{legal.case_no}}.'),
('LG-TPL-BREACH','Breach Notice','You are in breach of the obligations set out under case {{legal.case_no}}.','Remedy the breach within fourteen (14) days.','SSB Breach Notice: Case {{legal.case_no}}.');

-- 5. Update active version of each KN Legal template with full body + structure
UPDATE public.core_template_version v
SET body_html = public.lg_build_standard_body(s.subject, s.intro, s.action),
    body_text = regexp_replace(public.lg_build_standard_body(s.subject, s.intro, s.action),'<[^>]+>',' ','g'),
    subject = s.subject,
    template_structure = public.lg_build_standard_structure(s.subject, s.intro, s.action),
    body_metadata = jsonb_build_object('regenerated_at', now(), 'source', 'lg_seed_v2', 'sections',
      jsonb_build_array('header','reference','recipient','subject','body','legal_references','action','consequences','contact','signature','footer'))
FROM public.core_template t, tmp_lg_seed s
WHERE v.id = t.active_version_id
  AND t.module_code='LEGAL'
  AND t.country_code='KN'
  AND t.code = s.code;

-- 6. Seed the 4 additional channel variants (PRINT_LETTER, PDF, SMS, PORTAL_MSG) per template
-- Determine each template's active version, and upsert variants.

WITH active AS (
  SELECT t.code, t.active_version_id AS vid,
         s.subject, s.intro, s.action, s.sms_text
  FROM public.core_template t
  JOIN tmp_lg_seed s ON s.code = t.code
  WHERE t.module_code='LEGAL' AND t.country_code='KN'
    AND t.active_version_id IS NOT NULL
)
INSERT INTO public.core_template_channel_variant
  (template_version_id, channel_code, subject, body_html, body_text, is_default, is_active)
SELECT vid, ch.channel_code,
       CASE WHEN ch.channel_code = 'SMS' THEN NULL
            WHEN ch.channel_code = 'PORTAL_MSG' THEN a.subject
            ELSE a.subject END,
       CASE
         WHEN ch.channel_code = 'PRINT_LETTER' THEN public.lg_build_standard_body(a.subject, a.intro, a.action)
         WHEN ch.channel_code = 'PDF' THEN public.lg_build_standard_body(a.subject, a.intro, a.action)
         WHEN ch.channel_code = 'PORTAL_MSG' THEN format(
            '<div class="portal-card"><h3>%s</h3><p>%s</p><p><strong>Action:</strong> %s</p><p><a href="/legal/cases/{{legal.case_id}}">Open case {{legal.case_no}}</a></p></div>',
            a.subject, a.intro, a.action)
         ELSE NULL
       END,
       CASE WHEN ch.channel_code = 'SMS' THEN a.sms_text ELSE NULL END,
       false, true
FROM active a
CROSS JOIN (VALUES ('PRINT_LETTER'),('PDF'),('SMS'),('PORTAL_MSG')) AS ch(channel_code)
ON CONFLICT DO NOTHING;

-- Backfill any rows that did exist but were empty for these channels
UPDATE public.core_template_channel_variant cv
SET body_html = COALESCE(NULLIF(cv.body_html,''),
                  CASE WHEN cv.channel_code IN ('PRINT_LETTER','PDF') THEN public.lg_build_standard_body(s.subject, s.intro, s.action)
                       WHEN cv.channel_code = 'PORTAL_MSG' THEN format('<div class="portal-card"><h3>%s</h3><p>%s</p></div>', s.subject, s.intro)
                       ELSE cv.body_html END),
    body_text = COALESCE(NULLIF(cv.body_text,''),
                  CASE WHEN cv.channel_code = 'SMS' THEN s.sms_text ELSE cv.body_text END),
    subject = COALESCE(NULLIF(cv.subject,''), s.subject),
    is_active = true
FROM public.core_template t
JOIN tmp_lg_seed s ON s.code = t.code
WHERE cv.template_version_id = t.active_version_id
  AND t.module_code='LEGAL' AND t.country_code='KN';

-- 7. Completeness scoring function for the admin report
CREATE OR REPLACE FUNCTION public.lg_template_completeness(p_module_code TEXT DEFAULT 'LEGAL', p_country TEXT DEFAULT 'KN')
RETURNS TABLE (
  template_id UUID,
  code TEXT,
  name TEXT,
  status TEXT,
  has_subject BOOLEAN,
  has_body BOOLEAN,
  has_structure BOOLEAN,
  has_legal_refs BOOLEAN,
  has_signature BOOLEAN,
  has_footer BOOLEAN,
  channel_count INTEGER,
  completion_pct INTEGER
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
SELECT t.id AS template_id, t.code, t.name, t.status,
  (v.subject IS NOT NULL AND length(v.subject) > 0) AS has_subject,
  (v.body_html IS NOT NULL AND length(v.body_html) > 200) AS has_body,
  (v.template_structure IS NOT NULL AND jsonb_array_length(v.template_structure) > 0) AS has_structure,
  EXISTS(SELECT 1 FROM core_template_legal_reference lr WHERE lr.template_id = t.id) AS has_legal_refs,
  (v.body_html ILIKE '%signature%' OR v.body_html ILIKE '%Yours faithfully%') AS has_signature,
  (v.body_html ILIKE '%footer%' OR v.body_html ILIKE '%official communication%') AS has_footer,
  COALESCE((SELECT count(*)::int FROM core_template_channel_variant cv WHERE cv.template_version_id = v.id AND cv.is_active),0) AS channel_count,
  (
    (CASE WHEN v.subject IS NOT NULL AND length(v.subject)>0 THEN 1 ELSE 0 END) +
    (CASE WHEN v.body_html IS NOT NULL AND length(v.body_html)>200 THEN 1 ELSE 0 END) +
    (CASE WHEN v.template_structure IS NOT NULL AND jsonb_array_length(v.template_structure)>0 THEN 1 ELSE 0 END) +
    (CASE WHEN EXISTS(SELECT 1 FROM core_template_legal_reference lr WHERE lr.template_id = t.id) THEN 1 ELSE 0 END) +
    (CASE WHEN v.body_html ILIKE '%Yours faithfully%' THEN 1 ELSE 0 END) +
    (CASE WHEN v.body_html ILIKE '%official communication%' THEN 1 ELSE 0 END) +
    (CASE WHEN COALESCE((SELECT count(*) FROM core_template_channel_variant cv WHERE cv.template_version_id = v.id AND cv.is_active),0) >= 5 THEN 4 ELSE 0 END)
  ) * 10 AS completion_pct
FROM public.core_template t
LEFT JOIN public.core_template_version v ON v.id = t.active_version_id
WHERE t.module_code = p_module_code
  AND t.country_code = p_country
  AND t.scope = 'COUNTRY'
ORDER BY t.code;
$$;

GRANT EXECUTE ON FUNCTION public.lg_template_completeness(TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lg_build_standard_body(TEXT,TEXT,TEXT,TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lg_build_standard_structure(TEXT,TEXT,TEXT) TO authenticated, service_role;
