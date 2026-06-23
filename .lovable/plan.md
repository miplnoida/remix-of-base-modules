
# Central Employer Ledger — Implementation Plan

Build an audit-safe, recalculable central employer ledger used by C3, Compliance, Legal, Payments and Employer Account. This is a large foundational change; it will land in clearly bounded phases so each phase is reviewable and the TypeScript build stays green.

## Phase 1 — Schema (single migration)

Create the core ledger schema. All tables are in `public`, no RLS (per project standard), with GRANTs to `authenticated` and `service_role`.

Tables:

1. `core_employer_ledger_account` — one row per employer ledger
   - id, employer_id, employer_no, employer_name, country_code default 'SKN', status, opened_at, closed_at, created_at, updated_at
   - unique (employer_id, country_code)

2. `core_ledger_head` — chart of heads
   - head_code PK, head_name, fund_code (SS/LV/PE/LEGAL/COURT/OTHER), head_type (CONTRIBUTION/PENALTY/FINE/INTEREST/LEGAL_FEE/COURT_COST/PAYMENT/ADJUSTMENT), is_principal, is_waivable, allocation_priority, is_active
   - Seeded: SS_CONTRIBUTION, SS_FINE, SS_INTEREST, LV_CONTRIBUTION, LV_PENALTY, LV_INTEREST, PE_CONTRIBUTION, PE_PENALTY, PE_INTEREST, LEGAL_FEE, COURT_COST, PAYMENT, ADJUSTMENT
   - Principal contribution heads marked is_principal=true, is_waivable=false.

3. `core_employer_ledger_transaction` — append-only journal
   - id, transaction_no (seq), employer_ledger_account_id FK, employer_id, employer_no, transaction_date, posting_period (date, first of month), head_code FK, debit_amount, credit_amount, running_balance, source_module, source_record_type, source_record_id, source_reference_no, payment_code, mop_code, receipt_id, payment_id, legal_case_id, legal_action_id, compliance_case_id, payment_arrangement_id, description, posting_status (DRAFT/POSTED/REVERSED/ADJUSTED), reversed_transaction_id FK self, recalculation_run_id FK, created_by, created_at
   - Indexes on (employer_id, posting_period, head_code), (source_module, source_record_id), (recalculation_run_id)
   - Trigger forbids UPDATE/DELETE of rows where posting_status='POSTED' (must use reversal/adjustment instead).

4. `core_employer_ledger_balance` — period rollups
   - PK (employer_id, posting_period, head_code), opening_balance, debit_total, credit_total, closing_balance, last_calculated_at

5. `stg_bema_employer_payment` — BEMA payment import staging
   - payer_type, payer_id, payment_id, receipt_no, payment_amount, payment_code, mop_code, period, payment_date, receipt_status, batch_number, source_hash unique, imported_at

6. `stg_bema_employer_liability` — BEMA liability statement staging
   - employer_no, period, fund_code, contribution_due, contribution_paid, contribution_outstanding, penalty_fine_outstanding, total_outstanding, source_statement_date, source_hash unique, imported_at

7. `core_ledger_recalculation_run`
   - id, employer_id nullable, period_from, period_to, reason, recalculation_mode (PREVIEW/POST_ADJUSTMENTS/FULL_REBUILD_PREVIEW), status (PENDING/RUNNING/COMPLETED/FAILED), diff_summary jsonb, run_by, started_at, completed_at

8. `core_payment_allocation_rule`
   - rule_code PK, country_code, debtor_type (EMPLOYER/IP/SE), allocation_order int, head_code FK, oldest_period_first bool, is_active
   - Seeded SKN default order: SS_CONTRIBUTION, LV_CONTRIBUTION, PE_CONTRIBUTION, LEGAL_FEE, COURT_COST, SS_FINE, LV_PENALTY, PE_PENALTY, SS_INTEREST, LV_INTEREST, PE_INTEREST.

9. `core_payment_allocation`
   - id, ledger_transaction_id FK (payment credit row), receipt_id, employer_id, allocated_head_code, allocated_period, allocated_amount, legal_case_id, legal_action_id, compliance_case_id, payment_arrangement_id, created_at

Sequence: `core_ledger_transaction_no_seq` for `transaction_no`.

## Phase 2 — Posting & Allocation services (TypeScript)

New files under `src/services/ledger/`:

- `ledgerHeadService.ts` — fetch heads, head metadata, waivability check.
- `ledgerAccountService.ts` — get-or-create account for employer.
- `ledgerTransactionService.ts` — post (DRAFT→POSTED), reverse, adjust. No update/delete of POSTED rows. Idempotency via (source_module, source_record_type, source_record_id, head_code, posting_period).
- `ledgerBalanceService.ts` — recompute balance row from transactions for (employer, period, head); recompute closing/running balance.
- `paymentAllocationService.ts` — given a payment credit, walk active allocation rules, oldest-period-first, allocate against outstanding head balances; create `core_payment_allocation` rows and offsetting debit/credit transfer transactions where required. Blocks allocation > outstanding.
- `monthlyPostingService.ts` — orchestrates: pull C3 dues → post contribution debits; pull payments → post credits + allocate; call penalty service.
- `penaltyService.ts` — reads existing C3 penalty/fine/interest rate configuration (`tb_ssc_rates`, `tb_penalty`, `c3_calculation_config`) — no hardcoded SKN rates. Supports first-month, subsequent-month, recalc-as-of-date, adjustment, waiver against waivable heads only.
- `recalculationService.ts` — runs PREVIEW (diff jsonb), POST_ADJUSTMENTS (post adjustment/reversal txns tagged with `recalculation_run_id`), FULL_REBUILD_PREVIEW (recompute everything as if from scratch and diff).

## Phase 3 — BEMA staging import

- `src/services/ledger/bemaImportService.ts` — import from `bema_*` and `cn_payment` / `cn_c3_reported` into `stg_bema_*` with `source_hash` dedupe, then drive monthly posting.

## Phase 4 — Integrations

- **Legal**: replace `lgActionDuesService.fetchEmployerOutstandingByCode` to read `core_employer_ledger_balance` joined to `core_ledger_head` filtered by `fund_code in (SS,LV,PE)` and `head_type in (CONTRIBUTION, PENALTY, FINE)`. Snapshot ledger balance + transaction ids onto each `lg_case_action` (extend with `ledger_balance_snapshot jsonb`, `ledger_transaction_ids text[]`). `FinancialSnapshotPanel` Source Dues / Recovery / Legal Cost sections read from ledger views.
- **Compliance**: `lgCaseCreateService` and `ce_arrears_report_entries` consumers point at ledger balances. Referral to Legal copies ledger snapshot.
- **C3**: monthly posting service is invoked by C3 reporting finalization (hook only — no change to existing C3 calc).
- **Payments**: `cn_payment` insert path calls `paymentAllocationService`.
- **Employer Account screen**: new route `src/pages/employer/EmployerLedger.tsx` with tabs Balances / Transactions / Payments & Allocations / Penalties / Legal & Court / Recalculations / Export Statement.

## Phase 5 — Validation & warnings

Implemented in services + UI banners:

- Block: legal liability action without ledger source (unless `is_manual_legacy=true`), duplicate monthly posting, waiver against non-waivable principal, allocation > outstanding.
- Warn: unallocated payment, due penalty not posted, ledger ≠ recalc preview, legal case amount ≠ ledger snapshot.

## Phase 6 — UI surfaces

- Employer Account `EmployerLedger.tsx` (read views).
- Recalculation Wizard `LedgerRecalcWizard.tsx`: pick employer/period range/mode → preview diff → approve → post adjustments.
- Allocation Rule admin page `PaymentAllocationRules.tsx`.

## Order of execution (each step lands and verifies TS build before next)

1. Phase 1 migration (await approval).
2. Phase 2 services + unit-safe types.
3. Phase 3 BEMA import.
4. Phase 4 Legal integration first (closes the open thread from prior turns), then Compliance, then Payments hook, then C3 hook.
5. Phase 5 validators wired into existing create/post paths.
6. Phase 6 Employer Account + Recalc + Allocation Rules screens.

## Technical notes

- No RLS — role-based only (project standard).
- All `created_by` fields store logged-in `user_code` per project rule.
- Idempotency key on transaction posting prevents double-post on retries.
- `running_balance` is filled at post time per (employer, head); balances table is rebuildable from transactions, so it's a cache.
- All money fields `numeric(18,2)`.
- Seeds tagged `SEED-` where applicable.
- Recalculation always preserves originals; adjustments link via `reversed_transaction_id` and `recalculation_run_id`.

## Out of scope this batch

- Editing existing C3 penalty rate tables.
- IP/SE ledger (account type is parameterized but only employer is wired now).
- Re-importing historical BEMA arrears (importer exists; bulk run is a separate ops action).

## What I need from you

Approve Phase 1 (migration). I'll then ship Phases 2–6 incrementally, each as its own change with TS build passing.
