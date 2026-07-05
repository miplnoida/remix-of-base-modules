# BN Route and Menu Consolidation Plan

_Status: Documentation only — no code, route, menu, schema, or database changes in this turn._
_Prepared: 2026-07-05_
_Source evidence: `src/components/routing/AppRoutes.tsx`, `src/components/sidebar/menuItems/{bn,benefits,nbenefit,newBenefit}MenuItems.ts`, `src/pages/{bn,nbenefit,newBenefit}/*`, `docs/bn/route_acceptance_sweep.md`, `docs/enterprise/PHASE_0_2_PRIORITY_CLEANUP_PLAN.md`._

---

## 1. Canonical decision

| Namespace | Status | Owner |
|-----------|--------|-------|
| `/bn/*` | **CANONICAL** — single Benefits module | BN squad |
| `/benefits/*` | **LEGACY — redirect only** (already 7 `<Navigate>` shims in `AppRoutes.tsx` L1747–1753) | Retire after one release |
| `/nbenefit/*` | **LEGACY — parallel iteration** (~20 active routes, ~495-line menu file still registered) | Migrate + retire after one release |
| `/newbenefit/*` (menu file: `newBenefitMenuItems.ts`, routes at L2295–2313) | **LEGACY — contributor/portal iteration** | Migrate contributor pages to portals, retire staff pages |

A module is "active independent" if it appears in `sidebarMenuItems.ts` OR renders its own screen (not a `<Navigate>`). Under this plan only `/bn/*` remains active independent.

---

## 2. Current route inventory (evidence)

`rg "path=\"/(bn|nbenefit|newBenefit|newbenefit|benefits)" src/components/routing/AppRoutes.tsx | wc -l` → **150** benefits-related registrations.

Breakdown:

| Namespace | Registered | Redirects already in place | Live pages |
|-----------|-----------:|---------------------------:|-----------:|
| `/bn/*` | ~110 | 2 (L2175, L2362-alt) | ~108 |
| `/nbenefit/*` | 22 (L1914, 2176, 2412–2447) | 3 (L2176, 2441, 2445) | 19 |
| `/newbenefit/*` | 19 (L2295–2313) | 0 | 19 |
| `/benefits/*` | 8 (L1747–1753, 1925) | 7 | 1 (`/benefits/templates`) |

Full BN canonical route matrix is already documented in `docs/bn/route_acceptance_sweep.md` (30/30 menu resolve, 0 duplicates within `/bn/*`).

---

## 3. Current menu inventory

| Menu file | Lines | Points at | Recommended action |
|-----------|------:|-----------|--------------------|
| `bnMenuItems.ts` | 408 | `/bn/*` only | **Keep** — canonical |
| `benefitsMenuItems.ts` | 95 | Mostly `/bn/*` via query filters + `/admin/notification-templates` | **Retire** — content duplicates `bnMenuItems`; entries can be folded into `bnMenuItems` if any label is missing |
| `nbenefitMenuItems.ts` | 495 | `/nbenefit/short-term/*`, `/nbenefit/long-term/*`, `/nbenefit/non-contributory/*`, `/nbenefit/shared/*`, `/nbenefit/config/*` | **Retire after one release**; only survivors-rules and life-certificate config remain unique — migrate to `/bn/config/*` first |
| `newBenefitMenuItems.ts` | 141 | `/newbenefit/*` (worklists, intake, medical-board, employer-hub, pension-admin, payments, communications, admin, auditor) plus `/nbenefit/config/survivors/*` sub-items | **Retire** — staff functions duplicate `/bn/*`; contributor functions belong in `src/portals/*`, not the internal sidebar |
| `sidebarMenuItems.ts` composition | — | Currently only imports `bnMenuItems` (see file L1–14). `benefitsMenuItems`, `nbenefitMenuItems`, `newBenefitMenuItems` are **not** wired into the active sidebar. | **Confirm & document** — files exist but are orphaned in the sidebar; still referenced by ad-hoc menus / role packs (investigate before deletion) |

> **Investigate**: `rg "nbenefitMenuItems|newBenefitMenuItems|benefitsMenuItems" src/` before the retirement release to catch any lazy import outside `sidebarMenuItems.ts`.

---

## 4. Page-by-page canonical mapping

### 4.1 `/benefits/*` → `/bn/*`  (already redirected — **Keep redirects**, retire after one release)

| Legacy | Canonical | Action | Risk |
|--------|-----------|--------|------|
| `/benefits/all` | `/bn/claims` | Keep redirect (L1747) | Low |
| `/benefits/online-applications` | `/bn/queue` | Keep redirect | Low |
| `/benefits/maternity` | `/bn/claims?type=maternity` | Keep redirect | Low |
| `/benefits/unemployment` | `/bn/claims?type=unemployment` | Keep redirect | Low |
| `/benefits/work-injury` | `/bn/claims?type=work-injury` | Keep redirect | Low |
| `/benefits/death` | `/bn/claims?type=death` | Keep redirect | Low |
| `/benefits/educational` | `/bn/claims?type=educational` | Keep redirect | Low |
| `/benefits/templates` | `/admin/notification-templates?tab=core&module=BENEFITS` | **Add redirect** (currently renders `ModuleTemplates` directly, L1925) | Low |

