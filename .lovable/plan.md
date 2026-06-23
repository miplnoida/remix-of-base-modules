## Rebuild Legal Matter Intake — Universal Model

### Scope
Convert the current employer/compliance-skewed "Case Intake" into a **universal Legal Matter Intake** that supports employer, insured person, claim, overpayment, fraud, estate, court, and internal-advice matters. Reseed Legal data so no orphan/half-seeded cases remain.

---

### 1. Database changes (one migration)

**New table `lg_case_intake`** (replaces ad-hoc intake usage of `lg_case_referral`):
```text
intake_no, country_code (default 'SKN'), source_module, source_type,
source_record_id (nullable), matter_type_code, recommended_case_type_code,
primary_entity_type, primary_entity_id (nullable), legacy_primary_entity_name,
summary, priority_code, intake_status, submitted_by, submitted_at,
recommended_stage_code, recommended_workbasket_code, recommended_team_code,
lg_case_id (nullable, set on accept), decision_reason, info_request_notes
```
Indexes on `intake_status`, `source_module`, `primary_entity_type+primary_entity_id`, `lg_case_id`.

**Extend `lg_case`** (additive, nullable):
`primary_entity_type`, `primary_entity_id`, `legacy_primary_entity_name`, `source_intake_id`, `source_module`, `source_record_id`.

**Reference seed rows**:
- `lg_case_intake_source` (new small table) seeded with: `COMPLIANCE`, `BENEFITS`, `CLAIMS`, `EMPLOYER_SERVICES`, `INSURED_PERSON_SERVICES`, `LEGAL_DIRECT`, `COURT_EXTERNAL`, `INTERNAL_ADMIN`, `LEGACY_MIGRATION`.
- `lg_matter_type` (new) seeded: contribution recovery, failure-to-register, payment-arrangement-default, benefit-appeal, overpayment, fraud, estate-recovery, court-matter, internal-advice, contract/procurement.
- `lg_primary_entity_type` (new) seeded with the 11 allowed types.

All new public tables get standard GRANTs (NO-RLS per project rule).

### 2. Services
- New `src/services/legal/lgIntakeService.ts` — list/get/create/update intake, accept (delegates to `lgCaseCreateService` + `lgAssignmentService` + `lgPartyService`), request-info, reject, link-existing.
- Extend `lgCaseCreateService.createCase` to accept primary_entity_* and source_intake_id, and auto-create SSB internal party as COMPLAINANT/APPLICANT plus respondent based on entity type.

### 3. UI
- Rename screen/route labels to **"Legal Matter Intake"** (sidebar + page titles); keep route paths for back-compat.
- Rebuild `LegalCaseIntake` list grid with the 12 generic columns specified.
- New `IntakeReviewWorkspace` page (replaces existing `IntakeDetail` content) with sections: Source Summary, Primary Entity, Related Records, Documents, Payment/Amounts, Recommended Action, Routing Preview, Decision; actions: Accept & Create Case, Request Info, Reject, Link Existing, Attach Documents.
- Routing Preview reuses existing routing engine via `useLgAssignment` dry-run.

### 4. Data cleanup + reseed
- **Audit query** finds existing `lg_case` rows without employer/person/claim link AND not flagged legacy → delete (cascade parties/assignments/history) via a one-off SQL migration step.
- **Reseed** with the 9 flows (A–I), each producing a linked intake + (for accepted/created) a real `lg_case` with parties, assignment, stage history, and DMS doc links. Status mix: PENDING_REVIEW, INFO_REQUESTED, ACCEPTED, CASE_CREATED, REJECTED.

### 5. Validation report
- New admin page `/legal/admin/intake-validation` showing the 10-column report (Intake No, Source, Matter Type, Primary Entity Link Status, Legal Case Link, Parties, Documents, Routing, Assignment, Issues).

### 6. Acceptance checks
- TypeScript build passes.
- Grid is matter-type generic (no employer-only columns).
- All seeded cases linked OR explicitly LEGACY_EXTERNAL.
- Accept flow produces case + parties + assignment + stage history in a single transaction-like sequence.

---

### Out of scope
- Renaming existing route URL strings (keep redirects).
- Deleting `legal_cases` legacy table (separate concern).
- Changing routing/assignment engine internals.

### Delivery order
1. Migration (tables + grants + reference seeds).
2. Services (`lgIntakeService`, extend `lgCaseCreateService`).
3. UI (list + review workspace + validation report).
4. Data cleanup + demo reseed (insert tool).
5. Smoke check via Playwright on `/legal/intake`.

Estimated touch: ~15 new files, ~6 edited, 1 migration, 1 data-reseed script.