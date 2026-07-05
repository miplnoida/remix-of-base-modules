# Epic 0.36B — UI Implementation Matrix

**Status:** Read-only audit. 49 top-level page directories under `src/pages/`, plus `src/portals/`.

Classification per directory:

- **Domain** — target enterprise domain.
- **Ownership** — application that should own the pages.
- **Retention** — Keep / Consolidate / Legacy-retain (per Epic 0.2) / Retire (documented, none deleted by this epic).
- **Migration** — action recommended by the roadmap.

| # | Directory | Domain | Ownership | Retention | Migration |
|---|---|---|---|---|---|
| 1 | `admin/` | Platform + Org + Shared | AD | Keep | Split into Platform / Org / Shared / SSP sub-areas |
| 2 | `audit/` | Internal Audit | IA app | Keep | — |
| 3 | `auth/` | Identity | AD | Keep | — |
| 4 | `bema/` | CE legacy | CE | Legacy-retain | Excluded from live menu |
| 5 | `bn/` | Benefit | BN | Keep | Canonical (Epic 0.2) |
| 6 | `c3/` | Contribution | C3 | Keep | Consolidate with c3Management |
| 7 | `c3Management/` | Contribution | C3 | Consolidate | Merge into `c3/` |
| 8 | `cashier/` | Contribution | C3 (cashiering) | Keep | Move under `c3/cashier` in future |
| 9 | `compliance/` | Compliance | CE | Keep | Canonical |
| 10 | `correspondence/` | Shared Correspondence | AD | Consolidate | Overlaps `admin/comm/templates` |
| 11 | `crd/` | Unknown | ? | Investigate | Document owner |
| 12 | `dashboard/` | Cross-module | AD | Keep | — |
| 13 | `db-diagram/` | Platform (dev tool) | AD | Keep | — |
| 14 | `employer/` | Employer | ER | Consolidate | Merge with `employer-registration`, `employersManagement` |
| 15 | `employer-registration/` | Employer | ER | Consolidate | Merge into `employer/` |
| 16 | `employersManagement/` | Employer | ER | Consolidate | Merge into `employer/` |
| 17 | `external/` | Portal | PT | Keep | Route via portal shared surface |
| 18 | `finance/` | Finance | FN | Keep | Consolidate ledger fragments |
| 19 | `inspector/` | CE legacy | CE | Legacy-retain | |
| 20 | `insuredPersons/` | Person | Shared Party | Consolidate | Merge with `person/`, `ip-registration/`, `registration/` |
| 21 | `ip-registration/` | Person Registration | Shared Party | Consolidate | Merge |
| 22 | `legal/` | Legal | LG | Keep | Canonical (Legal V1) |
| 23 | `legal-advanced/` | Legal | LG | Legacy-retain | Merge into `legal/` in a legal consolidation epic |
| 24 | `legalFinal/` | Legal | LG | Legacy-retain | Same |
| 25 | `medical/` | Benefit (Medical) | BN | Consolidate | Move under `bn/medical` |
| 26 | `meetings/` | Cross-module | LG/CE | Investigate | Assign owner |
| 27 | `nbenefit/` | Benefit legacy | BN | Legacy-retain | Excluded from live menu |
| 28 | `newBenefit/` | Benefit legacy | BN | Legacy-retain | Same |
| 29 | `notifications/` | Shared Notification | AD | Keep | — |
| 30 | `online-applications/` | Portal | PT | Consolidate | Move under portal umbrella |
| 31 | `person/` | Person | Shared Party | Consolidate | Merge with `insuredPersons/`, `ip-registration/`, `registration/` |
| 32 | `profile/` | Identity | AD | Keep | — |
| 33 | `public/` | Portal (public shell) | PT | Keep | — |
| 34 | `registration/` | Person Registration | Shared Party | Consolidate | Merge |
| 35 | `reports/` | Reporting | AD | Keep | — |
| 36 | `sample-application/` | Demo | — | Retire (documented) | Not delivered to users |
| 37 | `selfEmployed/` | Contribution (self-emp) | C3 | Consolidate | Move under `c3/` |
| 38 | `setup/` | Platform | AD | Keep | — |
| 39 | `system-logs/` | Platform | AD | Keep | — |
| 40 | `systemAdmin/` | Platform | AD | Consolidate | Merge into `admin/` |
| 41 | `templates/` | Shared Correspondence | AD | Consolidate | Merge with `admin/comm/templates` |
| 42 | `test/` | Demo | — | Retire (documented) | |
| 43 | `users/` | Platform (RBAC UI) | AD | Consolidate | Merge into `admin/` |
| 44 | `workflow/` | Shared Workflow | AD | Consolidate | Merge with `admin/approval-matrix`, `admin/notifications` peers |
| 45 | `FoundationComponentsDemo.tsx` | Demo | — | Retire (documented) | |
| 46 | `IPBlocked.tsx` | Platform | AD | Keep | — |
| 47 | `Maintenance.tsx` | Platform | AD | Keep | — |
| 48 | `NotFound.tsx` | Platform | AD | Keep | — |
| 49 | `Unauthorized.tsx` | Platform | AD | Keep | — |

## Portals (`src/portals/*`)

| Path | Domain | Ownership | Verdict |
|---|---|---|---|
| `PortalHub.tsx`, `_shared/*` | Portal | PT | ✅ |
| `claimant/*` | Portal (Claimant) | PT | ✅ |
| `employer/EmployerLanding.tsx` | Portal (Employer) | PT | ✅ |
| `doctor/DoctorLanding.tsx` | Portal (Doctor) | PT | ✅ |
| `ExternalTaskLanding.tsx` | Portal | PT | ✅ |

Bypass concerns:

- `_shared/publicBenefitApiClient.ts` calls BN endpoints directly — should call through Enterprise Portal Interaction facade in a future portal epic.

## Retirement inventory (documented — none deleted)

- Demo pages: `FoundationComponentsDemo.tsx`, `sample-application/*`, `test/*`, `components-demo/*` route.
- Legacy Benefit trees: `nbenefit/`, `newBenefit/`, `medical/` (until merged), `benefits/` (route only).
- Legacy Compliance trees: `bema/`, `inspector/`, `compliance-hub` route.
- Legacy Legal trees: `legal-advanced/`, `legalFinal/`.
- Duplicate person/employer trees pending consolidation.

## Summary counts

| Verdict | Directories |
|---|---|
| ✅ Keep | 22 |
| 🟡 Consolidate | 14 |
| 🔴 Legacy-retain | 7 |
| ⚪ Retire (documented, not deleted) | 6 |
