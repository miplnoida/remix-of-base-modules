# Financial Reference Domain Boundary Fix — Acceptance

Status: Complete
Mode: Additive + selector rebind (no legacy DDL, no duplicate CRUD)
BN Product Builder: unblock progressing

## Problem
`ssb_financial_policy` rows with `binding_kind = PAYMENT_CHANNEL` and
`SETTLEMENT_METHOD` were being resolved against
`ssp_communication_channel` as an interim canonical list. This mixed two
distinct domains: communication (EMAIL / SMS / LETTER / PORTAL / …) and
payment (CASH / CHEQUE / EFT / ONLINE / MOBILE_WALLET). Financial policy
must never source from a communication table.

## What changed
1. **Canonical Financial Reference tables** (pre-existing, now the single source of truth):
   - `ssp_payment_channel (channel_code, channel_name, category, direction, country_code, is_active, sort_order)`
   - `ssp_settlement_method (method_code, method_name, is_active, sort_order)`
2. **Seeds confirmed present:**
   - Payment channels: `CASH`, `CHEQUE`, `EFT`, `ONLINE`, `MOBILE_WALLET`
   - Settlement methods: `MANUAL`, `BANK_FILE`, `PAYMENT_GATEWAY`
3. **Selector rebind — `src/components/admin/ssb/sections/FinancialPolicyForm.tsx`:**
   - `PAYMENT_CHANNEL`  → `ssp_payment_channel.channel_code / channel_name`
   - `SETTLEMENT_METHOD` → `ssp_settlement_method.method_code / method_name`
   - `CURRENCY`, `BANK_LIST`, `BANK_BRANCH`, `ACCOUNT_TYPE` unchanged.
   - Binding-kind value `SETTLEMENT` renamed to `SETTLEMENT_METHOD` to
     match existing `ssb_financial_policy` rows (no data migration
     needed; codes `MANUAL` / `BANK_FILE` already valid).
4. **Communication contamination cleaned:**
   - `ssp_communication_channel` rows `CASH`, `CHEQUE`, `EFT`, `ONLINE`
     marked `is_active = false`.
   - True communication channels (`EMAIL`, `SMS`, `LETTER`, `PORTAL`,
     `WHATSAPP`, `VOICE`, `IN_APP`) remain active and untouched.
5. **Platform Readiness / governance validation** (`platformReadinessService.ts`):
   - `PAYMENT_CHANNEL` orphan check now runs against `ssp_payment_channel.channel_code`.
   - `SETTLEMENT_METHOD` (and legacy `SETTLEMENT`) orphan check added
     against `ssp_settlement_method.method_code`. Blocking severity.
6. **Registry (`ssbPolicyRegistry.ts`):** `ssb.financial.consumes` now
   lists `ssp_payment_channel` and `ssp_settlement_method` (and
   `ssp_bank_branch`) instead of `ssp_communication_channel`.

## Data-migration notes
No SQL data migration was required for `ssb_financial_policy`:
- Existing `PAYMENT_CHANNEL` codes (`CASH`, `CHEQUE`, `EFT`, `ONLINE`)
  resolve against `ssp_payment_channel` rows with the same codes.
- Existing `SETTLEMENT_METHOD` codes (`MANUAL`, `BANK_FILE`) resolve
  against `ssp_settlement_method` rows with the same codes.

## No duplicate screens
No new CRUD screen was created. Selectors point at the existing
Financial Reference tables. Authoring stays in Financial Reference.

## No legacy impact
Zero DDL/DML on any `bn_*`, `bema_*`, `ia_*`, `ip_*`, `er_*`, `cl_*`,
`cn_*` table. Only:
- Rebinds in `ssb_financial_policy` selectors (code-level).
- `ssp_communication_channel` housekeeping (`is_active = false` on 4
  rows that were seeded as interim payment channels).

## Rollback
```sql
-- Re-activate interim rows in communication table (optional)
UPDATE public.ssp_communication_channel
   SET is_active = true, updated_at = now()
 WHERE code IN ('CASH','CHEQUE','EFT','ONLINE');
```
Revert `FinancialPolicyForm.tsx`, `platformReadinessService.ts`, and
`ssbPolicyRegistry.ts` to their previous versions.

## Acceptance checklist
- [x] Financial policy no longer uses `ssp_communication_channel` for
      payment/settlement.
- [x] Communication domain contains only communication concepts (active
      rows).
- [x] `PAYMENT_CHANNEL` resolves from `ssp_payment_channel`.
- [x] `SETTLEMENT_METHOD` resolves from `ssp_settlement_method`.
- [x] Platform Readiness no longer names `ssp_communication_channel` as
      the payment source.
- [x] No BN/BEMA/IA/legacy table changed.
- [x] Typecheck passes.
