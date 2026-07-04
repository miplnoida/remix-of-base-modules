# EPIC-09A — Legal Reporting, BI & Executive Analytics

**Status:** Phase 1 (Foundation) shipped · Phase 2 (per-category report pages) planned.

## Objective
Enterprise Legal management-intelligence layer over live Legal V1 data. No mock data. Financial totals reconcile with `v_lg_case_financials`. Existing Legal V1 workflows and workbenches are untouched.

---

## Phase 1 — What shipped

### Canonical route
`/legal/reports` → `src/pages/legal/reports/LegalReportsCentre.tsx`

Replaces the previous `LgReportsHub`. The 11 explorer-based reports it exposed have been migrated as entries in the new registry (marked `status: "live"`). The old hub remains reachable at `/legal/reports/legacy-hub` for reference during Phase 2 transition.

### Report registry
`src/config/legalReportDefinitions.ts`

Central catalogue of 60+ reports across 8 categories. Every entry declares:
`code · name · category · purpose · dataSource[] · columns · filters · groupingOptions · drilldownRoute · route · exportAllowed · viewCapability · financialReconciled · status`

Categories: `executive · operational · financial · compliance_referral · judicial · recovery · workload · external_counsel`

### Reporting service
`src/services/legal/lgReportingService.ts`

Canonical service:
- `fetchCaseFinancials()` / `sumCaseFinancials()` — **single source of truth** wrapping `v_lg_case_financials`. No report may recompute assessed/paid/outstanding.
- `getExecutiveKpis()` — 20 KPIs for the exec dashboard.
- Saved reports CRUD — `listSavedReports · upsertSavedReport · deleteSavedReport`.
- Scheduled reports CRUD — `listScheduledReports · upsertScheduledReport · toggleScheduledReport · computeNextRunAt`.
- Export audit — `writeExportAudit · listExportAudit`.

### Reusable Report Viewer
`src/components/legal/reports/ReportViewer.tsx`

Renders any `LegalReportDefinition` against a row provider. Ships with search, column-visibility chooser, sort, pagination, totals row, drilldown, save-report hook, and export to **Excel / CSV / PDF / Print** — every export writes to `lg_report_export_audit`.

### Database
Migration `EPIC-09A_reporting_foundation`:

| Table | Purpose |
|---|---|
| `lg_saved_report` | Personal + shared saved report configurations |
| `lg_scheduled_report` | Frequency-driven scheduled deliveries (daily/weekly/monthly/quarterly) |
| `lg_report_export_audit` | Append-only audit of every export (download, email, scheduled) |

**Security posture:** per project rule, no RLS. Role-based grants only:
- `authenticated`: `SELECT, INSERT, UPDATE, DELETE` on saved/scheduled; `SELECT, INSERT` on audit.
- `service_role`: `ALL` on every table.

Extensions enabled: `pg_cron`, `pg_net`.

### Scheduled report dispatcher
`supabase/functions/send-scheduled-legal-report/index.ts`

Edge function invoked by pg_cron every 5 minutes. Finds due `lg_scheduled_report` rows, sends a summary email via Resend gateway from `reports@notify.mishainfotech.us`, advances `next_run_at`, writes a `scheduled` audit row. Phase 1 delivers a summary/notice; Phase 2 will attach rendered artefacts.

pg_cron schedule name: `legal-scheduled-reports-dispatch` (5-minute cadence). Scheduled through the `supabase--insert` tool after this migration so the FQDN + service role token are not baked into a migration.

### Permissions
Six new capabilities on `LgCapability` and `LG_BASE_MATRIX`:

| Capability | READ_ONLY | ASSISTANT | HANDLER | REVIEWER | APPROVER | ADMIN |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `viewLegalReports` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `exportLegalReports` | | | ✅ | ✅ | ✅ | ✅ |
| `saveLegalReports` | | | | ✅ | ✅ | ✅ |
| `scheduleLegalReports` | | | | | ✅ | ✅ |
| `viewLegalExecutiveAnalytics` | | | | | ✅ | ✅ |
| `manageLegalReports` | | | | | | ✅ |

