# Compliance & Enforcement — Reports Correction Plan

> Manual Acceptance Testing finding: many submenu items under
> **Compliance & Enforcement → Reports** open the same dashboard page,
> with the same URL, even though their labels are different.
>
> This document is the implementation plan and verification log for
> fixing all Reports submenu items so that every leaf has a unique URL
> and content that matches its label.

## 1. Current Reports menu tree (as found in code + DB `app_modules`)

The sidebar is DB-driven via `app_modules`. The Reports parent is
`compliance_reports` (`ca000000-…-000080`). Its children are:

```
Compliance & Enforcement
└── Reports                                 ca000000-…-000080
    ├── Violations Reports                  ca000000-…-000081
    │   ├── Violations Summary              (fixed earlier)
    │   ├── Violations by Status            (fixed earlier)
    │   ├── Violations by Type              (fixed earlier)
    │   ├── Violation Resolution Time       (fixed earlier)
    │   └── Violations by Zone              (fixed earlier)
    ├── Inspector Performance               ca000000-…-000082
    │   ├── Weekly Plan Compliance
    │   ├── Field Activities Summary
    │   ├── Check-In/Check-Out Audit
    │   └── Violations Handled by Inspector
    ├── C3 Compliance Reports               ca000000-…-000083
    │   ├── On-Time vs Late Submissions
    │   ├── Missing C3 Submissions
    │   ├── C3 Without Payment
    │   └── Compliance Rate by Zone
    ├── Arrears & Collections               ca000000-…-000084
    │   ├── Total Arrears by Zone
    │   ├── Arrears Aging Analysis
    │   ├── Collections Over Time
    │   └── Top 50 Arrears Employers
    ├── Audit & Inspection Reports          ca000000-…-000085
    │   ├── Audit Completion Rate
    │   ├── Findings by Severity
    │   ├── Inspection Coverage by Zone
    │   └── Risk-Based Audit Results
    ├── Payment Arrangements                ca000000-…-000086
    │   ├── Active Arrangements
    │   ├── Defaulted Arrangements
    │   ├── Arrangement Success Rate
    │   └── Installment Payment Trends
    ├── Legal Escalation                    ca000000-…-000087
    │   ├── Violations Escalated to Legal
    │   ├── Legal Stage Distribution
    │   ├── Court Proceedings Status
    │   └── Judgements & Enforcement
    ├── Trend Analysis                      ca000000-…-000088
    │   ├── Compliance Trends (12 months)
    │   ├── Violation Creation Trends
    │   ├── Resolution Rate Trends
    │   └── Financial Recovery Trends
    └── Automation Jobs Report               cb000001-…-000801   (single page)
```

## 2. Current route per submenu (DUPLICATES IDENTIFIED)

| Group                   | Children | Current route (all duplicates)                 |
|-------------------------|---------:|------------------------------------------------|
| Inspector Performance   |        4 | `/compliance/reports/inspector-performance`    |
| C3 Compliance           |        4 | `/compliance/reports/c3-compliance`            |
| Arrears & Collections   |        4 | `/compliance/reports/arrears`                  |
| Audit & Inspection      |        4 | `/compliance/reports/audit`                    |
| Payment Arrangements    |        4 | `/compliance/reports/arrangements`             |
| Legal Escalation        |        4 | `/compliance/reports/legal`                    |
| Trend Analysis          |        4 | `/compliance/reports/trends`                   |

Total **28 duplicate links** rendering the same dashboard page.

The Violations group (5 items) was corrected in the previous loop and
each leaf already renders unique content.

## 3. Current component rendered by each duplicate route

| Route                                       | Component                                    |
|---------------------------------------------|----------------------------------------------|
| `/compliance/reports/inspector-performance` | `InspectorPerformance.tsx` (dashboard)       |
| `/compliance/reports/c3-compliance`         | `C3Compliance.tsx` (dashboard)               |
| `/compliance/reports/arrears`               | `ArrearsReports.tsx` (dashboard)             |
| `/compliance/reports/audit`                 | `AuditReports.tsx` (dashboard)               |
| `/compliance/reports/arrangements`          | `ArrangementReports.tsx` (dashboard)         |
| `/compliance/reports/legal`                 | `LegalEscalationReports.tsx` (dashboard)     |
| `/compliance/reports/trends`                | `TrendReports.tsx` (dashboard)               |

All seven are useful dashboards that should be **preserved** — but they
must not be reused as the content for every drill-down report below
them.

## 4. Duplicate URL identification

See §2. Every group except Violations and Automation Jobs has 4 items
pointing to the same URL.

## 5. Duplicate component misuse

