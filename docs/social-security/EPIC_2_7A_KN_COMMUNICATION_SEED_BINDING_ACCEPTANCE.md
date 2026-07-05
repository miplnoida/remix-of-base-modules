# Epic 2.7A — St. Kitts & Nevis Communication Seed & Template Binding Pack

Status: **Implemented — configuration/seed only.**
Default country: **KN**
Scope: Bind existing `notification_templates` to the shared correspondence
domain (`ssp_correspondence_template_binding`) and document the legal-notice
mapping status. **No new template engine, no schema changes, no legacy table
edits.**

---

## 1. Existing templates reused

Source of truth: `notification_templates` (rendered by
`/admin/notification-templates`). Templates leveraged for KN bindings:

| Template code                | Purpose                          | Channel |
| ---------------------------- | -------------------------------- | ------- |
| BN_CLAIM_SUBMITTED_EMAIL     | Claim received (BN)              | Email   |
| CLAIM_SUBMITTED              | Claim received (legacy)          | Email   |
| BN_ACKNOWLEDGEMENT_EMAIL     | General acknowledgement          | Email   |
| BN_EVIDENCE_REQUEST_EMAIL    | Document/evidence required       | Email   |
| IP_DOCUMENTS_REQUIRED        | IP documents required            | Email/Portal |
| BN_CLAIM_APPROVED_EMAIL      | Approval notice (BN)             | Email/Portal |
| CLAIM_APPROVED               | Approval notice (legacy)         | Email   |
| BN_CLAIM_DENIED_EMAIL        | Rejection notice (BN)            | Email   |
| CLAIM_REJECTED               | Rejection notice (legacy)        | Email   |
| BN_PAYMENT_ISSUED_EMAIL      | Payment notice (BN)              | Email   |
| CLAIM_PAYMENT_ISSUED         | Payment notice (legacy)          | Email   |
| INVOICE_EMAIL                | Payment receipt / invoice        | Email   |
| C3_SUBMITTED                 | Contribution statement ack       | Email   |
| COMP_NOTICE_1                | Compliance notice (first)        | Email   |
| COMP_FINAL_NOTICE            | Compliance final notice          | Email   |
| COMP_LEGAL_ESCALATED         | Compliance → legal escalation    | Email   |
| LG_DEMAND_LETTER             | Legal demand letter (disabled)   | Email   |
| LG_FINAL_DEMAND              | Legal final demand (disabled)    | Email   |
| LG_ENFORCEMENT_NOTICE        | Legal enforcement (disabled)     | Email   |
| LG_COURT_FILING_COVER        | Court filing cover (disabled)    | Email   |

Legal templates are shipped disabled in `notification_templates`; their
bindings are recorded but marked `is_active=false` pending legal-reference
sign-off (see §4).

---

## 2. Bindings created (`ssp_correspondence_template_binding`)

15 KN bindings inserted (deduped by the natural key
`(correspondence_code, channel_code, language_code, country_code)`).

| correspondence_code | channels covered | active default |
| ------------------- | ---------------- | -------------- |
| LETTER_GENERAL      | Email, Portal    | Yes            |
| REMINDER_FILING     | Email, Portal, SMS (TODO) | Yes / SMS inactive |
| BENEFIT_DECISION    | Email, Portal    | Yes            |
| BENEFIT_AWARD       | Email, SMS (TODO) | Yes / SMS inactive |
| RECEIPT_PAYMENT     | Email            | Yes            |
| STATEMENT_CONTRIB   | Email            | Yes            |
| NOTICE_COMPLIANCE   | Email, Letter (TODO) | Yes / Letter inactive |
| NOTICE_LEGAL        | Email, Letter    | **Inactive** (pending legal refs) |

Configure additional bindings from `/admin/communication-domain` → **Template
Bindings** tab, or by editing the template in `/admin/notification-templates`
and re-binding.

---

## 3. Missing templates / TODOs

Recorded as **inactive** placeholder bindings so gaps are visible in the UI:

| Placeholder ref                | Correspondence      | Channel |
| ------------------------------ | ------------------- | ------- |
| TODO_KN_SMS_PAYMENT_ISSUED     | BENEFIT_AWARD       | SMS     |
| TODO_KN_SMS_DOC_REMINDER       | REMINDER_FILING     | SMS     |
| TODO_KN_LETTER_COMPLIANCE      | NOTICE_COMPLIANCE   | LETTER  |
| TODO_KN_LETTER_LEGAL_DEMAND    | NOTICE_LEGAL        | LETTER  |

