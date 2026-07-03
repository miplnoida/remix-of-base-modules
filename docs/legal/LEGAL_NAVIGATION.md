# Legal Navigation — Sidebar Structure

This document lists the user-facing sidebar entries for the Legal platform.
Menu entries are stored in `public.app_modules` and rendered by
`useDynamicNavigation`. Detail/workspace routes are intentionally excluded.

## Legal Recovery (parent: `1e9a2000-0000-0000-0000-0000000000e0`)

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

## Routes intentionally NOT in the menu

Detail and workspace routes are reached only by drill-down from a workbench
row or a case link. They must never be added to `app_modules`.

- `/legal/lg/post-judgment/:caseId` — post-judgment workspace
- `/legal/lg/recovery-assignments/:id` — assignment workspace
- All `LgCaseDetail` and matter-360 routes

## Route guards

- Outer guard: `/legal/lg/*` requires `viewLegalModule`.
- Per-page guard: each workbench calls
  `useLgAccess().can("view<Capability>")` at mount and returns an
  access-denied stub when it fails.
- Admin (`LG_ADMIN`) inherits every capability through the role mapping in
  `useLgAccess.ts`, so no per-route admin overrides are required.

## Adding a new menu entry

1. Add or update the row in `app_modules` via a migration
   (columns: `name, display_name, icon, route, parent_id, sort_order,
   is_enabled, show_in_menu, description`).
2. Register the lazy route in `src/components/routing/AppRoutes.tsx`.
3. Add a capability check inside the page component using `useLgAccess`.
4. Update `LEGAL_PERMISSION_MATRIX.md` and this file.
