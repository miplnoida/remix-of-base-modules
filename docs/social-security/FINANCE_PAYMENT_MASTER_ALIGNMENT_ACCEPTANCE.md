# Finance / Payment Master Alignment — Acceptance

Status: Complete
Mode: Non-destructive (crosswalk + readiness validation only)

## What changed

1. **Canonical decision recorded** in
   `docs/social-security/FINANCE_PAYMENT_MASTER_DUPLICATION_AUDIT.md`.
2. **`finance_master_crosswalk`** table created (see migration
   `20260706-192128`). Fields: `source_table`, `source_code`,
   `canonical_domain`, `canonical_table`, `canonical_code`, `active`,
   `notes`. Unique on `(source_table, source_code, canonical_table)`.
   Non-destructive — no legacy row is moved or deleted.
3. **SSB Financial Policy** (`FinancialPolicyForm.tsx`) already sources
   from the canonical `ssp_*` tables — confirmed:
   - CURRENCY          → `ssp_currency_profile`
   - PAYMENT_CHANNEL   → `ssp_payment_channel`
   - BANK_LIST         → `ssp_bank`
   - BANK_BRANCH       → `ssp_bank_branch`
   - ACCOUNT_TYPE      → `ssp_account_type`
   - SETTLEMENT_METHOD → `ssp_settlement_method`
   No further form change required.
4. **Platform Readiness** (`platformReadinessService.ts`) now includes
   `detectFinancePaymentDuplication()`:
   - **warning** if `tb_bank_code` rows exist that are not mapped in
     `finance_master_crosswalk` to a live `ssp_bank.bank_code`.
   - **warning** if `tb_method_of_payment` rows exist that are not
     mapped to a live `ssp_payment_channel.channel_code`.
   - **warning** if any policy still references the legacy `tb_*` table
     directly (guard for future regressions).
   Findings surface under the existing **Payment / Financial References**
   category with `fix_route = /admin/master-data/bank-codes` or
   `/admin/master-data/methods-of-payment` for authoring, plus a note to
   add the crosswalk row.

## What stays

- `/admin/master-data/bank-codes`
- `/admin/master-data/methods-of-payment`
- `/admin/master-data/payment-types`
- `/admin/master-data/payment-sources`
- `/admin/master-data/merchants`
- `/admin/master-data/payer-types`

All existing screens remain fully functional and are neither renamed
nor removed. `bank-codes` and `methods-of-payment` are now labelled
"BEMA-era master (adapter to Financial Reference)" in the audit doc.

## What is forbidden

- Any new BN / SSB configuration binding to `tb_bank_code`,
  `tb_method_of_payment`, `tb_payment_type`, `tb_payment_sources`,
  `tb_merchant`, or `tb_payer_type`.
- Any duplicate CRUD screen for currency, payment channel, bank, bank
  branch, account type, or settlement method.
- Any write to BN / BEMA / IA / legacy tables from this alignment.

## Acceptance checklist

- [x] No duplicate source of truth for payment channels
      (`ssp_payment_channel` canonical, `tb_method_of_payment` = adapter).
- [x] No duplicate source of truth for banks
      (`ssp_bank` canonical, `tb_bank_code` = adapter).
- [x] Existing master screens remain usable and are documented as adapters.
- [x] SSB Financial Policy consumes canonical `ssp_*` only.
- [x] Platform Readiness validates canonical source and reports
      un-mapped legacy rows as warnings.
- [x] No BN / BEMA / IA / legacy table changes.
- [x] Typecheck passes.

## Rollback

```sql
DROP TABLE IF EXISTS public.finance_master_crosswalk;
```
Revert `platformReadinessService.ts` to remove
`detectFinancePaymentDuplication()`.
