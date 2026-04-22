# Officers / Inspectors

## 1. Screen Overview
- **Screen name**: Officers / Inspectors
- **Route/path**: `/compliance/admin/staff/officers` (legacy redirect from `/compliance/staff/officers` and `/bema/admin/roles`)
- **Page component**: `src/pages/compliance/staff/OfficerManagement.tsx`
- **Parent menu location**: Compliance → Admin → Staff
- **Screen type**: List + Entry (single-screen CRUD with embedded status-change wizard)

## 2. Business Function
Maintains the canonical roster of compliance officers (a.k.a. inspectors) used by every downstream Compliance feature: violation assignment, case ownership, queue membership, supervisor reporting, weekly planning, and field operations. Each row is the **link** between a system identity (`profiles`) and a compliance role (`ce_inspectors`), optionally bridged to a legacy SSB inspector code (`tb_inspector`) so historic SEP/case data continues to resolve.

- Operational problem solved: prevents orphan assignments — every routing/assignment rule (in `AssignmentRoutingRules`) targets an `inspector_id` that originates here.
- Users: Compliance Admin, Compliance Manager, Director (read).
- Lifecycle stage: Configuration / Workforce administration. Used continuously, especially during onboarding, transfer, and leave events.

## 3. Primary User Roles
- **Access**: `compliance_admin`, `compliance_manager`, `director`
- **Edit (link/unlink, edit attributes)**: `compliance_admin`
- **Status changes (Leave, Transfer, Suspend, Resign)**: `compliance_admin` via the `OfficerStatusChangeWizard` (which also controls workload reassignment)
- **View only**: `compliance_supervisor`, auditors

> Assumption / needs confirmation: Role gating is currently route-level (`ProtectedLayout`); no per-action capability check is enforced inside the page. Recommended to wire `useComplianceCapability('staff.manage')`.

## 4. UI Responsibilities
- **Header KPI**: Officer count badge in the card title.
- **Grid columns**: Name, Inspector Code, Legacy Inspector (`code — insp_name`), Zone, Supervisor, Caseload, Flags (`REV`/`LEG`), Status (color-coded), Actions.
- **Actions per row**:
  - **Edit** (`Pencil`) — opens edit dialog
  - **Change Status** (`ArrowRightLeft`) — opens `OfficerStatusChangeWizard`
- **Create/Edit Dialog** fields: System Profile (required), Inspector Code, Legacy Inspector dropdown, Primary Zone, Office Code, Supervisor, Max Caseload, Can Handle Review, Can Handle Legal.
- **Status Change Wizard** (`src/components/compliance/staff/OfficerStatusChangeWizard.tsx`): multi-step flow that selects new status, effective date, reason, **shows current open assignments**, and when applicable **reassigns active violations** to another inspector and **deactivates queue memberships**.

## 5. Main Actions and Business Outcomes

| Action | Effect | DB Impact | Workflow Impact | Downstream |
|---|---|---|---|---|
| Link Officer | Creates `ce_inspectors` row tied to a `profiles.id` and (optional) `tb_inspector.code` | INSERT `ce_inspectors` | None | Profile becomes assignable in Routing, Queues, Cases |
| Edit | Updates code/zone/supervisor/caseload/flags | UPDATE `ce_inspectors` | None | Affects routing eligibility; cascades into AssignmentRouting & QueueMembers |
| Change Status (wizard) | Sets `status`, `status_effective_from`, optionally `transferred_from_zone_id`; reassigns open violations; deactivates queue memberships | UPDATE `ce_inspectors`; UPDATE `ce_violation_assignments` (close) + INSERT new assignment to replacement; UPDATE `ce_queue_members.is_active=false` | Removes officer from active routing pools | Workbench metrics, queue counts, case ownership |

## 6. Data Model / Tables Used

| Table | Purpose | RW | Key Fields | Reused In |
|---|---|---|---|---|
| `ce_inspectors` | Primary roster | R/W | `id`, `profile_id`, `inspector_code`, `legacy_inspector_code`, `supervisor_id`, `primary_zone_id`, `office_code`, `max_caseload`, `can_handle_review`, `can_handle_legal`, `status`, `is_active` | All Compliance modules: workbench, field, cases, planner, queues, routing |
| `profiles` | System identity link | R | `id`, `full_name`, `email` | Global |
| `ce_zones` | Primary zone dropdown | R | `id`, `zone_name`, `zone_code`, `is_active` | Geography mapping, routing |
| `tb_inspector` (legacy) | Bridge to SSB legacy data | R | `code`, `insp_name` | Legacy Inspector Linking, SEP module |
| `ce_violation_assignments` | Read open caseload during status change; reassign | R/W (wizard) | `inspector_id`, `is_active`, `resolution_method` | Cases, workbench |
| `ce_queue_members` | Auto-deactivate memberships on status change | R/W (wizard) | `inspector_id`, `is_active` | Queue Members admin |

