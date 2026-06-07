
# BN Bank / EFT / Cheque — Configurable Masters

Treat BEMA as **operational reference only**. BN ships configurable masters instead of hardcoded DataWindow exports. A background research agent is parsing the BEMA artefacts (`d_t_directdepositrpt.srd`, `p_d_t_DirectDepositRpt.sql`, `d_export.srq`, `u_tab_cheque.sru`, `n_bso_cheque_print.sru`, `q_dbd_cheques*`, `ds_cheques_recon.srd`, DDL); its findings will be appended to the legacy-mapping doc in Phase 1 — they do **not** block the BN build because BN owns its own schema.

## Phase 1 — Legacy mapping doc (no code)
Output a short markdown file `docs/bn/legacy-payment-mapping.md`:
- BEMA tables found vs. missing (bank master, branch master, EFT format, cheque stock, recon).
- BEMA hardcoded export layout (header/detail/trailer) quoted verbatim so it can be entered as a seeded BN format.
- Field-by-field map: BEMA column → `bn_payment_profile` / `bn_eft_format_field.source_field`.
- Cheque concepts kept from BEMA: batch, number range, print / reprint / cancel / correct.

## Phase 2 — Schema migration (single migration, GRANTs included)

New tables (all with `service_role` + `authenticated` grants, audit triggers, updated_at):

- **`bn_bank_master`** — `bank_code` (PK), `country_code`, `bank_name`, `swift_code`, `clearing_code`, `default_currency`, `active`.
- **`bn_bank_branch`** — `(bank_code, branch_code)` PK, `branch_name`, `routing_number`, `address_snapshot` JSONB, `active`.
- **`bn_payment_method`** — `method_code` (`EFT`/`CHEQUE`/`CASH_PICKUP`/`INTERNAL_TRANSFER`), `method_name`, `requires_bank_account`, `requires_postal_address`, `active`.
- **`bn_eft_format`** — `format_code` PK, `country_code`, `bank_code` (nullable = generic), `format_name`, `file_extension`, `delimiter`, `record_separator`, `date_format`, `amount_format`, `amount_decimals`, `header_required`, `trailer_required`, `encoding`, `active`.
- **`bn_eft_format_field`** — `(format_code, record_type, order_index)` PK, `record_type` enum `HEADER|DETAIL|TRAILER`, `field_name`, `source_field` (dotted path into `bn_payment_instruction` + joined profile/bank/branch/batch), `start_position`, `length`, `padding` (`L`/`R`/`ZERO`/`NONE`), `pad_char`, `required`, `default_value`, `transform` (`UPPER`/`DIGITS`/`DATE_FMT`/...).
- **`bn_cheque_stock`** — `(bank_account_code, cheque_start_no)` PK, `bank_code`, `branch_code`, `cheque_end_no`, `next_cheque_no`, `status` (`ACTIVE|EXHAUSTED|VOIDED`), `assigned_to_office`, `received_at`.
- **`bn_cheque_register`** — `cheque_number` PK, `bank_account_code`, `batch_id` FK `bn_payment_batch`, `payment_instruction_id` FK, `payee_name`, `amount`, `currency`, `status` (`ASSIGNED|PRINTED|DELIVERED|REPRINTED|CANCELLED|RECONCILED`), `printed_at`, `printed_by`, `reprint_of`, `cancelled_at`, `cancel_reason`, `correction_of`, `reconciled_at`.
- Extend `bn_payment_batch`: `eft_format_code`, `eft_file_storage_path`, `eft_control_total`, `eft_control_count`, `bank_response_status`, `bank_response_at`.
- Extend `bn_payment_profile`: `bank_code` FK `bn_bank_master`, `branch_code` (paired with `bank_code` → `bn_bank_branch`).

Seed rows (channel `SEED-`): generic `EFT_GENERIC_FIXED`, `EFT_GENERIC_DELIMITED`, one per `eftFormatPresets.ts` entry; `CHEQUE` method; seed `bn_payment_method` rows.

Register screens in `app_modules` + `module_actions` (auto-granted to Admin):
`bn_bank_master`, `bn_bank_branch`, `bn_payment_method`, `bn_eft_format`, `bn_cheque_stock_admin`, `bn_cheque_register` — all under existing Payment Preparation parent.

## Phase 3 — Configuration UI

New page at `/bn/config/payment-masters` with tabs (single shell, lazy-loaded panels):
1. **Payment Methods** — toggle per country.
2. **Bank Master** — CRUD, search by SWIFT/clearing.
3. **Bank Branches** — nested under selected bank, routing-number validation.
4. **EFT Formats** — header card (delimiter/date/amount) + preset selector that seeds from `eftFormatPresets.ts`.
5. **EFT Field Layout** — drag-reorderable rows per record type, live preview of one sample detail line built from a sample `bn_payment_instruction`.
6. **Cheque Stock** — replaces existing simple `/bn/cheque-stock` page (keep route, swap content); add range allocation, status, next-number guard.
7. **Cheque Number Rules** — per-bank-account: prefix, length, void-on-cancel?, reprint policy.

