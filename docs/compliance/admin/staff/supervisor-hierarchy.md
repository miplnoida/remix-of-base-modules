# Supervisor Hierarchy

## 1. Screen Overview
- **Screen name**: Supervisor Hierarchy
- **Route/path**: `/compliance/admin/staff/supervisors` (legacy redirect from `/compliance/staff/supervisors`)
- **Page component**: `src/pages/compliance/staff/SupervisorHierarchy.tsx`
- **Parent menu location**: Compliance → Admin → Staff
- **Screen type**: Mapping / Hierarchy management (visual + edit dialog)

## 2. Business Function
Provides a focused view of the **inspector ↔ supervisor reporting tree** stored in `ce_inspectors.supervisor_id` and lets admins reassign reports without editing each officer record. Critical for: SLA escalation pathing, weekly report approval (Audit Planning), and the Reporting Manager workflow approver type.

- Operational problem: scattered supervisor links are hard to audit; this screen surfaces orphans (inspectors with no supervisor and no direct reports) and prevents circular reporting.
- Users: Compliance Admin, Compliance Manager, HR liaison.
- Lifecycle: Configuration; revisited on org changes, promotions, transfers.

## 3. Primary User Roles
- **Access/Edit**: `compliance_admin`, `compliance_manager`
- **View**: `compliance_supervisor`, director

## 4. UI Responsibilities
- **Per-supervisor cards**: each supervisor (= any officer who has at least one direct report) renders a card with badge `SUPERVISOR`, count of reports, and a table of reports (Inspector, Max Caseload, Status, Actions).
- **Orphans card** (amber): inspectors that are neither supervisors nor have a supervisor — highlighted for action.
- **Reassign Dialog**: select new supervisor (or "— No Supervisor —"); excludes self.
- **Cycle prevention**: walks the supervisor chain before save and blocks circular assignments with an inline error.

## 5. Main Actions and Business Outcomes
| Action | Effect | DB | Workflow | Downstream |
|---|---|---|---|---|
| Assign / Change Supervisor | Sets `ce_inspectors.supervisor_id` | UPDATE `ce_inspectors` | Affects Reporting Manager resolution at runtime (`mem://technical/workflow/reporting-manager-resolution`) | Audit Planning approvals, escalation, dashboards |
| Clear Supervisor | Sets `supervisor_id=null` | UPDATE | Same | Inspector becomes orphan or top-of-tree |

## 6. Data Model / Tables Used
| Table | Purpose | RW | Key Fields | Reused In |
|---|---|---|---|---|
| `ce_inspectors` | Hierarchy storage | R/W | `id`, `supervisor_id`, `max_caseload`, `is_active`, `profile_id`, `inspector_code`, `legacy_inspector_code` | All Compliance modules |
| `profiles` | Display name | R | `id`, `full_name` | Global |

## 7. Services / Hooks / Queries Used
- Direct Supabase: `ce_inspectors` select/update; `profiles` select.
- No service or hook abstraction.
- Identity hook: **not used** (gap).
- Cycle detection: in-memory traversal `wouldCreateCycle()` inside the page.

## 8. Validation Rules
| Rule | Where |
|---|---|
| Cannot pick self as supervisor | UI dropdown filter |
| No circular hierarchy | UI: `wouldCreateCycle()` walks chain before save |
| Active-only supervisors selectable | UI filter `i.is_active` |
| `created_by`/`updated_by` | **Not stamped** (gap) |

## 9. Workflow / Approval / Notification Logic
- No approval required.
- Direct write to `ce_inspectors`.
- Indirectly affects `Reporting Manager` workflow approver resolution at runtime.

## 10. Linkages to Other Screens
- **Source of truth read by**:
  - `Officers / Inspectors` (shows supervisor name)
  - Audit Planning weekly report approval flow
  - Workflow engine when `approver_type='Reporting Manager'`
  - Workbench escalation logic
- **Mutates same column** as Officer edit dialog — both screens write `ce_inspectors.supervisor_id`.

## 11. Audit Trail / Logging
- None.
- No history of supervisor reassignments persisted.

## 12. Technical Risks / Gaps / Assumptions
- **Cycle check is client-side only** — concurrent edits could still create a cycle. No DB trigger.
- **No history**: cannot answer "who supervised X on date Y".
- **No identity stamping**.
- **Two write paths** (this screen + Officer edit) without a unified service — risk of divergent validation.
- **Display-only consideration**: officers who are supervisors are detected by *having reports*, not by an explicit role flag. An officer may "qualify" simply because of a stale supervisor link.

## 13. Recommended Improvements
1. Add Postgres trigger preventing `supervisor_id` cycles.
2. Add `ce_inspector_supervisor_history(inspector_id, supervisor_id, effective_from, effective_to, actor_user_code)`.
3. Centralize writes in a `useOfficerSupervisor` hook used by both screens.
4. Stamp `updated_by`/`updated_at`.
5. Consider an explicit `is_supervisor` flag or capability rather than inferring from reports.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line 1101)
- Page: `src/pages/compliance/staff/SupervisorHierarchy.tsx`
- Related: `src/pages/compliance/staff/OfficerManagement.tsx` (alternate write path)
- Workflow consumer: `mem://technical/workflow/reporting-manager-resolution`
