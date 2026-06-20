
-- 1. core_template_legal_reference linkage table
CREATE TABLE IF NOT EXISTS public.core_template_legal_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.core_template(id) ON DELETE CASCADE,
  template_version_id uuid NULL REFERENCES public.core_template_version(id) ON DELETE CASCADE,
  legal_reference_id uuid NOT NULL REFERENCES public.core_legal_reference(id) ON DELETE RESTRICT,
  required_flag boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  usage_note text NULL,
  created_by varchar(50) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, template_version_id, legal_reference_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_template_legal_reference TO authenticated;
GRANT ALL ON public.core_template_legal_reference TO service_role;

CREATE INDEX IF NOT EXISTS ctlr_template_idx
  ON public.core_template_legal_reference(template_id, display_order);
CREATE INDEX IF NOT EXISTS ctlr_ref_idx
  ON public.core_template_legal_reference(legal_reference_id);

-- 2. Snapshot column on generated documents
ALTER TABLE public.core_generated_document
  ADD COLUMN IF NOT EXISTS legal_references_snapshot jsonb NULL;

-- 3. Missing tokens
INSERT INTO public.core_template_token (token_code, token_label, module_code, entity_type, sample_value, description, is_active)
VALUES
  ('legal_reference.act_name',   'Legal Reference: Act Name',   'LEGAL', 'legal_reference', 'Social Security Act, Cap 329', 'Name of the governing act', true),
  ('legal_reference.regulation', 'Legal Reference: Regulation', 'LEGAL', 'legal_reference', 'Social Security (Amendment) Regulations, 2012', 'Regulation cited', true)
ON CONFLICT (token_code) DO NOTHING;