System admins (`ADMIN/SYSTEMADMIN/SUPERADMIN/LEGALADMIN`) inherit all via existing bootstrap.

### Menu
`Legal Management → Legal Reports & Analytics` with 11 items: Reports Centre · Executive · Operational · Financial · Compliance Referral · Judicial · Recovery · Workload · External Counsel · Saved · Scheduled · Export Audit.

Old sub-menu ("Cases by Stage", "Recovery Analysis", …) removed — all reachable through the new centre.

---

## Financial Reconciliation Rules

1. **`v_lg_case_financials` is authoritative** for `total_assessed / total_paid / total_outstanding` per matter. No report re-derives these.
2. Category-level financial rollups query the view first, then group by employer/fund/officer.
3. Fund/period/liability-type breakdowns query `lg_recoverable_liability` directly (that table is the atomic source the view aggregates).
4. Reports that mix multiple sources (e.g. "Counsel Cost vs Recovery") always join to the view for the recovery side.

---

## Export Audit Rules

- Every export from the Report Viewer writes an `lg_report_export_audit` row with `report_code · report_name · exported_by · exported_at · format · filters_json · row_count · file_name · delivery_channel`.
- Delivery channel: `download` (interactive), `email` (manual send), `scheduled` (edge function).
- Audit is append-only (no UPDATE/DELETE grant to `authenticated`).

---

## Saved / Scheduled Report Behaviour

**Saved:** `owner_user_id` sees own rows plus any `visibility = 'shared'` rows. Payload = filters + columns + grouping + sort JSON.

**Scheduled:** created against a `report_code`; `next_run_at` computed at 06:00 UTC of the next period. Recipient list is a JSONB string array. Toggle via `is_active`. Last-run status/error captured for diagnostics.

---

## Known Limitations (Phase 1)

- **Per-report detail pages** (60+) not yet built — Phase 2. Cards for `status: "planned"` reports are disabled in the centre.
- **Executive dashboard** exposes KPIs via service; the drilldown-heavy visual page is Phase 2.
- **Scheduled email** currently ships a summary/notice, not the rendered file — the render pipeline lives in Phase 2 alongside per-report detail pages.
- **Grouping in ReportViewer** shows totals only; hierarchical group rows are Phase 2.
- **Drilldown** wired through the viewer callback; per-report `drilldownRoute` mapping activates as detail pages ship.

---

## Files created (Phase 1)

- `src/config/legalReportDefinitions.ts` — 60+ report definitions
- `src/services/legal/lgReportingService.ts` — canonical reporting layer
- `src/components/legal/reports/ReportViewer.tsx` — reusable viewer
- `src/pages/legal/reports/LegalReportsCentre.tsx` — new `/legal/reports` centre
- `supabase/functions/send-scheduled-legal-report/index.ts` — scheduler dispatcher
- `docs/legal/EPIC-09A-REPORTING-BI.md` — this document

## Files modified

- `src/hooks/legal/useLgAccess.ts` — 6 new capabilities added to `LgCapability` + role matrix
- `src/components/routing/AppRoutes.tsx` — `/legal/reports` now renders `LegalReportsCentre`; legacy hub relocated to `/legal/reports/legacy-hub`
- `src/components/sidebar/menuItems/legalManagementMenuItems.ts` — new "Legal Reports & Analytics" group replaces old Reports sub-menu
- `docs/legal/permission-matrix.md` · `docs/legal/LEGAL_NAVIGATION.md` — see linked docs

## DB changes

- New: `lg_saved_report`, `lg_scheduled_report`, `lg_report_export_audit`
- Extensions: `pg_cron`, `pg_net` (idempotent)
- Trigger: `lg_reporting_touch_updated_at()` shared updated_at handler

## Typecheck

`bunx tsgo --noEmit` — clean.

---

## Phase 2 — Production Report Set (2026-07-03)

### Implemented reports (live)

