# BN Dynamic `app_modules` Menu — Addendum

**Status:** Documentation only. Addendum to `docs/bn/BN_ROUTE_AND_MENU_CONSOLIDATION_PLAN.md`. Does not replace it.
**Companion:** `docs/bn/BN_DYNAMIC_MENU_AND_ROUTE_CONSOLIDATION_PLAN.md`.
**Purpose:** Correct the earlier plan's implicit assumption that static sidebar files drive live navigation. The live sidebar is generated from the `app_modules` table.

---

## 1. Correction to the existing plan

`docs/bn/BN_ROUTE_AND_MENU_CONSOLIDATION_PLAN.md` remains valid for:
- The canonical decision (`/bn/*`).
- The `AppRoutes.tsx` legacy-vs-canonical mapping.
- The one-release retirement cadence.

It is **corrected** on one point: static menu files
(`bnMenuItems.ts`, `benefitsMenuItems.ts`, `nbenefitMenuItems.ts`,
`newBenefitMenuItems.ts`) are **not** the runtime source of the sidebar.
They are reference/legacy artefacts. Any action described in the earlier
plan as "update the sidebar" or "retire the menu file" must be interpreted
through the `app_modules`-driven pipeline described below.

---

## 2. How the live menu is generated

`src/hooks/useNavigationMenu.ts` executes:

```
SELECT * FROM app_modules
 WHERE is_enabled = true
   AND show_in_menu = true
 ORDER BY sort_order;
```

The flat rows are shaped into a tree by `src/hooks/useDynamicNavigation.ts`
(parent/child via `parent_id`), filtered by
`fetchAllUserPermissions(user.id)` and the `is_admin` RPC, then rendered by
`src/components/sidebar/DynamicSidebarContent.tsx`. Feature-flag hiding is
applied on top via `src/lib/bn/featureToggles.ts` (BN) and
`src/lib/compliance/menuFeatureFilter.ts` (Compliance).

The only truly static entries appended at runtime are the "User Profile &
Preferences" group defined inside `DynamicSidebarContent`. Every other
sidebar entry — including everything in the BN module — is a row in
`app_modules`.

**Consequence:** editing `bnMenuItems.ts` et al. has no effect on the
menu real users see. Live navigation changes require updates to
`app_modules`.

---

## 3. BN-related `app_modules` records (from live table + migrations)

Direct query against the live `app_modules` table:

- **79** rows with `name LIKE 'bn_%'`.
- **0** rows whose `route` targets `/nbenefit/*`, `/newbenefit/*`, or `/benefits/*`.

All BN dynamic-menu rows already point at canonical `/bn/*` paths. A
representative subset (full listing in
`BN_DYNAMIC_MENU_AND_ROUTE_CONSOLIDATION_PLAN.md §2`):

| name | route | show_in_menu |
|---|---|---|
| `bn_claim_queue` | `/bn/queue` | ✅ |
| `bn_approval_console` | `/bn/approval` | ✅ |
| `bn_entitlements` | `/bn/entitlements` | ✅ |
| `bn_payables_queue` | `/bn/payables` | ✅ |
| `bn_payment_schedules` | `/bn/schedules` | ✅ |
| `bn_batch_operations` | `/bn/batches` | ✅ |
| `bn_historical_inquiry` | `/bn/history` | ✅ |
| `bn_simulation` | `/bn/simulation` | ✅ |
| `bn_rule_groups` | `/bn/config/rules` | ✅ |
| `bn_rules_admin` | `/bn/config/rules-admin` | ✅ |
| `bn_cp_*` (5) | `/bn/config/country/*` | ✅ |
| `bn_medical_*` (7) | `/bn/config/medical/*` | ✅ |
| `bn_post_issue_enhanced` | `/bn/post-issue-enhanced` | ❌ (deep link) |
| `bn_worklist_enhanced` | `/bn/worklist` | ❌ (deep link) |

