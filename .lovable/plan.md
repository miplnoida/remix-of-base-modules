

## Goal
When the inspector opens the **Employer Audit Report** from a Field Visit (`/compliance/field/audit-report/:inspectionId`), every field that the system already knows must be **pre-filled automatically**, so the inspector only has to review/tweak text. Today only counts (findings/evidence/violations/checklist %) are auto-filled — narrative, audit date, location, reg no., and audit contact are blank.

## Root cause
`fieldAuditService.generateEmployerAuditReport()` only writes counts + employer/inspector identity. It ignores:
- `ce_inspections` → `actual_start` / `visit_date` / `scheduled_date` / `location_address` (audit date & location)
- `ce_inspection_employer_interactions` → `representative_name`, `representative_designation`, `employer_acknowledged` (audit contact)
- `er_master` (via `employer_id`) → `regno`, `hq_addr1/2` (employer reg number, fallback location)
- Findings/checklist/evidence aggregates (records reviewed, executive summary seed)

The viewer hydrates from the report row, so any field the generator leaves null shows blank.

## Plan

### A. Service — extend the generator to auto-derive every available field
**File:** `src/services/fieldAuditService.ts` → `generateEmployerAuditReport()`

1. **Fetch employer master** (`er_master`) by `employer_id` to read `regno`, `hq_addr1/2`.
2. **Use interaction row** (already in `payload.interaction`) for `representative_name`, `representative_designation`, `employer_acknowledged`.
3. **Compose auto-derived fields** and write them on **insert**, AND on **update only when the existing value is null/empty** (never overwrite inspector-edited text):
   - `audit_date` ← `inspection.actual_start ?? inspection.visit_date ?? inspection.scheduled_date`
   - `audit_location` ← `inspection.location_address ?? "${er_master.hq_addr1}, ${er_master.hq_addr2}"`
   - `employer_reg_number` ← `er_master.regno`
   - `audit_contact_name` ← `interaction.representative_name`
   - `audit_contact_designation` ← `interaction.representative_designation`
   - `audit_contact_present` ← `interaction.employer_acknowledged ?? true`
   - **Seed narrative** (only when null on first insert; never overwritten on refresh):
     - `purpose_scope` ← templated: *"Routine compliance audit of ${employer_name} for the period under review. Scope covers wage records, contributions, and statutory filings."*
     - `executive_summary` ← *"On ${auditDate}, an on-site audit was conducted at ${employer_name}. ${findings_count} finding(s), ${violations_count} violation(s), and ${evidence_count} evidence item(s) were recorded. Checklist completion: ${checklist_pct}%."*
     - `records_reviewed` ← derived from distinct `category` values in `payload.checklist`, joined with commas (e.g. *"Wage Books, Contribution Registers, Payroll, Employee Records"*); fallback fixed list when checklist empty.
     - `recommendations` ← *"Address all findings within the statutory timeframe. Refer to Violations section for required corrective actions."* — only when `violations_count > 0`.

4. Add a small helper `coalesceEmpty(existingVal, derivedVal)` → returns `derivedVal` only when `existingVal` is null/undefined/empty. Apply per field on the UPDATE branch so inspector edits are never clobbered by **Refresh Counts**.

### B. Viewer — surface a clear "auto-populated" cue
**File:** `src/pages/compliance/audit-planning/EmployerAuditReportViewer.tsx`

- Add a subtle hint badge `"Auto-filled from visit data"` near the narrative section after a fresh generate, so inspectors know the prefilled text is editable. Pure cosmetic — no extra API calls.

### C. Database — no schema change required
All target columns already exist on `ce_employer_audit_reports`: `audit_date`, `audit_location`, `employer_reg_number`, `audit_contact_name`, `audit_contact_designation`, `audit_contact_present`, `purpose_scope`, `executive_summary`, `records_reviewed`, `recommendations`.

### D. Behavior guarantees
- **First open from visit** → report row created with everything pre-filled. Inspector just reviews & saves.
- **Refresh Counts after manual edits** → counts update; `coalesceEmpty` preserves all manual text.
- **Finalized report** → generator early-returns unchanged (already implemented).
- **Missing source data** (e.g. no interaction yet) → those specific fields stay blank; no error thrown.

## Files
- **Edit:** `src/services/fieldAuditService.ts` — extend `generateEmployerAuditReport` (~60 lines added).
- **Edit:** `src/pages/compliance/audit-planning/EmployerAuditReportViewer.tsx` — add "Auto-filled" badge cue (~10 lines).
- **No migration, no RLS change, no edge function.**

## Verification
1. Visit with interaction + completed checklist → "Generate Report" → date, location, reg no., contact, purpose, summary, records reviewed all pre-filled.
2. Edit Executive Summary → click Refresh Counts → manual edit preserved; counts updated.
3. Visit with no interaction → contact fields stay blank, other fields still pre-filled.
4. Finalize report → no overwrite on subsequent refresh attempts.

