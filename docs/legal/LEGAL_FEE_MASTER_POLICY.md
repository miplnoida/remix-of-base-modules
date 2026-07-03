# Legal Fee Master — Single-Source Policy

## Decision

**No new Legal Cost Master is created.** The existing Fee Master (`lg_fee_rule` + `lg_fee_bundle` + `lg_fee_charge` + `lg_fee_waiver_policy`) is the single source of truth for every court, legal and cost category. Legal Costs (`lg_legal_cost`) reference fee heads from the Fee Master rather than a parallel category table.

## Rationale

- `lg_fee_rule` already models: fee head, calculation type (Fixed / Percentage / Formula / Tier / Manual), min / max, effective dating, waiver policy, auto-apply per event.
- `LG_FEE_EVENT` reference group (10 values) already drives event-based auto-apply.
- Introducing a second cost/category table would fragment reporting, waivers and ledger posting.

## Fee Heads — current inventory

Present in `lg_fee_rule.fee_head_code`:

| Fee Head Code | Category | Notes |
|---|---|---|
| `LEGAL_COURT_FILING_FEE` | Court Filing Fee | Filings |
| `LEGAL_JUDGMENT_COST` | Court Cost | Judgment-related |
| `LEGAL_SERVICE_FEE` | Legal Notice Fee | Notices |
| `LEGAL_ATTORNEY_COST` | Attorney Fee | Internal & external counsel |
| `LEGAL_EXECUTION_COST` | Execution Fee | Includes sheriff / bailiff execution |
| `LEGAL_APPEAL_FEE` | Appeal Fee | Appeal & cross-appeal |
| `LEGAL_RECOVERY_COST` | Enforcement Fee | Post-judgment enforcement |
| `LEGAL_PROCESSING_FEE` | Administrative Legal Cost | General administrative |

## Coverage matrix (plan requirements → existing head)

| Required category | Existing fee head | Gap? |
|---|---|---|
| Court Filing Fee | `LEGAL_COURT_FILING_FEE` | No |
| Court Cost | `LEGAL_JUDGMENT_COST` | No |
| Legal Notice Fee | `LEGAL_SERVICE_FEE` | No |
| Attorney Fee | `LEGAL_ATTORNEY_COST` | No |
| Execution Fee | `LEGAL_EXECUTION_COST` | No |
| Sheriff / Bailiff Fee | `LEGAL_EXECUTION_COST` (sub-classified by `event_code` on `lg_fee_rule`) | No — modelled via event/rule not a new head |
| Appeal Fee | `LEGAL_APPEAL_FEE` | No |
| Variation Filing Fee | `LEGAL_COURT_FILING_FEE` with `event_code = CONSENT_VARIATION` | No — event-scoped rule |
| Enforcement Fee | `LEGAL_RECOVERY_COST` | No |
| Administrative Legal Cost | `LEGAL_PROCESSING_FEE` | No |

**Conclusion:** every category required by EPIC-06/07 is covered by existing fee heads. Sub-categorisation (e.g. Sheriff vs Bailiff, first vs subsequent variation filing) is intentionally handled as **rules** (`lg_fee_rule` + `event_code`) rather than new fee heads, so waiver policies, tiers and ledger posting rules continue to apply.

## Rules for future changes

1. New cost categories must first be evaluated as a **fee rule / event** on an existing head.
2. A new fee head is only justifiable when the amount posts to a distinct ledger account or has an independent waiver policy.
3. Fee heads must never be free text on `lg_legal_cost` or `lg_court_filing` — always resolve to an active `lg_fee_rule` row.
4. `LG_FUND_TYPE` (SSB fund) is the recovery / posting dimension; fee heads describe the *cost*. Do not merge the two.

## Ownership

- Fee Master (`lg_fee_rule`, bundles, waivers): Legal Admin, System Admin.
- Fund Types / Liability Types (recovery-side): Legal Admin, System Admin.
- All fee/head changes require audit entry (already captured via `lg_liability_audit` / activity tables).
