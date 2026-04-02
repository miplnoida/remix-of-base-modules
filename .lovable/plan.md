

# Response to C3-Wizard: Void Incorrect Payments for Re-Post

## Analysis

The C3-Wizard team confirms the **wrong amounts are a bug on their side** — they sent full header totals instead of actual paid amounts. SSB Admin stored exactly what was received. The affected payments:

| Payment ID | Receipt ID | Stored Amount | Correct Amount | Difference |
|-----------|-----------|--------------|---------------|------------|
| 19 | 14 | $5,395.02 | (TBD by C3) | ? |
| 20 | 15 | $921.60 | (TBD by C3) | ? |
| 21 | 16 | $411.44 | $400.00 | +$11.44 |
| 22 | 17 | $666.00 | (TBD by C3) | ? |
| 23 | 18 | $6,283.02 | $100.00 | +$6,183.02 |

## Current Constraint

The Payment History cancel button only works on receipts with status `O` (Original). These API-posted receipts have status `A` — so they cannot be cancelled through the UI.

## Recommended Approach: Void via Migration

Create a one-time migration that:

1. **Cancels all 5 receipts** (IDs 14–18) — sets `status = 'C'`, `cancel_reason`, `cancel_date`, `cancel_user`
2. **Marks all 5 payment headers** (IDs 19–23) as cancelled — sets `status = 'X'` (or similar)
3. Does **not** delete any data — preserves full audit trail

After the migration runs, the C3-Wizard team can re-post all 5 payments with correct amounts, which will create new payment IDs and receipt IDs.

## Communication to C3-Wizard Team

> The 5 incorrect payments (IDs 19–23) will be voided on SSB Admin's side. No data is deleted — the records are marked as cancelled with an audit trail. Once confirmed, you can re-post all 5 payments with the corrected amounts. New `paymentId`, `receiptId`, and `receiptNumber` values will be returned — please update your records accordingly.

### Step 1: Migration SQL

Cancels receipts 14–18 and marks headers 19–23 with cancel metadata. Uses `status = 'C'` for receipts (consistent with the existing cancel flow) and `status = 'X'` for headers.

### Step 2: No code changes

The existing filter already shows status `P` payments. Cancelled records (`C`/`X`) will naturally stop appearing in active views.