-- 4. Seed 4 missing Legal templates (DRAFT bodies, then publish v1)
-- Use a CTE to insert template + initial version atomically
WITH letterhead AS (
  SELECT id FROM public.core_template_layout WHERE code = 'LETTERHEAD_FULL' LIMIT 1
),
new_templates AS (
  INSERT INTO public.core_template (code, name, description, module_code, module_name, country_code, institution_code,
                                    template_type, template_category, owning_department, status, source_system, is_active,
                                    default_layout_id, tags)
  SELECT * FROM (VALUES
    ('LG-TPL-WITNESS-REQUEST', 'Witness Request Letter',
      'Request for a witness to attend hearing or provide a statement.',
      'LEGAL', 'Legal', 'KN', 'SSB',
      'LETTER', 'Court & Hearing', 'Legal', 'ACTIVE', 'CORE', true,
      (SELECT id FROM letterhead), ARRAY['legal','witness','hearing']),
    ('LG-TPL-RECOVERY-NOTICE', 'Recovery Action Notice',
      'Formal notice of recovery action under SSA Section 46 for outstanding contributions.',
      'LEGAL', 'Legal', 'KN', 'SSB',
      'NOTICE', 'Enforcement', 'Legal', 'ACTIVE', 'CORE', true,
      (SELECT id FROM letterhead), ARRAY['legal','recovery','enforcement']),
    ('LG-TPL-WITHDRAWAL-NOTICE', 'Withdrawal Notice',
      'Notice of withdrawal of legal action / case discontinuance.',
      'LEGAL', 'Legal', 'KN', 'SSB',
      'NOTICE', 'Closure', 'Legal', 'ACTIVE', 'CORE', true,
      (SELECT id FROM letterhead), ARRAY['legal','closure','withdrawal']),
    ('LG-TPL-MATTER-RESOLVED', 'Matter Resolved Notice',
      'Notification that a legal matter has been resolved.',
      'LEGAL', 'Legal', 'KN', 'SSB',
      'NOTICE', 'Closure', 'Legal', 'ACTIVE', 'CORE', true,
      (SELECT id FROM letterhead), ARRAY['legal','closure','resolved'])
  ) AS t(code,name,description,module_code,module_name,country_code,institution_code,template_type,template_category,owning_department,status,source_system,is_active,default_layout_id,tags)
  WHERE NOT EXISTS (SELECT 1 FROM public.core_template ct WHERE ct.code = t.code)
  RETURNING id, code, default_layout_id
),
new_versions AS (
  INSERT INTO public.core_template_version (template_id, version_no, status, subject, body_html, layout_id, published_at, published_by)
  SELECT nt.id, 1, 'PUBLISHED',
    CASE nt.code
      WHEN 'LG-TPL-WITNESS-REQUEST'  THEN 'Request to Appear as a Witness — Case {{legal.case_no}}'
      WHEN 'LG-TPL-RECOVERY-NOTICE'  THEN 'Notice of Recovery Action — {{employer.name}}'
      WHEN 'LG-TPL-WITHDRAWAL-NOTICE' THEN 'Notice of Withdrawal of Legal Action — Case {{legal.case_no}}'
      WHEN 'LG-TPL-MATTER-RESOLVED'  THEN 'Notice: Legal Matter Resolved — Case {{legal.case_no}}'
    END,
    CASE nt.code
      WHEN 'LG-TPL-WITNESS-REQUEST' THEN
        '<div class="letter">'
        || '<p class="ref"><strong>Ref:</strong> {{document.reference_no}}<br/><strong>Date:</strong> {{document.generated_date}}</p>'
        || '<p>{{employer.contact_person}}<br/>{{employer.name}}<br/>{{employer.address}}</p>'
        || '<p><strong>RE: Request to Appear as a Witness — Case {{legal.case_no}}</strong></p>'
        || '<p>Dear Sir/Madam,</p>'
        || '<p>The St. Christopher and Nevis Social Security Board, Legal Department, requires your attendance as a witness in the matter referenced above, scheduled for <strong>{{legal.next_hearing_date}}</strong> at the Magistrate''s Court of St. Kitts and Nevis (Court Case No. {{legal.court_case_no}}).</p>'
        || '<p>You are requested to bring all original documents in your possession that relate to the employer''s contribution records, employment of the affected insured persons, and any communications received from the Board.</p>'
        || '<p><strong>Legal basis:</strong> {{legal_reference.full}} ({{legal_reference.act_name}}, Section {{legal_reference.section}}).</p>'
        || '<p>Failure to attend without lawful excuse may result in the issuance of a summons compelling your attendance.</p>'
        || '<p>For confirmation or to request rescheduling, please contact the Legal Department on {{institution.phone}} or {{institution.email}}.</p>'
        || '<p>Yours faithfully,<br/><br/>____________________________<br/>{{legal.assigned_officer}}<br/>Legal Department<br/>{{institution.name}}</p>'
        || '</div>'
      WHEN 'LG-TPL-RECOVERY-NOTICE' THEN
        '<div class="letter">'
        || '<p class="ref"><strong>Ref:</strong> {{document.reference_no}}<br/><strong>Date:</strong> {{document.generated_date}}</p>'
        || '<p>{{employer.contact_person}}<br/>{{employer.name}} (Reg. No. {{employer.registration_no}})<br/>Account: {{employer.account_no}}<br/>{{employer.address}}</p>'
        || '<p><strong>RE: NOTICE OF RECOVERY ACTION — Outstanding Contributions</strong></p>'
        || '<p>Compliance Case: {{compliance.case_no}} · Legal Case: {{legal.case_no}}</p>'
        || '<p>Despite previous demands, the sum of <strong>EC$ {{legal.amount_due}}</strong> remains outstanding on your employer account in respect of unpaid social security contributions, surcharges and interest.</p>'
        || '<p>Take notice that the Board will, within fourteen (14) days from the date of this notice, commence formal recovery proceedings, including but not limited to attachment of monies, garnishment, and enforcement of judgment.</p>'
        || '<p><strong>Action required:</strong> Pay the full outstanding balance, or contact the Legal Department to agree a binding payment arrangement, on or before <strong>{{payment_arrangement.next_due_date}}</strong>.</p>'
        || '<p><strong>Legal basis:</strong> {{legal_reference.full}} ({{legal_reference.act_name}}, Section {{legal_reference.section}}). Further provisions: {{legal_reference.regulation}}.</p>'
        || '<p>Costs incurred in recovering this debt (court filing, service, enforcement) will be added to your account as permitted under the Act.</p>'
        || '<p>Yours faithfully,<br/><br/>____________________________<br/>{{legal.assigned_officer}}<br/>Legal Department · {{institution.name}}<br/>{{institution.phone}} · {{institution.email}}</p>'
        || '</div>'
      WHEN 'LG-TPL-WITHDRAWAL-NOTICE' THEN
        '<div class="letter">'
        || '<p class="ref"><strong>Ref:</strong> {{document.reference_no}}<br/><strong>Date:</strong> {{document.generated_date}}</p>'
        || '<p>{{employer.contact_person}}<br/>{{employer.name}}<br/>{{employer.address}}</p>'
        || '<p><strong>RE: NOTICE OF WITHDRAWAL OF LEGAL ACTION — Case {{legal.case_no}}</strong></p>'
        || '<p>Court Case No.: {{legal.court_case_no}}</p>'
        || '<p>Please be advised that the St. Christopher and Nevis Social Security Board hereby withdraws the legal action commenced against {{employer.name}} in the matter referenced above, with effect from {{document.generated_date}}.</p>'
        || '<p>This withdrawal is made on the following basis:</p>'
        || '<blockquote>{{legal.stage}}</blockquote>'
        || '<p>This notice does not preclude the Board from re-instituting proceedings should fresh grounds arise, including non-compliance with any payment arrangement, fresh contribution arrears, or breach of settlement terms.</p>'
        || '<p><strong>Legal basis:</strong> {{legal_reference.full}} ({{legal_reference.act_name}}).</p>'
        || '<p>Yours faithfully,<br/><br/>____________________________<br/>{{legal.assigned_officer}}<br/>Legal Department · {{institution.name}}</p>'
        || '</div>'
      WHEN 'LG-TPL-MATTER-RESOLVED' THEN
        '<div class="letter">'
        || '<p class="ref"><strong>Ref:</strong> {{document.reference_no}}<br/><strong>Date:</strong> {{document.generated_date}}</p>'
        || '<p>{{employer.contact_person}}<br/>{{employer.name}} (Reg. No. {{employer.registration_no}})<br/>{{employer.address}}</p>'
        || '<p><strong>RE: NOTICE — LEGAL MATTER RESOLVED · Case {{legal.case_no}}</strong></p>'
        || '<p>The St. Christopher and Nevis Social Security Board confirms that the legal matter referenced above (Court Case No. {{legal.court_case_no}}) has been fully resolved as of {{document.generated_date}}.</p>'
        || '<p><strong>Resolution summary:</strong> All outstanding contributions, surcharges, interest, legal fees and costs in respect of Compliance Case {{compliance.case_no}} and Payment Arrangement {{payment_arrangement.reference}} have been satisfied. The total of <strong>EC$ {{legal.amount_due}}</strong> has been received and applied.</p>'
        || '<p>Your employer account is in good standing as of the date of this notice. Please continue to file C3 returns and remit contributions in accordance with the Act.</p>'
        || '<p><strong>Legal basis:</strong> {{legal_reference.full}} ({{legal_reference.act_name}}, Section {{legal_reference.section}}).</p>'
        || '<p>If you have any questions, contact the Legal Department on {{institution.phone}} or {{institution.email}}.</p>'
        || '<p>Yours faithfully,<br/><br/>____________________________<br/>{{legal.assigned_officer}}<br/>Legal Department · {{institution.name}}</p>'
        || '</div>'
    END,
    nt.default_layout_id, now(), 'SYSTEM-SEED'
  FROM new_templates nt
  RETURNING id, template_id
)
UPDATE public.core_template t
SET active_version_id = nv.id
FROM new_versions nv
WHERE t.id = nv.template_id;

