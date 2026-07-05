# Epic 0.2 — BN Navigation & Route Foundation — Acceptance

_Implemented: 2026-07-05_
_Sources: `docs/bn/BN_ROUTE_AND_MENU_CONSOLIDATION_PLAN.md`, `docs/bn/BN_DYNAMIC_APP_MODULES_MENU_ADDENDUM.md`_

Canonical BN namespace: **`/bn/*`**. Live menu source: **`app_modules`** table via `src/hooks/useNavigationMenu.ts` → `useDynamicNavigation.ts`. Static sidebar files are reference-only.

---

## 1. Task results

### 1.1 `app_modules` legacy-namespace check

Query:

```sql
SELECT * FROM app_modules
WHERE route ILIKE '/benefits%'
   OR route ILIKE '/nbenefit%'
   OR route ILIKE '/newbenefit%';
```

Result: **0 rows**. No legacy-namespace rows exist. All 79 `bn_*` canonical rows are unchanged. No schema, seed, or data changes were made.

### 1.2 Redirects added in `src/components/routing/AppRoutes.tsx`

Converted from live render to `<Navigate replace>` (Epic 0.2 marker in comments):

| Legacy path | Canonical target |
|-------------|------------------|
| `/benefits/templates` | `/admin/notification-templates?tab=core&module=BENEFITS` |
| `/nbenefit/claim-approval` | `/bn/approval` |
| `/nbenefit/config/rules` | `/bn/config/rules` |
| `/nbenefit/shared/common-eligibility-rules` | `/bn/config/rules` |
| `/nbenefit/shared/calculation-engines` | `/bn/engine` |
| `/nbenefit/shared/registry-search` | `/bn/person-360` |
| `/nbenefit/long-term/registry` | `/bn/awards` |
| `/nbenefit/long-term/life-certificates` | `/bn/life-certificates` |
| `/newbenefit/worklists` | `/bn/worklist` |
| `/newbenefit/intake` | `/bn/intake/register` |
| `/newbenefit/pension-admin` | `/bn/awards` |
| `/newbenefit/payments` | `/bn/payables` |
| `/newbenefit/communications` | `/admin/notification-templates?tab=core&module=BENEFITS` |
| `/newbenefit/auditor` | `/bn/audit-history` |

Existing redirects preserved (`/benefits/all|maternity|unemployment|work-injury|death|educational|online-applications`, `/nbenefit/config/medical-rules`, `/nbenefit/shared/document-templates`).

### 1.3 Kept as INVESTIGATE (no redirect forced)

Reason: parametric routes cannot be interpolated by React Router `<Navigate>` (`:id`, `:claimId`, `:benefitType`, `:verificationId`), or the target requires a portal migration, or the source has bespoke functionality with no verified canonical parity.

- Portal-like contributor/employer under `/newbenefit/*`: `dashboard`, `apply`, `apply/:benefitType`, `my-claims`, `reports`, `inbox`, `new-referral`, `new-verification`, `verification/:verificationId`, `employer-hub`, `medical-board`, `admin`, `claim-360/:claimId` — target is `src/portals/*`, not `/bn/*`.
- Parametric `/nbenefit/*`: `application/:benefitType`, `config/rules/:id`, `config/rules/:id/edit`, `long-term/beneficiary/:id`.
- Bespoke sub-routers still unique: `short-term/{sickness,employment-injury,maternity,funeral-grant}/*`, `long-term/{age-benefit,invalidity,assistance,survivors}/*`, `non-contributory/{assistance-pension,invalidity-assistance}/*`, `shared/workflows`, `config/life-certificate-config`.

Each is annotated with an `INVESTIGATE` comment in `AppRoutes.tsx`.

### 1.4 Legacy static menu files — deprecation comments only

Header `@deprecated` JSDoc block added to:

- `src/components/sidebar/menuItems/benefitsMenuItems.ts`
- `src/components/sidebar/menuItems/nbenefitMenuItems.ts`
- `src/components/sidebar/menuItems/newBenefitMenuItems.ts`

Verification — none of the three files are imported anywhere in `src/`:

```
$ rg "benefitsMenuItems|nbenefitMenuItems|newBenefitMenuItems" src/ \
    | rg -v "menuItems/(benefits|nbenefit|newBenefit)MenuItems.ts"
(no output)
```

`src/components/sidebar/sidebarMenuItems.ts` continues to import `bnMenuItems.ts` only. No file was deleted.

---

## 2. Acceptance criteria check

| Criterion | Status |
|-----------|--------|
| `/bn/*` remains canonical and working | ✅ 79 `bn_*` rows unchanged; 30/30 menu routes still resolve (see `docs/bn/route_acceptance_sweep.md`) |
| `app_modules` remains the live menu source | ✅ No hook, table, or seed change |
| Legacy BN URLs redirect instead of 404 | ✅ 14 new `<Navigate>` shims + 10 pre-existing |
| No legacy benefit menu appears in live navigation | ✅ Static legacy files are orphaned and now `@deprecated`-tagged |
| No old files deleted | ✅ All page components and menu files remain on disk |
| No schema changes | ✅ Zero migrations |
| Acceptance doc includes rollback steps | ✅ See §3 |

---

## 3. Rollback

Every change in this epic is source-only and reversible without data loss.

### 3.1 Rollback redirects

Revert `src/components/routing/AppRoutes.tsx` to restore the previous `element={<Component />}` mappings. The legacy page components (`ClaimApprovalEnhanced`, `BenefitRulesList`, `CommonEligibilityRules`, `CalculationEngines`, `RegistrySearch`, `BeneficiaryRegistry`, `LifeCertificateManagement`, `WorklistsHome`, `IntakeConsole`, `PensionAdministration`, `PaymentsModule`, `LettersCommunications`, `AuditorView`, `ModuleTemplates`) are unchanged and still present, so `git revert` of the AppRoutes edit fully restores prior behaviour.

### 3.2 Rollback deprecation comments

Remove the JSDoc header blocks from the three legacy menu files. No runtime behaviour depends on the comments.

### 3.3 Data / schema rollback

None required. This epic performed **no** database, migration, seed, RLS, or `app_modules` change.

### 3.4 Rollback verification

1. `rg "Epic 0.2" src/components/routing/AppRoutes.tsx` → should return no matches after rollback.
2. Visit `/nbenefit/claim-approval` — should render `ClaimApprovalEnhanced` again instead of navigating to `/bn/approval`.
3. Live sidebar rendered from `app_modules` remains unchanged in both directions.

---

## 4. Follow-up (out of scope for Epic 0.2)

- P1 redirects requiring param interpolation shims (small wrapper components using `useParams` + `<Navigate>`).
- Portal migration of `/newbenefit/*` contributor & employer screens into `src/portals/*`.
- Merge of bespoke `nbenefit/short-term|long-term|non-contributory/*` sub-routers into `/bn/claims` / `/bn/awards` with product bindings.
- Physical deletion of legacy pages and legacy menu files after one full release with redirects live (plan §9).
