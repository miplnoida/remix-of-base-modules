# Epic 2.5B — St. Kitts & Nevis Legal Reference Seed Pack

Status: **Implemented — configuration/seed only, no DDL.**
Default country: **KN**
BN Product Builder: **ON HOLD.**

Seeds verified KN Social Security Act (Cap 329) records into the shared SSP
legal tables and activates communication legal-notice mappings. All content
is copied from existing repo evidence — no legal text was invented.

---

## 1. Legal sources found in repo

| Source | Evidence |
| --- | --- |
| Social Security Act, Cap 329 | `supabase/migrations/20260620194621_..._seed core_legal_reference` (11 sections) |
| Social Security Regulations (Reg 12 / 12A) | Same migration |
| Cap 329 citations in templates | `20260620204225_...` (LG-TPL-CERT-COMPLIANCE), `20260620200420_...` (org tokens), `20260620211003_...`, `20260627141426_...` |
| Legislation reference on BN scheme | `20260404132056_...` (`bn_scheme.governing_legislation = 'Social Security Act Cap 25.09'` — **conflicts** with Cap 329, see §3) |

Cap 329 is the citation used across `core_legal_reference`, LG templates, and
communication seeds — this epic adopts Cap 329 as the verified canonical
reference and flags the BN Cap 25.09 / Cap 20.25 strings as needing legal
sign-off (see §3).

---

## 2. Records seeded (verified)

| Table | Rows | Notes |
| --- | --- | --- |
| `ssp_legal_act` | 1 active (`SSA_CAP329`) | `CONFIG_PENDING` marked `is_active=false`, status `SUPERSEDED` (not deleted). |
| `ssp_regulation` | 1 (`SSR_MAIN`) | Parent = SSA Cap 329. |
| `ssp_legal_section` | 11 | Sections 20, 26, 46, 48, 49, 55, 60, 70, 72, 75, 78. |
| `ssp_legal_reference` | 13 | 11 section refs + `SSR_PAY_ARR` (Reg 12) + `SSR_PAY_BREACH` (Reg 12A). |
| `ssp_country_legal_applicability` | 2 | ACT + REGULATION marked available for KN from 1978-02-01. |

All `full_citation` strings mirror the exact wording already present in the
`core_legal_reference` seed — no new legal text was authored.

---

## 3. Pending client/legal-team input

- **Section text bodies.** Only short descriptors were copied from repo. Full
  authoritative section text must be provided by SSA / legal team and pasted
  into `ssp_legal_section.section_text`.
- **Amendment history.** `effective_from` set to 1978-02-01 for the Act and
  2020-01-01 for sections (repo values); confirm actual amendment dates.
- **Chapter number reconciliation.** BN legacy tables reference
  `Cap 25.09` / `Cap 20.25`; `core_legal_reference` and LG templates use
  `Cap 329`. Legal team must confirm the current statutory chapter number
  and, if different from Cap 329, we update `ssp_legal_act.chapter` +
  `full_citation` centrally.
- **Additional sections.** Any sections outside the 11 seeded here (e.g.
  short-term / long-term benefit qualifying rules, employment-injury
  provisions, non-contributory pensions) must be provided before BN Product
  Builder resumes.
- **Regulations schedule.** `SSR_MAIN` is a single umbrella record; the
  numbered regulations (Reg 3, 5, 12, 12A, …) should be broken out once the
  full text is supplied.
- **Court references.** `ssp_court_reference` remains empty — pending court
  master (Magistrate, High Court, ECSC) from SSA.

---

## 4. Communication legal-mapping status

`ssp_correspondence_legal_ref` — **9 KN mappings active**:

| correspondence_code | legal_reference_code |
| --- | --- |
| NOTICE_LEGAL | SSA_S46_RECOVERY, SSA_S48_ARREARS, SSA_S49_PENALTY, SSA_S60_PROSECUTE |
| NOTICE_COMPLIANCE | SSA_S20_REG, SSA_S26_REMIT, SSA_S55_INSPECT |
| BENEFIT_DECISION | SSA_S70_APPEAL, SSA_S72_OVERPAY |

