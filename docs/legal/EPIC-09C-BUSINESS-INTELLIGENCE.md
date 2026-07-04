# EPIC-09C — Enterprise Business Intelligence Platform

Extends **EPIC-09A** (framework) and **EPIC-09B** (production reports + analytics) with a
full executive BI layer built entirely on the existing Legal Reporting Framework.

**Non-negotiables (unchanged from 09A/09B):**

- Financial totals come exclusively from `v_lg_case_financials` and `lg_recoverable_liability`.
- No new reporting engine — all reports flow through `lgReportingService` +
  `legalReportDefinitions` + `ReportViewer`.
- No duplicate reports; the existing 75-report registry is extended, not replaced.

## Parts Delivered

| Part | Deliverable | Route |
|------|-------------|-------|
| 1 | Executive Command Centre | `/legal/reports/command-centre` |
| 2 | Global dashboard filter engine | `GlobalDashboardFilters` component |
| 3 | Query-string drilldown support | `FilterChips` + `useDashboardFilters` |
| 4 | Report Catalogue redesign | `/legal/reports?tab=catalog` |
| 5 | Advanced report search | search bar on Centre |
| 6 | Enterprise Export Centre | `/legal/reports/exports` |
| 7 | Subscription enhancements | pause / resume / clone + annual cadence |
| 8 | Shared Dashboards | `/legal/reports/shared` |
| 9 | Report Certification | `/legal/reports/certification` |
| 10 | Data Quality Dashboard | `/legal/reports/data-quality` |
| 11 | Performance Monitoring | `/legal/reports/performance` |
| 12 | Enterprise Audit | `/legal/reports/audit` |
| 13 | Menu integration | Legal Reports & Analytics submenu |
| 14 | Permissions | see below |
| 15 | Documentation | this file + 3 guides |

## Database (EPIC-09C additions)

Migration `20260704_epic09c_*.sql`:

- `lg_shared_dashboard` — private/team/department/organization/template scopes, read_only vs editable, publish, template & clone metadata.
- `lg_report_certification` — status, business owner, financial source, freshness, last validated.
- `lg_report_performance_metric` — per-run timing, row count, cache hit.
- `lg_report_audit_event` — 12 event types covering dashboard views, exports, shares, filter changes, drilldowns and certification changes.
- `lg_scheduled_report` extended with `days_of_week`, `days_of_month`, `skip_holidays`,
  `business_calendar_code`, `paused_at`, `retry_max`, `retry_backoff_minutes`,
  `cloned_from`; `frequency` now allows `annual`.

All new tables use platform-standard grants (`authenticated`, `service_role`) — no
RLS (project policy: role-based security via services).

## Permissions

`useLgAccess` capabilities added:

- `viewExecutiveCentre` — Command Centre
- `shareDashboards` — save/edit shared dashboards
- `viewDataQuality` — Data Quality dashboard
- `viewPerformanceMetrics` — Performance page
- `viewReportAudit` — Enterprise audit
- `manageDashboardTemplates` — publish/template dashboards
- `manageReportCertification` — set certified/draft/deprecated
- `viewExportCentre` — Export Centre

Granted to `LG_APPROVER` (view-level) and `LG_ADMIN` (all).

## Data Quality Checks (12)

1. Missing parties on open matters
2. Cases without recoverable liabilities
3. Judicial-stage matters without hearings
4. Post-judgment matters without orders
5. Orphaned document links
6. Broken referral references
7. Enforcement matters without recovery assignment
8. Consent orders missing installments
9. Appeals past deadline without decision
10. Court filings without court
11. External counsel engagements missing instructions
12. Financial reconciliation variance (`v_lg_case_financials` vs sum(`lg_recoverable_liability`))

Every check is a live SQL query with drilldown into affected records.

## Scheduled Report Enhancements (Part 7)

- Cadence: daily, weekly, monthly, quarterly, annual.
- Specific weekdays (`days_of_week`) and specific dates (`days_of_month`).
- Business calendar (`business_calendar_code`) + `skip_holidays` flag.
- Pause / resume via UI (row actions).
- Clone existing schedule.
- Retry policy: `retry_max`, `retry_backoff_minutes`.
- CSV attachments implemented; Excel / PDF / ZIP configuration retained for a future dispatcher upgrade.

## Financial Reconciliation

All Command Centre KPIs and dashboards call `getExecutiveKpis()` /
`v_lg_case_financials` / `lg_recoverable_liability`. Nothing recomputes.

## Remaining Phase-D Items

- Scheduled dispatcher Excel/PDF/ZIP rendering (currently CSV-only).
- Business calendar / holiday tables (`skip_holidays` semantics rely on a future
  calendar table).
- Cache hit ratio requires future server-side query cache; currently records `false`.
- Data quality auto-remediation actions.
