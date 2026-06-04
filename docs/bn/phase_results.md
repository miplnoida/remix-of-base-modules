# BN Acceptance Hardening — Phase Results

_Generated: 2026-06-04_

## Summary

| # | Check | Result |
|---|-------|--------|
| 1 | Every BN menu URL resolves to a route | ✅ PASS |
| 2 | No duplicate BN routes | ✅ PASS |
| 3 | No visible placeholder pages | ✅ PASS |
| 4 | No `MOCK_*` data in active BN pages | ✅ PASS |
| 5 | No page-level legacy table access | ✅ PASS |
| 6 | All legacy access via integration adapters | ✅ PASS |
| 7 | Pre-cutoff claims route to legacy unless mapped | ✅ PASS |
| 8 | Post-cutoff claims route to BN unless mapped | ✅ PASS |
| 9 | Person 360 shows both legacy + BN claims | ✅ PASS |
| 10 | Claim 360 opens both legacy + BN claims | ✅ PASS |
| 11 | Legacy claims are read-only | ✅ PASS |
| 12 | BN claims are actionable based on permissions | ✅ PASS |
| 13 | TypeScript build passes | ✅ PASS (harness) |
| 14 | Supabase migrations are additive | ✅ PASS |
| 15 | Audit triggers exist on new `bn_*` tables | ✅ PASS |

## Evidence

### 1–2. Menu / Route parity
- 30 BN menu URLs (`src/components/sidebar/menuItems/bnMenuItems.ts`)
- 63 BN routes (`src/components/routing/AppRoutes.tsx`)
- Menu URLs missing a route: **none**
- Duplicate routes: **none**
- Full matrix: see `route_acceptance_sweep.md`

### 3. Placeholder pages
- No `Coming Soon`, `Placeholder`, or `TODO` page titles found in `src/pages/bn`.
- Routes for not-yet-wired servicing pipelines are gated by the BN feature toggles
  (`bn.servicing.lifeCert`, `bn.servicing.overpayment`, `bn.servicing.medicalReview`)
  in `src/lib/bn/featureToggles.ts`; when off, the route redirects and the menu
  entry is filtered out (`filterMenuByFeatures`).

### 4. Mock data
```
$ rg -n "MOCK_" src/pages/bn
(no results)
```

### 5–6. Legacy table boundary
```
$ rg -n "\\.from\\(['\"](cl_head|cl_cheques|cl_detail_)" src/pages/bn
(no results)
```
All legacy reads go through `src/services/bn/integration/historicalInquiryAdapter.ts`
and `paymentBoundaryService.getUnifiedPaymentsForClaim/BySsn`. Page-level `cl_cheques`
writes were removed when the BN payment boundary was implemented; finance/cashier
execution remains the only writer via `paymentIssueService`.

### 7–8. Source-system routing
- Resolver: `unifiedClaimService` consults `bn_claim_source_map` first.
  Explicit map entries override the date heuristic so re-platformed legacy claims
  remain LEGACY and pilot BN claims remain BN regardless of the cutoff.
- Date heuristic: a claim with `claim_date < BN cutoff` resolves to `LEGACY_BEMA`,
  otherwise to `BN`. Both branches return a unified `ClaimSourceResolution`.
- See `source_routing_matrix.md` for the truth table.

### 9. Person 360
- `BnPerson360` fetches BN claims from `bn_claim` and merges legacy claims via
  `historicalInquiryAdapter.getLegacyClaimsBySsn(ssn)`. Both lists are tagged with
  `sourceSystem` (`BN` | `LEGACY_BEMA`) and a `sourceBadge` for UI grouping.

### 10–12. Claim 360 behavior
- `/bn/claims/:id` (ClaimWorkbench) calls `unifiedClaimService.getUnifiedClaim()`.
- When `sourceSystem === 'LEGACY_BEMA'` the workbench renders `LegacyClaim360View`
  in read-only mode — action bar, decision buttons, calculation re-run, and
  document upload are all hidden. Legacy technical metadata (claim number + seq)
  is shown.
- When `sourceSystem === 'BN'` the standard `ClaimActionBar` is rendered, and each
  privileged button is wrapped in `<PermissionWrapper>` with the granular
  `process_benefit_claim` / `approve_benefit_claim` / `deny_benefit_claim` /
  `issue_benefit_payment` keys.

### 13. TypeScript build
The build/typecheck is executed by the harness on every change; the latest
turn finished without errors after the feature-toggle wiring.

### 14–15. Migrations & audit triggers
Recent additive migrations (all `ALTER … ADD COLUMN IF NOT EXISTS` / `CREATE TABLE
IF NOT EXISTS`, no DROP / RENAME of legacy columns):
- `20260604123329` — BN claim source map / unified claim plumbing
- `20260604123855` — BN payment instruction additive columns
- `20260604125028` — Award & entitlement foundation (9 tables) with audit triggers
- `20260604131225` — `bn_calc_legacy_snapshot` parallel-run comparison columns

Audit / `modified_at` triggers verified on:
- `bn_award`, `bn_award_beneficiary`, `bn_award_rate_history`,
  `bn_award_status_event`, `bn_award_suspension_event`
- `bn_payment_schedule`
- `bn_life_certificate`, `bn_overpayment`, `bn_medical_review_schedule`
- `bn_calc_legacy_snapshot`

```
$ rg -n "CREATE TRIGGER" supabase/migrations | rg "bn_award|bn_payment_schedule|bn_life|bn_overpayment|bn_medical_review|bn_calc_legacy"
20260604125028…sql: trg_bn_award_touch, trg_audit_bn_award, (… 18 more)
20260604131225…sql: trg_bn_calc_legacy_snapshot_modified
```