The seven dashboard pages above are valid summary screens. The misuse
is that the DB `app_modules.route` for every drill-down points to the
dashboard URL instead of a unique leaf URL.

## 6. Useful dashboards to preserve

All seven existing dashboard pages will be kept under their existing
URLs. Each group's menu gains a new explicit **"Summary"** child that
points at the dashboard URL, so the dashboard is reachable by an
appropriately-labelled menu item and the four drill-down siblings are
unique pages.

## 7. Target route per submenu item

Pattern: `/compliance/reports/<group>/<slug>` for every drill-down.
Dashboard kept at the existing `/compliance/reports/<group>` URL and
re-labelled `<Group> Summary` in the sidebar.

| Submenu label                       | Target route                                                     |
|-------------------------------------|------------------------------------------------------------------|
| Inspector Performance Summary       | `/compliance/reports/inspector-performance`                      |
| Weekly Plan Compliance              | `/compliance/reports/inspector-performance/weekly-plan`          |
| Field Activities Summary            | `/compliance/reports/inspector-performance/field-activities`     |
| Check-In/Check-Out Audit            | `/compliance/reports/inspector-performance/check-in-out`         |
| Violations Handled by Inspector     | `/compliance/reports/inspector-performance/violations-by-inspector` |
| C3 Compliance Summary               | `/compliance/reports/c3-compliance`                              |
| On-Time vs Late Submissions         | `/compliance/reports/c3-compliance/on-time-vs-late`              |
| Missing C3 Submissions              | `/compliance/reports/c3-compliance/missing`                      |
| C3 Without Payment                  | `/compliance/reports/c3-compliance/without-payment`              |
| Compliance Rate by Zone             | `/compliance/reports/c3-compliance/rate-by-zone`                 |
| Arrears Summary                     | `/compliance/reports/arrears`                                    |
| Total Arrears by Zone               | `/compliance/reports/arrears/by-zone`                            |
| Arrears Aging Analysis              | `/compliance/reports/arrears/aging`                              |
| Collections Over Time               | `/compliance/reports/arrears/collections-over-time`              |
| Top 50 Arrears Employers            | `/compliance/reports/arrears/top-50`                             |
| Audit & Inspection Summary          | `/compliance/reports/audit`                                      |
| Audit Completion Rate               | `/compliance/reports/audit/completion-rate`                      |
| Findings by Severity                | `/compliance/reports/audit/findings-by-severity`                 |
| Inspection Coverage by Zone         | `/compliance/reports/audit/coverage-by-zone`                     |
| Risk-Based Audit Results            | `/compliance/reports/audit/risk-based`                           |
| Payment Arrangements Summary        | `/compliance/reports/arrangements`                               |
| Active Arrangements                 | `/compliance/reports/arrangements/active`                        |
| Defaulted Arrangements              | `/compliance/reports/arrangements/defaulted`                     |
| Arrangement Success Rate            | `/compliance/reports/arrangements/success-rate`                  |
| Installment Payment Trends          | `/compliance/reports/arrangements/installment-trends`            |
| Legal Escalation Summary            | `/compliance/reports/legal`                                      |
| Violations Escalated to Legal       | `/compliance/reports/legal/escalated`                            |
| Legal Stage Distribution            | `/compliance/reports/legal/stage-distribution`                   |
| Court Proceedings Status            | `/compliance/reports/legal/court-status`                         |
| Judgements & Enforcement            | `/compliance/reports/legal/judgements`                           |
| Trend Analysis Summary              | `/compliance/reports/trends`                                     |
| Compliance Trends (12 months)       | `/compliance/reports/trends/compliance-12m`                      |
| Violation Creation Trends           | `/compliance/reports/trends/violation-creation`                  |
| Resolution Rate Trends              | `/compliance/reports/trends/resolution-rate`                     |
| Financial Recovery Trends           | `/compliance/reports/trends/financial-recovery`                  |

## 8. Target component / reportType per route

A single shared component `src/pages/compliance/reports/shared/VariantReport.tsx`
is added. It accepts a `variant` prop that maps to an entry in
`src/pages/compliance/reports/shared/reportVariants.ts`. Each variant
config defines:

- `title`, `subtitle`, breadcrumb label
- `dataSource` async function returning rows from real Supabase data
- `filters` (date range, zone, status, severity, …) where relevant
- `kpis` (count, sum, avg) derived from rows
- `chart` (optional) — bar / line built from rows
- `table` columns
- `emptyMessage` — variant-specific honest text
- `exportColumns` — column map for `exportReportToExcel`

Dashboard URLs continue to render their existing dashboard component
(no change there). The seven dashboards are now correctly labelled
**Summary** in the menu.