| Category | Code | Route |
|---|---|---|
| Executive | `EXEC_DASHBOARD` | `/legal/reports/executive` |
| Financial | `FIN_CASE_SUMMARY` | `/legal/reports/run/FIN_CASE_SUMMARY` |
| Financial | `FIN_OUTSTANDING_BY_EMPLOYER` | `/legal/reports/run/FIN_OUTSTANDING_BY_EMPLOYER` |
| Financial | `FIN_OUTSTANDING_BY_FUND` | `/legal/reports/run/FIN_OUTSTANDING_BY_FUND` |
| Financial | `FIN_OUTSTANDING_BY_LIABILITY_TYPE` | `/legal/reports/run/FIN_OUTSTANDING_BY_LIABILITY_TYPE` |
| Financial | `FIN_RECOVERY_COLLECTION` | `/legal/reports/run/FIN_RECOVERY_COLLECTION` |
| Financial | `FIN_LEGAL_COST_REGISTER` | `/legal/reports/run/FIN_LEGAL_COST_REGISTER` |
| Compliance | `CR_REFERRAL_REGISTER` | `/legal/reports/run/CR_REFERRAL_REGISTER` |
| Compliance | `CR_REFERRAL_ITEMS` | `/legal/reports/run/CR_REFERRAL_ITEMS` |
| Compliance | `CR_CONVERSION_RATE` | `/legal/reports/run/CR_CONVERSION_RATE` |
| Compliance | `CR_REFERRED_VS_LIABILITY` | `/legal/reports/run/CR_REFERRED_VS_LIABILITY` |
| Operational | `OPS_OPEN_MATTERS` | `/legal/reports/run/OPS_OPEN_MATTERS` |
| Operational | `OPS_CLOSED_MATTERS` | `/legal/reports/run/OPS_CLOSED_MATTERS` |
| Operational | `OPS_HEARINGS_REGISTER` | `/legal/reports/run/OPS_HEARINGS_REGISTER` |
| Operational | `OPS_ORDERS_REGISTER` | `/legal/reports/run/OPS_ORDERS_REGISTER` |
| Operational | `OPS_RECOVERY_ASSIGNMENT_REGISTER` | `/legal/reports/run/OPS_RECOVERY_ASSIGNMENT_REGISTER` |
| Post-Judgment | `OPS_APPEALS_REGISTER` | `/legal/reports/run/OPS_APPEALS_REGISTER` |
| Post-Judgment | `OPS_ENFORCEMENT_REGISTER` | `/legal/reports/run/OPS_ENFORCEMENT_REGISTER` |
| Post-Judgment | `OPS_CONSENT_ORDER_REGISTER` | `/legal/reports/run/OPS_CONSENT_ORDER_REGISTER` |
| External Counsel | `EC_ENGAGEMENT_REGISTER` | `/legal/reports/run/EC_ENGAGEMENT_REGISTER` |

### Architecture

- `src/pages/legal/reports/LegalReportRunner.tsx` — single generic page keyed by `:code`; resolves the definition, checks `viewCapability` via `useLgAccess().can`, fetches rows through `REPORT_FETCHERS`, and renders the shared `ReportViewer` with drilldown to `definition.drilldownRoute`.
- `src/pages/legal/reports/ExecutiveKpiDashboard.tsx` — 13 KPI tiles; each drills into the correct canonical Legal V1 screen or a filtered report.
- `src/services/legal/lgReportFetchers.ts` — one fetcher per implemented code. Financial figures always come from `v_lg_case_financials` (via `fetchCaseFinancials`) or `lg_recoverable_liability` — no recomputation.
- `src/components/legal/reports/ReportFilters.tsx` — filter chip panel driven by `definition.filters`.

### Drilldowns

Every operational row navigates via `definition.drilldownRoute` (`/legal/lg/cases/:id`, `/legal/lg/appeals/:id`, `/legal/lg/enforcement/:id`, `/legal/lg/consent-orders/:id`, `/legal/lg/orders/:id`, `/legal/lg/hearings/:id`, `/legal/lg/recovery-assignments/:id`). No deprecated routes are referenced.

### Financial reconciliation

