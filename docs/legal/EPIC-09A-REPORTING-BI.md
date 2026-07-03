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
