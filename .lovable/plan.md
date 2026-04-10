

# Workflow-Based Receipt Cancellation Approval

## Overview

Replace direct receipt cancellation with a workflow-driven approval process across all 4 screens, mirroring the existing card-machine change request pattern.

---

## 1. Database: New `cn_receipt_cancel_requests` Table

Create a table mirroring `cn_card_machine_change_requests`:

```sql
CREATE TABLE public.cn_receipt_cancel_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL,
  payment_id integer NOT NULL,
  receipt_id integer NOT NULL,
  receipt_total numeric,
  workflow_instance_id uuid REFERENCES workflow_instances(id),
  status text NOT NULL DEFAULT 'Pending',    -- Pending, InProgress, Approved, Rejected, Completed, Cancelled
  reason text NOT NULL,
  request_type text NOT NULL DEFAULT 'cancel_receipt',
  requested_by text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  completed_by text,
  skip_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cn_receipt_cancel_requests_batch ON cn_receipt_cancel_requests(batch_number);
CREATE INDEX idx_cn_receipt_cancel_requests_status ON cn_receipt_cancel_requests(status);
CREATE INDEX idx_cn_receipt_cancel_requests_payment ON cn_receipt_cancel_requests(payment_id);
CREATE INDEX idx_cn_receipt_cancel_requests_receipt ON cn_receipt_cancel_requests(receipt_id);
```

Also add workflow step actions (Approve/Reject) for the existing workflow `65f82f25-e422-438e-8c12-005a23d81d62` step `a072b471-3d03-4bab-86fa-bd45480a78d1` if not already present.

---

## 2. New Hook: `useReceiptCancelRequests.ts`

Mirrors `useCardMachineChangeRequests.ts` exactly:

- **Constants**: `CANCEL_WORKFLOW_ID = '65f82f25-e422-438e-8c12-005a23d81d62'`, `CANCEL_STEP_ID = 'a072b471-...'`
- **`useReceiptCancelRequests(batchNumber)`** — fetch requests by batch
- **`useReceiptCancelRequestByPayment(paymentId)`** — fetch active request for a payment
- **`useCreateReceiptCancelRequest()`** — mutation: insert request → create workflow_instance (source_module: `receipt_cancellation`) → create task → log → update request status to InProgress
- **`useApplyReceiptCancellation()`** — mutation: verify Approved status → update cn_receipt (status=C, cancel_reason, cancel_user, cancel_date) → mark request Completed → close workflow
- **`useSkipReceiptCancellation()`** — mutation: mark request Cancelled with skip_comment
- **`useReceiptCancelRequestsForApprover(filters)`** — fetch all requests with filters for the approval screen
- **`getActiveCancelRequest(requests, paymentId)`** — helper to find active request

---

## 3. Workflow Engine Integration: `useWorkflowActions.ts`

Add a new `else if (sourceModule === 'receipt_cancellation')` block (alongside `batch_card_machine_change`) that updates `cn_receipt_cancel_requests.status` based on workflow outcome (Approved/Rejected).

---

## 4. Screen Changes

### 4a. PaymentDataEntry (`/cashier/payment-data-entry`)
- Replace `handleCancelReceipt` (direct DB update) with `useCreateReceiptCancelRequest`
- Check for active cancel request; if InProgress/Pending → show "Pending Approval" badge, disable cancel button
- If Approved → show "Apply Cancellation" button that calls `useApplyReceiptCancellation`
- Update `ReceiptCancelModal.onConfirm` to submit workflow request instead of direct cancel

### 4b. C3Payments (`/cashier/c3-payments`)
- Same changes as PaymentDataEntry

### 4c. PaymentHistoryManagement (`/cashier/payment-history-mgmt`)
- Same changes in the detail popup cancel handler

### 4d. BatchClosing (`/cashier/batch-closing`) — Batch Transactions Section
- Add a "Cancel Receipt" action button to each transaction row in the Batch Transactions table (lines 740-749)
- Only show for receipts with status 'O'
- Check active cancel requests per payment; show status badge if pending
- Wire up `ReceiptCancelModal` and `useCreateReceiptCancelRequest`

---

## 5. Approval Screen Extension: `CardMachineChangeRequests.tsx`

Rename/extend to handle both request types:

- **Page title**: "Batch Change Requests" (or "Payment Change Requests")
- **Add `request_type` filter**: "All", "Card Machine Change", "Cancel Receipt"
- **Query both tables**: Fetch from `cn_card_machine_change_requests` AND `cn_receipt_cancel_requests`, merge with a `request_type` discriminator
- **Table columns**: Add "Type" column with badge (Card Machine / Cancel Receipt)
- **Detail modal**: Show type-specific fields (card machine details vs receipt/reason details)
- **Workflow actions**: Use correct `sourceModule` per type (`batch_card_machine_change` vs `receipt_cancellation`)
- **Menu item**: Update sidebar label to "Batch Change Requests"

---

## 6. Audit Trail

All actions already logged via:
- `workflow_logs` entries at each step (request_submitted, approval, rejection, change_applied)
- `system_audit_trail` triggers on the new table

---

## Technical Details

### Workflow IDs
- Cancel Receipt Workflow: `65f82f25-e422-438e-8c12-005a23d81d62`
- Step: `a072b471-3d03-4bab-86fa-bd45480a78d1` (Approval Pending)

### Source Module Key
- `receipt_cancellation` — used in `workflow_instances.source_module`

### Files to Create
| File | Purpose |
|---|---|
| `src/hooks/useReceiptCancelRequests.ts` | All CRUD + workflow hooks |
| Migration SQL | `cn_receipt_cancel_requests` table + workflow step actions |

### Files to Modify
| File | Change |
|---|---|
| `src/hooks/useWorkflowActions.ts` | Add `receipt_cancellation` source module handler |
| `src/pages/cashier/PaymentDataEntry.tsx` | Replace direct cancel with workflow request |
| `src/pages/cashier/C3Payments.tsx` | Replace direct cancel with workflow request |
| `src/pages/cashier/PaymentHistoryManagement.tsx` | Replace direct cancel with workflow request |
| `src/pages/cashier/BatchClosing.tsx` | Add Cancel Receipt button to transaction rows |
| `src/pages/cashier/CardMachineChangeRequests.tsx` | Extend to list both request types |
| `src/components/payments/ReceiptCancelModal.tsx` | Minor: update description text for "request" vs "cancel" |
| `src/components/sidebar/menuItems/cashierMenuItems.ts` | Update menu label |

