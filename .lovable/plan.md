# Employer Compliance History & Audit Linkage — Architecture & Phased Plan

> **Pivot:** No new "Audit Case" parent. Cases (`ce_cases`) are still created **only on violation escalation** — that route stays as-is. This plan instead **surfaces existing employer compliance history everywhere the audit officer works**, lets them **manually link** prior matters to the current visit/finding, and lets **report templates decide** what shows in the report.

---

## Goal
Give audit officers full visibility of an employer's compliance posture (past + open) inside:
- Employer 360
- Audit Visit Workspace
- Audit Report editor / preview
- Audit Communications panel

…and let them attach any prior matter to the current visit or a specific finding when relevant. Reports include prior-matter sections **only when the chosen report template enables them** (auto-fill from posture + manual links).

---

## Architecture Summary

### What we **do not** add
- No `ce_employer_audit_cases` parent.
- No new case-types catalog.
- No auto-load of prior matters into a case.
- No new approval engine for resolution actions — reuse what's already configured per scope/case-type.

### What we **add** (small & targeted)

1. **One read-only aggregator service** — `employerComplianceHistoryService` — bundles the employer's "full posture" for the panel:
   - Past inspections (`ce_inspections`)
   - Past audit reports (`ce_employer_audit_reports`)
   - Open & closed compliance cases (`ce_cases`)
   - Open violations (`ce_violations`)
   - Active payment arrangements (`ce_payment_arrangements`)
   - Active legal proceedings / referrals (`ce_legal_proceedings`, `ce_legal_referrals`)
   - Open follow-up actions (`ce_follow_up_actions`)
   - Recent disputes (`ce_audit_disputes`)
   - Ledger overdue snapshot (`ce_employer_financial_ledger`)

2. **One reusable panel** — `EmployerComplianceHistoryPanel` — used in Employer 360, Audit Visit Workspace, Audit Report editor, Comms. Filterable by category (Cases / Violations / Arrangements / Legal / Follow-ups / Reports / Inspections / Disputes).

3. **One small linkage table** — `ce_audit_prior_matter_links` — manual attachments at **either visit or finding level**.
   ```
   id                 uuid PK
   inspection_id      uuid (nullable) → ce_inspections
   finding_id         uuid (nullable) → ce_inspection_findings
   matter_type        text   -- 'CASE' | 'VIOLATION' | 'ARRANGEMENT' | 'LEGAL' | 'FOLLOW_UP' | 'PAST_INSPECTION' | 'PAST_REPORT' | 'DISPUTE'
   matter_id          text   -- id of the linked entity (uuid or business key as appropriate)
   relevance_note     text
   linked_by          varchar(50)
   linked_at          timestamptz
   is_active          bool default true
   ```
   - CHECK constraint: exactly one of `inspection_id` or `finding_id` is non-null.
   - Indexes on (inspection_id), (finding_id), (matter_type, matter_id).

4. **Report template sections** — extend the **existing** report template/section model with new optional section keys:
   - `PRIOR_MATTERS`
   - `OPEN_CASES`
   - `OPEN_VIOLATIONS`
   - `ACTIVE_ARRANGEMENTS`
   - `LEGAL_STATUS`
   - `OPEN_FOLLOW_UPS`
   - `LINKED_PRIOR_MATTERS` (only items manually linked to this visit/finding)

   When the report renders, each enabled section pulls from:
   - the posture aggregator (auto, scoped to employer + period filter on the section), AND/OR
   - `ce_audit_prior_matter_links` for the visit (manual links).

   Admin can toggle sections per template; whatever's in the template = what appears in the report.

5. **Surface in Comms** — comms editor lets the officer attach a "Prior matter context" snippet generated from the same posture aggregator, so emails/SMS to the employer can reference open cases / arrangements when relevant. Optional and template-driven.

---

## Schema Changes (single migration, additive only)

1. Create `ce_audit_prior_matter_links` (above).
2. Add `included_section_keys text[]` to existing report-template table (if not present), seeded with current keys; add the 7 new optional section keys to the admin enum/whitelist.
   - On read, the report renderer treats absent → off, present → on.
3. **No** changes to `ce_cases`, `ce_violations`, `ce_payment_arrangements`, `ce_legal_*`, `ce_inspections`, `ce_follow_up_actions`, `ce_audit_communications`, `ce_employer_audit_reports`.

