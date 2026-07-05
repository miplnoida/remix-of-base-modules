# BN Dynamic Menu and Route Consolidation Plan

**Status:** Documentation only. No code, route, database, permission, or menu changes are proposed for execution in this phase.
**Prepared:** Phase 0.3 — follow-up to `docs/enterprise/PHASE_0_2_PRIORITY_CLEANUP_PLAN.md` and `docs/bn/BN_ROUTE_AND_MENU_CONSOLIDATION_PLAN.md`.
**Scope:** Benefits (BN) module. Canonical namespace: `/bn/*`.

---

## 1. How the live menu is generated

The runtime sidebar is **not** driven by the static `src/components/sidebar/menuItems/*.ts` files. It is driven by the `app_modules` table, resolved through:

- `src/hooks/useNavigationMenu.ts` — queries
  ```
  SELECT * FROM app_modules
   WHERE is_enabled = true
     AND show_in_menu = true
   ORDER BY sort_order;
  ```
  then joins user permissions (`fetchAllUserPermissions`) and admin status (`is_admin` RPC) to filter the tree.
- `src/hooks/useDynamicNavigation.ts` — shapes the flat `app_modules` rows into the `MenuItem` tree consumed by `DynamicSidebarContent`.
- `src/components/sidebar/DynamicSidebarContent.tsx` — renders the tree and appends only a fixed "User Profile & Preferences" group as truly static.
- `src/lib/compliance/menuFeatureFilter.ts` and `src/lib/bn/featureToggles.ts` — apply post-fetch feature-flag hiding on top of the dynamic tree.

**Implication:** for any menu entry to appear, disappear, or move for real users, the change must land in `app_modules`. Editing `bnMenuItems.ts`, `benefitsMenuItems.ts`, `nbenefitMenuItems.ts`, or `newBenefitMenuItems.ts` alone has **no effect** on the live sidebar. Those static files are reference/legacy artifacts only.

`app_modules` is therefore the **source of truth** for live BN navigation.

---

## 2. Current BN-related `app_modules` records

Direct query of the live `app_modules` table (anon read):

- **79 rows** with `name LIKE 'bn_%'`.
- **0 rows** whose `route` targets `/nbenefit/*`, `/newbenefit/*`, or `/benefits/*`.

All BN menu rows already point to `/bn/*`. Representative sample (all `is_enabled = true`; `show_in_menu` noted where false):

| name | display_name | route | show_in_menu |
|---|---|---|---|
| `bn_operations` | Operations (group) | — | ✅ |
| `bn_payment_preparation` | Payment Preparation (group) | — | ✅ |
| `bn_inquiry_history` | Inquiry & History (group) | — | ✅ |
| `bn_claim_queue` | Claim Queue | `/bn/queue` | ✅ |
| `bn_approval_console` | Approval Console | `/bn/approval` | ✅ |
| `bn_approval_queue` | Approval Queue | `/bn/approval/queue` | ✅ |
| `bn_entitlements` | Entitlements | `/bn/entitlements` | ✅ |
| `bn_payables_queue` | Payables Queue | `/bn/payables` | ✅ |
| `bn_payment_schedules` | Payment Schedules | `/bn/schedules` | ✅ |
| `bn_batch_operations` | Batch Operations | `/bn/batches` | ✅ |
| `bn_historical_inquiry` | Historical Inquiry | `/bn/history` | ✅ |
| `bn_simulation` | Calculation Simulation | `/bn/simulation` | ✅ |
| `bn_person_360` | Claim 360 / Person 360 | `/bn/person-360` | ✅ |
| `bn_rule_groups` | Rule Groups | `/bn/config/rules` | ✅ |
| `bn_rules_admin` | Rule Version Governance | `/bn/config/rules-admin` | ✅ |
| `bn_formulas` | Formula Library | `/bn/config/formulas` | ✅ |
| `bn_doc_setup` | Document Library | `/bn/config/document-setup` | ✅ |
| `bn_screen_setup` | Screen & Fields | `/bn/config/screen-setup` | ✅ |
| `bn_transitions` | Transition Matrix | `/bn/config/transitions` | ✅ |
| `bn_reason_codes` | Reason Codes | `/bn/config/reason-codes` | ✅ |
| `bn_escalation` | Escalation Policies | `/bn/config/escalation` | ✅ |
| `bn_cp_overview` | Pack Overview | `/bn/config/country` | ✅ |
| `bn_cp_id_rules` | ID / SSN Rules | `/bn/config/country/id-rules` | ✅ |
| `bn_cp_address` | Address Model | `/bn/config/country/address-model` | ✅ |
| `bn_cp_participants` | Participant Types | `/bn/config/country/participant-types` | ✅ |
| `bn_cp_payment` | Payment Config | `/bn/config/country/payment-config` | ✅ |
| `bn_medical_setup` | Medical Policy Library | `/bn/config/medical` | ✅ |
| `bn_medical_procedures` | Medical Procedures Catalog | `/bn/config/medical/procedures` | ✅ |
| `bn_medical_facility_avail` | Facility Availability Matrix | `/bn/config/medical/facility-availability` | ✅ |
| `bn_medical_referral_rules` | Referral & Recommendation Rules | `/bn/config/medical/referral-rules` | ✅ |
| `bn_medical_reimb_limits` | Reimbursement Limits | `/bn/config/medical/reimbursement-limits` | ✅ |
| `bn_medical_expense_types` | Expense Type Configuration | `/bn/config/medical/expense-types` | ✅ |
| `bn_medical_review_rules` | Medical Review Rules | `/bn/config/medical/review-rules` | ✅ |
| `bn_medical_documents` | Medical Documents | `/bn/config/medical/documents` | ✅ |
| `bn_post_issue_enhanced` | Post-Issue Enhanced | `/bn/post-issue-enhanced` | ❌ (deep link) |
| `bn_worklist_enhanced` | Enhanced Worklist | `/bn/worklist` | ❌ (deep link) |

