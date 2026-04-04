# BN Historical Inquiry — Specification

## Business Purpose
Allow authorized users to search and view legacy claims and benefit disbursement history within the modern UI, without depending on old fragmented screens. All results are **read-only** by default.

## How It Fits Into the Existing System
- Historical claim data traces back to `bn_claim` (modern orchestration) and `cl_head` / `cl_detail_*` (legacy)
- Historical benefit disbursements trace to `cl_cheques`, `cl_cheques_holding`, and `cl_cheques_survivor`
- `cn_payment*`, `cn_receipt`, `cn_refund` are **NOT** shown in disbursement results — those are incoming collections only

## Existing Tables Used
| Table | Purpose |
|---|---|
| `bn_claim` | Modern claim records |
| `bn_claim_detail` | Benefit-specific JSONB detail |
| `bn_claim_event` | Audit timeline events |
| `bn_product` | Product/benefit metadata |
| `cl_cheques` | Standard issued payments |
| `cl_cheques_holding` | Payments on hold |
| `cl_cheques_survivor` | Survivor-specific payments |

## New Tables Introduced
None — this module is read-only and uses existing structures.

## Search Filters
### Claims Search
- SSN
- Claim Number (partial match)
- Claim Status
- Date Range (filed date)
- Product Code

### Disbursement Search
- SSN
- Claim Number (partial match)
- Cheque / Reference Number
- Payment Method (CHQ, DD, EFT)
- Payment Status
- Date Range (payment date)

## Result Grids
### Claims Grid Columns
Claim #, SSN, Claimant, Benefit, Status, Filed Date, Source (Modern/Legacy)

### Disbursements Grid Columns
Cheque/Ref, Claim #, SSN, Payee, Amount, Method, Date, Status, Source (Standard/Held/Survivor)

## Detail Panels

### Claim Detail Drawer
- Claim header fields (read-only)
- Source lineage badge (bn_claim vs cl_head)
- Legacy reference display
- Benefit-specific detail (from bn_claim_detail JSONB)
- Event timeline (from bn_claim_event)
- Linked disbursements (cross-referenced from cl_cheques*)

### Disbursement Detail Drawer
- Payment amount and status
- Source table lineage (cl_cheques / cl_cheques_holding / cl_cheques_survivor)
- Payment instrument fields (cheque #, method, bank, masked account)
- Period coverage
- Hold reason (cl_cheques_holding only)
- Survivor ID (cl_cheques_survivor only)
- Disclaimer: cn_payment* not used for outbound disbursements

## Read-Only Rules
1. All fields are display-only — no edit controls rendered
2. Read-only badge visible in drawer header and page header
3. No mutation hooks exposed from the inquiry service
4. Navigation links to Person 360 and Claim Workbench for operational actions

## Navigation
- **To Person 360**: Button in drawer footer and grid action icon
- **To Claim Workbench**: Button in claim detail drawer footer

## Audit Approach
- `logInquiryAccess()` writes an `INQUIRY_ACCESS` event to `bn_claim_event`
- Captures entity_type (CLAIM/DISBURSEMENT), entity_id, user_code, timestamp
- Enables compliance tracking of who viewed sensitive historical data

## Workflow Integration
- No workflow transitions — this is a pure inquiry module
- Leverages existing `bn_claim_event` for audit trail

## Notification Integration
- No notifications triggered — read-only module

## Statuses Displayed
All existing claim and payment statuses via `BnStatusBadge`:
DRAFT, SUBMITTED, APPROVED, DENIED, SUSPENDED, CLOSED, WITHDRAWN, IN_PAYMENT, ISSUED, VOIDED, STOPPED, STALE_DATED

## Backward Compatibility
- All legacy references (cl_head claim numbers, cl_cheques cheque_no) remain visible
- Source table lineage badge clearly distinguishes modern vs legacy records
- Account numbers are PII-masked (last 4 digits only)
- No writes to any legacy table
