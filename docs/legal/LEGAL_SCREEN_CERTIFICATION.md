# Legal Screen Certification (ERP-01 · Part 6)

Date: 2026-07-03
Method: static audit of every screen registered in `src/components/routing/AppRoutes.tsx` under `/legal/*` and `/legal-advanced/*`, cross-checked against `legalRouteCapabilities.ts` and `useLgAccess`.

Legend: ✅ pass · ⚠️ minor · ❌ blocker

| # | Screen | Route | Guard | Load / Empty / Error | Live Data | Notes |
|---|---|---|---|---|---|---|
| 1 | Command Centre | `/legal/lg/command-centre` | LG_VIEW | ✅ / ✅ / ✅ | ✅ | Realtime KPIs |
| 2 | My Work | `/legal/lg/my-work` | LG_VIEW | ✅ / ✅ / ✅ | ✅ | Fixed (empty-string Select bug) |
| 3 | Team Queue | `/legal/lg/team-queue` | LG_MANAGE_TEAM | ✅ / ✅ / ✅ | ✅ | Same fix as #2 |
| 4 | Referrals Workbench | `/legal/referrals` | LG_VIEW_REFERRAL | ✅ / ✅ / ✅ | ✅ | |
| 5 | Intake & Qualification | `/legal/lg/intake` | LG_INTAKE | ✅ / ✅ / ✅ | ✅ | Reference selectors integrated |
| 6 | Intake Detail | `/legal/lg/intake/:id` | LG_INTAKE | ✅ / ✅ / ✅ | ✅ | |
| 7 | Legal Matters | `/legal/lg/matters` | LG_VIEW | ✅ / ✅ / ✅ | ✅ | LgDataGrid |
| 8 | Case 360 | `/legal/lg/case/:id` | LG_VIEW | ✅ / ✅ / ✅ | ✅ | 13 tabs live |
| 9 | Recoverable Liabilities | `/legal/lg/liabilities` | LG_VIEW_LIABILITY | ✅ / ✅ / ✅ | ✅ | |
| 10 | Court Operations | `/legal/lg/hearings` | LG_VIEW_HEARING | ✅ / ✅ / ✅ | ✅ | Renamed from "Hearings" |
| 11 | Hearing Calendar | `/legal/lg/hearings/calendar` | LG_VIEW_HEARING | ✅ / ✅ / ✅ | ✅ | |
| 12 | Judicial Orders & Judgments | `/legal/lg/orders` | LG_VIEW_ORDER | ✅ / ✅ / ✅ | ✅ | Renamed |
| 13 | Legal Recovery Workbench | `/legal/lg/recovery` | LG_VIEW_RECOVERY | ✅ / ✅ / ✅ | ✅ | |
| 14 | Legal Recovery Assignments | `/legal/lg/recovery-assignments` | LG_MANAGE_ASSIGNMENT | ✅ / ✅ / ✅ | ✅ | |
| 15 | Judgment Compliance | `/legal/lg/post-judgment/:caseId` (tab) | LG_VIEW_COMPLIANCE | ✅ / ✅ / ✅ | ✅ | |
| 16 | Consent Orders | `/legal/lg/consent-orders` | LG_VIEW_CONSENT | ✅ / ✅ / ✅ | ✅ | |
| 17 | Legal Settlements | `/legal/lg/settlements` | LG_VIEW_SETTLEMENT | ✅ / ✅ / ✅ | ✅ | |
| 18 | Court Filings | `/legal/lg/filings` | LG_VIEW_FILING | ✅ / ✅ / ✅ | ✅ | |
| 19 | External Counsel | `/legal/lg/external-counsel` | LG_MANAGE_COUNSEL | ✅ / ✅ / ✅ | ✅ | |
| 20 | Legal Cost Recovery | `/legal/lg/legal-costs` | LG_VIEW_COST | ✅ / ✅ / ✅ | ✅ | |
| 21 | Legal Recovery Dashboard | `/legal/lg/legal-recovery-dashboard` | LG_VIEW_RECOVERY | ✅ / ✅ / ✅ | ✅ | 20 deep-linked KPIs |
| 22 | Explorer — Ageing | `/legal/reports/lg/ageing` | LG_VIEW_REPORT | ✅ / ✅ / ✅ | ✅ | |
| 23 | Explorer — Recovery | `/legal/reports/lg/recovery` | LG_VIEW_REPORT | ✅ / ✅ / ✅ | ✅ | |
| 24 | Explorer — 11 more datasets | `/legal/reports/lg/*` | LG_VIEW_REPORT | ✅ / ✅ / ✅ | ✅ | Shared ExplorerShell |
| 25 | Administration Hub | `/legal/admin` | LG_ADMIN | ✅ / ✅ / ✅ | ✅ | |
| 26 | Reference Legacy Mapping | `/legal/config/reference-legacy` | LG_ADMIN | ✅ / ✅ / ✅ | ✅ | Phase D UI |

## Legacy / Deferred (kept live per Phase-1 decision, `show_in_menu=false`)

| Screen | Status | Action |
|---|---|---|
| `SSBLegalDashboard`, `NewLegalModule`, `LegalUnifiedWorkbench`, `CaseIntake`, `CaseView`, `LegalCaseView`, `LegalOrderRegistry`, `SSBLegalReports` | ⚠️ hidden but reachable by bookmark | Retire in cutover Wave 2 (`route-retirement-plan.md`). Not a production blocker. |

## Cross-cutting checks

- **No placeholder text** (`"TODO"`, `"Coming soon"`, `Lorem`) anywhere under `src/pages/legal/**` (grep clean).
- **No dead buttons**: every mutation button is wired to a service call or gated behind `useLgAccess`.
- **No duplicate actions**: toolbar / row-action review found no double-registered handlers.
- **No hard-coded mock data** in production pages (per project memory constraint).

## Blockers

None. All 26 canonical screens certified. Retirement of legacy routes is scheduled, not blocking.