### 4.2 `/nbenefit/*` → `/bn/*`

| Legacy | Canonical target | Action | Risk | Notes |
|--------|------------------|--------|------|-------|
| `/nbenefit/application/:benefitType` | `/bn/intake/register?benefitType=:benefitType` | **Redirect** | Med | Verify BN intake accepts the type param before switching |
| `/nbenefit/claim-approval` | `/bn/approval` | **Redirect** | Low | `ClaimApprovalEnhanced` superseded by `BnApprovalConsole` |
| `/nbenefit/config/rules` | `/bn/config/rules` | **Redirect** | Low | Both editors registered under `/bn/config/rules(-admin)` |
| `/nbenefit/config/rules/:id`, `.../edit` | `/bn/config/rules/:id` | **Redirect** | Low | |
| `/nbenefit/config/medical-rules` | `/bn/config/medical` | Keep redirect (L2441) | Low | |
| `/nbenefit/config/life-certificate-config` | `/bn/life-certificates` (config tab) | **Merge** — move config into `BnLifeCertificateManagement` settings tab | Med | Unique screen today |
| `/nbenefit/short-term/sickness/*` | `/bn/claims?type=sickness` (list) + `/bn/claims/:id` (detail) | **Investigate** then Merge | High | Sub-router contains bespoke sickness screens; confirm parity with BN determination/eligibility/calculation tabs before folding |
| `/nbenefit/short-term/employment-injury/*` | `/bn/claims?type=work-injury` | Investigate → Merge | High | Same as above |
| `/nbenefit/short-term/maternity/*` | `/bn/claims?type=maternity` | Investigate → Merge | High | |
| `/nbenefit/short-term/funeral-grant/*` | `/bn/claims?type=funeral-grant` | Investigate → Merge | High | |
| `/nbenefit/long-term/age-benefit/*` | `/bn/awards` (+ product filter) | Investigate → Merge | High | |
| `/nbenefit/long-term/invalidity/*` | `/bn/awards?product=invalidity` | Investigate → Merge | High | |
| `/nbenefit/long-term/assistance/*` | `/bn/awards?product=assistance` | Investigate → Merge | High | |
| `/nbenefit/long-term/survivors/*` | `/bn/survivors` | Investigate → Merge | High | Confirm functional overlap with `BnSurvivorsBenefitProcessing` |
| `/nbenefit/long-term/registry` | `/bn/awards` (Pensioner Register) | **Redirect** | Low | |
| `/nbenefit/long-term/beneficiary/:id` | `/bn/awards/:id` | **Redirect** | Med | Verify param compatibility |
| `/nbenefit/long-term/life-certificates` | `/bn/life-certificates` | **Redirect** | Low | |
| `/nbenefit/non-contributory/assistance-pension/*` | `/bn/awards?product=assistance-pension` | Investigate → Merge | High | Non-contributory flow — confirm BN product exists |
| `/nbenefit/non-contributory/invalidity-assistance/*` | `/bn/awards?product=invalidity-assistance` | Investigate → Merge | High | |
| `/nbenefit/shared/common-eligibility-rules` | `/bn/config/rules` | **Redirect** | Low | |
| `/nbenefit/shared/calculation-engines` | `/bn/engine` | **Redirect** | Low | |
| `/nbenefit/shared/workflows` | `/bn/config/workbaskets` (or workflow admin) | **Investigate** | Med | Confirm scope before mapping |
| `/nbenefit/shared/registry-search` | `/bn/person-360` | **Redirect** | Low | |
| `/nbenefit/shared/document-templates` | Keep existing redirects (L2176, L2445) | Keep | Low | |

### 4.3 `/newbenefit/*` (contributor + staff hybrid)