-- 5. Seed default template ↔ legal-reference links (best-effort, idempotent)
-- Map well-known template codes to relevant SKN refs.
INSERT INTO public.core_template_legal_reference (template_id, legal_reference_id, required_flag, display_order, usage_note, created_by)
SELECT t.id, r.id, true, 0, 'Default mapping (seed)', 'SYSTEM-SEED'
FROM public.core_template t
JOIN public.core_legal_reference r
  ON r.country_code = 'SKN' AND r.status = 'ACTIVE' AND r.is_active = true
WHERE t.module_code = 'LEGAL'
  AND (
       (t.code = 'LG-TPL-DEMAND-LETTER'      AND r.ref_code IN ('SSA_S46_RECOVERY','SSA_S48_ARREARS'))
    OR (t.code = 'LG-TPL-FINAL-DEMAND'       AND r.ref_code IN ('SSA_S46_RECOVERY','SSA_S49_PENALTY'))
    OR (t.code = 'LG-TPL-NBA'                AND r.ref_code IN ('SSA_S46_RECOVERY','SSA_S60_PROSECUTE'))
    OR (t.code = 'LG-TPL-ARR-BREACH'         AND r.ref_code IN ('SSR_PAY_ARR','SSR_PAY_BREACH'))
    OR (t.code = 'LG-TPL-PAYMENT-DEFAULT'    AND r.ref_code IN ('SSR_PAY_BREACH','SSA_S48_ARREARS'))
    OR (t.code = 'LG-TPL-REF-ACCEPT'         AND r.ref_code IN ('SSA_S60_PROSECUTE'))
    OR (t.code = 'LG-TPL-REF-RETURN'         AND r.ref_code IN ('SSA_S55_INSPECT'))
    OR (t.code = 'LG-TPL-CASE-ASSIGNMENT'    AND r.ref_code IN ('SSA_S60_PROSECUTE'))
    OR (t.code = 'LG-TPL-COURT-COVER'        AND r.ref_code IN ('MCA_FILE_CLAIM','FEE_COURT_FILING'))
    OR (t.code = 'LG-TPL-HEARING-NOTICE'     AND r.ref_code IN ('MCA_SUMMONS'))
    OR (t.code = 'LG-TPL-ADJOURNMENT'        AND r.ref_code IN ('MCA_ADJOURN'))
    OR (t.code = 'LG-TPL-SUMMONS-COVER'      AND r.ref_code IN ('MCA_SUMMONS'))
    OR (t.code = 'LG-TPL-EVIDENCE-COVER'     AND r.ref_code IN ('MCA_FILE_CLAIM'))
    OR (t.code = 'LG-TPL-WITNESS-REQUEST'    AND r.ref_code IN ('MCA_SUMMONS'))
    OR (t.code = 'LG-TPL-SETTLEMENT-OFFER'   AND r.ref_code IN ('SETTLE_AGREE','SSR_PAY_ARR'))
    OR (t.code = 'LG-TPL-SETTLE-ACCEPT'      AND r.ref_code IN ('SETTLE_AGREE'))
    OR (t.code = 'LG-TPL-SETTLE-REJECT'      AND r.ref_code IN ('SETTLE_AGREE'))
    OR (t.code = 'LG-TPL-SETTLE-TERMS'       AND r.ref_code IN ('SETTLE_AGREE','SSR_PAY_ARR'))
    OR (t.code = 'LG-TPL-PAYPLAN-LEGAL'      AND r.ref_code IN ('COURT_ORDER_PAY','SSR_PAY_ARR'))
    OR (t.code = 'LG-TPL-JUDGMENT'           AND r.ref_code IN ('MCA_JUDGMENT'))
    OR (t.code = 'LG-TPL-JUDG-SATISFIED'     AND r.ref_code IN ('MCA_JUDGMENT'))
    OR (t.code = 'LG-TPL-ENFORCEMENT'        AND r.ref_code IN ('MCA_ENFORCE','FEE_ENFORCE'))
    OR (t.code = 'LG-TPL-GARNISHMENT'        AND r.ref_code IN ('MCA_GARNISH'))
    OR (t.code = 'LG-TPL-EXECUTION'          AND r.ref_code IN ('MCA_ENFORCE'))
    OR (t.code = 'LG-TPL-RECOVERY-NOTICE'    AND r.ref_code IN ('SSA_S46_RECOVERY','SSA_S48_ARREARS'))
    OR (t.code = 'LG-TPL-FEE-NOTICE'         AND r.ref_code IN ('FEE_LEGAL_PROC','FEE_SERVICE'))
    OR (t.code = 'LG-TPL-FEE-WAIVER-ACK'     AND r.ref_code IN ('FEE_WAIVER'))
    OR (t.code = 'LG-TPL-WAIVER-APPROVE'     AND r.ref_code IN ('FEE_WAIVER'))
    OR (t.code = 'LG-TPL-WAIVER-REJECT'      AND r.ref_code IN ('FEE_WAIVER'))
    OR (t.code = 'LG-TPL-CASE-CLOSURE'       AND r.ref_code IN ('SSA_S60_PROSECUTE'))
    OR (t.code = 'LG-TPL-WITHDRAWAL-NOTICE'  AND r.ref_code IN ('SSA_S60_PROSECUTE'))
    OR (t.code = 'LG-TPL-MATTER-RESOLVED'    AND r.ref_code IN ('SSA_S46_RECOVERY'))
  )
ON CONFLICT (template_id, template_version_id, legal_reference_id) DO NOTHING;
