# Job Configuration

## 1. Screen Overview
- **Screen name**: Job Configuration (Compliance Automation)
- **Route/path**: `/compliance/admin/automation/jobs` (legacy redirect from `/compliance/automation/jobs`)
- **Page component**: `src/pages/compliance/automation/JobConfiguration.tsx`
- **Parent menu location**: Compliance → Admin → Automation & Jobs
- **Screen type**: Settings + Operations console (list + edit + run + pipeline visualization)

## 2. Business Function
Central control panel for **all Compliance automation jobs**: detection scans, escalation jobs, notice generation, ledger refreshes, risk recalculations, etc. Allows admins to enable/disable jobs, edit cron schedules, run dry-runs or live executions on demand, add custom jobs, and inspect the pipeline phase graph that orchestrates the canonical 6-phase flow (`mem://features/compliance/automation-and-rule-engine`).

- Operational problem: jobs need governed activation — many depend on others, some are deprecated, some have no edge-function runtime yet. This screen prevents misconfiguration.
- Users: Compliance Admin, DevOps liaison, Director (read).
- Lifecycle stage: Configuration / Continuous operations.

## 3. Primary User Roles
- **Access**: `compliance_admin`, `compliance_manager`, `director`
- **Edit / Toggle / Run**: `compliance_admin`
- **View only**: others

> Assumption / needs confirmation: enforcement is route-level only (`ProtectedLayout`); the page does not call `useComplianceCapability`.

## 4. UI Responsibilities
- **Tabs**: Job List · Pipeline Flow View (visual DAG via `PipelineFlowView`).
- **Header KPIs**: Active count, Ready count, Blocked count.
- **Per-job Card**: name + `job_code` + classification (System/Custom) + phase badge `P1..P6` + execution mode badge (scheduled/event-driven/manual) + readiness badge (Active / Ready / No Runtime / Deprecated) + dry-run flag + impact icons (creates/updates/posts ledger/affects risk/sends notices).
- **Per-job Actions**: Job Details (Drawer), Edit (Modal), Dry Run, Run Now, Enable/Disable Switch.
- **Add Custom Job dialog** (`AddCustomJobDialog`) — for non-canonical jobs.
- **Activation Confirm Dialog** — appears on enable when there are unmet dependencies, missing cron, deprecated status, or upstream failures.
- **Deprecated section** — collapsed list, switch still available but row is line-through.

## 5. Main Actions and Business Outcomes

| Action | Effect | DB Impact | Workflow / Side-effects | Downstream |
|---|---|---|---|---|
| Toggle Enable | Sets `is_enabled` if runtime exists and warnings cleared | UPDATE `ce_automation_jobs.is_enabled` | Schedules/unschedules cron-driven runs | Job History, downstream jobs |
| Edit | Updates name/cron/parameters via `JobEditModal` | UPDATE `ce_automation_jobs` | Changes future run cadence | Cron scheduler |
| Add Custom Job | Inserts new row | INSERT `ce_automation_jobs` | New job appears, requires runtime registration | None until runtime wired |
| Dry Run | Invokes `run-compliance-job` edge fn with `dry_run=true` | INSERT `ce_automation_runs` (read-only outcome) | No data writes; surfaces scan summary in toast | Job History |
| Run Now | Invokes `run-compliance-job` with `dry_run=false`; honors `force` for already-completed-today | Edge function writes to violations / risk / ledger / notices depending on job | Updates `last_run_*` on the job row; emits `scan_details` | Workbench, Cases, Notices, Risk dashboards |
| Activation Confirm | Records explicit override of dependency/runtime/freshness warnings | UPDATE `is_enabled` | Bypasses guardrails (audit gap) | Same |

## 6. Data Model / Tables Used

| Table | Purpose | RW | Key Fields | Reused In |
|---|---|---|---|---|
| `ce_automation_jobs` | Job catalog (canonical + custom) | R/W | `id`, `job_code`, `name`, `description`, `schedule_cron`, `is_enabled`, `last_run_at`, `last_run_status`, `parameters` (JSONB: `pipeline_phase`, `pipeline_label`, `execution_mode`, `depends_on[]`, `downstream_jobs[]`, `has_runtime`, `blocked_reason`, `status` (`ACTIVE`/`DEPRECATED`), `superseded_by`, `actions{}`, `dry_run_default`, `block_on_upstream_failure`, `canonical_purpose`, `job_classification`) | Job History, Employer Compliance Jobs (subset), Pipeline Flow |
| `ce_automation_runs` | Execution history (written by edge function) | R via History page; W via edge fn | — | Job History |
| Edge function `run-compliance-job` | Runtime executor | invoke | body: `{ job_code, dry_run, force }`; returns `{ ok, scan_details, result, already_completed }` | Employer Compliance Jobs hook also invokes it |

