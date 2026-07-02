# Legal Case 360 Workspace

Phase 4 deliverable. The Case 360 Workspace is the single screen an officer
opens to work an entire matter end-to-end. It replaces the older
`LegalCaseView` / `SSBCaseView` / `CaseView` screens (kept alive in parallel
per Phase-1 decision B until the Phase-4 cutover waves defined in
`route-retirement-plan.md`).

Route: `/legal/lg/case/:id` → `src/pages/legal/LgCaseDetail.tsx`.

## Design

The workspace uses a **two-level navigation** (6 groups × N sub-tabs) instead
of 13 flat tabs. The 2-level layout keeps the tab bar readable on 1366-wide
laptops and groups related work so an officer isn't scanning 13 labels for
the one they need. All 13 functional areas required by the master prompt
are covered — the mapping is below.

## 13 Functional Areas → Workspace Tabs

| # | Functional area              | Group        | Sub-tab(s)                                |
|---|------------------------------|--------------|-------------------------------------------|
| 1 | Case Summary                 | Overview     | Summary                                   |
| 2 | Parties                      | Overview     | Parties                                   |
| 3 | Intake & Referral Source     | Overview     | Intake, Source / Referral                 |
| 4 | Financial Snapshot           | Overview     | Financial Snapshot                        |
| 5 | Actions & Officer Tasks      | Work         | Actions, Tasks, Assignment History        |
| 6 | Court Proceedings & Hearings | Litigation   | Court Proceedings, Hearings               |
| 7 | Orders & Judgments           | Litigation   | Orders / Judgments                        |
| 8 | Appeals & Enforcement        | Litigation   | Appeals, Enforcement                      |
| 9 | Payments / Recovery          | Recovery     | Payments / Recovery                       |
|10 | Settlements & Arrangements   | Recovery     | Payment Arrangements, Settlements, Waivers|
|11 | Fees & Legal Costs           | Recovery     | Fees                                      |
|12 | Documents, Notices, Letters  | Documents    | Documents, Letters, Notices, Correspondence|
|13 | Governance & Audit           | Governance   | Legal References, Timeline, History, Activity/Audit |

## Contracts

- **Data**: every sub-tab pulls from live `lg_*` / `core_legal_*` /
  `ce_payment_arrangements` tables via the hooks in `src/hooks/legal/`.
  No mock imports.
- **Permissions**: all mutating buttons are gated by `useLgAccess()` and the
  central capability matrix (see `permission-matrix.md`).
- **Audit**: every state-changing action writes to `lg_case_activity` via
  `lgAuditService.logLgActivity()`.
- **Loading / error / empty**: sub-tabs use `LgDataGrid`, which already
  renders skeleton, error and empty states from React-Query.
- **Workflow**: central `WorkflowActionButtons` mounts in the header for the
  active workflow instance governing the case.

## Legacy screens covered by the workspace

`LegalCaseView`, `SSBCaseView`, `CaseView`, `CaseDetailView`,
`CaseEditView`. Retirement waves in `route-retirement-plan.md`.
