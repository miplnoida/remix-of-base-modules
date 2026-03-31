

# Payment Module Enhancements — Implementation Plan

## 1. Fix Head Cashier Assignment Unique Constraint Error

**Root Cause**: The original migration created `CONSTRAINT uq_head_cashier_per_date UNIQUE (assignment_date)` — a single-column constraint that only allows one assignment per date globally. The later migration added `office_code` but never dropped this old constraint and replaced it with `UNIQUE (assignment_date, office_code)`.

**Fix (Migration)**:
```sql
ALTER TABLE cn_head_cashier_assignment DROP CONSTRAINT IF EXISTS uq_head_cashier_per_date;
ALTER TABLE cn_head_cashier_assignment ADD CONSTRAINT uq_head_cashier_per_date_office UNIQUE (assignment_date, office_code);
```

Also update `assign_head_cashier` RPC: before inserting, deactivate the existing row for that date+office, so the INSERT never conflicts with the new unique constraint (the current RPC already does `UPDATE ... SET is_active = false` but the unique constraint still fires because the row exists). Change the approach to DELETE the deactivated rows or use `ON CONFLICT ... DO UPDATE`.

**Files**: Migration SQL only. No frontend changes needed.

---

## 2. Office Auto-Detection Fallback Chain in Open Batch Dialog

**Current state**: The dialog already has IP detection → `resolvedOffice` (via `get_cashier_office_for_date`) → profile default fallback. The IP detection and head-cashier override logic is already implemented.

**Enhancement needed**: The `get_cashier_office_for_date` RPC should also be updated to check head-cashier assignment for the cashier at that office. Currently it checks `cn_cashier_office_override` — verify it also falls back correctly. Ensure the office field is truly read-only so the user can't tamper with it.

**Backend enforcement**: Add an `resolve_batch_office` RPC that runs the same 3-tier fallback (IP → HC assignment → profile) server-side, called during batch creation to validate the office_code. Update `handleCreate` to call this RPC and use its result instead of trusting the client-side `effectiveOffice`.

**Files**:
| File | Change |
|------|--------|
| Migration SQL | Create `resolve_batch_office` RPC |
| `src/pages/cashier/BatchManagement.tsx` | Call `resolve_batch_office` during creation to enforce server-side office |

---

## 3. Email Delivery Prompt for Invoice and Receipt

**Invoice flow** (`CreateInvoice.tsx`): After successful `handleSubmit` (line ~452), check the `invoice_email_delivery` config:
- `'always'`: Auto-send email (call an edge function or log for future API integration)
- `'ask'`: Show a confirmation dialog asking "Send invoice to payer's email ({email})?"
- `'never'`: Do nothing

**Receipt flow** (`PaymentDataEntry.tsx`): After successful receipt generation (line ~249), check `receipt_email_delivery` config with the same 3-way logic.

**Implementation**:
- Create a reusable `EmailDeliveryPrompt` dialog component
- Create a `useEmailDeliveryConfig` hook that fetches the two config values
- In both pages, after successful creation, evaluate the config and either auto-trigger, prompt, or skip
- For the actual "send" action, call an internal notification placeholder (log to `system_audit_trail` + toast, since actual email API is `${MainAPIBaseURL}/notifications/email` per project standards)

**Files**:
| File | Change |
|------|--------|
| `src/components/payments/EmailDeliveryPrompt.tsx` | New reusable dialog |
| `src/hooks/useEmailDeliveryConfig.ts` | New hook |
| `src/pages/cashier/CreateInvoice.tsx` | Integrate email prompt after invoice creation |
| `src/pages/cashier/PaymentDataEntry.tsx` | Integrate email prompt after receipt generation |

---

## 4. Batch Behavior Config — Explicit Save Button

**Current**: Each toggle/radio change immediately calls `updateConfig.mutate()`.

**Change**: Maintain local state for the two batch behavior configs. Only persist on explicit "Save" button click.

- Add `useState` for local config copies, initialized from server data
- Replace `handleToggle` and `handleScheduleChange` to update local state only
- Add a "Save Configuration" button that calls `updateConfig.mutate()` for each changed config
- Add a dirty-state indicator and validate inputs (e.g., date_from < date_to, working_days_count > 0) before saving

**Files**:
| File | Change |
|------|--------|
| `src/components/payments/BatchBehaviorConfigSection.tsx` | Add local state, Save button, validation |

---

## Database Changes Summary

| Change | Method |
|--------|--------|
| Drop old `uq_head_cashier_per_date`, add `uq_head_cashier_per_date_office` | Migration |
| Update `assign_head_cashier` to handle upsert properly | Migration |
| Create `resolve_batch_office` RPC (server-side office enforcement) | Migration |

## New Files
- `src/components/payments/EmailDeliveryPrompt.tsx`
- `src/hooks/useEmailDeliveryConfig.ts`

## Modified Files
- `src/pages/cashier/BatchManagement.tsx` — server-side office enforcement on batch create
- `src/pages/cashier/CreateInvoice.tsx` — email delivery prompt integration
- `src/pages/cashier/PaymentDataEntry.tsx` — email delivery prompt integration
- `src/components/payments/BatchBehaviorConfigSection.tsx` — explicit Save button with local state

