# Fix Reassign / Workload + Enable Assignment

## What's actually broken

The page looks fine but every officer shows **0 Active Violations**, so the **Reassign** button (which is gated by `violation_count > 0`) never appears. That's why admins think assignment isn't available.

**Root cause:** `Reassignment.tsx` builds the workload map keyed by `ce_inspectors.id` and then counts `ce_violations.assigned_to_user_id` against those keys. But `assigned_to_user_id` actually stores **profile UUIDs** (e.g. `b1b2c3d4-0001-...`) plus a few legacy string codes (`SAdmin`, `inspector-001`). The two ID spaces never match → all counts are 0. DB confirms 1,192 assigned violations across 5 holders.

Secondary issues:
- Page only lists officers present in `ce_queue_members` (active queue), so legacy assignees (`SAdmin`, etc.) and inspectors with no queue membership are invisible.
- No way to **assign** unassigned violations from this page (3,191 are currently unassigned).
- Page has no role gate beyond `ComplianceRouteGate`; admins/compliance managers should be the only ones who can reassign in bulk.
- The All Violations bulk "Assign To" is a free-text name input, not an officer picker — it can't update `assigned_to_user_id` properly.

## Plan

### 1. Fix workload counting in `src/pages/compliance/operations/Reassignment.tsx`
- Build officer list from the **union** of `ce_inspectors` (active) + any distinct `assigned_to_user_id` already present on `ce_violations` (so legacy holders like `SAdmin` show up and can be drained).
- Resolve a stable `assignment_key` per inspector = `profile_id || id`, and match violations using BOTH `profile_id` and `ce_inspectors.id` for safety.
- Show a separate "Legacy / unmapped assignees" group at the bottom for holders that don't map to an active inspector, with a Reassign action so admins can clear them out.

### 2. Always allow the action button
- Replace the `violation_count > 0` gate with always-visible **Reassign** + **Assign more** buttons. Disable (not hide) Reassign when count = 0. This restores the affordance the admin expects.

### 3. Add an "Unassigned Violations" card
- New card above the officer table showing the count of `ce_violations` with `assigned_to_user_id IS NULL` and active status, plus a **Bulk Assign** button.
- The dialog uses the existing officer picker (same `inspectorOptions`) and writes via the same path as `AssignmentDialog` (insert into `ce_violation_assignments` + update `ce_violations.assigned_to_user_id` / `assigned_to_name` / `assigned_at` / `assignment_method='MANUAL_BULK'`).
- Optional filter: limit by violation type or employer (single SearchableSelect each) so admins can target a slice instead of all 3,191 at once. Hard cap per click = 500 with a confirmation.

### 4. Reassign dialog improvements
- Keep "Number of violations to reassign (0 = all)" but add: target officer load preview ("Will go from 18 → 64 violations, max 50 — over capacity") with a non-blocking warning when target would exceed `max_caseload`.
- Persist `reassigned_from_inspector_id`, `assignment_type='REASSIGN'`, `is_current=true`, and supersede prior rows — matching the single-violation `AssignmentDialog` contract so history is consistent.
- Require a reason (textarea), stored in `ce_violation_assignments.notes` and `ce_violation_history.change_reason`.

### 5. Role gating (admin/compliance manager only)
- Wrap the page header actions and the per-row Reassign/Assign buttons with `useComplianceCapability('violations.reassign')` (or the closest existing capability — will reuse the same hook the rest of compliance uses; no new capability if one already covers it).
- Non-admins see the workload view (read-only) but no action buttons, with a small "Read-only — contact a Compliance Admin to reassign" note.

### 6. Audit trail
- Every bulk action writes one row per violation to `ce_violation_assignments` (existing table) and a single summary row to `ce_audit_log` (`action='BULK_REASSIGN'` / `'BULK_ASSIGN'`, with `from_user`, `to_user`, `count`, `reason`). Uses the logged-in `user_code` per the project's user-tracking rule.

## Technical notes

- Files touched:
  - `src/pages/compliance/operations/Reassignment.tsx` (rewrite of data load + UI)
  - small new component `src/components/compliance/BulkAssignDialog.tsx` reused by the "Unassigned" card and any future entry point
  - no schema changes; uses existing `ce_violations`, `ce_violation_assignments`, `ce_violation_history`, `ce_inspectors`, `profiles`, `ce_audit_log`
- All writes go through `useBlockingMutation` (project standard) and invalidate `['ce_violations']` + `['ce_inspectors_active_for_assign']` queries on success.
- No RLS changes (project is NO-RLS per memory); access is gated in the app layer via capability hook.

## Out of scope

- Auto-balancing / round-robin assignment.
- Case (vs violation) bulk reassignment — `AssignmentDialog` already handles single-case reassign; can be added later if needed.
- Scheduling automatic reassignment for stale workloads.