## 7. Services / Hooks / Queries Used
- **Direct Supabase calls** in `OfficerManagement.tsx` (no dedicated hook):
  - `from("ce_inspectors").select("*"|update|insert)`
  - `from("profiles").select("id, full_name, email")`
  - `from("ce_zones").select("id, zone_name, zone_code").eq("is_active", true)`
  - `from("tb_inspector").select("code, insp_name").order("code")`
- **Child component**: `src/components/compliance/staff/OfficerStatusChangeWizard.tsx` — uses `useUserCode` for actor stamping; wraps `ce_inspectors` UPDATE with `ce_violation_assignments` reassign and `ce_queue_members` deactivation.
- **Audit/identity hook**: `useUserCode` used inside the wizard only — **not used in main page Save**.

## 8. Validation Rules
| Rule | Where Enforced |
|---|---|
| `profile_id` required | UI (`validate()`) |
| `inspector_code` unique among officers | UI (in-memory check vs current `officers[]`) — **no DB unique constraint** |
| Profile cannot be linked twice | UI filters `availableProfiles` excluding already-linked `profile_id` |
| Legacy inspector cannot be linked twice | UI filters `availableLegacyCodes` |
| Supervisor cannot be self | UI: `supervisorOptions` excludes `editing.id` |
| Excluded legacy codes | UI constant `EXCLUDED_LEGACY_CODES = ['00','OSC','UNK']` |
| Status change reassignment, effective-date, reason | Wizard (`OfficerStatusChangeWizard`) |
| `created_by`/`updated_by` stamping | **NOT enforced on page Save** (gap). Wizard uses `useUserCode`. |

## 9. Workflow / Approval / Notification Logic
- No approval required for create/edit on this screen — direct write.
- Status change wizard performs side-effect cascade (assignment reassign + queue deactivation) but **does not** post to `system_audit_trail` or send notifications.
- No reminders / SLA / escalation tied to officer record itself.

> The Planner Approval Workflow (`mem://features/compliance/planner-approval-workflow.md`) is **not** triggered from this screen.

## 10. Linkages to Other Screens
- **Consumed by**:
  - `Queue Members` admin (selects from `ce_inspectors`)
  - `Supervisor Hierarchy` admin (reads/writes `supervisor_id`)
  - `Assignment Routing Rules` (target inspector)
  - `Review Queue` and `Case Detail` (officer dropdowns)
  - `Audit Planning` weekly reports (filters by inspector)
  - SEP `SelfEmployDetailsTab` (legacy `tb_inspector` lookup, reused via `useSEPLookups`)
- **Navigates from**: Compliance Admin landing, sidebar.
- **Shared component**: `OfficerStatusChangeWizard` (only used here).

## 11. Audit Trail / Logging
- **Page Save**: no audit log; no `created_by`/`updated_by` (gap).
- **Status Change Wizard**: stamps `status_effective_from` and updates derived fields; `useUserCode` resolved but not written to a dedicated history table — **no `ce_inspector_status_history` table exists**.
- No access logging on this screen.

## 12. Technical Risks / Gaps / Assumptions
- **No DB-level uniqueness** on `inspector_code` or `profile_id` — relies on UI check; concurrent saves could duplicate.
- **No `created_by`/`updated_by`/audit timestamps** captured by the page Save path (violates project Knowledge Repo entry "User Identity Tracking in Database Actions").
- **No status history table**: status changes overwrite the previous value; only `status_effective_from` survives.
- **Hard list of excluded legacy codes** (`['00','OSC','UNK']`) hardcoded in two places (`OfficerManagement.tsx` and `LegacyInspectorLinking.tsx`) — should be a config or DB filter.
- **Wizard-induced reassignments** insert new `ce_violation_assignments` rows but do not call the standardized workflow status updater (`updateSourceRecordStatus`).
- **No capability/role enforcement** inside the page; route-level only.

## 13. Recommended Improvements
1. Add unique indexes: `ce_inspectors(profile_id) WHERE profile_id IS NOT NULL`, `ce_inspectors(inspector_code) WHERE inspector_code IS NOT NULL`.
2. Add `created_by`, `updated_by`, `updated_at` columns and stamp using `useUserCode` on Save.
3. Introduce `ce_inspector_status_history(id, inspector_id, from_status, to_status, effective_from, reason, actor_user_code, created_at)` and write from the wizard.
4. Write a `system_audit_trail` entry on every create/update/status-change.
5. Move `EXCLUDED_LEGACY_CODES` to `app_settings` or a DB flag column on `tb_inspector`.
6. Wrap the wizard cascade (officer update + assignment reassign + queue deactivation) in a single Postgres function (RPC) for atomicity — currently three separate awaits.
7. Add `useComplianceCapability('staff.manage')` gate.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line 1099)
- Page: `src/pages/compliance/staff/OfficerManagement.tsx`
- Child: `src/components/compliance/staff/OfficerStatusChangeWizard.tsx`
- Identity hook: `src/hooks/useUserCode.ts`
- Related types: `src/types/systemAdmin.ts` (`Employee`, `PositionAssignment` — generic, not directly used)
- Related hooks: none (direct supabase); SEP reuse via `src/hooks/useSEPLookups.ts`
- Migrations: search `supabase/migrations/*ce_inspectors*` for schema lineage
