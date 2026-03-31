

# Fix: Head Cashier Persistence, Email Prompt Timing, and Save Button Scope

## Root Cause Analysis

### 1. Head Cashier Assignment Not Persisting
**Root cause**: Two conflicting versions of `assign_head_cashier` exist across migrations. Migration `20260331175421` creates a version that uses `UPDATE SET is_active = false` then `INSERT`, while migration `20260331202936` replaces it with a `DELETE` then `INSERT` approach. However, the partial unique index `uq_head_cashier_active_per_date_office ON (assignment_date, office_code) WHERE is_active = true` combined with the UPDATE approach (from the first migration, which may be the active version if the second migration failed to apply cleanly) causes the INSERT to violate the constraint because deactivated rows still exist with the same `(assignment_date, office_code)` pair in the index's scope until the transaction commits.

Additionally, the dedicated page (`HeadCashierAssignment.tsx`) queries the table directly (line 41-48) rather than using the `get_active_head_cashier` RPC. If PostgREST resolves the wrong function overload, the assignment could silently fail.

**Fix**:
- Create a new consolidated migration that drops ALL existing overloads of `assign_head_cashier` and recreates a single clean version using DELETE + INSERT
- On the frontend, add post-save verification: after the RPC returns success, re-query the table to confirm the row exists before showing the success toast
- Invalidate queries with `await` to ensure UI refreshes before the user sees the result

### 2. Email "Ask" Prompt — Print Fires Before Dialog
**Root cause**: In `CreateInvoice.tsx` (lines 461-465), `printConfiguredInvoice` is called immediately after invoice creation, BEFORE the email prompt logic (lines 467-494). Similarly in `PaymentDataEntry.tsx` (line 286), `printConfiguredReceipt` fires via `setTimeout` regardless of whether the email prompt is shown. The requirement states: "dialog must appear before any print action is triggered."

**Fix**:
- **Invoice flow**: Move `printConfiguredInvoice` call AFTER the email prompt decision. If mode is `'ask'`, defer printing until after the user responds (Yes or No). Add a `pendingPrint` flag — when the email prompt closes (either confirm or skip), trigger print.
- **Receipt flow**: Same pattern — defer `printConfiguredReceipt` until after email prompt is resolved. If mode is `'never'` or `'always'`, print immediately after email handling.

### 3. Save Configuration Button Scope
**Current state**: The "Save Configuration" button inside `BatchBehaviorConfigSection.tsx` already only saves the two batch behavior keys (`allow_new_batch_with_previous_open`, `allow_current_date_payment_in_old_batch`). However, the email delivery radio groups in `PaymentModuleConfig.tsx` (lines 551, 591) call `handleSave` immediately on every selection change, which could be confused as being triggered by the Save button.

**Fix**: Convert the email delivery sections to use local state with their own explicit Save buttons, matching the pattern used by Cashier Roles, Manage All Batches, and Duplicate Handling sections. This makes it unambiguous that the "Save Configuration" button only affects batch behavior.

---

## Changes

### Migration SQL
- Drop all overloads of `assign_head_cashier` and recreate a single clean function using explicit `DELETE FROM cn_head_cashier_assignment WHERE assignment_date = v_date AND office_code = p_office_code` followed by `INSERT`
- Drop and recreate the unique index to ensure clean state

### `src/pages/cashier/HeadCashierAssignment.tsx`
- After RPC returns success, verify persistence by re-reading the table row before showing success toast
- Move `setSelectedUserId('')` and query invalidation inside the verification block only

### `src/pages/cashier/CreateInvoice.tsx`
- Add `pendingPrintInvoiceId` state
- Move `printConfiguredInvoice` out of the immediate post-creation flow
- If email mode is `'ask'`, set pending print ID and show email prompt; print fires when prompt closes (in both `onConfirm` and `onClose`)
- If email mode is `'always'` or `'never'`, handle email then print immediately
- Update `EmailDeliveryPrompt` `onClose` and `onConfirm` to trigger the deferred print

### `src/pages/cashier/PaymentDataEntry.tsx`
- Same pattern: defer `printConfiguredReceipt` until after email prompt resolution
- Remove the `setTimeout(() => printConfiguredReceipt(...), 300)` from the immediate flow
- Trigger print in email prompt close/confirm callbacks, and immediately when mode is `'never'` or `'always'` (after email send)

### `src/pages/cashier/PaymentModuleConfig.tsx`
- Convert invoice email delivery and receipt email delivery radio groups from auto-save (`onValueChange → handleSave`) to local state + explicit Save button per section
- Add `invoiceEmailMode` and `receiptEmailMode` local state initialized from configs
- Each section gets its own "Save Email Setting" button

### Files Changed
| File | Change |
|------|--------|
| Migration SQL | Consolidate `assign_head_cashier` RPC |
| `src/pages/cashier/HeadCashierAssignment.tsx` | Post-save verification |
| `src/pages/cashier/CreateInvoice.tsx` | Defer print until after email prompt |
| `src/pages/cashier/PaymentDataEntry.tsx` | Defer print until after email prompt |
| `src/pages/cashier/PaymentModuleConfig.tsx` | Explicit save buttons for email delivery sections |

