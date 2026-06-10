# Compliance Module — Manual Acceptance QA Remediation Plan

> Scope-locked: bug fixes and small wiring corrections only. No redesign, no unrelated refactors.
> Each item below MUST be reviewed and approved (or re-scoped) before any code change is made.

Legend — **R**isk: 🟢 Low · 🟡 Medium · 🔴 High

---

## 1. Rule Engine — invalid rule activation passes validation

- **Root cause (suspected)**: Activation toggle in `RuleCatalogue` / `RuleWizard` flips `is_active = true` without re-running the rule validator (missing trigger type, no conditions, no action, expired effective window, or unsaved draft state). Server-side guard in `ce_compliance_rules` activation RPC is either missing or only checks `status != 'DRAFT'`.
- **Affected files**:
  - `src/pages/compliance/admin/RiskOperations.tsx` and/or `src/pages/bn/config/RuleCatalogue.tsx` (activation action)
  - `src/services/compliance/*rule*` (activation service) — to confirm
  - `supabase` RPC `ce_rule_activate` (or equivalent) — to confirm name
- **Proposed fix**:
  1. Add a shared `validateRuleForActivation(rule)` pure function returning `{ ok, errors[] }` (required: name, trigger, ≥1 condition, ≥1 action, valid effective dates, no broken references).
  2. Block the Activate button + show inline `ValidationSummary` when invalid.
  3. Re-run the same checks in the activation RPC/service before flipping `is_active`; return a structured error mapped to a toast per project Validation-UX standard.
- **Risk**: 🟡 — touches activation path used by admins; mitigated by additive validation only.
- **Verification**:
  - Manual: try activating a rule missing trigger/conditions/action → blocked with inline errors + red toast.
  - Activate a fully valid rule → succeeds, audit row written.
  - Unit test: `validateRuleForActivation` covers each missing-field case.

---

## 2. Workflow Mapping not enforced for `case.closure_approval`

- **Root cause**: `CaseClosurePage` calls the closure mutation directly instead of routing through `resolveWorkflow('case.closure_approval', ctx)` from `src/services/complianceWorkflowMappingService.ts`. When a mapping exists + is enabled, no workflow instance is started; when disabled, `fallback_behavior` (BLOCK / REQUIRE_NOTE) is ignored.
- **Affected files**:
  - `src/pages/compliance/cases/CaseClosurePage.tsx`
  - `src/services/compliance/*case*closure*` (closure service)
  - `src/services/complianceWorkflowMappingService.ts` (no change, just consume)
- **Proposed fix**:
  1. Before submitting closure, call `resolveWorkflow('case.closure_approval', { fund, severity, amount })`.
  2. If `enabled && workflowDefinitionId` → start workflow instance, mark case `PENDING_CLOSURE_APPROVAL`, do **not** close yet.
  3. If `!enabled` honor `fallback_behavior`: `BLOCK` → toast + abort; `REQUIRE_NOTE` → require closure note ≥ N chars; `DIRECT_APPLY` → close as today.
  4. Show resolved mapping (workflow name or fallback) in the confirm dialog.
