# Report Catalogue Guide

The catalogue lives at `/legal/reports?tab=catalog`. It renders every report from
`src/config/legalReportDefinitions.ts` grouped by category with a global search bar.

## Card metadata

Each card shows:

- Report name and short purpose statement
- Certification badge (`certified` / `draft` / `deprecated`)
- Owner and frequency
- `v_lg_case_financials` badge when the report is financial-reconciled
- Data source table list (first three)
- Recently-used and favourite indicators
- Recommended badge (`isRecommended: true`)

## Categories

`executive`, `operational`, `financial`, `compliance_referral`, `judicial`,
`recovery`, `workload`, `external_counsel`.

## Search

The search box matches across:

- Code, name, purpose
- Owner, tags, keywords
- Data source table names

Combine with `?cat=<category>` query to scope the search.

## Adding a report

1. Append a `LegalReportDefinition` entry to `LEGAL_REPORTS`.
2. Add a fetcher in `src/services/legal/lgReportFetchers.ts`.
3. Register certification in `/legal/reports/certification`.
4. Never re-compute financial totals — read from `v_lg_case_financials` /
   `lg_recoverable_liability`.