(Per project knowledge: **no RLS** — role-based access only. Audit trail via existing `auditService.logAuditTrail`.)

---

## Files Changed

**New**
- `src/services/employerComplianceHistoryService.ts` — single aggregator returning typed bundle.
- `src/services/auditPriorMatterLinkService.ts` — link/unlink/list at visit or finding level.
- `src/components/compliance/employer-history/EmployerComplianceHistoryPanel.tsx` — the reusable panel (filter chips, categorized lists, "Link to this visit / finding" actions).
- `src/components/compliance/employer-history/PriorMatterLinkDialog.tsx` — pick a target (visit or finding) + relevance note.
- `src/components/compliance/audit-report/sections/PriorMattersSection.tsx` (+ siblings for OpenCases, OpenViolations, ActiveArrangements, LegalStatus, OpenFollowUps, LinkedPriorMatters).
- `src/types/employerHistory.ts`

**Edited**
- `src/pages/compliance/employers/EmployerProfilePage.tsx` (or Employer 360 entry) — drop in `<EmployerComplianceHistoryPanel employerId={…} />`.
- `src/pages/compliance/audit-planning/AuditVisitWorkspace.tsx` — add a "History" tab using the panel; allow link from any item to this visit.
- `src/pages/compliance/employers/EmployerVisitWorkspace.tsx` — same panel as a tab.
- `src/components/compliance/audit-report/InternalReportLayout.tsx` (and PDF builder `auditReportPdfService.ts`) — render the new optional sections when their keys are present in the template.
- `src/pages/compliance/admin/AuditReportTemplatesPage.tsx` (existing or new) — toggle the 7 new section keys per template.
- `src/components/compliance/communication/AuditCommunicationsPanel.tsx` — optional "Insert prior matter context" affordance that pulls from the aggregator.
- `src/components/compliance/inspection/FindingsTabContent.tsx` — per-finding "Link prior matter" affordance.

**Migration**
- `supabase/migrations/<timestamp>_employer_compliance_history.sql` — `ce_audit_prior_matter_links` + section-key whitelist seed.

---

## Backward Compatibility
- Purely additive: no FKs added to existing tables; no columns renamed; no data backfill.
- Existing report templates render unchanged (new sections off by default).
- Existing comms / cases / violations flows untouched.
- No RLS changes per project rule.

---

## Phased Rollout

- **Phase A** — Migration: create `ce_audit_prior_matter_links` + extend section-key whitelist on report templates. Verify against `ce_cases` / `ce_violations` / `ce_payment_arrangements` / `ce_legal_*` / `ce_follow_up_actions`.
- **Phase B** — `employerComplianceHistoryService` aggregator + types.
- **Phase C** — `EmployerComplianceHistoryPanel` + filter chips + drop-in to Employer 360 and Audit Visit Workspace.
- **Phase D** — `auditPriorMatterLinkService` + `PriorMatterLinkDialog`; visit-level and finding-level link actions in the panel and Findings tab.
- **Phase E** — Report sections (UI + PDF) and admin toggles per template.
- **Phase F** — Comms "Insert prior matter context" affordance.

---

## Assumptions / Risks
- The existing report-template model already supports per-template section toggling; if not, Phase E adds a minimal `included_section_keys text[]` column. Decided on first read.
- "Past audit reports" surfaced from `ce_employer_audit_reports` filtered by `employer_id`; "past inspections" from `ce_inspections` joined via `ce_weekly_plan_items.employer_id`.
- The aggregator is read-only and bounded (last 24 months by default, configurable per call) — keeps the panel fast.
- No new cron / edge function required.

---

## Deliverables Recap
- **Architecture summary** ✅ above
- **Schema/migration changes** ✅ one additive migration
- **Files changed** ✅ listed
- **Linkage design** ✅ visit-level and finding-level (`ce_audit_prior_matter_links`)
- **Showcase design** ✅ one reusable panel surfaced in Employer 360, Audit Visit Workspace, Audit Report editor, Comms
- **Report inclusion** ✅ template-driven (admin enables sections)
- **Backward compatibility** ✅ fully additive, no RLS changes
- **Phased rollout** ✅ A–F
