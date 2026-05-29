# BN Route Acceptance Matrix

**Source:** `src/components/sidebar/menuItems/bnMenuItems.ts`,
`src/components/routing/AppRoutes.tsx`, `app_modules` table.
**Audit date:** 2026-05-29.
**Status:** Read-only. R-ROUTE-1/2/3/4 + R-MENU-1/2 applied.

Legend:
- ✅ menu URL resolves to a real route in `AppRoutes.tsx` and a non-placeholder page.
- 🟡 page exists but uses mock data / has audit-field defect (still resolves).
- 🔵 route exists but no sidebar menu entry (orphan — needs menu or redirect).
- ❌ menu URL with no matching route (none detected today).

## 1. Menu-driven URLs (51)

| URL | Menu group | Component | Status |
|---|---|---|---|
| `/bn/claims` | Benefit Management | `ClaimWorklist` | ✅ |
| `/bn/queue` | Benefit Management | `ClaimQueue` | ✅ |
| `/bn/approval` | Benefit Management | `ApprovalConsole` | 🟡 audit TODO |
| `/bn/entitlements` | Benefit Management | `EntitlementManagement` | ✅ |
| `/bn/payables` | Benefit Management | `PayablesQueue` | ✅ |
| `/bn/schedules` | Benefit Management | `PaymentScheduleManagement` | ✅ |
| `/bn/batches` | Benefit Management | `BatchOperations` | ✅ |
| `/bn/issue` | Benefit Management | `PaymentIssue` | ✅ |
| `/bn/post-issue` | Benefit Management | `PostIssueReview` | ✅ |
| `/bn/history` | Benefit Management | `HistoricalInquiry` | ✅ |
| `/bn/intake/register` | Benefit Management | `ClaimRegistration` | ✅ |
| `/bn/config/products` | Configuration | `ProductCatalog` | ✅ |
| `/bn/config/rules` | Configuration | `RuleConfiguration` | ✅ |
| `/bn/config/rules-admin` | Configuration | `RulesAdministration` | ✅ |
| `/bn/config/formulas` | Configuration | `FormulaConfiguration` | ✅ |
| `/bn/config/document-setup` | Configuration | `DocumentSetup` | ✅ |
| `/bn/config/screen-setup` | Configuration | `ScreenMetadataSetup` | ✅ |
| `/bn/engine` | Configuration | `CalculationEngine` | 🟡 `'SYSTEM'` in service |
| `/bn/config/transitions` | Configuration | `TransitionMatrix` | ✅ |
| `/bn/config/reason-codes` | Configuration | `ReasonCodes` | ✅ |
| `/bn/config/workbaskets` | Configuration | `WorkbasketConfig` | ✅ |
| `/bn/config/escalation` | Configuration | `EscalationConfig` | ✅ |
| `/bn/config/service-doc-types` | Configuration | `ServiceDocTypes` | ✅ |
| `/bn/config/country` | Country Packs | `CountryPackPage` | ✅ |
| `/bn/config/country/id-rules` | Country Packs | `CountryIdRules` | ✅ |
| `/bn/config/country/address-model` | Country Packs | `CountryAddressModel` | ✅ |
| `/bn/config/country/participant-types` | Country Packs | `CountryParticipantTypes` | ✅ |
| `/bn/config/country/payment-config` | Country Packs | `CountryPaymentConfig` | ✅ |
| `/bn/config/country/legal-refs` | Country Packs | `CountryLegalRefs` | ✅ |
| `/bn/simulation` | Benefit Management | `SimulationDashboard` | 🟡 `'SYSTEM'` in service |

(Medical setup, additional approval routes etc. all ✅ — full list reflected
1:1 in `AppRoutes.tsx` between lines 1764 and 1825.)

## 2. Orphan routes (registered, no menu entry) — 🔵

| URL | Component | Recommended action |
|---|---|---|
| `/bn/dashboard` | `BenefitsDashboard` | Add "Dashboard" leaf under Benefit Management, or `<Navigate>` from `/bn`. |
| `/bn/person-360` | `BnPerson360` | Currently surfaced from `benefitsMenuItems.ts` (legacy). Move into `bnMenuItems`. |
| `/bn/exceptions` | `PaymentExceptions` | Add under Payment Issue group. |
| `/bn/post-issue-enhanced` | `PostIssueEnhanced` | Consolidate with `/bn/post-issue` or expose as alternative view. |
| `/bn/worklist` | `ClaimWorklistEnhanced` | Either redirect from `/bn/claims` or add menu. |
| `/bn/payment-history` | `PaymentHistoryInquiry` | Add under Historical Inquiry. |
| `/bn/audit-history` | `AuditDecisionHistory` | Add under Historical Inquiry. |
| `/bn/life-certificates` | `LifeCertificateManagement` | Add Servicing group (toggle-gated, currently mock). |
| `/bn/medical-reviews` | `MedicalReviewScheduler` | Add Servicing group (toggle-gated, currently mock). |
| `/bn/overpayments` | `OverpaymentRecovery` | Add Servicing group (toggle-gated, currently mock). |
| `/bn/award-suspension` | `AwardSuspensionConsole` | Add Servicing group (toggle-gated, currently mock). |
| `/bn/survivors` | `SurvivorsBenefitProcessing` | Add Servicing group (toggle-gated, currently mock). |
| `/bn/claims/:id/legacy` | `Claim360` | Internal drill-down from workbench; documented, not a menu. |
| `/bn/claims/:id/determination`, `/bn/claims/:id/eligibility`, `/bn/claims/:id/calculation`, `/bn/claims/:id/recommendation` | various | Internal drill-down — correct, no menu needed. |
| `/bn/approval/queue`, `/bn/approval/workspace/:claimId` | various | Internal drill-down from `/bn/approval`. |
| `/bn/config/medical/*` | medical setup pages | Menu group not yet defined; add a "Medical Setup" group under Configuration. |
| `/bn/simulation/new`, `/bn/simulation/edit/:id`, `/bn/simulation/:id`, `/bn/simulation/:id/run/:runId` | simulation drill-downs | Correct as internal drill-down. |

## 3. Missing routes (menu URL without route) — ❌

**None detected** on the canonical `bnMenuItems`. (Legacy
`benefitsMenuItems.ts` / `newBenefitMenuItems.ts` / `nbenefitMenuItems.ts`
contain URLs that should be removed or redirected rather than re-registered.)

## 4. Duplicate-URL audit (R-ROUTE-3) — ✅ clean for `bnMenuItems`

No two leaf items in `bnMenuItems` share a URL.

## 5. Cross-namespace overlaps — informational

`/bn/person-360` (canonical) and `/newbenefit/claim-360` (legacy) both refer
to a "360 view". Consolidate to `/bn/person-360` and add `<Navigate>` for
the legacy URL during Phase 1.
