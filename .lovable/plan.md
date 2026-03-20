

# Payment History Management — Full Implementation

## Database Changes (2 migrations)

### Migration 1: Add `status` to `cn_payment_header`
```sql
ALTER TABLE cn_payment_header ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
```

### Migration 2: Add `receipt_number` to `cn_receipt` + auto-generate trigger + backfill

- Add `receipt_number TEXT UNIQUE` column
- Create an `AFTER INSERT` trigger on `cn_receipt` that:
  1. Looks up `payer_id` from `cn_payment_header` via `NEW.payment_id`
  2. Formats `created_at` as `DDMMYYYYHHmm`
  3. Sets `receipt_number = payer_id || '/' || NEW.receipt_id || '/' || formatted_timestamp`
- Backfill all existing rows using the same logic

```sql
-- Add column
ALTER TABLE cn_receipt ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Trigger function
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_payer_id TEXT; v_ts TEXT;
BEGIN
  SELECT payer_id INTO v_payer_id FROM cn_payment_header WHERE payment_id = NEW.payment_id;
  v_ts := to_char(COALESCE(NEW.created_at, now()), 'DDMMYYYYHH24MI');
  NEW.receipt_number := COALESCE(v_payer_id,'UNKNOWN') || '/' || NEW.receipt_id || '/' || v_ts;
  RETURN NEW;
END; $$;

-- Use BEFORE INSERT trigger (receipt_id from IDENTITY is available in BEFORE on INSERT)
-- Actually for GENERATED ALWAYS AS IDENTITY, receipt_id is set before BEFORE trigger fires
-- So we use AFTER INSERT + UPDATE approach:
CREATE OR REPLACE FUNCTION set_receipt_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_payer_id TEXT; v_ts TEXT; v_rn TEXT;
BEGIN
  SELECT payer_id INTO v_payer_id FROM cn_payment_header WHERE payment_id = NEW.payment_id;
  v_ts := to_char(COALESCE(NEW.created_at, now()), 'DDMMYYYYHH24MI');
  v_rn := COALESCE(v_payer_id,'UNKNOWN') || '/' || NEW.receipt_id || '/' || v_ts;
  UPDATE cn_receipt SET receipt_number = v_rn WHERE receipt_id = NEW.receipt_id;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_set_receipt_number AFTER INSERT ON cn_receipt
FOR EACH ROW EXECUTE FUNCTION set_receipt_number();

-- Backfill existing
UPDATE cn_receipt r SET receipt_number = 
  COALESCE(h.payer_id,'UNKNOWN') || '/' || r.receipt_id || '/' || to_char(COALESCE(r.created_at, now()), 'DDMMYYYYHH24MI')
FROM cn_payment_header h WHERE h.payment_id = r.payment_id
WHERE r.receipt_number IS NULL;

-- Add unique constraint after backfill
ALTER TABLE cn_receipt ADD CONSTRAINT uq_receipt_number UNIQUE (receipt_number);
```

## UI Rewrite: `src/pages/cashier/PaymentHistoryManagement.tsx`

Complete rewrite with the following changes:

### Data Fetching
- Query `cn_payment_header` with filter: `status IS NULL OR status = 'active'`
- Join `cn_receipt` for receipt data (receipt_total, status, receipt_number)
- Check `cn_payment` existence — exclude headers with no receipt AND no cn_payment rows
- Fetch `tb_receipt_status` for status code → description mapping
- Batch-resolve payer names: ER → `er_master.name`, others → `ip_master.firstname + surname`

### List Columns (replacing current)
| Column | Source |
|--------|--------|
| Payment ID | `payment_id` |
| Batch | `batch_number` |
| Type | Full name (ER→Employer, SE→Self-Employed, IP→Insured-Person, VC→Voluntary-Contributor) |
| Payer | `"payerId - payerName"` |
| Date Received | `date_received` |
| Amount | `cn_receipt.receipt_total` or "—" |
| Receipt | `tb_receipt_status.description` or `"code - Not Defined"` or "No Receipt" |

Removed: Code, CON, MOP, Period

### Row Actions (replacing Reprint + Split)
- **Receipt**: Shown only when no receipt exists. Calls `useReceiptActions().printReceipt()` then `window.print()`.
- **Remove**: Shown only when no receipt exists. Updates `cn_payment_header.status = 'deleted'`.
- No actions when receipt exists (those move to the popup).

### Row Click → Read-Only Detail Popup
- **Payment Info**: Payment ID, Batch, Type (full), Payer (ID - Name), Date Received, Remarks
- **Detail Lines** (from `cn_payment`): Payment Code, Fund, Amount, MOP, Period
- **Receipt Info** (from `cn_receipt`): Receipt ID, Receipt Number, Status, Total, Created By, Created At, Reprint Times, Cancel Date/Reason/User
- **Cancel Payment** button: Visible only when `receipt.status === 'O'`. Uses `ReceiptCancelModal`.
- **Reprint** button: Visible only when receipt exists and status ≠ 'C'. Reuses same reprint logic from PaymentDataEntry.

### Hooks/Components Reused
- `useReceiptActions` — printReceipt, loadReceipt
- `usePaymentEntry().lookupPayer()` — payer name resolution
- `useUserCode` — current user code
- `ReceiptCancelModal` — cancel flow

## Technical Details

- Payer names batch-resolved: collect unique ER payer_ids → single `er_master` query; non-ER → single `ip_master` query
- For receipt generation on existing payment: compute `receipt_total` from `SUM(cn_payment.payment_amount)` and `total_payments` from `COUNT(cn_payment)` for that payment_id, then call `printReceipt()`
- `receipt_number` trigger uses AFTER INSERT + UPDATE pattern since IDENTITY columns aren't available in BEFORE triggers
- Existing rows with NULL status treated as active

## Files Changed
| File | Change |
|------|--------|
| Migration 1 | Add `status` to `cn_payment_header` |
| Migration 2 | Add `receipt_number` to `cn_receipt` + trigger + backfill + unique constraint |
| `src/pages/cashier/PaymentHistoryManagement.tsx` | Complete rewrite |

