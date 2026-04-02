

# Existing Payments Popup on "Payment" Button Click

## Problem
When a cashier clicks the "Payment" button on a C3 Contribution row (for `Partial` or `$ Pay` status), they navigate directly to the cashier screen without seeing any prior payment history. The user wants an intermediate popup showing existing payments before continuing.

## Solution

### 1. Create `ExistingPaymentsPopup` Component
**New file**: `src/components/c3/ExistingPaymentsPopup.tsx`

A dialog that:
- Accepts `headerId`, `companyId`, `record` (the C3ContributionRecord), and callbacks
- On open, calls `getPaymentDetailsList` from `wizPaymentService.ts` filtered by `company_id` and matching period (month/year) to fetch existing payments for that C3 record
- Displays a table of existing payments with columns: Transaction ID, Date, Amount, Mode, Receipt #, Status
- Shows a summary: Total Paid so far, Pending Amount
- Has two action buttons:
  - **"Continue to Payment"** — navigates to `/cashier/c3-payments` with the pending amount (same as current `handlePayment` logic)
  - **"Close"** — dismisses the popup
- If no existing payments are found, shows a message "No previous payments found" and the continue button still works

### 2. Update `C3ContributionList.tsx`
- Add state for the popup: `paymentHistoryOpen`, `paymentHistoryRecord`
- Modify `handlePayment` to:
  - First open the `ExistingPaymentsPopup` instead of navigating directly
  - The popup's "Continue to Payment" button triggers the actual navigation
- This applies to both `Partial` and `$ Pay` payment status rows

### 3. Data Flow
```text
User clicks "Payment" button
  → Open ExistingPaymentsPopup dialog
  → Fetch payments via getPaymentDetailsList({ company_id, types: "Company" })
  → Filter results by matching period month/year and header_id
  → Display existing payment records in a table
  → User clicks "Continue to Payment"
  → Navigate to /cashier/c3-payments with existing state (regNo, month, year, schedule, payerType, pendingAmount)
```

### Technical Details
- **API**: Uses the existing `getPaymentDetailsList` from `wizPaymentService.ts` — no new backend/edge function needed
- **Filtering**: Match `period_month_number` and `period_year` from the C3 record against the payment records, plus filter by `pay_details` array for transaction-level info
- **UI Pattern**: Follows the existing `PaymentReceiptModal` dialog pattern (same max-width, loading spinner, error handling)
- **No database changes required**

### Files Changed
| File | Action |
|------|--------|
| `src/components/c3/ExistingPaymentsPopup.tsx` | **Create** — new popup component |
| `src/pages/c3Management/c3Details/C3ContributionList.tsx` | **Edit** — intercept Payment button to show popup first |