Migrations that seed / mutate BN rows:
`supabase/migrations/20260323052009_*.sql`,
`20260329150900_*.sql`,
`20260329152825_*.sql`,
`20260404041055_*.sql`,
plus follow-up patches (`20260627*`, `20260628*`, `20260701122305_*`,
`20260702*`, `20260703*`) that adjust `is_enabled` / `show_in_menu` /
`sort_order`.

---

## 4. Impact of the canonical `/bn/*` decision

Because `app_modules` already stores only `/bn/*` routes, the canonical
decision requires **no cleanup of live menu rows**. What remains:

1. Prevent regressions — no future migration may insert an
   `app_modules` row whose `route` starts with `/benefits`, `/nbenefit`,
   or `/newbenefit`.
2. Ensure legacy URLs still resolve (via redirects in `AppRoutes.tsx`) so
   bookmarks, portal emails, and external references continue to work.
3. Keep static menu files aligned with `app_modules` while they exist,
   then retire them.

---

## 5. `app_modules` cleanup plan for legacy namespaces

| Legacy namespace | Rows in `app_modules` today | Action |
|---|---|---|
| `/benefits/*` | 0 | Keep table as-is; add review guard to prevent new rows |
| `/nbenefit/*` | 0 | Keep table as-is; add review guard to prevent new rows |
| `/newbenefit/*` | 0 | Keep table as-is; add review guard to prevent new rows |

Should any legacy-namespace row appear during audit (none observed):

- **Hide from menu**: set `show_in_menu = false` first.
- **Update route** to the canonical `/bn/*` target when the target is
  functionally equivalent.
- **Retire** the row only after one full release with the hide + redirect
  in place.

No SQL is proposed for execution in this addendum.

---

## 6. Permission impact

- Live BN menu rows are gated by `requiresPermission: "benefits_management"`
  resolved through `fetchAllUserPermissions`. Granular BN capabilities are
  drafted in `docs/bn/permission_feature_flag_matrix.md` but not yet
  enforced.
- Static legacy menus reference permission strings (`process_claims`,
  `view_claims`, `apply_for_benefits`, `verify_employment`,
  `schedule_medical_board`, `view_audit_logs`, `system_administration`)
  that are **not linked** to any live `app_modules` row and therefore
  have no runtime effect today.
- **No permission changes are proposed here.** Redirect targets inherit
  the canonical `/bn/*` gating automatically.

---

## 7. Safe update sequence (recommended for future implementation)

The sequence below assumes any future work that touches BN navigation.
It is documentation only — nothing is being executed.

1. **Hide legacy `app_modules` entries from menu**
   - Query for any row whose `route` matches `/benefits*`, `/nbenefit*`,
     `/newbenefit*`. Today: 0 rows — step is a guard, not an action.
   - If any appear later, set `show_in_menu = false` (do **not** delete)
     and record the change in the release notes.

2. **Keep routes alive with redirects**
   - In `AppRoutes.tsx`, register `<Navigate to="/bn/…" replace />` for
     each legacy path per the mapping in
     `BN_DYNAMIC_MENU_AND_ROUTE_CONSOLIDATION_PLAN.md §8`.
   - Do not remove the original route registration in the same release
     as the redirect lands.

3. **Verify user permissions still resolve**
   - After redirects land, log in as each BN role (`bn_clerk`,
     `bn_officer`, `bn_supervisor`, `bn_manager`, `bn_finance`, `Admin`)
     and confirm:
     - Sidebar renders the expected canonical entries.
     - Navigating a legacy URL lands on the canonical page without an
       `Unauthorized` flash.
     - `benefits_management` gating still applies at the canonical route.

4. **Retire static menu files after one release**
   - After one full release with redirects live and permissions verified,
     delete `benefitsMenuItems.ts`, `nbenefitMenuItems.ts`,
     `newBenefitMenuItems.ts`, remove any surviving imports, and retire
     the corresponding legacy page files under `src/pages/nbenefit/` and
     `src/pages/newBenefit/` whose destinations are fully covered by
     `/bn/*`. Keep `bnMenuItems.ts` as a reference fixture until an
     `app_modules` seed/export script replaces it.

