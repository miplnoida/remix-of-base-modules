# Employer Audit Case — Architecture & Phased Plan

## Goal
Replace the current "loose collection" of audit visits / reports / communications with a single **Employer Audit Case** lifecycle:

`Employer → Audit Case → Visit(s) → Findings → Evidence → Violations → Communications → Actions → Resolution`

The **audit purpose** is set once at case setup and drives templates, communications, approvals, closure rules, and resolution behavior across the entire case.

---

## Architecture Summary

### New parent: `ce_employer_audit_cases`
A case is the durable container; visits are short-lived events. Multiple visits, communications, findings, violations, actions, and one final report all roll up to one case.

```
ce_employer_audit_cases (NEW — parent)
 ├─ ce_employer_audit_case_types (NEW — seeded catalog)
 ├─ ce_employer_audit_case_context_links (NEW — links to existing matters)
 ├─ ce_employer_audit_case_outcomes (NEW — per-action resolution log)
 ├─ ce_inspections (EXISTING — add audit_case_id FK)
 ├─ ce_inspection_findings (via inspection)
 ├─ ce_inspection_evidence (via inspection)
 ├─ ce_violations (EXISTING — add audit_case_id FK)
 ├─ ce_audit_communications (EXISTING — add audit_case_id FK)
 ├─ ce_employer_audit_reports (EXISTING — add audit_case_id FK + report_scope)
 └─ ce_follow_up_actions (EXISTING — add audit_case_id FK)
```

### Pulled-in employer context (linked, not copied)
At case open we **link** these existing employer matters into `ce_employer_audit_case_context_links`:
- `ce_payment_arrangements` (active)
- `ce_legal_proceedings` / `ce_legal_referrals` (open)
- `ce_violations` (open / in-progress)
- `ce_inspection_findings` (unresolved from prior cases)
- `ce_follow_up_actions` (open)
- `ce_audit_disputes` (open)
- `ce_employer_financial_ledger` aggregate (overdue / outstanding balance snapshot)

### Purpose as single source of truth
`audit_purpose` (set once on the case, validated against the seeded case type) drives:
- which **report sections** are rendered (case type → required sections)
- which **communication templates** are eligible (`case_type_codes` applicability)
- which **approval chain** applies (scoped by case type / purpose)
- which **closure checks** are required (scoped by case type)
- which **resolution actions** are allowed (e.g., "Legal Support Audit" can update legal status; "Payment Arrangement Review" can flag arrangement breach)

---

## Case Model Design

### `ce_employer_audit_cases`
```
id                     uuid PK
case_number            text UNIQUE  (AC-2026-000123 via ce_number_sequences)
employer_id            varchar(20) → er_master.regno
case_type_id           uuid → ce_employer_audit_case_types
audit_purpose          text   -- single source of truth
trigger_source         text   -- 'risk_score' | 'complaint' | 'random' | 'follow_up' | 'legal_request' | 'arrangement_review' | 'enforcement'
trigger_reference      text
scope                  jsonb  -- { contributions:true, payroll:true, classification:false, ... }
period_from            date
period_to              date
lead_inspector_code    varchar(50)
assigned_inspectors    text[]
status                 text   -- 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'CLOSED' | 'CANCELLED'
approval_state         text   -- 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED'
closure_outcome        text   -- 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'ESCALATED' | 'WITHDRAWN'
closure_reason         text
report_template_id     uuid
opened_at              timestamptz
closed_at              timestamptz
created_by, updated_by, created_at, updated_at
```

### `ce_employer_audit_case_types` (seeded)
```
id, code (UNIQUE), name, description,
default_purpose_text,
default_report_template_id,
default_communication_template_codes text[],
required_report_sections text[],
required_approval_levels text[],
closure_check_keys text[],
allowed_resolution_actions text[],
is_active, sort_order
```

**Seeded case types** (6):
1. `ROUTINE_AUDIT`
2. `FOLLOW_UP_AUDIT` (auto-loads prior open findings/violations)
3. `VIOLATION_REVIEW_AUDIT`
4. `PAYMENT_ARRANGEMENT_REVIEW`
5. `LEGAL_SUPPORT_AUDIT`
6. `SPECIAL_ENFORCEMENT_AUDIT`

### `ce_employer_audit_case_context_links`
```
id, audit_case_id, linked_entity_type, linked_entity_id,
link_reason ('AUTO_OPEN' | 'MANUAL'), display_summary jsonb,
is_addressed bool, addressed_outcome_id uuid → ce_employer_audit_case_outcomes,
created_at, created_by
```
`linked_entity_type` ∈ `{PAYMENT_ARRANGEMENT, LEGAL_CASE, VIOLATION, FINDING, FOLLOW_UP, DISPUTE, LEDGER_BALANCE}`.

