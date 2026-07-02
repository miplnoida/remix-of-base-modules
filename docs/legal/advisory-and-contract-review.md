# Advisory & Contract Review — Phase 10

Advisory work (NDAs, MOUs, vendor contracts, legal opinions, policy advice)
runs alongside — but is kept **separate from** — recovery cases so that
management KPIs are not diluted.

## Data model

| Table | Role |
|-------|------|
| `lg_contract_review` | Contract / MOU / NDA request metadata |
| `la_matter` | Non-recovery legal matter (opinion, policy advice) |
| `lg_case_activity` | Shared timeline (mirrored via `entity_type = ADVISORY`) |
| `lg_document_link` | Attached drafts, redlines, executed copies |

## Lifecycle

`SUBMITTED → ASSIGNED → UNDER_REVIEW → INFO_REQUESTED → COMMENTS_ISSUED →
APPROVED | REJECTED → CLOSED`

Every transition uses `useLgAccess` capability checks:

| Action | Capability |
|--------|------------|
| Submit request | any legal role |
| Assign / reassign reviewer | `canAssignCase` |
| Request info | `canRequestInfo` |
| Issue comments / draft opinion | `canDraftLetter` |
| Approve / reject | `canApproveAdvice` |
| Close | `canApproveClosure` |

## Screens

- List: `/legal-advanced` (`LAMatterList`) with `LgDataGrid`, filters for
  requesting department, counterparty, risk band, renewal date.
- Detail: `/legal-advanced/matter/:id` — capture requesting dept,
  counterparty, contract value, effective / expiry / renewal dates, risk
  band, comments, version history, decision, attached documents.
- Advisory items surface in **My Work** but under a separate "Advisory"
  section so they never inflate the recovery workbench KPIs.

## Analytics

Explorer dataset `lg.advisory` provides: turnaround time, workload per
reviewer, overdue renewals, comments-per-review, decision distribution.