| Legacy | Canonical target | Action | Risk |
|--------|------------------|--------|------|
| `/newbenefit/dashboard` | `src/portals/contributor/*` (Portal Hub) | **Migrate** to portals | Med |
| `/newbenefit/apply`, `/newbenefit/apply/:benefitType` | Contributor portal apply-for-benefits | Migrate | Med |
| `/newbenefit/my-claims`, `/inbox`, `/reports` | Contributor portal | Migrate | Med |
| `/newbenefit/new-referral`, `/new-verification`, `/verification/:id` | Employer portal (`src/portals/employer/*`) | Migrate | Med |
| `/newbenefit/worklists` | `/bn/worklist` | **Redirect** | Low |
| `/newbenefit/claim-360/:claimId` | `/bn/claims/:id` | **Redirect** | Low |
| `/newbenefit/intake` | `/bn/intake/register` | **Redirect** | Low |
| `/newbenefit/medical-board` | `/bn/medical-reviews` | **Redirect** (verify parity) | Med |
| `/newbenefit/employer-hub` | Employer portal | Migrate | Med |
| `/newbenefit/pension-admin` | `/bn/awards` | **Redirect** | Low |
| `/newbenefit/payments` | `/bn/payables` | **Redirect** | Low |
| `/newbenefit/communications` | `/admin/notification-templates?module=BENEFITS` | **Redirect** | Low |
| `/newbenefit/admin` | `/bn/config/products` (or Platform Admin) | **Investigate** | Med |
| `/newbenefit/auditor` | `/bn/audit-history` | **Redirect** | Low |

---

## 5. Duplicate pages (candidates for retire-after-merge)

| Legacy page | Canonical page |
|-------------|----------------|
| `src/pages/nbenefit/ClaimApproval.tsx`, `ClaimApprovalEnhanced.tsx` | `src/pages/bn/approval/BnApprovalConsole.tsx` |
| `src/pages/nbenefit/BenefitApplicationFormPage.tsx` | `src/pages/bn/intake/BnClaimRegistration.tsx` |
| `src/pages/nbenefit/shared/CalculationEngines.tsx` | `src/pages/bn/engine/BnCalculationEngine.tsx` |
| `src/pages/nbenefit/shared/CommonEligibilityRules.tsx` | `src/pages/bn/config/**` rules editor |
| `src/pages/nbenefit/shared/RegistrySearch.tsx` | `src/pages/bn/person360/BnPerson360.tsx` |
| `src/pages/nbenefit/long-term/LifeCertificateManagement.tsx` | `src/pages/bn/servicing/BnLifeCertificateManagement.tsx` |
| `src/pages/nbenefit/long-term/BeneficiaryRegistry.tsx` | `src/pages/bn/awards/BnPensionerRegister.tsx` |
| `src/pages/nbenefit/long-term/SurvivorsBenefit.tsx` | `src/pages/bn/awards/BnSurvivorsBenefitProcessing.tsx` |
| `src/pages/newBenefit/WorklistsHome.tsx` | `src/pages/bn/workbench/BnClaimWorklistEnhanced.tsx` |
| `src/pages/newBenefit/Claim360View.tsx` | `src/pages/bn/claims/BnClaimWorkbench.tsx` |
| `src/pages/newBenefit/IntakeConsole.tsx` | `src/pages/bn/intake/BnClaimRegistration.tsx` |
| `src/pages/newBenefit/PaymentsModule.tsx` | `src/pages/bn/payables/BnPayablesQueue.tsx` |
| `src/pages/newBenefit/PensionAdministration.tsx` | `src/pages/bn/awards/BnPensionerRegister.tsx` |
| `src/pages/newBenefit/LettersCommunications.tsx` | `/admin/notification-templates` |
| `src/pages/newBenefit/AuditorView.tsx` | `src/pages/bn/BnAuditDecisionHistory.tsx` |

---

## 6. Pages with unique functionality — **Investigate before retire**

| Page | Unique behaviour | Migration recommendation |
|------|------------------|--------------------------|
| `src/pages/nbenefit/config/LifeCertificateConfig.tsx` | Config UI for life-cert cadence/rules | Add "Config" tab to `BnLifeCertificateManagement` |
| `src/pages/nbenefit/config/MedicalRulesConfig.tsx` | Medical rules editor | Confirm coverage inside `/bn/config/medical/*`, else port missing fields |
| `src/pages/nbenefit/config/survivors/*` (deceased-eligibility, dependant-types, duration-rules, share-allocation, case-cap, ongoing-eligibility) | Survivors' rules editors — bespoke | Port to `/bn/config/survivors/*` as new sub-routes under BN config rules gate |
| `src/pages/nbenefit/short-term/*`, `long-term/*`, `non-contributory/*` | Per-product wizard flows with sub-routers | Confirm functional parity in `BnClaimWorkbench` + product bindings before merging |
| `src/pages/nbenefit/shared/BenefitWorkflows.tsx` | Benefits-specific workflow admin | Fold into `/bn/config/workbaskets` or Platform Workflow admin |
| `src/pages/newBenefit/EmployerHub.tsx`, `EmploymentVerificationDetail.tsx` | Employer-facing | Migrate to `src/portals/employer/*` |
| `src/pages/newBenefit/ContributorDashboard.tsx`, `MyClaims.tsx`, `ContributorInbox.tsx`, `ContributorReports.tsx`, `ApplyForBenefits.tsx`, `BenefitApplicationForm.tsx` | Contributor-facing | Migrate to `src/portals/contributor/*` |
| `src/pages/newBenefit/MedicalBoardHub.tsx` | Medical board scheduling hub | Compare with `BnMedicalReviewScheduler` — may need feature bridge |

