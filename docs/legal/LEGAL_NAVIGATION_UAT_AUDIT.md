# Legal Navigation & UAT Cleanup Audit

**Scope:** Post EPIC-02 → EPIC-07 sidebar audit.
**Rule:** No files or DB rows deleted. Duplicates hidden via
`app_modules.show_in_menu = false`; legacy routes continue to redirect.

## Final Menu Hierarchy

```
Legal Enforcement
├── Command Centre
│   └── Legal Dashboard              /legal/lg/dashboard
├── My Work
│   ├── My Tasks                     /legal/lg/tasks?view=my
│   └── Team Queue                   /legal/lg/tasks?view=team
├── Recovery Workbench
│   └── Recovery Workbench           /legal/lg/recovery
├── Referrals
│   ├── Referral Queue               /legal/referrals-workbench
│   ├── Referral from Compliance     /compliance/legal-referral/launcher
│   ├── Referral from Benefits       /bn/legal-referral/launcher
│   ├── Intake & Qualification       /legal/lg/intake
│   └── Supervisor Review            /legal/lg/intake?preset=supervisor_review
├── Cases
│   ├── Legal Matters                /legal/lg/cases
│   └── New Matter                   /legal/lg/cases/new
├── Legal Recovery
│   ├── Legal Recovery Dashboard     /legal/lg/legal-recovery-dashboard
│   ├── Legal Recovery Assignments   /legal/lg/recovery-assignments
│   ├── My Legal Recoveries          /legal/lg/recovery-assignments?view=my
│   ├── Team Legal Recoveries        /legal/lg/recovery-assignments?view=team
│   ├── Recovery Campaigns           /legal/lg/recovery-campaigns
│   ├── Judgment Compliance          /legal/lg/judgment-compliance
│   ├── Consent Orders               /legal/lg/consent-orders
│   ├── Legal Settlements            /legal/lg/settlements
│   ├── Court Filings                /legal/lg/court-filings
│   ├── External Counsel             /legal/lg/external-counsel
│   ├── Legal Cost Recovery          /legal/lg/cost-recovery
│   └── Recovery Admin (sub-group)
├── Court Operations                 (renamed from Hearings)
│   ├── Hearing Workbench            /legal/lg/hearing-workbench
│   └── Hearing Calendar             /legal/lg/hearings
├── Judicial Orders & Judgments      (renamed from Orders & Judgments)
│   └── Court Orders                 /legal/lg/orders  (was /legal/court-orders)
├── Documents & Notices
│   ├── Document Centre              /legal/documents
│   ├── Legal Notices                /legal/notices
│   └── Legal References             /legal/admin/legal-references
├── Advisory & Contract Review
│   ├── Services Hub                 /legal/services
│   └── Advice & Contract Reviews    (7-item workbench sub-tree)
├── Analytics
│   └── Legal Reports                /legal/reports
└── Administration                   /legal/admin  (unchanged sub-tree)
```

## Menu Entries Removed (hidden — rows retained)

| # | Entry                       | Legacy route              | Reason                                          |
|---|-----------------------------|---------------------------|-------------------------------------------------|
| 1 | Recovery Actions            | /legal/enforcement        | Superseded by Legal Recovery Assignments + Judicial Orders |
| 2 | Payment Arrangements        | /legal/payment-plans      | Superseded by Legal Settlements                 |
| 3 | Settlements (section shell) | —                         | Only child hidden                               |
| 4 | Recovery & Payments (shell) | —                         | Only child hidden                               |
| 5 | Tasks & SLA → My Tasks      | /legal/lg/tasks           | Duplicate of My Work → My Tasks                 |
| 6 | Tasks & SLA (section shell) | —                         | Only child hidden                               |

Previously hidden (unchanged this pass): `Legal Workbench`, legacy `Dashboard`
shell, legacy `Workbench` shell, legacy `Legal Services` shell, legacy
`Recovery & Enforcement` shell, legacy `Litigation` shell, `Knowledge &
Documents` shell, all `Detailed Reports` legacy report children,
Case Tracking, Case Intake.

## Routes Verified (canonical, visible in menu)

`/legal/lg/dashboard`, `/legal/lg/tasks`, `/legal/lg/recovery`,
`/legal/referrals-workbench`, `/legal/lg/intake`, `/legal/lg/cases`,
`/legal/lg/cases/new`, `/legal/lg/legal-recovery-dashboard`,
`/legal/lg/recovery-assignments`, `/legal/lg/recovery-campaigns`,
`/legal/lg/judgment-compliance`, `/legal/lg/consent-orders`,
`/legal/lg/settlements`, `/legal/lg/court-filings`,
`/legal/lg/external-counsel`, `/legal/lg/cost-recovery`,
`/legal/lg/hearings`, `/legal/lg/hearing-workbench`, `/legal/lg/orders`,
`/legal/documents`, `/legal/notices`, `/legal/admin/legal-references`,
`/legal/services`, `/legal/contract-review/*`, `/legal/advice/workbench/*`,
`/legal/reports`, `/legal/admin` and its sub-tree.

Each verified for: route registered in `AppRoutes.tsx`, wrapped by
`LegalRouteGuard`, page-level `useLgAccess` gate present, no hardcoded
mock data, empty-state and error-state components rendered.

## Broken Routes Fixed

- **Court Orders menu entry** previously pointed at legacy
  `/legal/court-orders` (soft-redirect stub, `LegalOrderRegistry`). Now
  points at canonical `/legal/lg/orders` (`LgJudicialOrdersWorkbench`).
  Legacy path remains registered and still redirects.

## Duplicate Routes Hidden

See "Menu Entries Removed" table above. All 6 legacy nav entries are now
`show_in_menu = false`; routes remain live for deep links.

## Permission Issues Fixed

None found. Spot-checks:
- `LG_ADMIN` role passes `useLgAccess().can(...)` for every capability
  through the role→capability map in `src/hooks/legal/useLgAccess.ts`.
- Platform System Admin inherits via the same role-mapping fallback used
  by `useLegalCapability`.
- `LG_READ_ONLY` receives `view` on every operational route and `false`
  on every mutating capability — verified across new Legal Recovery
  workbenches (Judgment Compliance, Consent Orders, Settlements, Court
  Filings, External Counsel, Cost Recovery).

## Remaining Gaps

1. **Recoverable Liabilities workbench** — foundational service
   (`lgLiabilityService.ts`, EPIC-06A.2) exists but no standalone
   portfolio workbench page is registered. Liabilities are surfaced only
   as child drawers inside Recovery Workbench, Matter Workspace and
   Court Operations. Adding a dedicated `/legal/lg/liabilities` page is
   deferred to a follow-up epic.
2. **Legacy `LegalUnifiedWorkbench`** and other retired pages listed in
   `docs/legal/route-retirement-plan.md` still exist as files. They are
   not linked from any live menu entry; deletion happens in Wave 8 of
   that plan once every importer is removed.

## Typecheck Result

`tsgo` (project typechecker) — clean, no new errors introduced.

## Acceptance Checklist

- [x] Every visible Legal menu item opens cleanly.
- [x] No duplicate legacy menu items visible.
- [x] Detail/workspace `:id` routes hidden from menu.
- [x] Legacy routes redirect safely (`/legal/court-orders`,
      `/legal/case-detail/:id`, `/legal/reports/*` stubs).
- [x] Admin has full access (role-mapping inheritance).
- [x] Typecheck clean.
