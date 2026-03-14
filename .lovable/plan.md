

# Payments Module — Implementation Plan (Approved)

## Task 1: Database Migration — Create `cn_batch` Table

Execute the user-provided SQL to create `cn_batch`:

```sql
CREATE TABLE cn_batch (
    batch_number VARCHAR(25) PRIMARY KEY,
    batch_status VARCHAR(3),
    balance_status CHAR(1),
    entered_by VARCHAR(5),
    date_entered TIMESTAMP(3),
    verified_by VARCHAR(5),
    date_verified TIMESTAMP(3),
    posted_by VARCHAR(5),
    date_posted TIMESTAMP(3),
    offset_amount NUMERIC(10,2) DEFAULT 0.0,
    balance_forward NUMERIC(10,2) DEFAULT 0.0,
    office_code VARCHAR(3),
    batch_date TIMESTAMP(3)
);
```

No RLS per project architecture rules.

## Task 2: Shared Hooks (3 files)

- `src/hooks/usePaymentBatch.ts` — CRUD for `cn_batch`, batch number generation (`{office}-{YYYYMMDD}-{HHmmss}`), balance forward from last batch
- `src/hooks/usePaymentEntry.ts` — CRUD for `cn_payment_header` + `cn_payment` detail rows, payer lookup against `er_master`/`ip_master`, payment_id sequence management
- `src/hooks/useReceiptActions.ts` — Create receipt in `cn_receipt`, print (status=P), reprint (status=R, increment reprint_times), cancel (status=C with reason/date/user)

## Task 3: Shared Components (8 files)

All under `src/components/payments/`:

- **BatchHeader.tsx** — Read-only bar: batch_number, status badge, balance_forward, batch_date, entered_by, office_code
- **PaymentHeaderForm.tsx** — Payer type select (ER/IP/SE/VC), payer_id input, auto-loaded name, payment_date, date_received, remarks
- **PaymentDetailGrid.tsx** — Editable table with columns: payment_code, fund_code, payment_amount, mop_code, period, bank_code, credit_card_code, cheque fields. Add/Delete row actions
- **PaymentActionBar.tsx** — State-driven buttons: New Batch, New Payment, Print/Reprint Receipt, Cancel Receipt, Add/Delete Detail, MOP Detail, Payer Search
- **BatchCreationModal.tsx** — Compact dialog: batch_date picker, balance_forward display, office select, generate & create
- **MOPDetailModal.tsx** — Context-sensitive: shows cheque fields (cheque_date, mop_number, bank_code) for CHQ/CHK, card fields (credit_card_code, expiration_date) for CRD
- **ReceiptCancelModal.tsx** — Mandatory reason textarea, warning text, returns reason to parent
- **PayerSearchModal.tsx** — Search dialog querying `er_master` (by regno/name) or `ip_master` (by ssn/name) based on payer_type

## Task 4: Six Screens

### Screen 1: Payment Data Entry (`/cashier/payment-data-entry`)
`src/pages/cashier/PaymentDataEntry.tsx`
- Three-section layout: BatchHeader → PaymentHeaderForm → PaymentDetailGrid
- PaymentActionBar with full action set
- State-driven: Print available until first print, then Reprint. Cancel requires reason modal.
- High-volume cashier feel with compact layout

### Screen 2: Historical Payment Entry (`/cashier/payment-historical-entry`)
`src/pages/cashier/PaymentHistoricalEntry.tsx`
- Same structure as Screen 1, reuses all shared components
- Warning banner: "Historical Entry — affects prior-period contribution records"
- `is_historical` flag on batch creation
- Date controls allow past periods

### Screen 3: Payment History Management (`/cashier/payment-history-mgmt`)
`src/pages/cashier/PaymentHistoryManagement.tsx`
- Large filterable data table joining `cn_payment_header` + `cn_payment` + `cn_receipt`
- Row selection → Reprint action (increments reprint_times)
- Split action: input 2-30, divides amount into N equal rows with same payment context
- No delete — audit trail preserved

### Screen 4: Transfer Payments (`/cashier/transfer-payments`)
`src/pages/cashier/TransferPayments.tsx`
- Three sections: Source Employer (regno input + Retrieve) → Payment Grid → Destination Employer (regno + Move)
- Validates: source ≠ destination, both active in `er_master`
- Updates `cn_payment_header.payer_id` for transferred records

### Screen 5: Payment History Report (`/cashier/payment-history-report`)
`src/pages/cashier/PaymentHistoryReport.tsx`
- Tab-based: Standard, VC, C3, Self-Employed, IP
- Filter header: payer_id, date range, status
- Wide data table with drill-down to detail
- Dynamic title: "Payment History — [Name] ([Type])"

### Screen 6: Update Voluntary Contributor (`/cashier/vc-payment-update`)
`src/pages/cashier/VCPaymentUpdate.tsx`
- Same batch/header/detail structure as Screen 1
- Additional "Apply VC Contribution" button
- Validates against `ip_vol_contrib` table
- Displays VC schedule info: avg_weekly_wage, contrib_amt, payment_interval

## Task 5: Routing & Sidebar

### AppRoutes.tsx additions (6 new routes):
```
/cashier/payment-data-entry
/cashier/payment-historical-entry
/cashier/payment-history-mgmt
/cashier/transfer-payments
/cashier/payment-history-report
/cashier/vc-payment-update
```

### cashierMenuItems.ts update:
Add new "Contribution Payments" group at the top of the cashier menu with all 6 screens.

## Technical Notes

- All payer lookups: `er_master` for ER/SE (by `regno`, return `name`), `ip_master` for IP/VC (by `ssn`, return `firstname + surname`)
- `cn_payment_header.payment_id` is auto-incrementing integer — use `select max(payment_id)+1` pattern
- `cn_payment.payment_sequence_no` starts at 1 per payment_id
- Receipt status transitions: null → P (Printed) → R (Reprinted) or P → C (Cancelled)
- Batch status: O (Open) → V (Verified) → P (Posted). Only O allows data entry.
- No mock data — all real Supabase queries

