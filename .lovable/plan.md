

# Payment Detail Popup Fixes

## Changes (all in `src/pages/cashier/PaymentHistoryManagement.tsx`)

### 1. Add "Received by Cashier" to Payment Information section
- In `handleRowClick`, after fetching detail lines and receipt, also fetch the batch's cashier:
  - Query `cn_batch` for `entered_by` using `row.batch_number`
  - Query `profiles` for `full_name` using the `entered_by` user_code
- Store cashier name in a new state variable `cashierName`
- Display in the Payment Information grid as "Received by Cashier: {full_name}"

### 2. Fix Credit Card Details display
- In `handleRowClick`, also fetch `tb_merchant` (credit_card_code → credit_card_name) to resolve card code to its name
- **Card Code**: Show `credit_card_name` from `tb_merchant` instead of raw `credit_card_code`
- **Expiration**: Format as MM/YY — parse `expiration_date` and display only month/year (handle both date strings and MM/YY already-formatted values)
- **Transaction No. → Card Number**: Rename label from "Transaction No." to "Card Number" and mask the value using `maskPIIValue(value, 'bank_account')` from the PII masking service (shows only last 4 digits)

### 3. Technical Details
- Add `cashierName` state (`string | null`)
- Add merchant map lookup in `handleRowClick` alongside existing `ptTypes` and `mopTypes` fetches
- Store resolved `card_desc` on each detail line for display
- Use existing `maskPIIValue` from `@/services/piiMaskingService` for card number masking (always mask card numbers regardless of admin status — PCI compliance)

### Files Modified
| File | Change |
|------|--------|
| `src/pages/cashier/PaymentHistoryManagement.tsx` | Add cashier lookup, merchant lookup, card number masking, expiration formatting |

