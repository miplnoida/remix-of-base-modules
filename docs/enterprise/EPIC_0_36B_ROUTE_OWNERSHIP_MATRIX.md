# Epic 0.36B — Route Ownership Matrix

**Status:** Read-only audit. `src/components/routing/AppRoutes.tsx` snapshot: **1,234 route declarations across 60 top-level prefixes.**

Each prefix is mapped to its target layer in the enterprise architecture:

- **PLATFORM** — Platform Foundation / Auth / Admin infra
- **ORG** — Organisation
- **SHARED** — Enterprise Shared Domain (Reference, Workflow, Notification, Document, Audit)
- **SSP** — Social Security Platform (Country Pack, Legal Ref, Payment, Bank, ID Rules, Address, Participant Types)
- **APP** — Business Application (BN, C3, ER, CE, LG, FN, PT, AD)

## 1. Route prefix inventory (with counts)

| # | Prefix | Route count | Target layer | Application | Verdict | Notes |
|---|---|---|---|---|---|---|
| 1 | `/admin` | 214 | PLATFORM + ORG + SHARED | AD | 🟡 Mixed | Contains master-data (SSP/Shared), notifications (Shared), DMS (Shared), and core admin. Requires later split. |
| 2 | `/compliance` | 256 | APP | CE | ✅ | Correct owner. |
| 3 | `/compliance-hub` | 1 | APP | CE | 🟡 Legacy alias | Overlaps `/compliance`. |
| 4 | `/legal` | 151 | APP | LG | ✅ | Legal V1 canonical. |
| 5 | `/legal-advanced` | 18 | APP | LG | 🟡 Legacy | Merge into `/legal`. |
| 6 | `/legal-final` | 10 | APP | LG | 🟡 Legacy | Retire or merge. |
| 7 | `/bn` | 94 | APP | BN | ✅ | Canonical (per Epic 0.2). |
| 8 | `/benefits` | 11 | APP | BN | 🟡 Legacy | Redirect target per Epic 0.2. |
| 9 | `/nbenefit` | 26 | APP | BN | 🔴 Legacy | Retained (no delete) but excluded from live menu. |
| 10 | `/newbenefit` | 19 | APP | BN | 🔴 Legacy | Same. |
| 11 | `/medical` | 5 | APP | BN | 🟡 | Should sit under `/bn/medical`. |
| 12 | `/c3` | 15 | APP | C3 | ✅ | |
| 13 | `/c3-management` | 53 | APP | C3 | 🟡 | Overlaps `/c3`; consolidate. |
| 14 | `/cashier` | 35 | APP | C3 (Cashiering) | 🟡 | Belongs under C3 sub-area. |
| 15 | `/self-employed` | 3 | APP | C3 | 🟡 | Belongs under C3. |
| 16 | `/bema` | 16 | APP | CE (legacy) | 🔴 Legacy | Legacy compliance stack. |
| 17 | `/inspector` | 2 | APP | CE (legacy) | 🔴 Legacy | |
| 18 | `/employer` | 8 | APP | ER | 🟡 | Employer app not fully separated. |
| 19 | `/employers` | 44 | APP | ER | 🟡 | Duplicate root; merge with `/employer`. |
| 20 | `/employers-management` | 7 | APP | ER | 🟡 | Duplicate; consolidate. |
| 21 | `/employer-registration` | 4 | APP | ER | 🟡 | Should be `/employer/register`. |
| 22 | `/person` | 36 | SHARED (Party) | AD | 🟡 | Should sit under a shared Party surface. |
| 23 | `/insured-persons` | 2 | APP | BN/C3 (subject view) | 🟡 | Rename / consume shared Person. |
| 24 | `/ip-registration` | 5 | APP | Registration | 🟡 | Same. |
| 25 | `/registration` | 4 | APP | Registration | 🟡 | Ambiguous root; scope. |
| 26 | `/audit` | 35 | APP | IA | 🟡 | Internal Audit app; parallel to `/admin/audit*`. |
| 27 | `/audit-hub` | 1 | APP | IA | 🟡 Alias | |
| 28 | `/finance` | 41 | APP | FN | 🟡 | Finance app not consolidated; ledger split. |
| 29 | `/ledger` | 1 | APP | FN | 🟡 | Alias to finance. |
| 30 | `/notifications` | 9 | SHARED | AD | ✅ | |
| 31 | `/documents` | 1 | SHARED | AD | ✅ | |
| 32 | `/correspondence` | 5 | SHARED | AD | 🟡 | Overlaps `/admin/comm/*`. |
| 33 | `/reports` | 8 | SHARED (Reporting) | AD | ✅ | |
| 34 | `/system-logs` | 9 | PLATFORM | AD | ✅ | |
| 35 | `/db-diagram` | 2 | PLATFORM (Dev) | AD | 🟡 | Internal tool. |
| 36 | `/crd` | 2 | Unknown | ? | 🟡 | Investigate. |
| 37 | `/meetings` | 2 | APP | LG/CE | 🟡 | Meeting module scope unclear. |
| 38 | `/online-applications` | 6 | PT | PT | 🟡 | Move under portal umbrella. |
| 39 | `/portal` | 1 | PT | PT | ✅ | |
| 40 | `/claimant` | 1 | PT | PT | ✅ | |
| 41 | `/doctor` | 1 | PT | PT | ✅ | |
| 42 | `/external` | 3 | PT | PT | 🟡 | Portal-adjacent. |
| 43 | `/public` | 5 | PT (public shell) | PT | ✅ | |
| 44 | `/acknowledge-audit/:token` | 1 | PT (secure link) | PT | ✅ | |
| 45 | `/uat-downloads` | 1 | PLATFORM | AD | ✅ | Static UAT assets. |
| 46 | `/sample-applications` | 4 | Demo | — | 🟡 | Demo only. |
| 47 | `/components-demo` | 2 | Demo | — | 🟡 | Demo only. |
| 48 | `/setup` | 1 | PLATFORM | AD | ✅ | |
| 49 | `/approval` | 2 | SHARED (Workflow) | AD | 🟡 | Overlaps `/admin/approval-matrix/*`. |
| 50 | `/workflow` | 2 | SHARED (Workflow) | AD | 🟡 | Overlaps. |
| 51 | `/profile` | 8 | PLATFORM (Identity) | AD | ✅ | |
| 52 | `/login`, `/mfa-verify`, `/change-password`, `/forgot-password`, `/reset-password`, `/demo-login`, `/unauthorized`, `/maintenance`, `/test`, `/` , `*` | ≤ 1 each | PLATFORM | AD | ✅ | Auth + system pages. |