---

## 8. Per-item classification

Legend: **Keep** / **Hide from menu** / **Redirect** / **Merge** /
**Retire after one release** / **Investigate**.

### 8.1 `app_modules` rows
| Scope | Action |
|---|---|
| All 79 `bn_*` rows pointing at `/bn/*` | Keep |
| `bn_post_issue_enhanced`, `bn_worklist_enhanced` (`show_in_menu = false`) | Keep (remain hidden) |
| Any future row targeting `/benefits*`, `/nbenefit*`, `/newbenefit*` | Hide from menu, then Retire after one release |

### 8.2 `AppRoutes.tsx` registrations
| Scope | Action |
|---|---|
| `/bn/*` (197 registrations) | Keep |
| `/newbenefit/{worklists,intake,application/*,claim-360,pension-admin,payments,communications,admin,auditor}` | Redirect |
| `/newbenefit/medical-board` | Redirect → `/bn/config/medical` |
| `/newbenefit/{employer-hub,contributor-*,my-claims,apply-for-benefits,new-referral,new-verification,employment-verification-detail}` | Investigate (candidate for `src/portals/*`) |
| `/nbenefit/claim-approval*` | Redirect → `/bn/approval` |
| `/nbenefit/config/survivors/*` (6) | Merge into `/bn/config/rules` (physical migration required) |
| `/benefits/*` menu shortcuts | Keep (already point at `/bn/*` or shared admin) |

### 8.3 Static menu files
| File | Action |
|---|---|
| `bnMenuItems.ts` | Keep (reference) |
| `benefitsMenuItems.ts` | Retire after one release |
| `nbenefitMenuItems.ts` | Retire after one release |
| `newBenefitMenuItems.ts` | Retire after one release |
| `sidebarMenuItems.ts` | Keep (does not spread legacy files) |

---

## 9. Rollback plan

- **Redirects** (`AppRoutes.tsx`): pure `<Navigate>` shims; revert the
  PR to restore the original legacy routes.
- **Hiding `app_modules` rows** (only if any legacy rows ever appear):
  a single `UPDATE app_modules SET show_in_menu = true WHERE …`
  reverses the change; the original row is preserved because rows are
  hidden, not deleted.
- **Static file deletion** (Release N+2): recoverable from git history.
  Because the files are already inert (not spread into the live
  sidebar), restoration is cosmetic.
- **`app_modules` is not modified by this addendum**, so no DB rollback
  is required for the documentation phase.

---

## 10. Acceptance criteria for future implementation

Any implementation PR arising from this addendum must:

1. Confirm via query that `SELECT COUNT(*) FROM app_modules WHERE route ~ '^/(benefits|nbenefit|newbenefit)(/|$)'` returns `0` both before and after the change.
2. Add `<Navigate replace>` shims for the legacy paths listed in §8.2, one per entry, without removing the canonical `/bn/*` route.
3. Include a smoke-test checklist confirming each BN role can reach the canonical page from at least one legacy URL and still hits `benefits_management` gating.
4. Not modify `app_modules` rows unless a legacy-namespace row is detected; if so, set `show_in_menu = false` in the same migration.
5. Not delete any static menu file in the same release as the redirect PR; deletion is deferred by one release.
6. Update `docs/bn/BN_ROUTE_AND_MENU_CONSOLIDATION_PLAN.md` and this addendum with the release number in which each step lands.

---

## 11. Acceptance summary for this addendum

- ✅ Confirms `app_modules` is the live navigation source.
- ✅ Existing BN route/menu consolidation plan remains valid, corrected for dynamic menus.
- ✅ Static menu files are explicitly reclassified as secondary/reference.
- ✅ No code, route, permission, menu-file, or database change is performed.