- **Risk**: 🟡 — changes closure flow; gated behind existing mapping table so behavior unchanged when no mapping configured.
- **Verification**:
  - Mapping enabled → closure creates workflow instance, case status changes to pending approval, approver action closes it.
  - Mapping disabled + BLOCK → user sees blocking toast.
  - No mapping row → closes directly (today's behavior).

---

## 3. Duplicate violation prevention / warning

- **Root cause**: `ManualViolationEntry` and `ConvertFindingToViolationPage` insert into `ce_violations` without checking for an existing open violation with the same `(employer_id, violation_type, period/discovered_date window)`. No DB unique index either.
- **Affected files**:
  - `src/pages/compliance/violations/ManualViolationEntry.tsx`
  - `src/pages/compliance/inspections/ConvertFindingToViolationPage.tsx`
  - `src/services/compliance/violationService.ts` (or equivalent — to confirm)
  - Migration: add partial unique index / RPC `ce_check_duplicate_violation`
- **Proposed fix**:
  1. New service helper `findPotentialDuplicateViolations({ employerId, violationType, periodStart, periodEnd })` returning matches with status ∈ (OPEN, IN_PROGRESS, UNDER_REVIEW).
  2. On submit, if matches exist, show non-blocking warning modal listing them with links; user must tick "Create anyway with justification" + provide note (stored on the new violation's `linkageMetadata`).
  3. Persist `related_prior_violation_id` when user picks "this is a continuation".
  4. Optional DB safety: partial unique index on `(employer_id, violation_type)` where `status IN ('OPEN','IN_PROGRESS')` — defer if it would break legacy data.
- **Risk**: 🟡 — UX change on a common path; warning is non-blocking so no functional regression.
- **Verification**:
  - Create violation for employer X / NON_PAYMENT while another is OPEN → warning modal lists it; justification captured.
  - Closed/resolved prior violations do **not** trigger warning.
  - Convert-from-finding path shares the same check.

---

## 4. "New Case" button not working

- **Root cause (suspected)**: Click handler on `CaseManagement` / `CaseQueue` either (a) navigates to a route not registered in `Routes.tsx`, (b) is gated by a capability check that silently no-ops, or (c) opens `CaseIntake` dialog whose `open` state is never set. Console will confirm.
- **Affected files**:
  - `src/pages/compliance/cases/CaseManagement.tsx`
  - `src/pages/compliance/cases/CaseQueue.tsx`
  - `src/pages/compliance/cases/CaseIntake.tsx`
  - `src/pages/compliance/Routes.tsx`
- **Proposed fix**:
  1. Reproduce, read `code--read_console_logs` + `code--read_session_replay`.
  2. Wire button to either route (`/compliance/cases/new`) or controlled `<CaseIntake open onClose />`.
  3. Verify capability used (`useHasCapability('case.create')`) maps to a real capability; if missing, add it to `src/lib/compliance/capabilities.ts` and grant to the relevant roles.
- **Risk**: 🟢 — isolated UI wiring.
- **Verification**: button opens intake; happy-path case creation persists row; unauthorized role sees disabled state with tooltip, not a dead click.

---

## 5. Review Queue not showing `UNDER_REVIEW` violations

- **Root cause**: Queue query filters `status IN ('OPEN','IN_PROGRESS')` (or `status = 'OPEN'`) and omits `UNDER_REVIEW`. `ViolationStatus` enum already declares `UNDER_REVIEW` (`src/types/violation.ts`).
- **Affected files**:
  - `src/pages/compliance/violations/VerificationQueue.tsx`
  - service that backs the queue (likely `src/services/compliance/violationService.ts` — to confirm)
- **Proposed fix**: add `UNDER_REVIEW` to the status filter; add status chip + filter pill in the queue header so users can scope.
- **Risk**: 🟢.
- **Verification**: violation transitioned to UNDER_REVIEW appears in queue with badge; filter toggle hides/shows it.

---

## 6. Compliance Admin missing "link violation to case" permission

- **Root cause**: Capability `violation.link_to_case` (or equivalent) not granted to `ComplianceAdmin` in `src/lib/compliance/capabilities.ts`, so `useHasCapability` returns false and the Link button is hidden/disabled.
- **Affected files**:
  - `src/lib/compliance/capabilities.ts`
  - Possibly RPC grant if a SECURITY DEFINER fn is used.
- **Proposed fix**: add the capability to `ComplianceAdmin` (and `ComplianceSupervisor` if appropriate per role matrix). No DB schema change.
- **Risk**: 🟢 — additive permission.
- **Verification**: log in as `ComplianceAdmin` test user → Link-to-Case button visible and functional; audit row written.

---

## 7. My Work Queue — role-based tab / action filtering

- **Root cause**: `MyWorkQueue.tsx` renders all tabs/actions regardless of role; `useComplianceRole` + `useComplianceWorkbench` not consulted for tab visibility.
- **Affected files**:
  - `src/pages/compliance/MyWorkQueue.tsx`
  - `src/hooks/useComplianceRole.ts`, `src/hooks/useHasCapability.ts`
- **Proposed fix**:
  1. Define a small `TAB_CAPABILITY_MAP` (e.g., Violations → `violation.review`, Cases → `case.work`, Legal → `legal.recommend`, Closure → `case.close`).
  2. Filter tabs via `useHasCapability`. Same for row-level actions.
  3. When zero tabs visible, show empty-state explaining the role has no work-queue items.
- **Risk**: 🟡 — visibility change; keep mapping conservative so no role loses access they currently use.
- **Verification**: log in as Inspector / ComplianceOfficer / Supervisor / Admin → each sees the documented tab subset; no console errors.

---

## 8. Case screens — responsibility clarification

- **Root cause**: Overlap between `CaseManagement`, `CaseQueue`, `CaseDetailView`, `CaseIntake`, `CaseRequestsQueue`, `AssignedCases`, `CaseClosurePage`, `CaseMergeReviewPage`, `ReopenRequestsPage`, `PenaltyManagement` is undocumented; users land on the wrong screen.
- **Affected files**: docs only + tiny header subtitle changes.
- **Proposed fix**:
  1. Add `docs/compliance/case_screens_responsibility_matrix.md` listing each screen → owner role → primary purpose → entry points → exits.
  2. Update each page's `t-page-subtitle` to a one-line purpose statement matching the matrix.
  3. Add cross-links between sibling screens in the page header (e.g., "Looking for closures? → Case Closure").
- **Risk**: 🟢 — docs + copy.
- **Verification**: matrix reviewed; subtitles render; navigation links work.

---

## 9. Convert Finding to Violation — data / query issue

- **Root cause (suspected)**: `ConvertFindingToViolationPage` query joins `ce_inspection_findings` → `ce_inspections` → `ce_employers` with a `!inner` join that drops findings whose inspection has no resolved employer, or filters by `violation_id IS NULL` against a column that's actually nullable on a different table. Per `supabase/tests/sql/ce_field_audit_integrity.sql` invariants, findings must be structured (title/category/severity) — page may be filtering those out.
- **Affected files**:
  - `src/pages/compliance/inspections/ConvertFindingToViolationPage.tsx`
  - backing service (likely under `src/services/compliance/`)
- **Proposed fix**:
  1. Read the page + service; log the actual query.
  2. Replace `!inner` with left joins where the relationship is optional; filter `violation_id IS NULL` server-side.
  3. Ensure required structured fields (`title`, `category`, `severity`) are surfaced; pre-fill from finding when converting.
  4. Wire duplicate check from item #3.
- **Risk**: 🟡 — query semantics change; verify counts before/after on test data.
- **Verification**: findings without an existing violation appear; convert button creates `ce_violations` row with `inspection_id` + `audit_report_id` linkages required by `ce_field_audit_integrity.sql` checks #2 and #3.

---

## 10. Legal Recommendation Queue — data / query / seed-data issue

- **Root cause (suspected)**: `LegalRecommendationQueue` query depends on `ce_cases` rows in status `RECOMMENDED_FOR_LEGAL` (or equivalent) with non-null `legal_recommendation_id`. Either (a) the query filter mismatches the enum value used by the case workflow, (b) seed data missing rows in that status, or (c) RLS/role gate via `useComplianceRole` excludes the logged-in test user.
- **Affected files**:
  - `src/pages/compliance/legal/LegalRecommendationQueue.tsx`
  - service backing it
  - seed/test data under `supabase/tests/` or migration seed for `ce_cases`
- **Proposed fix**:
  1. Verify the actual status string emitted by the case → legal transition; align the query filter.
  2. Add seeded `SEED-`-tagged rows for the legal recommendation flow (per project rule: no mock data, must be DB rows tagged `SEED-`).
  3. Add an empty-state explaining required upstream state ("No cases have been recommended for legal review").
- **Risk**: 🟡 — query + seed only; no schema change.
- **Verification**: with seed data, queue shows expected rows for `LegalOfficer` test user; transitioning a case in the case screen makes it appear here in real time.

---

## Cross-cutting

- **Standards to honor while fixing**: project Validation-UX (Entry 2), no RLS (Entry 9), no mock data (use `SEED-` rows), role-based gating via `useHasCapability`, UserCode in `*_by` columns, no broad refactors.
- **Knowledge Repo**: every item above must update / create the matching `kb_articles` entry + automated test case (project rule, Entry 8). Will be done alongside each fix, not as a separate sweep.
- **Execution order suggestion**: 4 → 6 → 5 → 9 → 10 → 1 → 3 → 2 → 7 → 8 (quick wins first, behavior-changing flows last).

---

## Answers to open questions (confirmed by product)

1. **Item #2** — Seed a `case.closure_approval` workflow definition + a `ce_workflow_mappings` row (enabled) so end-to-end verification is possible.
2. **Item #3** — Warning-only for now. No hard DB unique index. Capture justification + `related_prior_violation_id`.
3. **Item #7** — Yes, produce a Role → Tab visibility matrix (drafted below; will be reflected in `TAB_CAPABILITY_MAP` + `docs/compliance/case_screens_responsibility_matrix.md`).
4. **Item #10** — Status emitted by the case → legal handoff is `RECOMMENDED_FOR_LEGAL`. Align query filter and seed `SEED-` cases in that status.

### Draft Role → My Work Queue tab matrix (item #7)

| Tab                       | Capability gate                          | Inspector | Senior Inspector | Compliance Head | Compliance Admin | Legal Officer |
| ------------------------- | ---------------------------------------- | :-------: | :--------------: | :-------------: | :--------------: | :-----------: |
| Field Work (visits)       | `compliance.field.execute`               |     ✅    |        ✅        |        ✅       |         —        |       —       |
| Plan Approvals            | `compliance.field.approve_plans`         |     —     |        ✅        |        ✅       |         —        |       —       |
| Report Approvals          | `compliance.field.approve_reports`       |     —     |        ✅        |        ✅       |         —        |       —       |
| Violations (review)       | `compliance.violations.manage`           |     ✅    |        ✅        |        ✅       |         ✅       |       —       |
| Cases (work)              | `compliance.cases.manage`                |     ✅    |        ✅        |        ✅       |         ✅       |       —       |
| Closure Approvals         | `compliance.cases.manage` + head/senior  |     —     |        ✅        |        ✅       |         —        |       —       |
| Notices                   | `compliance.enforcement.notices`         |     ✅    |        ✅        |        ✅       |         —        |       —       |
| Arrangements              | `compliance.enforcement.arrangements`    |     —     |        ✅        |        ✅       |         —        |       —       |
| Legal Recommendations     | `compliance.enforcement.legal`           |     —     |        ✅        |        ✅       |         —        |       ✅      |
| Team Workbench            | `compliance.workbench.team`              |     —     |        ✅        |        ✅       |         —        |       —       |
| Enterprise Workbench      | `compliance.workbench.enterprise`        |     —     |         —        |        ✅       |         —        |       —       |

Empty-state shown when zero tabs visible: "No work-queue items for your role".

---

## Execution order (confirmed)

4 → 6 → 5 → 9 → 10 → 1 → 3 → 2 → 7 → 8.  Each item ships its own commit + KB/test-case update per Entry 8.