### `ce_employer_audit_case_outcomes`
```
id, audit_case_id,
action_kind text,
target_entity_type, target_entity_id,
new_violation_id, updated_status,
reason, evidence_finding_ids uuid[],
approver_code, approval_status,
created_by, created_at
```

**`action_kind` values**:
`OPEN_NEW_VIOLATION`, `UPDATE_EXISTING_VIOLATION`, `RESOLVE_VIOLATION`, `PARTIALLY_RESOLVE_VIOLATION`,
`VALIDATE_ARRANGEMENT_COMPLIANCE`, `FLAG_ARRANGEMENT_BREACH`,
`UPDATE_LEGAL_STATUS`, `CLOSE_FOLLOW_UP`, `ESCALATE_TO_LEGAL`, `ESCALATE_TO_COLLECTIONS`, `CARRY_FORWARD`.

### Visit linkage
Add nullable `audit_case_id` to `ce_inspections`. Multiple inspections per case allowed. Existing inspections without a case stay valid (backward-compatible).

The Plan Item flow stays as-is, but on visit creation the planner can either attach to an **existing open case** or **create a new case** (purpose, type, scope set once in a wizard step).

### Findings / Evidence / Violations / Comms / Reports
- `ce_inspection_findings` and `ce_inspection_evidence` already key off `inspection_id` — case is implicit via the visit. **No schema change.**
- `ce_violations` gains `audit_case_id` — case dashboard lists all violations raised under it.
- `ce_audit_communications` gains `audit_case_id`.
- `ce_employer_audit_reports` gains `audit_case_id` + `report_scope` (`'SINGLE_VISIT'` (legacy default) or `'CASE'` for case-consolidated reports).
- `ce_follow_up_actions` gains `audit_case_id`.

---

## Seeded Templates

### Report / document templates (8) — `ce_audit_report_templates` (new lightweight registry)
1. Internal Working Paper Report
2. Employer Acknowledgment Report
3. Findings Memo
4. Evidence Summary
5. Books / Documents Required Notice
6. Violation Notice
7. Management Summary
8. Legal / Enforcement Pack

Each template stores: `code`, `name`, `applicable_case_type_codes`, `sections (jsonb)`, `default_attachments`, `requires_approval`, `output_formats`.

### Communication templates (15 codes) — extends existing `ce_audit_communication_templates`
`AUDIT_INTIMATION`, `BOOKS_RECORDS_REQUIRED`, `VISIT_REMINDER`, `INTERIM_FINDINGS`, `EVIDENCE_SUMMARY_COMM`, `DRAFT_FINDINGS_SHARE`, `APPROVED_FINDINGS_SHARE`, `FINAL_REPORT_SHARE`, `VIOLATION_NOTICE_COMM`, `CORRECTIVE_ACTION_REQUEST`, `ACKNOWLEDGMENT_REQUEST`, `PAYMENT_ARRANGEMENT_REVIEW_NOTICE`, `LEGAL_SUPPORT_ESCALATION`, `FOLLOW_UP_REMINDER`, `FOLLOW_UP_ESCALATION`.

For each: channel(s), approval level, allowed attachments, recipient resolution rules, secure-link enabled, `case_type_codes[]` applicability.

---

## Online Communication / Employer Interaction
Existing `ce_audit_communication_secure_tokens` magic-link flow extended so the employer link surfaces the **case** (not just one comm): list of all comms, reports, document requests, dispute window. Acknowledgments, document uploads, clarifications, disputes write back via existing `ce_audit_employer_responses` / `ce_audit_employer_uploaded_documents` / `ce_audit_disputes` tables. Employer portal app itself stays out of scope per earlier directive.

---

## Resolution Workflow for Existing Violations (and other matters)
Within a case, "Resolve from Case" UI (Linked Matters → Violations):
1. Inspector picks linked violation → action `RESOLVE_VIOLATION` / `PARTIALLY_RESOLVE_VIOLATION`.
2. Provides reason + selects evidence findings (must belong to a visit in this case).
3. If case type / policy requires approval → `PENDING`; supervisor approves.
4. On approval: `ce_violations.status` updated, outcome row written, audit trail logged via existing `auditService.logAuditTrail`.
5. Linked context entry marked `is_addressed = true`.

Same pattern for arrangement breach flagging, legal status update, follow-up closure, escalations.

---

