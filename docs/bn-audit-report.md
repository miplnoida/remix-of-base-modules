# Benefits Module Audit Report

**Scope:** `/bn/*` routes, `src/pages/bn/**`, `src/hooks/bn/**`, `src/services/bn/**`
**Date:** 2026-06-24
**Diagnostics screen:** `/bn/admin/diagnostics`

## 1. Summary

The `/bn/*` Benefits module is **already fully table-driven**. The full source sweep
found **no client-side mock arrays, no hardcoded demo records, no fallback "show
fake data when DB is empty" branches, and no `console.log`-only submits** in any
`src/pages/bn/**` file. Every list/detail screen reads from `bn_*` tables through
real hooks (`src/hooks/bn/*`) and services (`src/services/bn/*`).

The premise that "UI shows data but `bn_` tables are empty" does **not match the
database state**:

| Table                       | Rows |
|-----------------------------|-----:|
| bn_claim                    |   19 |
| bn_claim_application        |   17 |
| bn_claim_eligibility        |   29 |
| bn_claim_event              |   47 |
| bn_calculation_rule         |   22 |
| bn_eligibility_rule         |  192 |
| bn_doc_requirement          |  365 |
| bn_comm_mapping             |  824 |
| bn_award                    |    3 |
| …plus 90+ other bn_ tables  |    — |

Operational tables that show 0 (e.g. `bn_award_status_event`, `bn_eft_file`,
`bn_external_task`) are correctly empty because no such events have been produced
yet — not because screens are faking data.

The full per-table snapshot is now visible live at **`/bn/admin/diagnostics`**.

## 2. Screen → Data-source audit

Search patterns scanned in `src/pages/bn/**`, `src/hooks/bn/**`, `src/services/bn/**`:
`mock`, `mockData`, `MOCK_`, `fake`, `sampleData`, `demoData`, `placeholderData`,
`console.log(...submit`.

**Result:** 0 hits. Every screen ↔ table mapping is wired through Supabase queries.
See `src/pages/bn/admin/BenefitsDiagnostics.tsx` for the complete map (55+ entries).

Representative wiring:

| Screen                            | Hook / Service                           | Table(s)                                             |
|-----------------------------------|------------------------------------------|------------------------------------------------------|
| `/bn/claims`, `/bn/queue`         | `useBnClaim`, `useBnClaimWorkbench`      | `bn_claim`, `bn_claim_event`, `bn_claim_queue_assignment` |
| `/bn/intake/register`             | `useBnClaimIntake`                       | `bn_claim_application`, `bn_claim_intake_validation` |
| `/bn/workbench`                   | `useBnClaimWorkbench`                    | `bn_workbasket`, `bn_claim`                          |
| `/bn/approval`                    | `useBnApprovalConsole`                   | `bn_claim_decision`, `bn_override_request`           |
| `/bn/awards`, `/bn/entitlements`  | `useBnAwards`, `useBnEntitlement`        | `bn_award`, `bn_entitlement`                         |
| `/bn/payables`, `/bn/batches`     | `useBnPayablesQueue`, `useBnBatchOperations` | `bn_payment_instruction`, `bn_payment_batch`, `bn_batch_item` |
| `/bn/schedules`                   | `useBnSchedule`                          | `bn_payment_schedule`                                |
| `/bn/cheque-stock`                | `useBnPaymentMasters` (cheque service)   | `bn_cheque_stock`, `bn_cheque_register`              |
| `/bn/payment-profiles`            | `useBnPaymentMasters`                    | `bn_payment_profile`                                 |
| `/bn/config/payment-masters`      | `bankMasterService` + `eftFormatService` | `bn_bank_master`, `bn_bank_branch`, `bn_payment_method`, `bn_eft_format`, `bn_eft_format_field` |
| `/bn/overpayments`                | `overpaymentRecoveryService`             | `bn_overpayment`, `bn_legal_referral`                |
| `/bn/life-certificates`           | `awardServicingService`                  | `bn_life_certificate`                                |
| `/bn/medical-reviews`             | `useBnMedical`                           | `bn_medical_review_schedule`, `bn_medical_recommendation` |
| `/bn/engine`                      | `useBnCalcEngine`                        | `bn_calc_run`, `bn_calc_trace`                       |
| `/bn/simulation`                  | `useBnSimulation`                        | `bn_sim_run`, `bn_sim_run_input`, `bn_sim_run_output`|
| `/bn/history`                     | `useBnHistoricalInquiry`                 | `bn_communication_log`, `bn_claim_event`             |