`CountryPaymentConfig` (existing EFT preset tab) stays for country-level defaults; it links across to the new EFT Format master rather than duplicating fields.

## Phase 4 — Service layer

- `bankMasterService.ts` — CRUD + lookup helpers.
- `eftFormatService.ts`:
  - `getFormatForBatch(batchId)` → resolves via `eft_format_code` → falls back to country preset.
  - `buildEftFile(batchId)` — pure function over `bn_eft_format` + `bn_eft_format_field`, materialises HEADER/DETAILs/TRAILER, computes control totals, returns `{ filename, content, controlTotal, controlCount }`.
  - `validateFormat(formatCode)` — required fields present, positions don't overlap, lengths > 0.
- `chequeStockService.ts` (extend existing): `allocateNextNumbers(batchId, count)` — atomic update of `next_cheque_no`; writes `bn_cheque_register` rows in `ASSIGNED` state.
- `chequePrintService.ts` (extend): transitions `ASSIGNED → PRINTED`; supports `reprint`, `cancel(reason)`, `correct(newAmount/newPayee)` — every state change audited via `bn_claim_event` + `system_audit_trail`.

## Phase 5 — Payment Preparation wiring

`PaymentExecutionPanel` (Batch Detail drawer):
- **EFT path**: pick `eft_format_code` (defaulted from country+bank); preview first 3 detail lines; generate → store in Supabase Storage `bn-payments/eft/{batchId}/...`; persist `eft_file_storage_path`, `eft_control_total`, `eft_control_count`; show "Mark Submitted to Bank" + later "Upload Bank Response" → reconcile.
- **Cheque path**: enforce bank-account selection → allocate from `bn_cheque_stock` → render `ChequePrintView` per cheque → on confirm, mark `PRINTED`; expose Reprint / Cancel / Correct from the row menu.

`payableValidationService` adds these blockers:
- EFT method but no `bn_bank_master` row for profile's `bank_code`.
- EFT method but no active `bn_eft_format` resolved for batch.
- Missing `branch_code` on profile when format requires it.
- Cheque method but no `ACTIVE` `bn_cheque_stock` with capacity for batch size.
- Duplicate cheque number detected (unique-constraint catch with friendly message).
- Verified bank profile missing (already covered).
- EFT file generation refuses unless control total + count are computed.

## Phase 6 — Audit & acceptance

- All bank/branch/method/format/stock CUD writes to `system_audit_trail` with `user_code`.
- Cheque state machine events written to `bn_claim_event` (`CHEQUE_PRINTED`, `CHEQUE_REPRINTED`, `CHEQUE_CANCELLED`, `CHEQUE_CORRECTED`).

Acceptance checklist:
- Legacy mapping doc committed.
- Admin can create a bank → branch → EFT format → field layout end-to-end with no code change.
- Cheque stock allocation + register lifecycle works for a sample batch.
- EFT file regenerable, byte-stable for the same batch input.
- Payables Queue blocks all six validation cases above with actionable reasons.
- TypeScript build passes.

## Files (new / edited)

**New**
- `supabase/migrations/<ts>_bn_bank_eft_cheque_masters.sql`
- `docs/bn/legacy-payment-mapping.md`
- `src/services/bn/payment/bankMasterService.ts`
- `src/services/bn/payment/eftFormatService.ts` (replaces inline preset use)
- `src/pages/bn/config/payment-masters/PaymentMastersPage.tsx`
- `src/pages/bn/config/payment-masters/{BankMasterTab,BranchTab,MethodsTab,EftFormatTab,EftLayoutTab,ChequeStockTab,ChequeRulesTab}.tsx`
- `src/types/bnBankEft.ts`

**Edited**
- `src/components/bn/batch/PaymentExecutionPanel.tsx`
- `src/services/bn/payment/payableValidationService.ts`
- `src/services/bn/payment/chequeStockService.ts`, `chequePrintService.ts`, `eftFileService.ts`
- `src/components/sidebar/menuItems/bnMenuItems.ts`
- `src/components/routing/AppRoutes.tsx`
- `src/pages/bn/admin/ChequeStock.tsx` (point to new tab or thin wrapper)
- `mem://features/bn/payment-details-framework.md` (cross-link to bank/EFT masters)

## Decisions needed
1. **Phasing** — ship Phase 2 (schema) + Phase 4 (services) + minimal admin CRUD first, then Phase 3 polish + Phase 5 wiring in a follow-up — or all-in-one?
2. **Country scoping** — should `bn_bank_master` be hard-scoped per country (FK to `bn_country`) or global with a country tag (current draft)?
3. **EFT response reconciliation** — minimal "mark submitted/upload response file" now, or full parser per format in this pass?
