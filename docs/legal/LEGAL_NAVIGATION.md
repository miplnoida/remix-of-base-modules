# Legal Navigation — Sidebar Structure

This document lists the user-facing sidebar entries for the Legal platform.
Menu entries are stored in `public.app_modules` and rendered by
`useDynamicNavigation`. Detail/workspace routes are intentionally excluded.

Last updated: post-EPIC-07 Navigation & UAT Cleanup Audit.

## Root: Legal Enforcement (`1e9a1000-0000-0000-0000-000000000001`)

| Sort | Section                        | Route / Notes                                  |
|-----:|--------------------------------|------------------------------------------------|
|   10 | Command Centre                 | Legal Dashboard → `/legal/lg/dashboard`        |
|   15 | My Work                        | My Tasks / Team Queue                          |
|   20 | Recovery Workbench             | `/legal/lg/recovery`                           |
|   30 | Referrals                      | Referral Queue, Compliance, Benefits, Intake   |
|   40 | Cases                          | Legal Matters, New Matter                      |
|   45 | Legal Recovery                 | Post-judgment portfolio (see below)            |
|   50 | Court Operations               | Hearing Workbench, Hearing Calendar            |
|   60 | Judicial Orders & Judgments    | Court Orders → `/legal/lg/orders`              |
|  100 | Documents & Notices            | Document Centre, Legal Notices, References     |
|  105 | Document Automation (EPIC-08)  | `/legal/lg/documents` (Legal Administration)   |
|  110 | Advisory & Contract Review     | Services Hub, Advice & Contract Reviews        |
|  120 | Analytics                      | Legal Reports (Explorer)                       |
|  130 | Administration                 | Admin Hub + sub-groups                         |

## Legal Recovery (parent `1e9a2000-0000-0000-0000-0000000000e0`)

| Sort | Display Name                | Route                                          | Required capability            |
|-----:|-----------------------------|------------------------------------------------|--------------------------------|
|    5 | Legal Recovery Dashboard    | `/legal/lg/legal-recovery-dashboard`           | `viewLegalRecoveryDashboard`   |
|   10 | Legal Recovery Assignments  | `/legal/lg/recovery-assignments`               | `viewRecoveryAssignment`       |
|   20 | My Legal Recoveries         | `/legal/lg/recovery-assignments?view=my`       | `viewRecoveryAssignment`       |
|   30 | Team Legal Recoveries       | `/legal/lg/recovery-assignments?view=team`     | `viewRecoveryAssignment`       |
|   40 | Recovery Campaigns          | `/legal/lg/recovery-campaigns`                 | `viewRecoveryCampaign`         |
|   50 | Judgment Compliance         | `/legal/lg/judgment-compliance`                | `viewJudgmentCompliance`       |
|   55 | Consent Orders              | `/legal/lg/consent-orders`                     | `viewConsentOrder`             |
|   60 | Legal Settlements           | `/legal/lg/settlements`                        | `viewLegalSettlement`          |
|   65 | Court Filings               | `/legal/lg/court-filings`                      | `viewCourtFiling`              |
|   70 | External Counsel            | `/legal/lg/external-counsel`                   | `viewExternalCounsel`          |
|   75 | Legal Cost Recovery         | `/legal/lg/cost-recovery`                      | `viewLegalCost`                |
|   90 | Recovery Admin              | *(sub-group)*                                  | admin only                     |

## Hidden in Nav Cleanup Audit (rows retained, `show_in_menu=false`)

| Legacy entry            | Reason hidden                                                | Canonical replacement                 |
|-------------------------|--------------------------------------------------------------|---------------------------------------|
| Recovery Actions (`/legal/enforcement`)      | Legacy enforcement page          | Legal Recovery Assignments + Judicial Orders |
| Payment Arrangements (`/legal/payment-plans`)| Legacy payment plans             | Legal Settlements                     |
| Settlements section shell                    | No visible children remained     | Legal Settlements (Legal Recovery)    |
| Recovery & Payments section shell            | No visible children remained     | Legal Recovery section                |
| Tasks & SLA → My Tasks (`/legal/lg/tasks`)   | Duplicate of My Work → My Tasks  | My Work → My Tasks / Team Queue       |
| Tasks & SLA section shell                    | Only child hidden                | My Work                               |

Routes remain registered and load normally when accessed directly.

## Routes intentionally NOT in the menu (detail/workspace)

Detail and workspace routes are reached only by drill-down from a workbench
row or a case link. They must never be added to `app_modules`.

- `/legal/lg/cases/:id` — matter workspace
- `/legal/lg/cases/:id/edit`
- `/legal/lg/orders/:id`
- `/legal/lg/intake/:id`
- `/legal/lg/hearings/:id`
- `/legal/lg/recovery-assignments/:id`
- `/legal/lg/post-judgment/:caseId`

## Route guards

- Outer guard: `/legal/*` and `/legal-advanced/*` are wrapped by
  `LegalRouteGuard`, which resolves the caller's `LegalCapability` and
  compares against `legalRouteCapabilities.ts`.
- `LG_ADMIN` (and platform System Admin) inherit every capability via
  `useLgAccess.ts`, so admin bypasses every per-page gate automatically.
- `LG_READ_ONLY` resolves to `view` for every operational route and to
  `false` for every mutation capability — mutation buttons are hidden by
  each screen's `useLgAccess().can(...)` gate.

## Renamed sections (Nav Cleanup Audit)

- Hearings → **Court Operations**
- Orders & Judgments → **Judicial Orders & Judgments**
- Court Orders entry repointed from legacy `/legal/court-orders` (still
  redirects) to the canonical `/legal/lg/orders`.

## Adding a new menu entry

1. Add or update the row in `app_modules` via a migration
   (columns: `name, display_name, icon, route, parent_id, sort_order,
   is_enabled, show_in_menu, description`).
2. Register the lazy route in `src/components/routing/AppRoutes.tsx`.
3. Add a capability check inside the page component using `useLgAccess`.
4. Update `LEGAL_PERMISSION_MATRIX.md` and this file.