Action: create the missing templates in `/admin/notification-templates`, then
update the binding `template_ref` to the new template code and set
`is_active=true`.

Additional gaps (no binding created — no matching template):
- WhatsApp channel (no WhatsApp templates seeded).
- Voice/IVR channel.
- Multi-language variants (all bindings are `en`).

---

## 4. Legal-notice mapping status

`ssp_correspondence_legal_ref` — **no rows seeded.**

Reason: `ssp_legal_reference` for KN contains no confirmed acts/sections;
`ssp_legal_act` only holds the `CONFIG_PENDING` placeholder from Epic 2.5A.
Per the epic rules, unverified legal citations must NOT be invented.

Next steps (blocking for legal notices going live):
1. Seed KN Social Security Act + regulations in `ssp_legal_act` /
   `ssp_legal_section` (Legal Reference Domain screen).
2. Create matching `ssp_legal_reference` entries.
3. Return here and insert `ssp_correspondence_legal_ref` rows mapping
   `NOTICE_LEGAL`, `NOTICE_COMPLIANCE`, and `BENEFIT_DECISION` to the correct
   `legal_reference_code`s.
4. Flip the `NOTICE_LEGAL` bindings to `is_active=true` once citations exist.

---

## 5. Recipient preference examples

5 demo rows seeded under `party_source='DEMO'` (`DEMO-MEMBER-001`,
`DEMO-EMPLOYER-001`) so the Preferences tab is not empty. **No real member or
employer preferences have been created.**

---

## 6. UI verification (`/admin/communication-domain`)

Tabs verified to render seeded data:
- Channels — 7 seeded (Email, SMS, Letter, Portal, WhatsApp, Voice, In-App).
- Correspondence Types — 8 seeded.
- Delivery Statuses — from Epic 2.7 seed.
- Template Bindings — 15 KN rows (this epic).
- Legal Notice Mappings — empty by design (see §4).
- Recipient Resolver — still functional (uses Participant projection).
- Recipient Preferences — 5 demo rows.

---

## 7. Legacy impact

- `notification_templates` — **not modified** (read-only source of truth).
- `comm_*` assets — **untouched**.
- BN / Legal / Compliance / BEMA / IA tables — **no structural or data
  changes**.
- Legacy notification designer (`/admin/notification-templates`) remains the
  only editor for template bodies.

---

## 8. Rollback

```sql
-- Bindings created by this epic
DELETE FROM ssp_correspondence_template_binding
 WHERE country_code = 'KN'
   AND (template_ref LIKE 'TODO_KN_%'
        OR template_ref IN (
          'BN_CLAIM_APPROVED_EMAIL','BN_CLAIM_DENIED_EMAIL','CLAIM_APPROVED',
          'CLAIM_REJECTED','BN_PAYMENT_ISSUED_EMAIL','CLAIM_PAYMENT_ISSUED',
          'BN_ACKNOWLEDGEMENT_EMAIL','BN_CLAIM_SUBMITTED_EMAIL','CLAIM_SUBMITTED',
          'BN_EVIDENCE_REQUEST_EMAIL','IP_DOCUMENTS_REQUIRED',
          'COMP_NOTICE_1','COMP_FINAL_NOTICE','COMP_LEGAL_ESCALATED',
          'LG_DEMAND_LETTER','LG_FINAL_DEMAND','LG_ENFORCEMENT_NOTICE',
          'LG_COURT_FILING_COVER','INVOICE_EMAIL','C3_SUBMITTED'
        ));

-- Demo recipient preferences
DELETE FROM ssp_recipient_preference WHERE party_source = 'DEMO';
```

No structural rollback required — no DDL was executed.

---

## 9. Next recommendation

1. **Epic 2.5B — KN Legal Reference Seed** (unblocks legal-notice mappings and
   flips `NOTICE_LEGAL` bindings active).
2. **Epic 2.7B — Multi-channel template authoring** (create the SMS/Letter
   templates recorded as TODO here).
3. Only after (1): return to Epic 2.7A and insert the
   `ssp_correspondence_legal_ref` mappings.
4. **BN Product Builder remains ON HOLD** until legal refs and payment
   channels are verified for KN.
