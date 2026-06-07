## BN Payment Preparation Rework

Note: The BEMA legacy `.sru/.srd` files are not in this workspace. I'll model the concepts (cheque batch + range, reprint/cancel/correct, direct deposit export, reconciliation, long/short term separation) from your spec and prior BEMA notes already in repo memory. If you have the legacy files to upload, share them and I'll align field-by-field.

### Phase A — Schema (single migration)
Tables created/extended:
- `bn_payment_instruction` — extend with `payment_type`, `currency`, `validation_status`, `validated_at/by`, `bank_account_snapshot` (jsonb), `cheque_address_snapshot` (jsonb). Status enum widened.
- `bn_payment_batch` — extend with `batch_type` (EFT/CHEQUE/MIXED), `benefit_type`, `payment_period`, `bank_account_ref`, `prepared_by/at`.
- `bn_batch_item` — already exists; add `bank_account_snapshot`, `cheque_number`, `error_message`.
- `bn_eft_file` (new) — file metadata + hash + submission tracking.
- `bn_cheque_register` (new) — per-cheque row with print/reprint/cancel/dispatch fields + reasons.
- `bn_cheque_stock` (new) — bank account → cheque-book ranges, next number, used/cancelled counters.
- `bn_country_payment_config` — extend with EFT format fields (header/detail/trailer specs, file naming, date format, account/routing rules).
- `bn_payment_reconciliation` (new) — bank response items: accepted/rejected/returned, reason, link to batch_item.

All public-schema tables get GRANTs to `authenticated` + `service_role`. RLS stays off per project rule.

Number sequences added to `system_reference_sequence` for `BN/PAY/EFT/YYYY` and `BN/PAY/CHQ/YYYY`.

### Phase B — Services (`src/services/bn/payment/`)
- `payableValidationService.ts` — runs the 8 validation checks; flips `validation_status` + writes blockers.
- `paymentBatchService.ts` — create batch, add items, validate, approve, lock.
- `eftFileService.ts` — render bank file from country pack template, hash, store, mark generated/submitted, ingest response file.
- `chequePrintService.ts` — assign cheque numbers from stock, print/reprint/cancel/correct, dispatch.
- `chequeStockService.ts` — register & consume cheque ranges.
- `paymentIssueService.ts` — finalize batch → write history → update entitlement/claim status → fire notifications.
- `postIssueService.ts` — bank rejection, returned/stale cheque, stop payment, reissue.
- `paymentReconciliationService.ts` — import bank response, match by reference, mark reconciled.
- `paymentNumberingService.ts` — central batch number + cheque sequence allocation.
- Extend `postApprovalOrchestrator.ts` to call new validation service before queuing payable; short-term → instant payable, long-term → schedule-driven payable (duplicate-period guard).

### Phase C — UI

Updated routes (existing routes kept, content reworked):
- `/bn/payables` — Payables Queue with filters (benefit type, method, payee, amount, status, hold reason, period) + actions Validate/Hold/Release/Add to Batch/View.
- `/bn/batches` — Batch list + Batch Wizard (type, date, period, benefit, bank account) + per-batch detail (items, validation, approve).
- `/bn/eft` (new under batch detail) — EFT generator panel: validate, generate file, download, mark submitted, upload bank response.
- `/bn/cheques` (new) — Cheque batch panel: assign numbers (start no + auto-range), preview, print, reprint, correct, annul, mark dispatched.
- `/bn/cheque-stock` (new admin) — register cheque books per bank account.
- `/bn/issue` — issue EFT or cheque batch (locks batch, writes history).
- `/bn/post-issue` — exceptions: rejected/returned/stale/stop/reissue.
- `/bn/config/payment` (under existing BN Config) — Country Pack payment & EFT format editor.
- Claim Workbench panel — adds Payment block: instruction status, batch #, EFT/cheque ref, issued date, history; if approved-no-payable shows "Generate Payable" action.

Components live in `src/components/bn/payment/*` and reuse existing `SearchableSelect`, `BlockingOverlay`, and `useBlockingMutation` patterns.

### Phase D — Communications & Audit
- Wire payment lifecycle events to `bn_communication_log` via existing notification engine: payment_queued (internal), eft_generated (internal), cheque_printed (internal), payment_issued (claimant if configured), bank_rejected/cheque_returned (claimant + officer).
- Every action writes to `system_audit_trail` + `bn_claim_event`.

### Phase E — Duplicate-period guard
Unique partial index on `bn_payment_instruction (entitlement_id, period_start, period_end)` where status not in cancelled/voided. Service-level pre-check returns friendly error.

### Phase F — Acceptance verification
Manual run-through with SSN 950001:
1. Approved EI claim → instruction created → appears in /bn/payables READY.
2. Validate → add to CHEQUE batch → assign cheque numbers → print → issue → reconcile.
3. Long-term pension scenario: entitlement → scheduled instruction → EFT batch → file download → submit → response import.
4. TypeScript build passes.

### Out of scope (this round)
- Actual bank-specific binary formats (we ship a configurable text/CSV template; you can plug NACHA/SWIFT/local formats via Country Pack later).
- Physical printer integration (we generate a print-ready HTML/PDF batch).
- Cheque MICR layout (HTML template only; can extend later).

### Delivery order
1. Migration (await approval).
2. Services + numbering + validation.
3. Payables Queue + Batch wizard.
4. EFT file + Cheque print/stock UI.
5. Issue + Post-issue + Reconciliation.
6. Workbench panel + comms + audit.
7. Build check + walkthrough notes.

Approve and I'll start with the migration.