> **Inconsistency flagged**: `useComplianceJobs.ts` reads from `ce_automation_job_runs` while this page's sibling (`JobHistory`) reads from `ce_automation_runs`. Either two tables exist or one is wrong. Needs reconciliation.

## 7. Services / Hooks / Queries Used
- React Query keys: `ce_automation_jobs`, `ce_job_runs_detail`.
- Direct Supabase: `from('ce_automation_jobs').select|update|insert`, `functions.invoke('run-compliance-job', …)`.
- Helpers: `cronToHumanText` (`src/lib/cronUtils.ts`), `formatAuditDateTime` (`src/lib/dateFormat.ts`).
- Child components (all under `src/components/compliance/automation/`):
  - `JobEditModal.tsx`
  - `AddCustomJobDialog.tsx` (with `CustomJobPayload` type)
  - `ActivationConfirmDialog.tsx`
  - `JobDetailDrawer.tsx`
  - `PipelineFlowView.tsx`
- Types: `src/types/automationJob.ts` (`AutomationJob`).

## 8. Validation Rules

| Rule | Where |
|---|---|
| Cannot enable a job with `has_runtime !== true` | UI (`handleToggle` early return + toast) |
| Enabling a deprecated job shows confirm dialog | UI |
| Enabling with unmet `depends_on` shows confirm | UI (`getActivationWarnings`) |
| Enabling scheduled job without `schedule_cron` shows warning | UI |
| Enabling when `block_on_upstream_failure=true` and any upstream failed shows warning | UI |
| Cron expression validity | Not validated client-side beyond conversion to human text — relies on Postgres/cron later |
| `created_by`/`updated_by` | **Not stamped** by Save — gap |

## 9. Workflow / Approval / Notification Logic
- No multi-step approval. Activation is a single-actor decision; the Activation Confirm Dialog is an interlock, not an approval workflow.
- `Run Now` triggers the edge function which can post to ledger, generate notices, create violations — these have their own downstream notifications.
- The Planner Approval Workflow (`mem://features/compliance/planner-approval-workflow.md`) is **not** invoked here.

## 10. Linkages to Other Screens
- **Sibling**: `Job History` (`/compliance/admin/automation/history`) reads runs.
- **Sibling**: `Employer Compliance Jobs` (`/compliance/admin/automation/employer-jobs`) is a curated subset of `ce_automation_jobs`.
- **Downstream consumers** of edge-function effects: Workbench, Violation List, Cases, Notices, Risk dashboards, Ledger.
- **Pipeline Flow View** uses the same `parameters.depends_on` / `downstream_jobs` graph.

## 11. Audit Trail / Logging
- No write to `system_audit_trail` for toggle/edit/add/run.
- `ce_automation_runs` captures runtime evidence (start/end/result), but not config-change history of the job row itself.
- No record of *who* enabled/disabled a job — high-impact action without an audit row.

## 12. Technical Risks / Gaps / Assumptions
- **Two-table inconsistency** for run history (`ce_automation_runs` vs `ce_automation_job_runs`).
- **No config-change audit** for enable/disable/edit.
- **Activation override** (Confirm dialog) bypasses guardrails silently; reason is not captured.
- **No DB-level validation** of cron strings; bad cron could silently never fire.
- **Heavy `parameters` JSONB** carries mission-critical metadata (phase, deps, runtime flag) without a schema constraint.
- **`Run Now` is synchronous from UI** — long-running jobs may exceed function timeout; no progress UI beyond a spinner.
- **No capability check** at component level.

## 13. Recommended Improvements
1. Reconcile `ce_automation_runs` vs `ce_automation_job_runs` into a single source of truth.
2. Add `system_audit_trail` row for enable/disable/edit/add/run; capture `actor_user_code`, `reason` (when override).
3. Promote `parameters` keys to typed columns (`pipeline_phase int`, `execution_mode enum`, `has_runtime bool`, `status enum`, `depends_on text[]`).
4. Validate cron via DB function before save.
5. Make the Confirm dialog require a *reason* before bypass.
6. Move `Run Now` to a queued background job pattern with realtime status.
7. Apply `useComplianceCapability('automation.manage')`.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line 1103)
- Page: `src/pages/compliance/automation/JobConfiguration.tsx`
- Children: `src/components/compliance/automation/{JobEditModal,AddCustomJobDialog,ActivationConfirmDialog,JobDetailDrawer,PipelineFlowView}.tsx`
- Types: `src/types/automationJob.ts`
- Helpers: `src/lib/cronUtils.ts`, `src/lib/dateFormat.ts`
- Edge function: `supabase/functions/run-compliance-job/`
- Memory: `mem://features/compliance/automation-and-rule-engine`, `mem://features/compliance/rule-engine-wizard-standards`
