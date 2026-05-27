## Problem

`/compliance/my-work-queue` returns 404. The Compliance submenu item "My Work Queue" (`complianceMenuItems.ts:96`) points to it, but no route is registered in `src/components/routing/AppRoutes.tsx` (the active router). A placeholder mount exists in `src/pages/compliance/Routes.tsx`, but that file is not mounted anywhere — dead code.

Existing assets we can reuse:
- `useComplianceWorkbench` already aggregates "my open violations / plans / visits today / draft plans" from `ce_violations`, `ce_weekly_plans`, `ce_weekly_plan_items`, etc., scoped by `userId`.
- `RoleWorkbench` + `WorkbenchLanding` render role-aware widgets but are not a per-user task inbox.
- `PermissionWrapper`, `useUserCode`, `useSupabaseAuth`, `ComplianceRouteGate` are the standard guards used by `FeatureTogglesPage`.

No existing component is a true per-user multi-section task inbox, so we will implement one (reusing existing data/queries) and register the route. We will not create a duplicate workbench.

## Plan

1. **Create page** `src/pages/compliance/MyWorkQueue.tsx`
   - Wrapped in `PermissionWrapper` (module `ce_my_work_queue`, falls back to `manage_compliance`).
   - Resolves current user via `useSupabaseAuth()` + `useUserCode()` — no `'SYSTEM'` fallback; if no user, show error state.
   - Layout: header + summary KPI strip + Tabs/Sections (Tabs component already in design system).
   - Sections (each: own React-Query hook, real Supabase queries, honest empty states, loading & error states):
     1. **Assigned Violations** — `ce_violations` where `assigned_to_user_id = userId` and status in open/in_progress/investigating.
     2. **Violations Awaiting Verification** — `ce_violations` status `pending_verification` (or feature-gated `violations.verificationQueue`); scope to assigned_to_user_id when set.
     3. **Assigned Cases** — `ce_cases` where `assigned_to_user_id = userId` and status open/active/in_progress.
     4. **Notices Awaiting Approval** — `ce_notices` where `approver_user_id = userId` (fallback `assigned_to_user_id`) and status pending_approval. Assumption documented.
     5. **Employer Responses Awaiting Review** — `ce_employer_responses` where `reviewer_user_id = userId` and status pending_review.
     6. **Payment Arrangements Awaiting Approval** — `ce_payment_arrangements` where `approver_user_id = userId` (fallback `assigned_to_user_id`) and status pending_approval.
     7. **Waiver Requests** — feature-gated `waivers`; `ce_waiver_requests` pending decision assigned to user.
     8. **Inspection Findings Awaiting Review** — feature-gated `inspections.findings`; `ce_inspection_findings` reviewer = user, status pending.
     9. **Legal Escalation Recommendations** — feature-gated `legal.recommendations`; `ce_legal_referrals` approver = user, status pending.
     10. **Workflow Tasks** — `workflow_tasks`/`workflow_step_instances` assigned to user_code, status open/pending.
   - All queries use the **shielded pattern** (try/catch → empty array; never break the page). If a table or column doesn't exist, that section silently shows "No assigned items".
   - Row schema: `type | reference | employer | status | priority | due date | action link`. Each row links to its existing detail route (`/compliance/violations/:id`, `/compliance/cases/:id`, `/compliance/enforcement/notices/:id`, etc.); no new detail routes invented.
   - Filters (lightweight): item type (tab), status, priority, due-date range — using existing `FilterBar` pattern.
   - Action buttons gated with `PermissionWrapper`/`PermissionButton`.

2. **Register route** in `src/components/routing/AppRoutes.tsx`
   - Lazy import `MyWorkQueue`.
   - `<Route path="/compliance/my-work-queue" element={<MyWorkQueue />} />` placed alongside other `/compliance/*` routes, wrapped consistently with sibling routes (the file uses direct elements; `ComplianceRouteGate` is not used in `AppRoutes.tsx`, so we follow the local convention and rely on `PermissionWrapper` inside the page, matching `FeatureTogglesPage`).

3. **Menu** — leave `complianceMenuItems.ts` unchanged; URL already correct.

4. **Documentation** — append a "Manual Acceptance Route Fixes" entry to `docs/compliance/final_stabilization_report.md`:
   - Note 404 found at `/compliance/my-work-queue`.
   - Final URL: `/compliance/my-work-queue`, component: `MyWorkQueue`.
   - List documented assumptions for approver/reviewer column names per source table.

5. **Verification**
   - TS build runs automatically.
   - Manually verify route opens, renders sections, no PlaceholderPage, empty states honest.

## Out of scope

- No changes to other Compliance pages, menu structure, or "Setup" naming.
- No new detail routes, no new permissions table, no schema migrations.
- No mock data; sections with missing/unknown tables show empty states.

## Files changed

- **Created**: `src/pages/compliance/MyWorkQueue.tsx`
- **Edited**: `src/components/routing/AppRoutes.tsx` (1 import + 1 route)
- **Edited**: `docs/compliance/final_stabilization_report.md` (append entry)
