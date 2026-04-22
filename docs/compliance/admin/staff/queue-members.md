# Queue Members

## 1. Screen Overview
- **Screen name**: Queue Members
- **Route/path**: `/compliance/admin/staff/queue-members` (legacy redirect from `/compliance/staff/queue-members`)
- **Page component**: `src/pages/compliance/staff/QueueMembers.tsx`
- **Parent menu location**: Compliance → Admin → Staff
- **Screen type**: List + Entry (CRUD with toggle)

## 2. Business Function
Defines which officers belong to which **assignment queue** and in what role (`MEMBER`, `LEAD`, `SUPERVISOR`). Queues are the work-distribution buckets used by the Assignment Router and the Review Queue — without a member, nothing routes to that queue. Optional per-member `max_caseload_override` lets ops fine-tune workload above/below the inspector's default.

- Operational problem: balances workload across review/legal/inspection queues; supports temporary surge staffing without editing the inspector master.
- Users: Compliance Admin, Compliance Manager.
- Lifecycle stage: Configuration & ongoing operational tuning.

## 3. Primary User Roles
- **Access/Edit**: `compliance_admin`, `compliance_manager`
- **View**: `compliance_supervisor` (read), audit roles

> Assumption / needs confirmation: enforcement is route-level only.

## 4. UI Responsibilities
- **Grid**: Queue, Type (badge), Inspector, Role (color-coded badge), Caseload Override, Status (Active/Inactive), Actions.
- **Actions**: Edit (Pencil), Toggle Active (Power icon — green/red).
- **Add/Edit Dialog**: Queue (locked on edit), Inspector (locked on edit), Role (`MEMBER`/`LEAD`/`SUPERVISOR`), Caseload Override (number, optional), Active checkbox.

## 5. Main Actions and Business Outcomes
| Action | Effect | DB | Workflow | Downstream |
|---|---|---|---|---|
| Add Member | Inserts row into `ce_queue_members` | INSERT | None | Officer becomes routable for that queue |
| Edit | Updates role/caseload/active | UPDATE | None | Affects routing capacity |
| Toggle Active | Flips `is_active` | UPDATE | None | Removes/restores from active routing pool |

## 6. Data Model / Tables Used
| Table | Purpose | RW | Key Fields | Reused In |
|---|---|---|---|---|
| `ce_queue_members` | Primary table | R/W | `id`, `queue_id`, `inspector_id`, `role`, `is_active`, `max_caseload_override` | Routing engine, Officer status wizard (auto-deactivate on status change) |
| `ce_assignment_queues` | Queue dropdown | R | `id`, `queue_code`, `queue_name`, `queue_type`, `is_active` | Routing, Review Queue, Case workbench |
| `ce_inspectors` | Inspector dropdown | R | `id`, `inspector_code`, `legacy_inspector_code`, `profile_id`, `is_active` | All Compliance modules |
| `profiles` | Display name resolution | R | `id`, `full_name` | Global |

## 7. Services / Hooks / Queries Used
- Direct Supabase from page (no hook layer):
  - `ce_queue_members` select/insert/update
  - `ce_assignment_queues` select where `is_active=true`
  - `ce_inspectors` select where `is_active=true`
  - `profiles` select
- Identity hook: **not used** (gap).

## 8. Validation Rules
| Rule | Where |
|---|---|
| Queue required | UI |
| Inspector required | UI |
| No duplicate active (queue, inspector) on create | UI in-memory check — **no DB unique constraint** |
| Queue and Inspector immutable after create | UI (`disabled={!!editing}`) |
| `max_caseload_override` numeric, min 1 | UI (HTML) |
| `created_by`/`updated_by` | **Not stamped** (gap) |

## 9. Workflow / Approval / Notification Logic
- None. Direct writes; no approval, no notification.
- Side-effect: Officer Status Change Wizard auto-deactivates members for officers leaving/transferring (`is_active=false` on related rows).

## 10. Linkages to Other Screens
- **Consumed by**: Assignment Router (when allocating a violation to a queue, members are eligible targets), Review Queue (officer dropdown), Workbench metrics.
- **Configures**: `ce_assignment_queues` membership.
- **Cascading effect**: `OfficerStatusChangeWizard` and `OfficerManagement` indirectly mutate this table.

## 11. Audit Trail / Logging
- No `system_audit_trail` writes.
- No `created_by`/`updated_by`/timestamps stamped from this UI.

## 12. Technical Risks / Gaps / Assumptions
- **No DB unique constraint** on `(queue_id, inspector_id) WHERE is_active`.
- **No identity stamping**.
- **No history table** for membership changes; toggling Active loses prior context.
- **Role enum unmanaged** — `ROLES = ['MEMBER','LEAD','SUPERVISOR']` is a hardcoded array; not a DB enum and not a lookup table.
- **No bulk add** — adding many inspectors to a new queue is row-by-row.

## 13. Recommended Improvements
1. Add partial unique index `ce_queue_members(queue_id, inspector_id) WHERE is_active`.
2. Stamp `created_by`/`updated_by` via `useUserCode`.
3. Persist role list in DB (`ce_queue_member_roles`) or as Postgres enum.
4. Add `ce_queue_member_history` for audit.
5. Add bulk-assign UX (multi-select inspector → queue).
6. Apply `useComplianceCapability('queues.manage')`.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line 1100)
- Page: `src/pages/compliance/staff/QueueMembers.tsx`
- Cascading mutator: `src/components/compliance/staff/OfficerStatusChangeWizard.tsx`
- Related: `src/pages/compliance/operations/ReviewQueue.tsx` (consumer)