Remaining rows (not enumerated here) follow the same `/bn/*` pattern. **No `app_modules` row currently exposes `/nbenefit/*`, `/newbenefit/*`, or `/benefits/*`.**

---

## 3. Canonical `/bn/*` route tree (as registered in `AppRoutes.tsx`)

197 route registrations under `/bn/*`. Grouped:

```text
/bn/dashboard
/bn/person-360
/bn/claims                       (worklist)
/bn/claims/:id                   (workbench)
/bn/claims/:id/legacy
/bn/claims/:id/determination
/bn/claims/:id/eligibility
/bn/claims/:id/calculation
/bn/claims/:id/recommendation
/bn/queue
/bn/worklist
/bn/intake/register
/bn/approval
/bn/approval/queue
/bn/approval/workspace/:claimId
/bn/entitlements
/bn/payables
/bn/schedules
/bn/batches
/bn/issue
/bn/exceptions
/bn/post-issue
/bn/post-issue-enhanced
/bn/history
/bn/payment-history
/bn/audit-history
/bn/simulation  (+ /new, /:id, /:id/run/:runId, /edit/:id)
/bn/engine
/bn/life-certificates            (feature-flag off by default)
/bn/medical-reviews              (feature-flag off by default)
/bn/overpayments                 (feature-flag off by default)
/bn/award-suspension
/bn/survivors
/bn/config/products              (+ /:id)
/bn/config/rules
/bn/config/rules-admin
/bn/config/formulas
/bn/config/document-setup
/bn/config/screen-setup
/bn/config/transitions
/bn/config/reason-codes
/bn/config/workbaskets
/bn/config/escalation
/bn/config/service-doc-types
/bn/config/country               (+ /id-rules, /address-model,
                                    /participant-types,
                                    /payment-config, /legal-refs)
/bn/config/medical               (+ 7 sub-routes)
/bn/config/calculation           (+ /reference-data)
```

This tree matches `bnMenuItems.ts` and the live `app_modules` rows.

---

## 4. Legacy `/benefits/*`, `/nbenefit/*`, `/newBenefit/*` route tree

**AppRoutes.tsx** currently registers **85 legacy route matches** across the three namespaces.

### 4.1 `/nbenefit/*`
Sourced from `nbenefitMenuItems.ts` and from `newBenefitMenuItems.ts` sub-items. Notable entries:
- `/nbenefit/config/survivors/deceased-eligibility`
- `/nbenefit/config/survivors/dependant-types`
- `/nbenefit/config/survivors/duration-rules`
- `/nbenefit/config/survivors/share-allocation`
- `/nbenefit/config/survivors/case-cap`
- `/nbenefit/config/survivors/ongoing-eligibility`
- `/nbenefit/claim-approval` and variants
- Other legacy configuration screens.