## Admin Configuration
- New `/compliance/admin/audit-case-types` — CRUD case types and their defaults / linkages.
- New `/compliance/admin/report-templates` — sections editor for report/document templates.
- Existing `/compliance/admin/communication-templates` extended with case-type applicability.

---

## Schema / Migration Changes (single migration)
1. Create `ce_employer_audit_case_types` + seed 6 rows.
2. Create `ce_employer_audit_cases`.
3. Create `ce_employer_audit_case_context_links`.
4. Create `ce_employer_audit_case_outcomes`.
5. Create `ce_audit_report_templates` + seed 8 templates.
6. Add nullable `audit_case_id` columns + indexes to: `ce_inspections`, `ce_violations`, `ce_audit_communications`, `ce_employer_audit_reports`, `ce_follow_up_actions`.
7. Add `case_type_codes text[]` to `ce_audit_communication_templates` if missing.
8. Add `report_scope text default 'SINGLE_VISIT'` to `ce_employer_audit_reports`.
9. Number sequence row for `AUDIT_CASE` in `ce_number_sequences`.
10. Helper view `ce_v_audit_case_overview` (visit/finding/evidence/violation/comm counts per case).

Per project knowledge: **no RLS** — role-based access only. Audit trail via existing `auditService.logAuditTrail` + DB triggers where already configured.

---

## Files Changed (high-level)

**New**
- `src/types/auditCase.ts`
- `src/services/auditCaseService.ts`
- `src/services/auditCaseContextService.ts`
- `src/services/auditCaseOutcomeService.ts`
- `src/services/auditReportTemplateService.ts` + `src/hooks/useReportTemplates.ts`
- `src/pages/compliance/audit-cases/AuditCaseListPage.tsx`
- `src/pages/compliance/audit-cases/AuditCaseWorkspace.tsx`
- `src/components/compliance/audit-cases/CreateAuditCaseDialog.tsx`
- `src/components/compliance/audit-cases/LinkedMattersPanel.tsx`
- `src/components/compliance/audit-cases/CaseOutcomePanel.tsx`
- `src/pages/compliance/admin/AuditCaseTypesPage.tsx`
- `src/pages/compliance/admin/AuditReportTemplatesPage.tsx`

**Edited**
- `src/pages/compliance/Routes.tsx`
- `src/pages/compliance/audit-planning/AuditVisitWorkspace.tsx`
- `src/services/inspectionService.ts`
- `src/services/auditCommunicationService.ts`
- `src/services/auditReportService.ts`
- `src/services/violationService.ts`

**Migration**
- `supabase/migrations/<timestamp>_employer_audit_cases.sql`

---

## Backward Compatibility
- All new FKs (`audit_case_id`) are **nullable**. Pre-existing inspections, violations, comms, reports, follow-ups continue to work untouched.
- The Plan → Visit flow still works without a case (legacy mode). "New Audit Case" is the new recommended entry point.
- Existing `EmployerVisitWorkspace` / `AuditVisitWorkspace` keep working; they additionally surface a "Part of Case AC-…" link when present.
- No data migration / backfill in this phase. (Optional later script.)
- No RLS changes; role-based access policy preserved.

---

## Phased Rollout

- **Phase A** — Schema & Seeds (single migration).
- **Phase B** — `auditCaseService` lifecycle + `auditCaseContextService` (auto-load prior matters) + number-sequence integration.
- **Phase C** — Case list + Case workspace UI (Overview, Linked Matters, Visits, Findings, Communications, Reports, Outcomes, Closure tabs); `CreateAuditCaseDialog` (purpose set ONCE).
- **Phase D** — Visit ↔ Case integration (attach existing visit / create new case from planner; AuditVisitWorkspace banner).
- **Phase E** — Outcomes / Resolution workflow (LinkedMattersPanel actions + approvals).
- **Phase F** — Communications & Reports purpose-driven (templates filtered by `case_type_codes`; report `report_scope` honored).
- **Phase G** — Admin pages (case types, report templates, comm template applicability).
- **Phase H** — Online interaction polish (case-level secure-token bundle).

---

## Assumptions / Risks
- Will add `ce_audit_report_templates` as a new lightweight registry rather than overloading `ce_notice_templates` (which is targeted at notices) — confirmed during Phase A read.
- Employer portal app is **not** in scope; we expose case data via existing secure-token edge function.
- Approval engine for outcomes will reuse `ce_audit_communication_approvals` patterns; case-specific approval table can be added later if needed.
- Migration is large but additive; risk to existing flows is low because all FKs are nullable.
- No RLS will be added per project knowledge entry 9.
