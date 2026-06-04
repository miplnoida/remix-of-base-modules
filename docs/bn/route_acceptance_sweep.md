# BN Route Acceptance Sweep

_Generated: 2026-06-04_

Cross-check of every BN menu entry (`bnMenuItems.ts`) and every BN route
registration (`AppRoutes.tsx`). Disabled rows are hidden by
`filterMenuByFeatures` when the corresponding flag in
`src/lib/bn/featureToggles.ts` is off.

## Menu → Route resolution

| Menu URL | Route registered | Feature flag |
|----------|------------------|--------------|
| `/bn/claims` | ✅ | `bn.claims.workbench` |
| `/bn/queue` | ✅ | `bn.claims.workbench` |
| `/bn/approval` | ✅ | `bn.claims.workbench` |
| `/bn/entitlements` | ✅ | `bn.awards` |
| `/bn/payables` | ✅ | `bn.payments` |
| `/bn/schedules` | ✅ | `bn.payments` |
| `/bn/batches` | ✅ | `bn.payments` |
| `/bn/issue` | ✅ | `bn.payments` |
| `/bn/post-issue` | ✅ | `bn.payments` |
| `/bn/history` | ✅ | `bn.historicalInquiry` |
| `/bn/intake/register` | ✅ | `bn.claims.intake` |
| `/bn/config/products` | ✅ | `bn.config.products` |
| `/bn/config/rules` | ✅ | `bn.config.rules` |
| `/bn/config/rules-admin` | ✅ | `bn.config.rules` |
| `/bn/config/formulas` | ✅ | `bn.config.rules` |
| `/bn/config/document-setup` | ✅ | `bn.config.rules` |
| `/bn/config/screen-setup` | ✅ | `bn.config.rules` |
| `/bn/engine` | ✅ | `bn.config.rules` |
| `/bn/config/transitions` | ✅ | `bn.config.rules` |
| `/bn/config/reason-codes` | ✅ | `bn.config.rules` |
| `/bn/config/workbaskets` | ✅ | `bn.config.rules` |
| `/bn/config/escalation` | ✅ | `bn.config.rules` |
| `/bn/config/service-doc-types` | ✅ | `bn.config.rules` |
| `/bn/config/country` | ✅ | `bn.config.rules` |
| `/bn/config/country/id-rules` | ✅ | `bn.config.rules` |
| `/bn/config/country/address-model` | ✅ | `bn.config.rules` |
| `/bn/config/country/participant-types` | ✅ | `bn.config.rules` |
| `/bn/config/country/payment-config` | ✅ | `bn.config.rules` |
| `/bn/config/country/legal-refs` | ✅ | `bn.config.rules` |
| `/bn/simulation` | ✅ | `bn.simulation` |

**Result: 30/30 resolve. 0 duplicates.**

## Routes registered but intentionally not in the menu

These are deep links opened from other pages (workbench tabs, detail drawers,
or secondary CTAs). They are still gated by feature flags.

| Route | Reached from | Flag |
|-------|--------------|------|
| `/bn/dashboard` | global sidebar header | `bn.enabled` |
| `/bn/person-360` | Person search, Claim 360 sidebar | `bn.person360` |
| `/bn/claims/:id` | Worklist row click | `bn.claims.workbench` |
| `/bn/claims/:id/legacy` | Source toggle from unified Claim 360 | `bn.claim360` |
| `/bn/claims/:id/determination` | Workbench tabs | `bn.claims.workbench` |
| `/bn/claims/:id/eligibility` | Workbench tabs | `bn.claims.workbench` |
| `/bn/claims/:id/calculation` | Workbench tabs | `bn.claims.workbench` |
| `/bn/claims/:id/recommendation` | Workbench tabs | `bn.claims.workbench` |
| `/bn/approval/queue` | Approval console | `bn.claims.workbench` |
| `/bn/approval/workspace/:claimId` | Approval queue row | `bn.claims.workbench` |
| `/bn/config/products/:id` | Product catalog row | `bn.config.products` |
| `/bn/exceptions` | Payment Issue exception link | `bn.payments` |
| `/bn/post-issue-enhanced` | Post-Issue Review v2 toggle | `bn.payments` |
| `/bn/worklist` | Enhanced worklist CTA | `bn.claims.workbench` |
| `/bn/payment-history` | Person 360 payments tab | `bn.payments` |
| `/bn/audit-history` | Claim 360 decision history | `bn.enabled` |
| `/bn/life-certificates` | Servicing console (gated off) | `bn.servicing.lifeCert` |
| `/bn/medical-reviews` | Servicing console (gated off) | `bn.servicing.medicalReview` |
| `/bn/overpayments` | Servicing console (gated off) | `bn.servicing.overpayment` |
| `/bn/award-suspension` | Entitlement actions | `bn.awards` |
| `/bn/survivors` | Entitlement actions | `bn.awards` |
| `/bn/config/medical*` (8 routes) | Medical setup hub | `bn.config.rules` |
| `/bn/simulation/new`, `/bn/simulation/:id`, `/bn/simulation/:id/run/:runId`, `/bn/simulation/edit/:id` | Simulation dashboard | `bn.simulation` |

## Duplicate scan

```
$ sort routes.txt | uniq -d
(none)
```

## Placeholder scan

```
$ rg -n "Coming Soon|Placeholder|TODO Page" src/pages/bn
(none)
```

## Disabled-route behavior

`BnFeatureGate` in `src/lib/bn/featureToggles.ts` redirects to `/bn/dashboard`
(or `/` if `bn.enabled` is off) when a flag is disabled. No 404, no blank
screen, no half-rendered mock view.