All financial reports and the Executive KPI tiles for Assessed / Paid / Outstanding / Recovery % delegate to `v_lg_case_financials`. `FIN_OUTSTANDING_BY_FUND`, `FIN_OUTSTANDING_BY_LIABILITY_TYPE` and `CR_REFERRED_VS_LIABILITY` roll up `lg_recoverable_liability` directly. Cross-check: sum(`v_lg_case_financials.total_outstanding`) == Σ(matter outstanding on `FIN_CASE_SUMMARY`) == Executive `Outstanding` KPI.

### Referral reconciliation

`CR_REFERRED_VS_LIABILITY` compares `core_legal_referral_item.amount_referred` to `lg_recoverable_liability.total_assessed` grouped by referral item id (`source_reference` where `source_module='LEGAL_REFERRAL'`). Rows with a non-zero variance are flagged `MISMATCH`.

### Export & audit

Every export (Excel / CSV / PDF / Print) is written to `lg_report_export_audit` with `report_code`, `format`, `filters_json`, `row_count`, `file_name`, and `exported_by = auth.uid()`.

### Pending reports (Phase 3)

- Intake / matter / task aging drilldowns (`OPS_INTAKE_AGING`, `OPS_MATTER_AGING`, `OPS_TASK_AGING`, `OPS_DEADLINE_REGISTER`)
- Judicial deep analytics (`JUD_HEARINGS_BY_COURT`, `JUD_HEARINGS_BY_JUDGE`, `JUD_HEARING_OUTCOMES`, `JUD_TIME_TO_JUDGMENT`, `JUD_TIME_TO_ENFORCEMENT`, `JUD_COURT_SUCCESS`)
- Recovery slice-and-dice (`REC_BY_OFFICER`, `REC_BY_FUND`, `REC_BY_EMPLOYER`, `REC_BY_STAGE`, `REC_AGING`, `REC_CONSENT_BREACH`, `REC_ENFORCEMENT`, `REC_SETTLEMENT`, `REC_OUTSTANDING`)
- Workload (`WL_OFFICER_WORKLOAD`, `WL_TEAM_WORKLOAD`, `WL_MATTERS_OFFICER`, `WL_HEARINGS_OFFICER`, `WL_TASKS_OFFICER`, `WL_OVERDUE_WORK`, `WL_RECOVERY_PERFORMANCE`, `WL_CLOSURE_PERFORMANCE`)
- External counsel deep dive (`EC_MATTERS`, `EC_FEES`, `EC_OUTCOME`, `EC_AVG_DURATION`, `EC_COST_VS_RECOVERY`)
- Compliance-referral SLAs (`CR_TIME_REFERRAL_TO_INTAKE`, `CR_TIME_INTAKE_TO_MATTER`, `CR_ITEMS_BY_FUND`, `CR_ITEMS_BY_PERIOD`, `CR_ITEMS_ACCEPTED`, `CR_ITEMS_REJECTED`, `CR_MULTI_COMPONENT`)
- Additional financial (`FIN_PAYMENT_ALLOCATION`, `FIN_LEGAL_COST_RECOVERY`, `FIN_SETTLEMENT`, `FIN_CONSENT_COLLECTION`, `FIN_WRITE_OFF`, `FIN_OUTSTANDING_BY_PERIOD`)
- ReportViewer enhancements: grouping toolbar, saved-filter chips inside the runner, chart pane per report

### Known limitations

- Executive dashboard drilldown for "Open Matters" and "New This Month" uses query-string filters (`?status=open`, `?opened=thisMonth`) that the Matter workspace does not yet parse — a small workspace-side enhancement will make these live.
- Filters currently accept raw IDs (employer / officer / court / counsel) via text input. Type-ahead dropdowns will land with the shared master-picker component in Phase 3.
- `CR_REFERRAL_REGISTER` reads `core_legal_referral` only; some historical rows still sit in `ce_legal_referrals` / `legal_referral` and are visible in the migrated legacy hub at `/legal/reports/legacy-hub` for reconciliation.

### Typecheck

