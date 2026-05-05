# Standardize Department source & display in Internal Audit

## Goal
1. Single source of truth for Department: master table `tb_office_departments`.
2. Uniform display label `Department Name (OFFICE_CODE)` across every IA dropdown, grid, detail, filter, report and export.
3. Stored relational keys unchanged — only the displayed label changes.
4. All reads go through Supabase endpoints (typed client + RPC/view).

## Current state (verified)
- `ia_departments` (13 rows) is the IA-side table referenced by 12 IA child tables (`ia_department_functions`, `ia_audit_engagements`, `ia_findings`, `ia_audit_universe`, `ia_annual_plans`, `ia_activities`, `ia_follow_ups`, `ia_audit_reports`, `ia_audit_queries`, `ia_checklist_templates`, `ia_rcm_processes`, `ia_department_audits`).
- Each `ia_departments` row already has `source_department_id → tb_office_departments.id` and `office_code`. 10/13 are linked to the master; 3 are local "Other" entries.
- Pages today read `ia_departments` ad-hoc in 4 places (`RiskAssessment`, `RiskRegister`, `RiskMatrix`, `EntitySummary`) and via `useIADepartments` everywhere else, then render `d.name` only.
- `useOfficeDepartments` already exposes the master table cleanly.

The IA tables cannot FK directly to `tb_office_departments` without a destructive data migration (engagements, findings, plans, etc. all bound to `ia_departments.id`). So `ia_departments` stays as the IA "binding table"; it must always be kept in lock-step with the master, and every read must surface the master's `name + office_code`.

## Plan

### 1. Database (migration only — no destructive changes)
- Add a Postgres VIEW `v_ia_departments` that returns one row per `ia_departments.id` joined to `tb_office_departments` via `source_department_id`, with COALESCE fallback to local fields for "Other" entries:
  ```
  id, source_department_id, office_code,
  name           = COALESCE(m.name,  d.name),
  master_active  = COALESCE(m.is_active, true),
  display_label  = name || ' (' || COALESCE(office_code, '—') || ')',
  head, head_profile_id, email, phone, location,
  risk_rating, is_active, created_at, updated_at
  ```
- Trigger `ia_departments_sync_from_master` (BEFORE INSERT/UPDATE): when `source_department_id` is set, copy `name` and `office_code` from `tb_office_departments` so the IA row never drifts from the master.
- One-shot backfill UPDATE that re-syncs the 10 linked rows from the master immediately.
- Helper RPC `fn_ia_department_label(p_id uuid) returns text` for use in reports/exports SQL.
- No RLS changes (project rule).

### 2. Shared label helper
`src/lib/audit/departmentLabel.ts`:
```ts
export const formatDepartmentLabel = (d?: { name?: string; office_code?: string | null }) =>
  d?.name ? `${d.name}${d.office_code ? ` (${d.office_code})` : ''}` : '—';
```

### 3. Hook consolidation
- Refactor `useIADepartments` (in `src/hooks/useAuditData.ts`) to read `v_ia_departments` and return rows that include `office_code` and a precomputed `display_label`.
- Remove the four ad-hoc `supabase.from('ia_departments')` reads in `RiskAssessment.tsx`, `RiskRegister.tsx`, `RiskMatrix.tsx`, `EntitySummary.tsx`; use `useIADepartments` everywhere.
- `useIADepartmentMutations` keeps writing to the base table (the trigger keeps name/office_code true to master); invalidate `v_ia_departments` query key.

### 4. UI updates — apply `display_label` everywhere
Replace every `dept.name` / `d.name` Department rendering, dropdown item, filter option, badge, export column, and report cell across the IA module with `formatDepartmentLabel(dept)` (or directly the precomputed `display_label`). Files in scope:
- Pages: `DepartmentMaster`, `DepartmentView`, `FunctionMaster`, `RiskAssessment`, `RiskRegister`, `RiskMatrix`, `EntitySummary`, `ExecutiveDashboard`, `AuditDashboard`, `AuditEngagements`, `EngagementDetail`, `AuditPlanDetail`, `PlanApproval`, `AuditQueries`, `AuditPreparation`, `TemplatesManagement`, `RiskSettings`.
- Components: `EngagementBuilder`, `EditEngagementDialog`, `PlanningWizard`, `AuditPlanForm`, `AddEngagementToPlanForm`, `AutoPlanSuggestions`, `DepartmentAuditForm`, `AuditHistoryTimeline`, `BoardPackTab`, `CoverageRiskTab`, `DocumentRequestsTab`, `PlanAmendmentHistory`, `PlanVersionHistory`, `ActivityScheduleForm`, `ActivityRescheduleDialog`, `CommunicationStageDialog`, `TemplateCommunicationDialog`, `templates/ManagementResponseTemplateEditor`, `engagement/AuditeeContactSelector`, `workspace/AuditSummaryStrip`, `execution/Audit*Tab`, `reports/*` (Audit/ManagementResponse PDF exports + previews + AuditReportCenter + builder + selector + sections/AuditPortfolioSection).

Stored values (department_id) are unchanged. Dropdown `value=d.id`, label = `display_label`.

### 5. Filters / search / sort
- Search filters that previously matched `name` now match `display_label` (covers both name and office code).
- Department filter dropdowns use `display_label`. Sorting uses `display_label`.
- Export columns: rename `Department` column to render `display_label`; `FunctionMaster` import stays keyed by `name` for backward compatibility but writes the same value to both `name` and `office_code` lookup.

### 6. Reports & PDF/Excel exports
- `AuditReportPDFExport`, `ManagementResponseReportPDFExport`, `AuditPortfolioSection`, and `reportExcelExport` derive Department text via `formatDepartmentLabel` so PDFs and Excel match the UI.

### 7. Backward compatibility
- All existing FKs and stored IDs untouched.
- Trigger keeps `ia_departments.name` and `office_code` consistent with master, so legacy reads of the base table still see correct values.
- "Other" departments (no master link) keep working; their `display_label` falls back to `name (office_code)` from local fields.

### 8. Test scenarios
End-to-end checks after deploy: create / edit / delete a department, link to master vs "Other", create function/engagement/finding/plan/audit query/checklist with a dept, verify display label in: list grids, detail headers, filters, search-match, dropdowns in wizards, Risk Matrix, Risk Register, Risk Assessment, Entity Summary, Executive Dashboard, Audit History Timeline, PDF report export, Excel export, and Board Pack. Verify duplicate department names across two offices are now distinguishable. Verify recalculate-risk and department-risk-sync still operate.

## Deliverables
- 1 migration (view + trigger + backfill + RPC).
- `src/lib/audit/departmentLabel.ts`.
- Refactored `useAuditData.useIADepartments` + removal of ad-hoc reads in 4 pages.
- Mechanical replacement of `d.name` Department renders in ~35 IA files with the shared label helper.
- No changes to `tb_office_departments` schema; no RLS changes; no breaking type changes.
