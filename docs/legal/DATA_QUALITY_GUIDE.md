# Data Quality Guide

The Data Quality dashboard at `/legal/reports/data-quality` runs 12 live
integrity checks over Legal V1 tables. Every check is a real SQL query — no
mock data, no cached snapshot.

## The 12 checks

| Code | Category | Severity | What it checks |
|------|----------|----------|----------------|
| `DQ_MISSING_PARTIES` | parties | critical | Open cases without any `lg_case_party` row |
| `DQ_MISSING_LIABILITIES` | liabilities | critical | Open cases without any `lg_recoverable_liability` row |
| `DQ_MISSING_HEARINGS` | hearings | warning | Judgment/post-judgment matters without hearings |
| `DQ_MISSING_ORDERS` | orders | warning | Post-judgment matters without `lg_order` |
| `DQ_ORPHAN_DOCUMENTS` | documents | warning | `lg_document_link` rows with null `lg_case_id` |
| `DQ_BROKEN_REFERENCES` | references | critical | `lg_case.source_referral_id` pointing to a missing referral |
| `DQ_RECOVERY_ASSIGNMENT_GAPS` | recovery | warning | Enforcement-stage matters without recovery assignment |
| `DQ_CONSENT_ORDER_ISSUES` | consent | warning | Active consent orders with no installments |
| `DQ_APPEAL_ISSUES` | appeals | warning | Appeals past deadline still open |
| `DQ_COURT_FILING_ISSUES` | filings | info | Court filings missing `court_id` |
| `DQ_EXTERNAL_COUNSEL_ISSUES` | counsel | info | Engagements missing instructions |
| `DQ_FINANCIAL_RECONCILIATION` | financial | critical | `v_lg_case_financials.total_outstanding` vs `sum(lg_recoverable_liability.outstanding)` |

## How to fix

Each result row links directly to the affected record (case, hearing, appeal,
etc.). Fix the underlying data and re-run the check.

## Extending

Add a new `DataQualityCheck` entry to
`src/services/legal/lgDataQualityService.ts`. Every check must:

- Return `{ code, count, sampleRows }`
- Provide a `drilldownRoute` (with optional `:id` placeholder)
- Never mutate data
- Never recompute financial totals — use `v_lg_case_financials` and
  `lg_recoverable_liability` as the sole source of truth.