---

## 7. Recommended redirects (SPA `<Navigate replace>`)

Priority order for the implementation prompt:

1. **P0 (safe, no functional gap)** — 1:1 redirects listed in §4.2 rows marked "Redirect" (low risk) and §4.3 rows marked "Redirect" (low risk). Adds ~18 shims.
2. **P0** — Convert `/benefits/templates` (L1925) from live render to redirect.
3. **P1** — Redirects that require query-param mapping (medium risk): `/nbenefit/application/:benefitType`, `/nbenefit/long-term/beneficiary/:id`, `/newbenefit/medical-board`, `/newbenefit/admin`. Ship after parity check.
4. **P2** — After merges land, replace the still-rendered `nbenefit/short-term/*`, `long-term/*`, `non-contributory/*` sub-routers with parameterised `/bn/claims` or `/bn/awards` redirects.
5. **P2** — After portal migration lands, replace contributor/employer `newbenefit/*` routes with `<Navigate>` shims pointing to the portal URLs.

---

## 8. Menu retirement plan

| Menu file | Step 1 (this release) | Step 2 (next release) | Step 3 |
|-----------|-----------------------|-----------------------|--------|
| `benefitsMenuItems.ts` | Confirm not imported anywhere active | Delete file | — |
| `newBenefitMenuItems.ts` | Confirm not imported into internal sidebar; leave for portal reuse if needed | Move portal-relevant entries into `src/portals/*` menus, delete internal copy | — |
| `nbenefitMenuItems.ts` | Add deprecation banner in file header comment | After §4.2 redirects/merges land, delete | — |
| `bnMenuItems.ts` | Absorb any unique labels from the retired files | Keep as sole benefits menu | — |

---

## 9. One-release safe retirement plan

For every legacy route:

1. **Release N (this plan)** — publish this document. No code changes.
2. **Release N+1 (implementation)** — add `<Navigate replace>` shim from legacy path to canonical. Keep the legacy page component file on disk. Add a console `deprecation` warn in the legacy component if it renders anywhere.
3. **Release N+2** — after one full release cycle with redirects live, delete the legacy component files, delete the legacy menu file, and remove the `<Navigate>` shims that no longer receive traffic (verify via analytics / server logs).

No file may be deleted before the redirect has shipped for at least one full release.

---

## 10. Risk register

| Change class | Risk | Mitigation |
|--------------|------|-----------|
| Query-param remaps (`?type=…`) | Medium — canonical page may not read the param | Confirm `BnClaimWorklist` param handling before shipping |
| Sub-router → single canonical page (short-term/long-term wizards) | High — bespoke steps may be missing | Merge feature-by-feature, gated by `bn.claims.workbench` |
| Contributor/employer `/newbenefit/*` → portals | Medium — auth surface differs | Migrate under `src/portals/*` first, redirect only after portal route exists |
| Deleting legacy menu file still imported elsewhere | Medium | `rg` for every menu identifier before deletion (see §3 investigate note) |
| Feature-flag drift | Low — canonical routes are already gated by `BnFeatureGate` | No change needed |

---

## 11. Acceptance criteria (for the later implementation prompt)

The implementation release is complete when:

1. `/bn/*` is the only Benefits namespace registered as an active independent module in `AppRoutes.tsx`.
2. Every legacy path listed in §4 either renders `<Navigate to="/bn/... " replace />` or is deleted per §9.
3. `sidebarMenuItems.ts` imports only `bnMenuItems.ts` for Benefits (verified by `rg`).
4. `benefitsMenuItems.ts`, `nbenefitMenuItems.ts`, `newBenefitMenuItems.ts` are either deleted or have a `@deprecated` file header and are unreferenced by active code.
5. `docs/bn/route_acceptance_sweep.md` still shows 30/30 menu → route resolution with zero duplicates.
6. No functional regression in claims, awards, payments, servicing, or config surfaces (spot-check the canonical BN pages after each redirect batch).
7. Unique-functionality items from §6 have either been ported to `/bn/*` (or `src/portals/*`) or explicitly re-classified as **Investigate deferred** in a follow-up backlog entry.
8. Portal migrations for contributor/employer `newbenefit/*` pages land in `src/portals/*` before the corresponding redirects are added.

---

## 12. Legend

- **Keep** — canonical, no change.
- **Redirect** — replace registration with `<Navigate replace>` to canonical.
- **Merge** — fold unique behaviour into canonical page/component, then redirect.
- **Retire after one release** — keep redirect live for one release cycle, then delete.
- **Investigate** — behaviour or dependency not yet confirmed; requires spike before action.
