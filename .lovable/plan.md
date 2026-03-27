

# Secure C3 Payment Navigation + External Payment Sync Integration

## Overview

Three workstreams: (1) Secure parameter passing via React Router state, (2) Post-receipt external API sync via edge function, (3) Sync status UI with retry.

---

## 1. Secure Parameter Passing

### Problem
Navigation to `/cashier/c3-payments` exposes `regNo`, `month`, `year`, `schedule`, `payerType` as plain URL query params.

### Solution
Replace `URLSearchParams` with `navigate(path, { state: {...} })` in all three source files. On C3Payments, read from `useLocation().state` instead of `useSearchParams()`.

**Files:**
- `C3ContributionList.tsx` — use `navigate('/cashier/c3-payments', { state: { regNo, month, year, schedule, payerType: 'ER' } })`
- `SelfEmployedContributionList.tsx` — same pattern with `payerType: 'SE'`
- `NwDirectorList.tsx` — same pattern with `payerType: 'NW'`
- `C3Payments.tsx` — replace `useSearchParams()` with `useLocation().state`, keep existing RPC-level validation as server-side guard

---

## 2. Database: `payment_sync_log` Table

New table to track sync attempts:

```sql
CREATE TABLE public.payment_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id INTEGER NOT NULL,
  receipt_id INTEGER NOT NULL,
  receipt_number TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  request_payload JSONB,
  response_payload JSONB,
  http_status INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  external_payment_id TEXT,
  is_duplicate BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  initiated_by TEXT,
  UNIQUE(payment_id, receipt_id)
);
```

No RLS per project rules.

---

## 3. Edge Function: `sync-c3-payment`

A new Supabase edge function that:

1. Accepts `{ payment_id, receipt_id }` from authenticated caller
2. **Idempotency check**: queries `payment_sync_log` — if a `success` row exists, returns early
3. Fetches from DB using service role:
   - `cn_receipt` → `receipt_number`, `receipt_total`, `created_at`
   - `cn_payment_header` → `payer_id`, `payer_type`
   - `c3_payment_components` → `period`, `sequence_no`
   - `tb_currencies` → `currency_code` (base/main currency)
4. Fetches API config from `api_settings` where `setting_key = 'c3_received_payment_sync'`
5. Constructs payload per the PDF spec:

```json
{
  "registration_number": "<payer_id>",
  "payer_type": "ER|SE",
  "ssn": "<payer_id, only when SE>",
  "schedule_number": "<sequence_no as string, only when ER>",
  "period_month": "<extracted from period MM/YYYY>",
  "period_year": "<extracted from period MM/YYYY>",
  "receipt_number": "<cn_receipt.receipt_number>",
  "payment_id": "<payment_id as string>",
  "receipt_date": "<cn_receipt.created_at formatted YYYY-MM-DD>",
  "currency": "<base currency code>",
  "receipt_amount": "<receipt_total as string>"
}
```

**Key change from previous plan**: `receipt_number` is sourced from the `receipt_number` column in `cn_receipt` (not `receipt_id`).

6. Sends POST to `{api_settings.base_url}` with configured header/key
7. Retry: up to 3 attempts with exponential backoff, 30s timeout
8. Logs every attempt to `payment_sync_log` with full request/response

---

## 4. UI: Post-Receipt Sync + Status Display

In `C3Payments.tsx`, after successful `create_c3_payment_with_receipt` RPC:

1. Call `supabase.functions.invoke('sync-c3-payment', { body: { payment_id, receipt_id } })` asynchronously (non-blocking)
2. Track sync state: `syncing` | `synced` | `sync_failed` | `not_configured`
3. Display a small status indicator below the action bar:
   - **Syncing**: Spinner + "Syncing payment..."
   - **Synced**: Green check + "Payment synced"
   - **Failed**: Amber warning + "Sync failed" + Retry button
   - **Not configured**: Gray text (when api_settings entry missing/inactive)
4. Retry button calls the same edge function again

---

## Files Summary

| File | Change |
|------|--------|
| `C3ContributionList.tsx` | Navigate with state |
| `SelfEmployedContributionList.tsx` | Navigate with state |
| `NwDirectorList.tsx` | Navigate with state |
| `C3Payments.tsx` | Read from location state; add post-receipt sync call + status UI |
| `supabase/functions/sync-c3-payment/index.ts` | New edge function |
| Migration SQL | New `payment_sync_log` table |

