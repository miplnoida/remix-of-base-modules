# Employer Compliance Jobs

## 1. Screen Overview
- **Screen name**: Employer Compliance Jobs
- **Route/path**: `/compliance/admin/automation/employer-jobs` (legacy redirect from `/compliance/automation/employer-jobs`)
- **Page component**: `src/pages/compliance/automation/EmployerComplianceJobs.tsx`
- **Parent menu location**: Compliance → Admin → Automation & Jobs
- **Screen type**: Operations console (curated job subset + per-job run history)

## 2. Business Function
Focused operations view for the **employer-status refresh family** of jobs: compliance status recompute, risk-score refresh, employer flag recalculations, ledger-driven reconciliation, etc. While `Job Configuration` shows the entire pipeline (P1–P6), this screen narrows to jobs that mutate employer-level state, giving the Employer Operations team a single pane to enable/disable, dry-run, run, and inspect history of just those jobs.

- Operational problem: the full pipeline view is too broad for daily employer-ops monitoring; this screen gives a noise-free workspace.
- Users: Compliance Operations, Employer Master Data team, Director.
- Lifecycle: Continuous monitoring + ad-hoc reruns.

## 3. Primary User Roles
- **Access**: `compliance_admin`, `compliance_manager`, `employer_ops`, `director`
- **Run / Toggle**: `compliance_admin`, `employer_ops`
- **View only**: others

> Assumption / needs confirmation: the same `ProtectedLayout` route gate applies; no in-page capability check.

## 4. UI Responsibilities
- **Header KPIs**: Total Jobs, Active, Inactive, Last Failed.
- **Per-job Card**: name + `job_code` + frequency badge + active/inactive badge; description; last run timestamp + status badge; cron expression; actions row.
- **Per-job Actions**: History, Dry Run, Run Now, Enable/Disable Switch.
- **Run History Dialog**: per-job table of recent runs (Started, Status, Mode, Processed, Affected, Errors, Duration, Triggered By).

## 5. Main Actions and Business Outcomes
| Action | Effect | DB | Downstream |
|---|---|---|---|
| Toggle Enable | `useToggleJob` → UPDATE `ce_automation_jobs.is_enabled` | UPDATE | Schedules/unschedules the job |
| Dry Run | `useRunComplianceJob` invokes `run-compliance-job` edge fn with `dryRun=true` | Read-only run | Toast w/ summary; row appears in history |
| Run Now | Same hook, `dryRun=false` | Edge fn writes to employer flags / risk / ledger | Updates dashboards |
| History | Opens modal listing runs from `ce_automation_job_runs` (via `useJobRunHistory`) | Read | None |

## 6. Data Model / Tables Used

| Table | Purpose | RW | Key Fields | Reused |
|---|---|---|---|---|
| `ce_automation_jobs` | Job catalog (filtered subset) | R/W (`is_enabled`) | `id`, `job_code`, `name`, `description`, `frequency`, `schedule_cron`, `last_run_at`, `last_run_status`, `is_enabled` | Job Configuration, Job History |
| `ce_automation_job_runs` | Per-job run history (consumed via `useJobRunHistory`) | R | `id`, `started_at`, `run_status`, `is_dry_run`, `records_processed`, `records_affected`, `errors_count`, `duration_ms`, `triggered_by` | This screen only — **does not match `ce_automation_runs` used by Job History page** |
| Edge function `run-compliance-job` | Runtime executor | invoke | `{ jobCode, dryRun }` | Job Configuration also invokes |

> **Critical inconsistency**: this hook (`useComplianceJobs`) reads `ce_automation_job_runs` while `JobHistory.tsx` reads `ce_automation_runs`. Status casing also differs (`success`/`failed`/`dry_run`/`running` vs `COMPLETED`/`FAILED`/`RUNNING`). Either there are two physical tables and they will drift, or one is a stale name. **Needs immediate reconciliation.**

## 7. Services / Hooks / Queries Used
- Hook file: `src/hooks/compliance/useComplianceJobs.ts` exposing:
  - `useComplianceJobs()` → `from('ce_automation_jobs').select('*')`
  - `useJobRunHistory(jobId)` → `from('ce_automation_job_runs').select('*').eq('job_id', jobId)`
  - `useRunComplianceJob()` → `supabase.functions.invoke('run-compliance-job', { body: { jobCode, dryRun } })`
  - `useToggleJob()` → `from('ce_automation_jobs').update({ is_enabled }).eq('id', id)`
- Types exported: `ComplianceJob`, `JobRun`.

## 8. Validation Rules
- Run buttons disabled when `!job.is_enabled || runMutation.isPending` — UI only.
- No edit form (no field validation).
- `created_by`/`updated_by` not stamped on toggle.

## 9. Workflow / Approval / Notification Logic
- None on this screen.
- Edge function may emit downstream effects (employer status updates, risk events) which are governed by their own modules.

## 10. Linkages to Other Screens
- **Same source data** as `Job Configuration` (`ce_automation_jobs`) but filtered/curated.
- **Different run table** than `Job History` (see inconsistency above).
- **Effects observed in**: Employer master detail, Compliance Workbench, Risk dashboards.

## 11. Audit Trail / Logging
- Run rows in `ce_automation_job_runs` serve as execution audit.
- No `system_audit_trail` row for enable/disable/run.
- `triggered_by` captured by edge fn.

## 12. Technical Risks / Gaps / Assumptions
- **Two parallel run tables** with different status vocabularies.
- **No filtering criterion in code** for which jobs are "employer compliance" — page renders **all** rows from `ce_automation_jobs`. The curated framing exists in name only. (Bug or pending refactor.)
- **No KPI for "unreachable"/"no runtime"** like Job Configuration has — operators here cannot see why a job won't toggle on.
- **No dry-run summary toast** like Job Configuration — generic success toast only.
- **No pagination on Run History dialog**.

## 13. Recommended Improvements
1. Reconcile run table & status casing with `Job History`.
2. Filter `useComplianceJobs` to `parameters.job_classification = 'employer'` (or equivalent flag) so the screen actually scopes to employer jobs.
3. Mirror Job Configuration's readiness checks (no-runtime, deprecated, unmet deps) before allowing toggle/run.
4. Reuse the rich `scan_details` toast formatter from `JobConfiguration` for consistency.
5. Stamp `system_audit_trail` for toggle/run.
6. Add capability gate `useComplianceCapability('automation.employer-jobs')`.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line 1105)
- Page: `src/pages/compliance/automation/EmployerComplianceJobs.tsx`
- Hook: `src/hooks/compliance/useComplianceJobs.ts`
- Edge function: `supabase/functions/run-compliance-job/`
- Sibling: `src/pages/compliance/automation/JobConfiguration.tsx`, `src/pages/compliance/automation/JobHistory.tsx`
