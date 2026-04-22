# Job Execution History

## 1. Screen Overview
- **Screen name**: Job Execution History
- **Route/path**: `/compliance/admin/automation/history` (legacy redirects from `/compliance/automation/history` and `/bema/admin/logs`)
- **Page component**: `src/pages/compliance/automation/JobHistory.tsx`
- **Parent menu location**: Compliance → Admin → Automation & Jobs
- **Screen type**: List + Detail (read-only operations log)

## 2. Business Function
Operational forensics screen for the Compliance automation pipeline. Lists the **last 100 runs** across all jobs with filterable status/mode/duration/records-processed, and exposes a rich Execution Detail modal that surfaces the structured `scan_details` produced by detection/calculation jobs (employers scanned, rules evaluated, violations created, duplicates skipped, per-rule breakdown).

- Operational problem: when a scheduled job fails or produces unexpected effects, ops needs to see the run record, dry-run vs live mode, error message, and rule-level counts without opening the database.
- Users: Compliance Admin, Compliance Manager, DevOps, Director.
- Lifecycle: Monitoring & exception handling.

## 3. Primary User Roles
- **Access (read-only)**: `compliance_admin`, `compliance_manager`, `director`, audit roles
- **Edit / Re-run**: not available on this screen — re-runs initiated from `Job Configuration`.

## 4. UI Responsibilities
- **Header KPIs**: Total Executions, Successful (status `COMPLETED`), Failed (status `FAILED`), Records Processed (sum).
- **Filters**: free-text on execution ID; Job dropdown (`All` + each job name).
- **Refresh** button (manual refetch).
- **Grid columns**: Job Name, Start Time, Duration, Mode (Dry Run / Live), Status badge, Records, Affected, Triggered By, Actions.
- **Execution Detail Modal** (`StandardModal`):
  - Section 1 — Run Overview: Job, Status, Mode, Triggered By, Started/Completed, Duration, Idempotency Key, Run ID.
  - Section 2 — Results: processed / affected; error message panel if failed.
  - Section 3 — Execution Log (collapsible): renders `ScanDetailsView` for `scan_details` payloads (employer/violation/rule counts + rule breakdown table) or raw JSON pre-format.
  - Section 4 — Input Parameters (collapsible JSON).

## 5. Main Actions and Business Outcomes
| Action | Effect | DB | Downstream |
|---|---|---|---|
| Refresh | Refetches the runs query | none | Updates list |
| View Details | Opens modal showing full `execution_log` and `parameters` | none | Read-only |

This screen is **read-only**; no writes.

## 6. Data Model / Tables Used

| Table | Purpose | RW | Key Fields | Reused |
|---|---|---|---|---|
| `ce_automation_runs` | Run history (limit 100, desc by `started_at`) | R | `id`, `job_id`, `started_at`, `completed_at`, `status` (`COMPLETED`/`FAILED`/`RUNNING`/etc.), `records_processed`, `records_affected`, `error_message`, `triggered_by`, `execution_log` (JSONB incl. `scan_details`), `is_dry_run`, `idempotency_key`, `parameters` | Job Configuration (last_run_* fields denormalize from here) |
| `ce_automation_jobs` | Job name resolution | R | `id`, `name` | Job Configuration (canonical); Employer Compliance Jobs |

> **Inconsistency flagged** (same as Job Configuration): `useComplianceJobs.ts` queries `ce_automation_job_runs` instead. One of the two tables is the canonical one; the other may be a leftover or a view.

## 7. Services / Hooks / Queries Used
- React Query keys: `ce_automation_jobs_list`, `ce_automation_runs`.
- Direct Supabase from page: `from('ce_automation_runs').select('*').order('started_at', desc).limit(100)`; `from('ce_automation_jobs').select('id, name')`.
- Component: `StandardModal` (`src/components/common/StandardModal.tsx`), `Collapsible` (UI primitive).

## 8. Validation Rules
- None — read-only screen.
- Fixed limit of 100 most recent rows. No pagination, no date range filter.

## 9. Workflow / Approval / Notification Logic
- None.

## 10. Linkages to Other Screens
- **Mirror of**: `Job Configuration` last-run summary (denormalized fields).
- **Sibling**: `Employer Compliance Jobs` shows a per-job dialog with its own history table (different hook).
- **Triggered by**: edge function `run-compliance-job` (writes runs) invoked from Job Configuration / Employer Compliance Jobs / cron.

## 11. Audit Trail / Logging
- The runs themselves are the audit trail for *executions*. No additional `system_audit_trail` writes.
- `triggered_by` field captures actor (cron user, manual user, system).

## 12. Technical Risks / Gaps / Assumptions
- **Hard 100-row limit** without pagination or date filter — older incidents become invisible quickly on busy days.
- **No download/export** of run history.
- **Two table names** in the codebase (`ce_automation_runs` vs `ce_automation_job_runs`); UI shows only one.
- **`status` value casing differs** between the two query paths: this page uses `COMPLETED`/`FAILED`; sibling uses `success`/`failed`/`dry_run`/`running`. Risk of confusion when comparing screens.
- **No retention policy visible** in UI; long-term storage strategy is implicit.

## 13. Recommended Improvements
1. Reconcile run-table naming + status casing into a single canonical model.
2. Add server-side pagination and date-range filter; default last 7 days.
3. Add CSV/JSON export of filtered runs.
4. Surface `idempotency_key` collisions explicitly with a "duplicate run prevented" badge.
5. Link Run Detail back to the Job Configuration card (deep-link).
6. Add retention policy / archival UX.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line 1104)
- Page: `src/pages/compliance/automation/JobHistory.tsx`
- Modal primitive: `src/components/common/StandardModal.tsx`
- Edge function (writer): `supabase/functions/run-compliance-job/`
- Sibling: `src/pages/compliance/automation/JobConfiguration.tsx`