## 9. Data source per report

| Variant                              | Data source                                          |
|--------------------------------------|------------------------------------------------------|
| inspector_perf_weekly_plan           | `ce_v_weekly_plan_versions`, `ce_v_weekly_report_summary` |
| inspector_perf_field_activities      | `ce_v_visit_execution_metrics`                        |
| inspector_perf_check_in_out          | `ce_v_visit_execution_metrics`                        |
| inspector_perf_violations_by_officer | `ce_v_officer_performance`                            |
| c3_on_time_vs_late                   | `ce_v_c3_compliance_summary`                          |
| c3_missing                           | `ce_v_c3_compliance_summary` (missing > 0)            |
| c3_without_payment                   | `ce_v_c3_unposted_to_ledger`                          |
| c3_rate_by_zone                      | `ce_v_c3_compliance_summary` (group by zone)          |
| arrears_by_zone                      | `ce_arrears_report_entries` (group by zone)           |
| arrears_aging                        | `ce_arrears_report_entries` (group by aging_category) |
| arrears_collections_over_time        | `ce_v_violation_trends` + `ce_arrears_report_entries` |
| arrears_top_50                       | `ce_arrears_report_entries` order by total_arrears    |
| audit_completion_rate                | `ce_audit_report_entries` (status counts)             |
| audit_findings_by_severity           | `ce_audit_report_entries` (severity)                  |
| audit_coverage_by_zone               | `ce_audit_report_entries` (zone)                      |
| audit_risk_based                     | `ce_audit_report_entries` filtered by severity High/Critical |
| arrangements_active                  | `ce_v_arrangement_health` where status='Active'       |
| arrangements_defaulted               | `ce_v_arrangement_health` where breach_detected=true  |
| arrangements_success_rate            | `ce_v_arrangement_health` aggregate                   |
| arrangements_installment_trends      | `ce_arrangement_report_entries`                       |
| legal_escalated                      | `ce_v_employer_legal_status`                          |
| legal_stage_distribution             | `ce_v_employer_legal_status` (group by latest_stage)  |
| legal_court_status                   | `ce_v_employer_legal_status` (active_suit_count > 0)  |
| legal_judgements                     | `ce_v_employer_legal_status` filtered                 |
| trends_compliance_12m                | `ce_v_compliance_kpis` (where available) + `ce_v_violation_trends` |
| trends_violation_creation            | `ce_v_violation_trends`                               |
| trends_resolution_rate               | `ce_v_violation_trends` (resolved / created)          |
| trends_financial_recovery            | `ce_arrears_report_entries` over time                 |

No mock data is introduced. Where a view returns zero rows, the
variant shows its own honest empty state.

## 10. Status of each report (before fix)

All 28 drill-downs listed above are **existing but wrongly routed** —
they each point at their group's dashboard URL. After this fix they
become drill-down pages with unique content.

The seven dashboards are **existing and correct** and are preserved.

`Violations Reports` (5 leaves) and `Automation Jobs Report` (1) are
already correct.

## 11. Implementation steps

1. Add `src/pages/compliance/reports/shared/reportVariants.ts` — variant
   registry with title, query, columns, KPIs, empty state, export map.
2. Add `src/pages/compliance/reports/shared/VariantReport.tsx` — shared
   renderer that consumes the registry.
3. Add new leaf routes in `src/components/routing/AppRoutes.tsx` and in
   `src/pages/compliance/Routes.tsx`, each rendering
   `<VariantReport variant="…" />` inside the existing
   `<ComplianceRouteGate>`.
4. Add a migration that:
   - rewrites the 28 child `app_modules.route` values to the unique
     leaf URLs from §7,
   - inserts a `*_summary` child per group (sort_order 5) pointing at
     the dashboard URL so dashboards remain reachable.
5. Update `src/pages/compliance/reports/ComplianceReports.tsx` hub so
   each category card lists the same unique leaf URLs.
6. Append a section to `docs/compliance/final_stabilization_report.md`.

## 12. Verification checklist

- [ ] No two Reports submenu items share a URL.
- [ ] Each leaf renders content whose title matches the menu label.
- [ ] The seven dashboards still render at their original URLs and are
      reachable via a `Summary` child.
- [ ] Filters render where applicable; empty states are variant-
      specific.
- [ ] All routes remain wrapped in `ComplianceRouteGate` (existing
      `generate_reports` permission preserved).
- [ ] No mock data is introduced.
- [ ] TypeScript build passes.
- [ ] §13 "Final Verification Results" is filled in.

## 13. Final Verification Results

_To be completed after implementation and verification pass._
