# Finance / Payment Master Duplication Audit

Scope: reconcile the SSB Financial Reference domain (`ssp_*`) with the
pre-existing Master Data screens under `/admin/master-data/*` so that BN
Product Builder Wave 1 consumes a single source of truth per concept.

No BN / BEMA / IA / legacy DDL. No existing master screen is deleted.
No duplicate CRUD is introduced.

## Concept-by-concept matrix

| Concept          | Existing master screen                       | Existing master table   | New / Canonical Financial Reference table | Current consumers of legacy master                              | Overlap / duplicate risk                                                                                     | Recommended canonical source | Alignment approach |
|------------------|----------------------------------------------|-------------------------|-------------------------------------------|-----------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|------------------------------|--------------------|
| Currency         | *(none)*                                     | *(none)*                | `ssp_currency_profile`                    | SSB Financial Policy, Cashier config                            | None                                                                                                         | `SSP_FINANCIAL_REFERENCE`    | Keep `ssp_currency_profile`. No adapter needed. |
| Payment Channel  | `/admin/master-data/methods-of-payment`      | `tb_method_of_payment`  | `ssp_payment_channel`                     | Cashier / receipt screens, legacy BEMA payment plans           | **High** — both lists describe how money is paid/received (CASH, CHEQUE, EFT, ONLINE, MOBILE_WALLET)         | `SSP_FINANCIAL_REFERENCE`    | Canonical = `ssp_payment_channel`. Existing screen kept as an **ADAPTER** for BEMA-era `tb_method_of_payment`; rows mapped via `finance_master_crosswalk` (`source_table='tb_method_of_payment'`, `canonical_table='ssp_payment_channel'`). |
| Bank             | `/admin/master-data/bank-codes`              | `tb_bank_code`          | `ssp_bank`                                | Legacy `cl_bank_acct`, BEMA payment plans, cashier             | **High** — both list banks by code / name                                                                    | `SSP_FINANCIAL_REFERENCE`    | Canonical = `ssp_bank`. Existing bank-codes screen kept as adapter; `finance_master_crosswalk` maps `tb_bank_code.bank_code` → `ssp_bank.bank_code`. |
| Bank Branch      | *(none — branches were embedded in BEMA)*    | *(embedded)*            | `ssp_bank_branch`                         | SSB Financial Policy                                            | Low                                                                                                          | `SSP_FINANCIAL_REFERENCE`    | Keep `ssp_bank_branch`. |
| Account Type     | *(none)*                                     | *(none)*                | `ssp_account_type`                        | SSB Financial Policy                                            | None                                                                                                         | `SSP_FINANCIAL_REFERENCE`    | Keep `ssp_account_type`. |
| Settlement Method| *(none)*                                     | *(none)*                | `ssp_settlement_method`                   | SSB Financial Policy                                            | None                                                                                                         | `SSP_FINANCIAL_REFERENCE`    | Keep `ssp_settlement_method`. |
| Payment Type     | `/admin/master-data/payment-types`           | `tb_payment_type`       | *(intentionally none)*                    | Cashier receipt / invoice classification                        | **None** — `payment_type` is a *classification* (contribution, penalty, fine, refund…), not a channel        | `EXISTING_MASTER`            | Keep `tb_payment_type` as the classification master. Do **not** move to `ssp_payment_channel`. |
| Payment Source   | `/admin/master-data/payment-sources`         | `tb_payment_sources`    | *(intentionally none)*                    | Receipts (source-of-funds label: employer, self, bank transfer) | **None** — different domain from channel                                                                     | `EXISTING_MASTER`            | Keep `tb_payment_sources`. |
| Merchant         | `/admin/master-data/merchants`               | `tb_merchant`           | *(intentionally none)*                    | Card acquirer / POS merchants                                   | **None** — merchant registry ≠ payment channel                                                               | `EXISTING_MASTER`            | Keep `tb_merchant`. |
| Payer Type       | `/admin/master-data/payer-types`             | `tb_payer_type`         | *(intentionally none)*                    | Payer classification on receipts                                | **None**                                                                                                     | `EXISTING_MASTER`            | Keep `tb_payer_type`. |

## Duplicate risk summary

- **True duplicates** (same concept, two lists): **Payment Channel**, **Bank**.
  Both are resolved through the new `finance_master_crosswalk` table so
  legacy screens keep working while the canonical source stays in
  Financial Reference.
- **Apparent-but-not-duplicate** (different concepts, similar names):
  Payment Type, Payment Source, Merchant, Payer Type — kept independent.

## Rules going forward

1. SSB / BN / any new configuration **must** bind to `ssp_*` for
   Currency, Payment Channel, Bank, Bank Branch, Account Type,
   Settlement Method.
2. Legacy screens `/admin/master-data/bank-codes` and
   `/admin/master-data/methods-of-payment` continue to author BEMA-era
   `tb_*` rows but must **register a crosswalk row** for each code so
   Platform Readiness can detect orphan mappings.
3. `Payment Type`, `Payment Source`, `Merchant`, `Payer Type` remain
   authored on their existing master screens.
4. Platform Readiness reports a `warning` finding for every
   `tb_bank_code` / `tb_method_of_payment` row that is missing from
   `finance_master_crosswalk` **or** points at a non-existent canonical
   code.