`bunx tsgo --noEmit` — clean.

---

## EPIC-09B — Executive BI, Analytics & Reporting Platform (delivered)

### Executive Dashboard (Part 1 & 2)

Rebuilt at `/legal/reports/executive` with the full Part-1 KPI set (17 tiles) and 14 interactive charts (Recharts):

- KPIs: Total / Open / Closed / New-this-month / Closed-this-month Matters, Active Hearings, Pending Orders, Pending Appeals, Active Enforcement, Active Consent Orders, Active External Counsel, Total Recoverable, Total Paid, Outstanding, Recovery %, Average Matter Age, Average Resolution Time.
- Every tile drills into a canonical Legal V1 route or filtered report (no `legalFinal`, no `legal-advanced`, no `redirect` targets).
- Charts: Matter Intake vs Closure, Recovery Trend, Outstanding vs Assessed, Recovery %, Appeals & Success Rate, Consent Performance, Enforcement Performance, Legal Cost Trend, External Counsel Spend, Referral Conversion, Matter Age Distribution, Officer Workload, Court Workload, Priority Mix.
- Time grain selector: **Month / Quarter / Year** (drives `bucketDate` on all trend queries).

### Analytics Dashboards (Parts 3-7)

`/legal/reports/analytics/:kind` — new page `LegalAnalyticsDashboard.tsx`. Kinds:

- `operational` — Officer performance, hearings, orders, appeal & enforcement outcomes
- `financial`   — Recoverable/paid/outstanding by fund/liability/employer/period + write-offs + settlements
- `compliance`  — Referral ageing, conversion, acceptance/rejection, multi-component analysis, reconciliation
- `post-judgment` — Appeals outcomes, consent performance, enforcement recovery
- `counsel`     — Engagements, matter volume, fees, average duration, cost-vs-recovery

Each dashboard is entirely composed from `lgReportingService` primitives and `lgReportFetchers` — no new calculation paths.

### Advanced Report Runner (Part 8)

`ReportViewer.tsx` gained:

- Multi-level grouping with per-group summary rows (numeric aggregates)
- Pivot mode (row × col with numeric aggregate)
- Favourites (`toggleFavourite`), Pinned (`togglePinned`), Recently-used history (`recordHistory`) — persisted via `lgReportPersonalization`
- Column presets (save/load/delete) + Saved Layouts (groupBy / pivot / conditional rules) per report code
- Conditional formatting rules engine (`column op value tone`)
- Export preview modal (first 200 rows)

The report Centre exposes a **My Reports** tab surfacing pinned/favourites/history.

### Master Pickers (Part 9)

`ReportFilters.tsx` replaces free-text inputs with `Select` pickers hydrated from the following masters via new helpers in `lgReportingService`:

- Officer (`lg_staff`), Court (`lg_court`), External Counsel (`lg_external_counsel`), Matter Type (`lg_matter_type`), Employer (distinct `primary_entity_id`), Fund / Liability Type / Contribution Period (distinct from `lg_recoverable_liability`), plus enumerated Status / Priority / Stage.

### Personalization (Part 10)

`/legal/reports/personalize` (page `LegalDashboardPersonalization.tsx`) is backed by `public.lg_dashboard_preference` (new table). Users can:

- Toggle any of 17 KPI cards
- Choose chart layout (grid / list / compact)
- Set default report on open
- Set default date range
- Reset dashboard to defaults

Favourites / Pinned are stored locally today and are ready to sync with `lg_dashboard_preference.favourites` / `pinned`.

### Scheduled Report Enhancements (Part 11)

`public.lg_scheduled_report` gained columns: `subject_template`, `recipient_group_ids`, `attach_data`, `attempt_count`, `execution_history`. New table `public.lg_report_recipient_group` provides reusable distribution lists.

Edge function `send-scheduled-legal-report` now:

- Expands recipient groups into the send list
- Renders subject template (`{{name}}`, `{{code}}`, `{{date}}` placeholders)
- Fetches server-side rows for the 15 highest-traffic report codes and attaches a CSV via Resend
- Appends every attempt to `execution_history` (append-only JSON), increments `attempt_count`
- Records outcome in `lg_report_export_audit` with `delivery_channel='scheduled'`

