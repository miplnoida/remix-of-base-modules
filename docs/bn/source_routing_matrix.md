# BN Source Routing Matrix

_Generated: 2026-06-04_

## Decision order

A claim's `sourceSystem` is resolved by `unifiedClaimService` /
`legacyRoutingService` in this precedence order:

1. **Explicit map override** — `bn_claim_source_map` row keyed by
   `(legacy_claim_number, legacy_claim_seq)` or `bn_claim_id`.
   Wins over any date heuristic. Used for re-platformed legacy claims
   that must remain LEGACY, or BN pilot claims dated before the cutoff.
2. **Date heuristic** — claim event date (`cl_head.claim_date` or
   `bn_claim.created_at`) compared to the BN cutoff
   (`bn_country.bn_cutoff_date` for the active scheme).
3. **Default** — if nothing else applies, lookup falls back to legacy
   when a `cl_head` row exists, otherwise BN.

## Truth table

| Claim origin | `bn_claim_source_map` entry | Claim date vs cutoff | Resolved `sourceSystem` | Claim 360 mode | Actions |
|--------------|-----------------------------|----------------------|-------------------------|----------------|---------|
| `cl_head` only | — | before | `LEGACY_BEMA` | Read-only `LegacyClaim360View` | Hidden |
| `cl_head` only | mapped → `BN` | before | `BN` | BN workbench | Permission-gated |
| `cl_head` only | — | after | `LEGACY_BEMA` | Read-only | Hidden |
| `bn_claim` only | — | after | `BN` | BN workbench | Permission-gated |
| `bn_claim` only | mapped → `LEGACY_BEMA` | after | `LEGACY_BEMA` | Read-only | Hidden |
| `bn_claim` only | — | before | `BN` | BN workbench | Permission-gated |
| Both exist, linked via map | map row | n/a | per map (`source`) | per resolution | per resolution |

## Read paths

| `sourceSystem` | Read path |
|----------------|-----------|
| `LEGACY_BEMA` | `historicalInquiryAdapter.getLegacyClaim`, `getLegacyClaimPayments`, `getLegacyClaimTimeline`, `getLegacyClaimsBySsn` (read-only against `cl_head`, `cl_detail_*`, `cl_cheques`) |
| `BN`          | `bn_claim`, `bn_claim_decision`, `bn_claim_calculation`, `bn_claim_document`, `bn_payment_instruction`, `bn_payment_schedule`, `bn_award*` |

## Write paths

| `sourceSystem` | Allowed writes |
|----------------|----------------|
| `LEGACY_BEMA` | **None** from BN module. Action bar hidden; `LegacyClaim360View` renders read-only with a legacy metadata panel (claim number + sequence). Only finance/cashier modules outside BN may still touch `cl_cheques` for historical cash management. |
| `BN`          | Standard BN workflow: intake → eligibility → calculation → decision → approval → award → payment schedule → payment instruction. Each privileged button is wrapped in `<PermissionWrapper>` with the granular key (`process_benefit_claim`, `approve_benefit_claim`, `deny_benefit_claim`, `issue_benefit_payment`, `suspend_benefit_award`, `configure_benefit_rules`, `view_legacy_benefit_data`, `view_benefit_audit`). |

## Payment source badges

`paymentBoundaryService.getUnifiedPaymentsForClaim` and `getUnifiedPaymentsBySsn`
tag every row with `source` + `sourceBadge`:

| `source` | Badge | Origin table |
|----------|-------|--------------|
| `LEGACY_CHEQUE` | "Legacy Cheque" | `cl_cheques` (read-only via adapter) |
| `BN_INSTRUCTION` | "BN Instruction" | `bn_payment_instruction` |

## Person 360 merge

`BnPerson360` calls both `bn_claim` (by `ip_master.ssn`) and
`historicalInquiryAdapter.getLegacyClaimsBySsn(ssn)`, then merges by
`(legacy_claim_number, legacy_claim_seq)` to suppress duplicates that appear
in both systems via `bn_claim_source_map`. The merged grid shows the
`sourceSystem` badge on every row.

## Parallel-run validation

For cutover QA, `calculationComparisonService.captureComparisonSnapshot`
stores legacy vs BN amounts in `bn_calc_legacy_snapshot` with computed
`difference_amount`, `difference_percent`, and `comparison_status`
(`MATCH` | `WITHIN_TOLERANCE` | `MISMATCH` | `LEGACY_MISSING` | `BN_MISSING`).
Snapshots are read-only — they never overwrite legacy data — and visible in
Claim 360 to users with `view_benefit_audit`.