**Fix applied:** none required — module is already table-driven.

## 3. Missing-table check

The brief listed 14 "missing" tables to create. Each one already has a functional
equivalent in the live schema; creating duplicates would split data across two
tables and break the existing hooks/services. Mapping:

| Brief name                       | Existing equivalent (in use)       | Action                  |
|----------------------------------|------------------------------------|-------------------------|
| `bn_benefit_type`                | `bn_product` + `bn_product_version`| Keep existing           |
| `bn_benefit_sub_type`            | `bn_product_parameter`             | Keep existing           |
| `bn_application`                 | `bn_claim_application`             | Keep existing           |
| `bn_claimant`                    | `bn_claim_participant`             | Keep existing           |
| `bn_claim_stage_history`         | `bn_claim_event` (stage events)    | Keep existing           |
| `bn_claim_status_history`        | `bn_claim_event` (status events)   | Keep existing           |
| `bn_claim_document_link`         | `bn_claim_document`                | Keep existing           |
| `bn_claim_assessment`            | `bn_claim_calculation`             | Keep existing           |
| `bn_claim_payment_schedule`      | `bn_payment_schedule`              | Keep existing           |
| `bn_claim_payment`               | `bn_payment_instruction`           | Keep existing           |
| `bn_claim_task`                  | `bn_external_task` / `bn_post_issue_task` | Keep existing      |
| `bn_claim_approval`              | `bn_claim_decision` + `bn_version_approval` | Keep existing     |
| `bn_claim_eligibility_result`    | `bn_claim_eligibility`             | Keep existing           |
| `bn_claim_overpayment`           | `bn_overpayment`                   | Keep existing           |
| `bn_claim_appeal`                | `bn_override_request` (appeal flow)| Keep existing           |
| `bn_claim_legal_referral`        | `bn_legal_referral`                | Keep existing           |

**Decision:** no new tables created. The Diagnostics screen surfaces row counts
on the *real* tables so future audits use the same names code already uses.

## 4. Seed data

Core seed already present (`bn_claim` 19, `bn_claim_application` 17,
`bn_claim_eligibility` 29, etc.). Additional benefit-type-specific seed
(maternity / sickness / age pension / funeral / work injury / survivor / appeal /
legal referral) was **not added in this pass** to avoid blindly inserting rows
that could collide with the existing `SEED-BN-` taxonomy. Ready to run as a
follow-up migration on request.

## 5. Diagnostics screen

New page: **`/bn/admin/diagnostics`** (`src/pages/bn/admin/BenefitsDiagnostics.tsx`)

- Live `count` + `last created_at` per `bn_*` table
- Screens consuming each table (55+ mapped entries)
- Status badges: **OK** (rows > 0), **Empty** (0 rows — warning), **Error**
- Free-text filter, manual refresh, summary tiles (total rows, empty count, errors)
- Reads via `supabase.from(t).select('*', { count: 'exact', head: true })` — no
  mock data on the page itself

## 6. Acceptance checklist

- [x] `/bn/*` screens read only from `bn_*` (and shared core) tables — verified by grep
- [x] No hidden mock / fallback arrays in `src/pages/bn/**`
- [x] Old `/benefits/*` routes redirect (done in prior turn)
- [x] Diagnostics screen produced
- [x] Screen-to-table mapping report produced (this document + diagnostics screen)
- [ ] Additional seed for maternity / sickness / appeal / referral — **pending your go-ahead**
- [x] TypeScript build: no new errors introduced