UI additions in the Scheduled panel: recipient-group picker, subject template field, `attach_data` toggle, retry button (advances `next_run_at = now()`), execution-history dialog, next-execution preview.

Deferred (config only): PDF / Excel / ZIP attachment rendering — CSV is delivered today; other formats fall back to CSV with a note in the email footer until server-side rendering is added.

### Report Completion (Part 12)

`REPORT_FETCHERS` in `src/services/legal/lgReportFetchers.ts` now covers **every** report code registered in `src/config/legalReportDefinitions.ts`. Every definition entry has `status: "live"` — the registry contains **zero** "Planned" reports.

Newly-implemented fetchers include: `OPS_INTAKE_AGING`, `OPS_MATTER_AGING`, `OPS_UPCOMING_HEARINGS`, `OPS_MISSED_HEARINGS`, `OPS_ORDERS_PENDING_COMPLIANCE`, `OPS_COURT_FILING_REGISTER`, `OPS_TASK_AGING`, `OPS_DEADLINE_REGISTER`, `FIN_OUTSTANDING_BY_PERIOD`, `FIN_PAYMENT_ALLOCATION`, `FIN_LEGAL_COST_RECOVERY`, `FIN_COURT_COST`, `FIN_SETTLEMENT`, `FIN_CONSENT_COLLECTION`, `FIN_WRITE_OFF`, `CR_ITEMS_BY_FUND`, `CR_ITEMS_BY_PERIOD`, `CR_ITEMS_ACCEPTED`, `CR_ITEMS_REJECTED`, `CR_TIME_REFERRAL_TO_INTAKE`, `CR_TIME_INTAKE_TO_MATTER`, `CR_MULTI_COMPONENT`, `JUD_HEARINGS_BY_COURT`, `JUD_HEARINGS_BY_JUDGE`, `JUD_HEARING_OUTCOMES`, `JUD_JUDGMENT_REGISTER`, `JUD_ORDER_COMPLIANCE`, `JUD_APPEAL_OUTCOMES`, `JUD_ENFORCEMENT_OUTCOMES`, `JUD_TIME_TO_JUDGMENT`, `JUD_TIME_TO_ENFORCEMENT`, `JUD_COURT_SUCCESS`, `REC_BY_OFFICER`, `REC_BY_FUND`, `REC_BY_EMPLOYER`, `REC_BY_STAGE`, `REC_AGING`, `REC_CONSENT_BREACH`, `REC_ENFORCEMENT`, `REC_SETTLEMENT`, `REC_OUTSTANDING`, `WL_OFFICER_WORKLOAD`, `WL_TEAM_WORKLOAD`, `WL_MATTERS_OFFICER`, `WL_HEARINGS_OFFICER`, `WL_TASKS_OFFICER`, `WL_OVERDUE_WORK`, `WL_RECOVERY_PERFORMANCE`, `WL_CLOSURE_PERFORMANCE`, `EC_MATTERS`, `EC_FEES`, `EC_OUTCOME`, `EC_AVG_DURATION`, `EC_COST_VS_RECOVERY`.

### Drilldown Validation (Part 13)

Every KPI, chart tile and report row with a `drilldownRoute` targets a canonical Legal V1 page (`/legal/lg/*`). The Executive Dashboard tiles use only canonical routes; no `legal-advanced`, `legalFinal`, `redirect`, or `/legal/reports/lg/*` legacy paths are linked from the new dashboards.

### Performance (Part 14)

- All fetchers respect `.limit()` caps (5k–10k) and rely on existing DB indexes.
- Time-series bucketing (`bucketDate`) runs in-memory over already-scoped data; no N+1 joins.
- Executive KPI queries run in parallel via `Promise.all` (11 concurrent queries).
- `useQuery` caches all reports for 60 seconds (`staleTime`).
- Master pickers cache for 5 minutes (`staleTime: 300_000`).
- No fetcher re-implements the financial roll-up — every path resolves through `v_lg_case_financials` or `lg_recoverable_liability`.