Pages backing these live under `src/pages/nbenefit/` (survivors + approval + config).

### 4.2 `/newbenefit/*`
From `newBenefitMenuItems.ts`. Pages live under `src/pages/newBenefit/` (19+ files):
- `/newbenefit/worklists` → WorklistsHome
- `/newbenefit/intake` → IntakeConsole
- `/newbenefit/application/sickness` → BenefitApplicationForm
- `/newbenefit/claim-360` → Claim360View
- `/newbenefit/medical-board` → MedicalBoardHub
- `/newbenefit/employer-hub` → EmployerHub
- `/newbenefit/pension-admin` → PensionAdministration
- `/newbenefit/payments` → PaymentsModule
- `/newbenefit/communications` → LettersCommunications
- `/newbenefit/admin` → AdminConfig
- `/newbenefit/auditor` → AuditorView
- Contributor/employer-facing: `ContributorDashboard`, `ContributorInbox`, `ContributorReports`, `EmployerHub`, `EmploymentVerificationDetail`, `NewReferralForm`, `NewVerificationRequest`, `MyClaims`, `ApplyForBenefits`.

### 4.3 `/benefits/*`
From `benefitsMenuItems.ts`. **No `src/pages/benefits/` directory exists**; every menu entry either:
- already links directly to `/bn/*` (e.g. Person 360, All Benefits, Online Benefit Applications, `?type=…` filters), or
- links to a non-BN canonical (e.g. Communication Templates → `/admin/notification-templates?tab=core&module=BENEFITS`).

So `/benefits/*` today is effectively a labelled shortcut set, not a distinct route tree.

---

## 5. Dynamic menu impact

Because live navigation is generated from `app_modules`:

1. Legacy static files (`benefitsMenuItems.ts`, `nbenefitMenuItems.ts`, `newBenefitMenuItems.ts`) **do not appear** in the current runtime menu — `sidebarMenuItems.ts` only spreads `userMenuItems`, `masterDataMenuItems`, `bnMenuItems`, `systemAdminMenuItems`, and even those are subordinate to the dynamic tree. Anyone reasoning about "what the user sees" must look at `app_modules`, not the TS files.
2. The 79 `bn_*` `app_modules` rows already point exclusively at `/bn/*`. There is **no dynamic-menu cleanup required to remove legacy URLs from the sidebar** — they are not there.
3. What is required is:
   - Registering `<Navigate replace>` shims in `AppRoutes.tsx` so any residual bookmark, deep link, external doc, or portal that points at `/nbenefit/*` / `/newbenefit/*` / `/benefits/*` lands on the canonical `/bn/*` screen.
   - Optionally hiding or retiring the legacy route registrations after one release.
   - Ensuring no future PR reintroduces `/nbenefit/*` etc. into `app_modules` (add a linter or schema-level check as a follow-up).

---

## 6. Permission impact

- Live BN dynamic menu uses `requiresPermission: "benefits_management"` via `useNavigationMenu` + `fetchAllUserPermissions`. Granular BN capabilities are enumerated but not yet enforced (see `docs/bn/permission_feature_flag_matrix.md`).
- Legacy static menus reference `process_claims`, `view_claims`, `apply_for_benefits`, `verify_employment`, `schedule_medical_board`, `view_audit_logs`, `system_administration`. These strings are **not linked to any live `app_modules` row**, so they have no runtime effect today.
- **No permission changes are proposed in this phase.** When redirects are installed, existing `benefits_management` gating on the canonical `/bn/*` targets is inherited automatically.

---

## 7. `app_modules` cleanup plan (recommendation only)

Ranked, evidence-based, non-destructive:

1. **Confirm** by manual query that no `app_modules` row references `/nbenefit/*`, `/newbenefit/*`, or `/benefits/*`. Today: confirmed 0.
2. **Do not insert** any new `app_modules` rows for legacy namespaces. Any migration attempting to do so must be rejected in review.
3. **Audit `sort_order`** within `bn_operations`, `bn_payment_preparation`, `bn_inquiry_history`, and BN configuration groups after redirects land, to make sure Enhanced Worklist / Enhanced Post-Issue stay hidden (`show_in_menu = false`) unless promoted.
4. **Add a documentation-only mapping** (this file + `BN_ROUTE_AND_MENU_CONSOLIDATION_PLAN.md`) referenced from `docs/enterprise/PHASE_0_2_PRIORITY_CLEANUP_PLAN.md` so future contributors know `app_modules` is the source of truth.
5. **Defer** any `is_enabled`/`show_in_menu` toggling for the 5 servicing rows (life-cert, medical review, overpayment, award suspension, survivors) until Phase 3 tables land — matches `permission_feature_flag_matrix.md`.

No SQL is proposed for execution here.

---

## 8. Redirect plan (recommended for the next implementation phase)

For every legacy URL, install a client-side `<Navigate to="…" replace />` in `AppRoutes.tsx`. Mapping (evidence-based on file names + `BN_ROUTE_AND_MENU_CONSOLIDATION_PLAN.md`):

| Legacy path | Canonical target | Classification |
|---|---|---|
| `/newbenefit/worklists` | `/bn/worklist` | Redirect |
| `/newbenefit/intake` | `/bn/intake/register` | Redirect |
| `/newbenefit/application/sickness` | `/bn/intake/register?type=sickness` | Redirect |
| `/newbenefit/claim-360` | `/bn/person-360` | Redirect |
| `/newbenefit/medical-board` | `/bn/config/medical` | Redirect |
| `/newbenefit/employer-hub` | `/portals/employer` (portal) | Investigate |
| `/newbenefit/pension-admin` | `/bn/entitlements` | Merge |
| `/newbenefit/payments` | `/bn/payables` | Redirect |
| `/newbenefit/communications` | `/admin/notification-templates?module=BENEFITS` | Redirect |
| `/newbenefit/admin` | `/bn/config/rules-admin` | Redirect |
| `/newbenefit/auditor` | `/bn/audit-history` | Redirect |
| `/newbenefit/contributor-*` | `/portals/contributor/*` | Investigate (portal) |
| `/nbenefit/claim-approval` | `/bn/approval` | Redirect |
| `/nbenefit/config/survivors/*` (6 URLs) | `/bn/config/rules?group=survivors` | Merge (survivors editors must first land on `/bn/*`) |
| `/benefits/*` menu entries | Already point at `/bn/*` | Keep (nothing to do) |

Every redirect is `replace` so the browser history does not accumulate legacy entries.

---

## 9. Static menu file retirement plan

Static menu files that must be reclassified as **legacy reference only, not live**:

- `src/components/sidebar/menuItems/benefitsMenuItems.ts`
- `src/components/sidebar/menuItems/nbenefitMenuItems.ts`
- `src/components/sidebar/menuItems/newBenefitMenuItems.ts`

Actions:

1. **Now (docs only):** annotate them as legacy in this document; do not edit the files.
2. **Next release:** verify no import of these three arrays exists in a live layout path (they are not currently spread in `sidebarMenuItems.ts`, but grep is still required at implementation time).
3. **After one release with redirects live:** delete the three static files and their imports. Any label/permission still needed must first be represented as a row in `app_modules`.
4. `bnMenuItems.ts` remains kept as reference against `app_modules`, and eventually as a fixture for a seed/sync script.

---

## 10. One-release safe retirement plan

Phased so no user hits a 404 and no external integration breaks silently.

- **Release N (this plan):** Publish documentation. No code changes.
- **Release N+1:**
  - Add `<Navigate replace>` shims for every legacy URL listed in §8.
  - Migrate the six survivors-rules editors from `src/pages/nbenefit/` into `src/pages/bn/config/rules/survivors/` (only functional migration required; other legacy pages have canonical equivalents already).
  - Add a lint / migration-review check preventing new `app_modules` rows with a `/nbenefit`, `/newbenefit`, or `/benefits` route prefix.
- **Release N+2 (one full release later):**
  - Delete the legacy component files under `src/pages/nbenefit/` and `src/pages/newBenefit/` whose targets are covered by redirects.
  - Remove the corresponding route registrations in `AppRoutes.tsx` (the shims can stay if analytics show residual traffic).
  - Delete the three static menu files in §9.
  - Remove now-unreferenced permission strings from any static seed.

