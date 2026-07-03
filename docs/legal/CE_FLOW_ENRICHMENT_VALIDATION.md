# Compliance → Legal Real UI-Flow Validation

**Date:** 2026-07-03
**Environment:** Test
**Scope:** Prove the actual Compliance → Legal path — `forwardComplianceCaseToLegal` →
`acceptAndCreateCase` → `enrichCaseFromSource` — using real Compliance cases and
the compiled client-side services (no direct liability inserts, no SQL harness).

The services were invoked in an authenticated browser context via Playwright
(`page.evaluate(async () => await import('/src/services/legal/...'))`) so every
row was created by the same code path the UI wizard uses.

## Test cases

| Scenario | Compliance case | Employer | Referral | Intake | Legal case | Items | Liabilities | Total |
|---|---|---|---|---|---|---|---|---|
| A — Multi-component arrears | `CC-2024-0002` | EMP-20078 Island Construction Co | `CMP-LR-SKN-2026-000003` | `LG-INT-SKN-2026-000018` | `LG-SKN-2026-000018` | 5 | 5 | 19,000.00 |
| B — Mixed-period arrears | `CC-2024-0007` | EMP-22081 Tropical Foods Distribution | `CMP-LR-SKN-2026-000002` | `LG-INT-SKN-2026-000017` | `LG-SKN-2026-000017` | 4 | 4 | 11,400.00 |

Note on Case A: the prompt specified Paradise Beach (EMP-10045). That employer
already had an accepted referral from the earlier CE04 test (blocked by
`uq_ce_legal_ref_source_active`). CC-2024-0002 (Island Construction) was
selected instead — same 5-component structure, same fund/period spread.

## Component selection

**Case A (5 components, 3 periods, 3 funds)**

| Ref key | Head | Fund | Period | P / I / Pen |
|---|---|---|---|---|
| CEUI-A-SS-JAN24 | SS_CONTRIBUTION | SS | 2024-01 | 10,000 / 0 / 0 |
| CEUI-A-HSD-JAN24 | HSD_LEVY_CONTRIBUTION | HSD | 2024-01 | 3,000 / 0 / 0 |
| CEUI-A-SEV-FEB24 | SEVERANCE_CONTRIBUTION | SEV | 2024-02 | 2,500 / 0 / 0 |
| CEUI-A-INT-JANFEB24 | SS_CONTRIBUTION | SS | 2024-01 → 2024-02 | 0 / 1,500 / 0 |
| CEUI-A-PEN-MAR24 | SS_PENALTY | SS | 2024-03 | 0 / 0 / 2,000 |

**Case B (4 components, 2 periods, 2 funds)**

| Ref key | Head | Fund | Period | P / I / Pen |
|---|---|---|---|---|
| CEUI-B-SS-APR24 | SS_CONTRIBUTION | SS | 2024-04 | 4,500 / 0 / 0 |
| CEUI-B-HSD-APR24 | HSD_LEVY_CONTRIBUTION | HSD | 2024-04 | 1,200 / 0 / 0 |
| CEUI-B-SS-MAY24 | SS_CONTRIBUTION | SS | 2024-05 | 4,800 / 0 / 0 |
| CEUI-B-PEN-MAY24 | SS_PENALTY | SS | 2024-05 | 0 / 0 / 900 |

## Mapping verification (Case A shown; Case B identical semantics)

| Referral item | Liability | Result |
|---|---|---|
| `id` → `source_record_id` (text uuid) | ✅ 5 unique |
| `fund_code` SS/HSD/SEV → `fund_type` SOCIAL_SECURITY/HOUSING/SEVERANCE | ✅ |
| `liability_head_code` → `liability_type` SS_CONTRIB / HOUSING_LEVY / SEVERANCE / PENALTY | ✅ |
| `period_from` / `period_to` → `contribution_period_from` / `_to` | ✅ preserved incl. cross-month interest window |
| `debtor_id` (EMPLOYER) → `employer_id` | ✅ EMP-20078 / EMP-22081 |
| `principal` / `interest` / `penalty` amounts | ✅ preserved 1:1 |
| `total_assessed`, `outstanding` | ✅ recomputed by DB trigger |

## Parties created by real `enrichFromCompliance`

Both cases have exactly two `lg_case_party` rows created by the actual service
(not by SQL) — no manual party inserts:

- `COMPLAINANT / INTERNAL_DEPARTMENT` — St. Christopher and Nevis Social Security Board
- `RESPONDENT / EMPLOYER` — employer trade name resolved via `er_master`

## Rollup (`v_lg_case_financials`)

| Case | liability_count | total_assessed | total_paid | total_outstanding |
|---|---|---|---|---|
| LG-SKN-2026-000018 (A) | 5 | 19,000.00 | 0 | 19,000.00 |
| LG-SKN-2026-000017 (B) | 4 | 11,400.00 | 0 | 11,400.00 |

Totals reconcile exactly to the sum of selected referral items.

## Idempotency

`enrichCaseFromSource` was invoked a second time on both cases:

- Case A rerun: `parties_added=0, parties_updated=2, actions_created=0, liabilities_created=0, liabilities_updated=5`
- Case B rerun: `parties_added=0, parties_updated=2, actions_created=0, liabilities_created=0, liabilities_updated=4`

Match key `(lg_case_id, source_module, source_record_id)` holds — no duplicate
liability or action rows.

## Referral item status

Both referral headers moved to `ACCEPTED_BY_LEGAL`; every child
`core_legal_referral_item` row was flipped to `ACCEPTED` and stamped with its
`lg_case_action_id`. Verified:

```
CMP-LR-SKN-2026-000002 | ACCEPTED_BY_LEGAL | items=4 accepted=4
CMP-LR-SKN-2026-000003 | ACCEPTED_BY_LEGAL | items=5 accepted=5
```

## `ce_cases` back-linking

`ce_cases.legal_case_id`, `lg_case_no`, `lg_intake_id`, `lg_intake_no` are
populated by `acceptAndCreateCase` on both source cases; `status` moved to
`ESCALATED_LEGAL` (Case A) / stayed at prior status (Case B, was ACTIVE →
ESCALATED_LEGAL by forwarding stamp).

## Distinction from earlier seeded scenarios

| Scenario | Case No | How created |
|---|---|---|
| UAT direct-seed arrears | SEED-LG-2026-0001..0003 | Direct SQL inserts into `lg_recoverable_liability` |
| CE04 harness | SEED-LG-2026-CE04 | SQL replicated the enrichment mapping |
| **Real-flow A** | **LG-SKN-2026-000018** | **`forwardComplianceCaseToLegal` + `acceptAndCreateCase` + `enrichCaseFromSource` invoked as compiled TS modules under an authenticated browser session** |
| **Real-flow B** | **LG-SKN-2026-000017** | Same |

## Limitations

- `SSBCaseView` (`/legal/cases/:id`) is a legacy screen backed by
  `useLegalCases` client mock context. It shows "Case not found" because it
  does not query `lg_case`. Matter Workspace / Recovery Workbench pages that
  read `lg_case` + `lg_recoverable_liability` render the new data correctly.
  Retiring or rewiring `SSBCaseView` is tracked separately.
- No source-document rows were attached (test payloads passed no `documents`).
  When the wizard is used interactively, `ce_case_documents` / uploaded files
  flow through `insertReferralDocuments` → `lg_document_link` unchanged.

## Typecheck

`bunx tsgo --noEmit` — clean, no source changes required.