### Security (Part 15)

No new permissions were introduced. Every runner and dashboard checks the existing EPIC-09A capabilities:

- `viewLegalReports` — catalogue, runner, saved/scheduled/audit tabs
- `exportLegalReports` — Excel/CSV/PDF/Print buttons
- `saveLegalReports` — save button on runner
- `scheduleLegalReports` — scheduled report CRUD
- `manageLegalReports` — recipient group management
- `viewLegalExecutiveAnalytics` — executive dashboard + analytics dashboards

### Implemented Reports

All 75 reports in `legalReportDefinitions.ts` are marked `status: "live"` and have registered fetchers.

### Pending Reports

None. Registry has zero unimplemented entries.

### Known Limitations

- Executive dashboard filter chips (Matter workspace `?status=open`, `?opened=thisMonth`) still rely on a small workspace-side enhancement to fully parse query-string filters.
- Scheduled email attachments render only as CSV; native Excel / PDF / ZIP rendering is deferred (config supported today).
- Favourites / Pinned live in `localStorage` for zero-latency reads; server sync into `lg_dashboard_preference.favourites` / `pinned` columns is available but not wired to the browser-side helpers yet.
- Some analytics chart datasets (`fetchReferralItems`, `fetchMultiComponentReferral`) will show empty axes on projects with no seeded referral data — this is a data issue, not a code issue.

### Files added / changed in EPIC-09B

- `src/pages/legal/reports/LegalAnalyticsDashboard.tsx` — new (Parts 3-7)
- `src/pages/legal/reports/LegalReportsManagers.tsx` — new (Saved / Scheduled / Recipients / Audit panels, Part 11)
- `src/pages/legal/reports/LegalDashboardPersonalization.tsx` — new (Part 10)
- `src/services/legal/lgReportPersonalization.ts` — new (favourites / pinned / history / presets / layouts)
- `src/pages/legal/reports/ExecutiveKpiDashboard.tsx` — rebuilt (Parts 1 & 2)
- `src/components/legal/reports/ReportFilters.tsx` — rewritten with master pickers (Part 9)
- `src/components/legal/reports/ReportViewer.tsx` — grouping, pivot, favourites, presets, layouts, conditional formatting, export preview (Part 8)
- `src/services/legal/lgReportingService.ts` — extended KPIs, trend/dist helpers, recipient groups, preferences, master lookups
- `src/services/legal/lgReportFetchers.ts` — every report code implemented (Part 12)
- `src/config/legalReportDefinitions.ts` — every report promoted to `live`
- `src/pages/legal/reports/LegalReportsCentre.tsx` — new tabs (Personal / Analytics / Groups) + drilldowns
- `src/components/routing/AppRoutes.tsx` — analytics + personalize routes
- `src/components/sidebar/menuItems/legalManagementMenuItems.ts` — analytics menu entries
- `supabase/functions/send-scheduled-legal-report/index.ts` — CSV attachment + subject templates + recipient groups + execution history
- `supabase/migrations/*_epic09b_scheduled_enhancements.sql` — schema for enhancements + recipient groups + preferences

### Typecheck

`bunx tsgo --noEmit` — clean.


---

## EPIC-09C — Enterprise BI (continuation)

EPIC-09C extends this framework with:
- Executive Command Centre (`/legal/reports/command-centre`)
- Global dashboard filters + query-string drilldowns
- Report Catalogue redesign with search, favourites, recently used and certification badges
- Enterprise Export Centre with retry/re-run
- Subscription enhancements (pause/resume/clone, annual cadence, business calendar, holiday skip)
- Shared Dashboards (`lg_shared_dashboard`)
- Report Certification (`lg_report_certification`)
- Data Quality Dashboard (12 live checks)
- Performance Monitoring (`lg_report_performance_metric`)
- Enterprise Audit (`lg_report_audit_event`)

See `EPIC-09C-BUSINESS-INTELLIGENCE.md` for the full breakdown.
