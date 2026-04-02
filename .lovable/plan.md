

# Fix: C3 Payments Screen Ignoring Pending Amount for Partial Payments

## Problem

When navigating from a `Partial` status record in C3 Details, the `pendingAmount` ($11.44) is passed via navigation state but the C3 Payments screen ignores it completely. It loads the **full** C3 amounts from `get_c3_payment_components` RPC ($244.64 + $144.56 + $22.24 = $411.44) and displays those as the amounts to pay.

## Root Cause

In `C3Payments.tsx`, line 57 reads `navState` but never extracts or uses `pendingAmount`. The auto-load logic (lines 194–253) populates components with full RPC amounts and caps `maxAmounts` to those full values.

## Fix (single file: `src/pages/cashier/C3Payments.tsx`)

After the components are loaded from the RPC (around line 241), check if `navState.pendingAmount` exists. If so:

1. Parse the pending amount from navState
2. Pro-rate each component proportionally: `component.amount = fullAmount × (pendingAmount / totalFullAmount)`, with rounding correction on the last component
3. Set `maxAmounts` to the **pro-rated** values (not the full values), so the user cannot exceed the pending balance
4. The C3 Amount, footer totals, and difference will then correctly show $11.44

### Pro-ration Example

For payer 658852 with `pendingAmount = 11.44` and full total = $411.44:
- SSC: 244.64 × (11.44 / 411.44) = **6.80**
- LVC: 144.56 × (11.44 / 411.44) = **4.02**
- PEC: 22.24 × (11.44 / 411.44) = **0.62**
- Total: **11.44** ✓

### No other files change

The RPC, navigation state passing, and payment processing logic remain untouched.

