

# Fix: Email Delivery — End-to-End from Payer Resolution to Actual Send

## Root Cause Analysis

### Why emails are not being sent
The `sendDocumentEmail()` function in `useEmailDeliveryConfig.ts` **never calls the `send-notification` edge function**. It only inserts a row into `system_audit_trail` with status `'queued'` and shows a success toast — creating the illusion of success. No email is actually dispatched.

### Why email resolution fails for non-AP payer types
Both `CreateInvoice.tsx` (line 465-470) and `PaymentDataEntry.tsx` (line 261-266) resolve email by querying `cn_payer.email` for **all** payer types. This is incorrect:
- **ER**: Email is in `er_master.email` (where `regno = payer_id`)
- **IP/SE/VC**: Email is in `ip_master.email_addr` (where `ssn = payer_id`)
- **AP**: Email is in `cn_payer.email` (correct as-is)

### Why Email Logs page doesn't show invoice/receipt emails
The `notification_logs` table is never written to during invoice/receipt email dispatch because the edge function is never called.

---

## Plan

### 1. Create `resolve_payer_email` Database RPC (Migration)

Centralizes payer email resolution server-side — no duplication across frontend pages.

```sql
CREATE OR REPLACE FUNCTION public.resolve_payer_email(
  p_payer_type TEXT,
  p_payer_id TEXT
) RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email TEXT;
BEGIN
  IF p_payer_type = 'ER' THEN
    SELECT email INTO v_email FROM er_master WHERE regno = p_payer_id;
  ELSIF p_payer_type IN ('IP', 'SE', 'VC') THEN
    SELECT email_addr INTO v_email FROM ip_master WHERE ssn = p_payer_id;
  ELSIF p_payer_type = 'AP' THEN
    SELECT email INTO v_email FROM cn_payer WHERE payer_id = p_payer_id;
  END IF;
  RETURN COALESCE(v_email, '');
END;
$$;
```

### 2. Rewrite `sendDocumentEmail` in `useEmailDeliveryConfig.ts`

Replace the current placeholder with a function that:
1. Validates the email address (basic format check)
2. Calls the `send-notification` edge function via `supabase.functions.invoke()`
3. Passes `payer_type`, `payer_id`, `document_type`, `document_number` as metadata so `notification_logs` captures full context
4. Returns the actual send result (success/failure)
5. Shows success toast **only** if the edge function returns `status: 'sent'`
6. Shows warning toast if queued, error toast if failed

### 3. Update `send-notification` Edge Function

Add support for `metadata` field in the request payload so payer context (payer_type, payer_id, document_type, document_number) is stored in `notification_logs.metadata`. Also add:
- `trigger_source` field set to `'invoice_creation'` or `'receipt_creation'`
- Basic email format validation before attempting Resend API call
- Retry logic: if Resend returns a transient error (429, 5xx), retry up to 2 times with exponential backoff

### 4. Update Invoice and Receipt Email Resolution

**`CreateInvoice.tsx`** and **`PaymentDataEntry.tsx`**: Replace the client-side `cn_payer` email lookup with a single RPC call:
```typescript
const { data: emailResult } = await supabase.rpc('resolve_payer_email', {
  p_payer_type: payerType,
  p_payer_id: payerId.trim(),
});
payerEmailAddr = emailResult || '';
```

### 5. Update `CreateInvoice.tsx` and `PaymentDataEntry.tsx` — Response-Based Confirmation

Change `sendDocumentEmail` calls from fire-and-forget to awaited, and adjust toast messaging based on the actual result:
- If `sendDocumentEmail` returns `{ success: true, status: 'sent' }` → show success
- If `status: 'queued'` → show info toast "Email queued for delivery"
- If failed → show error toast with failure reason

### 6. Enhance `EmailLogs` Page

Add `Payer Type`, `Payer ID`, and `Document #` columns by reading from `notification_logs.metadata`. The metadata JSONB already supports arbitrary fields — no schema change needed. Update the table headers, cell rendering, detail dialog, and CSV export to include these fields.

---

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Create `resolve_payer_email` RPC |
| `src/hooks/useEmailDeliveryConfig.ts` | Rewrite `sendDocumentEmail` to invoke `send-notification` edge function |
| `supabase/functions/send-notification/index.ts` | Add metadata support, email validation, retry logic |
| `src/pages/cashier/CreateInvoice.tsx` | Use `resolve_payer_email` RPC, await `sendDocumentEmail` |
| `src/pages/cashier/PaymentDataEntry.tsx` | Use `resolve_payer_email` RPC, await `sendDocumentEmail` |
| `src/pages/admin/EmailLogs.tsx` | Add payer context columns from metadata |

