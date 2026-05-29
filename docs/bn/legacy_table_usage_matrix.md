# BN Legacy Table Usage Matrix

**Status:** Read-only audit. R-ARCH (adapter-only access to legacy tables).
**Audit date:** 2026-05-29.
**Sources:** `grep "from('<table>')"` over `src/services/bn`, `src/pages/bn`,
`src/adapters`.

Legend:
- **Adapter** — access flows through `src/services/bn/integration/*Adapter.ts` (preferred).
- **Service** — access in a BN service file but not yet behind a contract.
- **Page** — direct table access from a page component (must be refactored).

---

## Legacy table → BN consumer map

| Legacy table | Layer | Files | Mode | Verdict |
|---|---|---|---|---|
| `ip_master` | Adapter | `integration/personAdapter.ts` (×4), `integration/notificationAdapter.ts`, `bnNotificationIntegrationService.ts` | read | ✅ compliant; tighten notification service to use adapter. |
| `ip_wages` | Adapter + Service | `integration/contributionAdapter.ts` (×2), `integration/employerAdapter.ts`, `person360Service.ts` | read | ✅ compliant; `person360Service.ts` should call adapter rather than table directly. |
| `er_master` | Adapter | `integration/employerAdapter.ts` (×2) | read | ✅ compliant. |
| `cn_receipt` | — | not yet wired in BN | n/a | Will be needed for premium-credit verification (R-DOC). |
| `cl_head` (+ `_orig`, `_recalc`, `_wages`, `_notes`, `_2014`, `_NEW`) | — | not yet wired | n/a | Required by Historical Inquiry / Audit Decision History — add `historicalInquiryAdapter` in Phase 5. |
| `cl_detail_sb`, `cl_detail_sib`, `cl_detail_matern`, `cl_detail_funeral`, `cl_detail_pen`, `cl_detail_me`, `cl_detail_refund`, `cl_detail_ui_*`, `cl_detail_review_questions`, `cl_detail_unemploy` | — | not yet wired | n/a | Historical drill-down only — adapter, read-only. |
| `cl_cheques` | Service | `paymentIssueService.ts` (insert), `batchOperationsService.ts` (read), `person360Service.ts` (read) | **write + read** | ⚠️ writes are spec-approved (`BN_Payment_Issue_Specification.md`); ensure pages call the service, never `cl_cheques` directly. |
| `cl_cheques_holding` | Service | `paymentIssueService.ts` (read/update), `postIssueService.ts` (update) | read + write | ⚠️ same as above. |
| `cl_cheques_survivor` | Service | `postIssueService.ts` (read/update) | read + write | ⚠️ same as above. |
| `cl_bank_acct` | — | not yet wired | n/a | Needed by Payment Issue beneficiary banking details. |
| `cl_track`, `cl_void`, `cl_notification`, `cl_online_details`, `cl_wages_credited` | — | not yet wired | n/a | Required by Post-Issue Review / Historical Inquiry. |

## Pages doing direct legacy access — ❌

**None detected** in `src/pages/bn/**`. All legacy access today is routed
through `src/services/bn/integration/*` or the dedicated payment services.
This is compliant with the controlled-module architecture rule.

## Recommendations

1. **Phase 1:** add a `historicalInquiryAdapter.ts` under
   `src/services/bn/integration/` covering `cl_head*`, `cl_detail_*`,
   `cl_void`, `cl_track`, `cl_notification`, `cl_online_details`,
   `cl_wages_credited` (read-only). Pages currently rendering historical
   data via service calls migrate to this adapter.
2. **Phase 1:** route the remaining direct `ip_master` / `ip_wages` reads
   from `person360Service.ts` and `bnNotificationIntegrationService.ts`
   through the existing `personAdapter` / `contributionAdapter` for
   uniformity.
3. **No new BN-prefixed clones** of any legacy table.

## Destructive migration risks — none

The plan does not require altering any legacy table. All future changes
are additive `CREATE TABLE bn_*` migrations.