Previously-inactive `NOTICE_LEGAL` template bindings created by Epic 2.7A
were flipped to `is_active=true` (only the ones tied to real templates —
`TODO_*` placeholders remain inactive).

Missing / still pending:
- SMS + Letter templates for legal notices (TODO placeholders from 2.7A).
- Mapping for `REMINDER_FILING` / `RECEIPT_PAYMENT` — no direct Cap 329
  section justifies a citation; deferred until legal review.

---

## 5. UI verification

- `/admin/legal-reference` — Acts, Sections, References and Applicability
  tabs now populated with SSA_CAP329 data (CONFIG_PENDING visible but
  inactive).
- `/admin/communication-domain` → **Legal Notice Mappings** tab — shows the
  9 active KN mappings.
- `/admin/communication-domain` → **Template Bindings** tab — `NOTICE_LEGAL`
  bindings now active for the real templates; TODO_* stay inactive.

---

## 6. Legacy impact

- `core_legal_reference*`, `lg_*`, BN, Compliance, BEMA, IA tables — **no
  structural or data changes**.
- No DDL executed; only inserts/updates against `ssp_*` tables.
- Admin routes and permissions unchanged.

---

## 7. Rollback

```sql
-- Reactivate placeholder if needed
UPDATE ssp_legal_act SET is_active = true, status='DRAFT'
 WHERE country_code='KN' AND act_code='CONFIG_PENDING';

-- Deactivate legal bindings (reverse the flip from this epic)
UPDATE ssp_correspondence_template_binding
   SET is_active = false
 WHERE country_code='KN' AND correspondence_code='NOTICE_LEGAL'
   AND template_ref NOT LIKE 'TODO@_%' ESCAPE '@';

DELETE FROM ssp_correspondence_legal_ref
 WHERE country_code='KN'
   AND legal_reference_code IN (
     'SSA_S46_RECOVERY','SSA_S48_ARREARS','SSA_S49_PENALTY','SSA_S60_PROSECUTE',
     'SSA_S20_REG','SSA_S26_REMIT','SSA_S55_INSPECT',
     'SSA_S70_APPEAL','SSA_S72_OVERPAY');

DELETE FROM ssp_country_legal_applicability
 WHERE country_code='KN'
   AND entity_ref IN (
     (SELECT id FROM ssp_legal_act    WHERE country_code='KN' AND act_code='SSA_CAP329'),
     (SELECT id FROM ssp_regulation   WHERE country_code='KN' AND regulation_code='SSR_MAIN'));

DELETE FROM ssp_legal_reference WHERE country_code='KN'
 AND ref_code IN ('SSA_S20_REG','SSA_S26_REMIT','SSA_S46_RECOVERY','SSA_S48_ARREARS',
                  'SSA_S49_PENALTY','SSA_S55_INSPECT','SSA_S60_PROSECUTE','SSA_S70_APPEAL',
                  'SSA_S72_OVERPAY','SSA_S75_FRAUD','SSA_S78_ESTATE',
                  'SSR_PAY_ARR','SSR_PAY_BREACH');

DELETE FROM ssp_legal_section WHERE act_id IN
  (SELECT id FROM ssp_legal_act WHERE country_code='KN' AND act_code='SSA_CAP329');

DELETE FROM ssp_regulation WHERE country_code='KN' AND regulation_code='SSR_MAIN';
DELETE FROM ssp_legal_act  WHERE country_code='KN' AND act_code='SSA_CAP329';
```

---

## 8. Next recommendation

1. **Legal team review** — confirm chapter number (Cap 329 vs Cap 25.09) and
   supply full section text; then update `ssp_legal_section.section_text`
   and `ssp_legal_act.chapter` in a follow-up seed.
2. **Epic 2.5C — KN Court Reference Seed** — populate
   `ssp_court_reference` (Magistrate, High Court, ECSC) with jurisdiction
   linkage.
3. **Epic 2.7B — Multi-channel template authoring** — build the SMS/Letter
   templates recorded as TODO in Epic 2.7A so all `NOTICE_LEGAL` channels
   activate.
4. Only after legal sign-off: revisit **BN Product Builder** to rebind
   `bn_scheme.governing_legislation` to the SSP legal reference facade.