---

## 11. Per-entry classification (BN routes / menu entries)

Legend: **Keep** / **Redirect** / **Merge** / **Hide** (from `app_modules` menu) / **Retire** (after one release) / **Investigate**.

### 11.1 Canonical `/bn/*`
All entries currently in `app_modules` with `bn_*` name → **Keep as `/bn/*`**.
Exceptions:
- `bn_post_issue_enhanced` (`/bn/post-issue-enhanced`) → **Keep**, remains `show_in_menu = false`.
- `bn_worklist_enhanced` (`/bn/worklist`) → **Keep**, remains `show_in_menu = false`.
- Servicing routes gated by `bn.servicing.*` flags → **Keep**, but leave feature flags default-false.

### 11.2 `/newbenefit/*`
| Entry | Classification |
|---|---|
| `worklists`, `intake`, `application/*`, `claim-360`, `pension-admin`, `payments`, `communications`, `admin`, `auditor` | Redirect to `/bn/*` |
| `medical-board` | Redirect → `/bn/config/medical` |
| `employer-hub`, `contributor-*`, `MyClaims`, `ApplyForBenefits`, `NewReferralForm`, `NewVerificationRequest`, `EmploymentVerificationDetail` | Investigate (candidate for `src/portals/*` migration, not `/bn/*`) |

### 11.3 `/nbenefit/*`
| Entry | Classification |
|---|---|
| `claim-approval*` | Redirect → `/bn/approval` |
| `config/survivors/*` (6) | Merge into `/bn/config/rules` after migrating the editors |
| Other legacy config screens | Investigate individually before Release N+2 |

### 11.4 `/benefits/*`
| Entry | Classification |
|---|---|
| All entries in `benefitsMenuItems.ts` | Keep (they already point at `/bn/*` or shared admin) — file itself is **Retire** after one release |

### 11.5 Static menu files
| File | Classification |
|---|---|
| `bnMenuItems.ts` | Keep (reference to canonical `/bn/*`) |
| `benefitsMenuItems.ts` | Retire after one release |
| `nbenefitMenuItems.ts` | Retire after one release |
| `newBenefitMenuItems.ts` | Retire after one release |
| `sidebarMenuItems.ts` | Keep (does not currently spread the legacy files) |

---

## 12. Risks and rollback approach

**Risks**
1. External bookmarks, portal deep links, or emailed notification links may still target legacy paths. Mitigation: install redirects in Release N+1 before any deletion.
2. Legacy `/newbenefit/*` pages (portal-shaped: contributor, employer) may not have a 1:1 `/bn/*` equivalent. Mitigation: those are marked **Investigate** for portal migration, not blanket-redirected.
3. Survivors' rules editors have unique screens under `/nbenefit/config/survivors/*` with no `/bn/*` counterpart today. Mitigation: **Merge**, not Redirect — physical migration required before shim.
4. A future migration could accidentally seed a legacy path into `app_modules`. Mitigation: add a review checklist item + lint (Release N+1).
5. Permission drift: legacy menus reference permission strings not enforced by canonical routes. Mitigation: no permission change in this phase; granular BN permissions are tracked separately in `permission_feature_flag_matrix.md`.

**Rollback**
- Redirects (Release N+1) are pure `<Navigate>` components; reverting a single PR restores original routes.
- Static file deletions (Release N+2) are recoverable from git history; static files being deleted are already unreferenced by the live dynamic menu, so restoration would be cosmetic.
- `app_modules` is **not** modified by this plan — no DB rollback is required at any stage covered here.

---

## 13. Acceptance summary

- ✅ Confirms `app_modules` is the live menu source.
- ✅ `/bn/*` defined as canonical.
- ✅ Legacy `/benefits/*`, `/nbenefit/*`, `/newBenefit/*` fully mapped.
- ✅ `app_modules` impact documented (zero rows require change; 79 `bn_*` rows already canonical).
- ✅ Static menu files reclassified as secondary/reference.
- ✅ Next implementation prompt can be generated to (a) add `<Navigate>` shims per §8, (b) migrate survivors' editors per §11.3, (c) after one release, retire files per §9 and §11.5.