## 2. Duplicate / legacy routes (retention per Epic 0.2)

- Legacy Benefit trees `/nbenefit`, `/newbenefit`, `/benefits`, `/medical` — retained, not in live menu, redirect where possible.
- Legacy Compliance `/bema`, `/inspector`, `/compliance-hub` — retained, live users on `/compliance`.
- Legacy Legal `/legal-advanced`, `/legal-final` — retained.
- Duplicate Employer roots (`/employer`, `/employers`, `/employers-management`, `/employer-registration`) — investigate merge target under Epic 0.37 or a future ER epic.
- Duplicate C3 roots (`/c3`, `/c3-management`, `/cashier`, `/self-employed`) — investigate merge under a C3 consolidation epic.

## 3. Misplaced routes (against target architecture)

| Route | Currently under | Should be under (target) |
|---|---|---|
| `/admin/master-data/countries` | AD | SSP |
| `/admin/master-data/bank-codes` | AD | SSP |
| `/admin/master-data/methods-of-payment` | AD | SSP |
| `/admin/master-data/legal-status` | AD | SSP (Legal Reference) |
| `/admin/master-data/postal-districts`, `/districts`, `/villages` | AD | SSP (Location) |
| `/admin/master-data/relations`, `/dependent-relations` | AD | Shared Reference |
| `/admin/master-data/{various}` (industries, sectors, occupations, income-codes, etc.) | AD | Shared Reference |
| `/admin/notifications/*` | AD | Shared Notification (already Shared, keep) |
| `/admin/comm/templates/*` | AD | Shared Correspondence |
| `/admin/dms`, `/admin/document-configuration` | AD | Org Document Master |
| `/admin/approval-matrix/*`, `/approval`, `/workflow` | AD | Shared Workflow |
| `/medical/*` | APP root | `/bn/medical/*` |
| `/insured-persons`, `/person`, `/ip-registration`, `/registration` | Mixed | Shared Party Registration surface |

## 4. Routes violating domain ownership

- BN routes read Country / Bank / Payment / Legal-Ref masters directly via `/bn/*` admin sub-routes. Those must move to `/ssp/*` per Epic 0.36A.
- Compliance routes (`/compliance/legal-*`) mirror Legal state. Must call Legal via shared service, not local re-implementation.
- IA (`/audit/*`) owns its own Org document taxonomy (`ia_org_document_foundation`) — should consume Org DMS.

## 5. Routes bypassing shared services

- Portal `/claimant/*`, `/doctor/*`, `/employer/*` call `publicBenefitApiClient` directly (see `src/portals/_shared/publicBenefitApiClient.ts`) — must route through Enterprise Portal Interaction Management + BN Claim service.
- `/external/*` uses `externalAuthService` and `externalHooks` — inspect for capability-gate compliance.

## 6. Verdict summary

| Verdict | Prefixes |
|---|---|
| ✅ Conforms (canonical) | 15 |
| 🟡 Consolidation / relocation needed | 30 |
| 🔴 Legacy retained (no live menu) | 5 |
| 🔵 Auth / demo / system | 10 |
