

# Fix Payment Processing After MOP Detail Settings Change

## Root Cause Analysis

After investigating the database, RPC functions, error logs, and frontend code, I identified **three concrete issues** causing payment failures:

### Issue 1: Duplicate `create_payment_with_receipt` RPC (PRIMARY CAUSE)
There are **two overloads** of `create_payment_with_receipt` in PostgreSQL that differ only in `p_date_received` type (`text` vs `date`). All other parameters are identical. PostgREST cannot reliably disambiguate these, causing intermittent `could not choose a best candidate function` errors. This is the most likely cause of the RPC failures logged in `system_error_logs`.

### Issue 2: Error messages logged as `[object Object]`
The `logApplicationError` function does `new Error(String(error))` for non-Error objects. Supabase RPC errors are plain objects `{message, code, details, hint}`, so `String(obj)` produces `[object Object]`, hiding the real error message.

### Issue 3: MOP config freshness not guaranteed
The `useMopDetailConfig` hook uses default React Query `staleTime`, meaning after toggling config on the settings page, navigating to a payment screen could show stale config values briefly.

## Fixes

### 1. Database Migration — Drop duplicate RPC overload
Drop the `create_payment_with_receipt(... p_date_received date ...)` overload, keeping only the `text` version (which the frontend already uses). This eliminates PostgREST ambiguity.

```sql
DROP FUNCTION IF EXISTS public.create_payment_with_receipt(
  text, text, text, date, text, jsonb, numeric, integer, text
);
```

### 2. Fix `logApplicationError` — Properly extract error messages
In `src/lib/globalErrorHandler.ts`, update the error serialization on line 32 to extract `.message` from Supabase error objects before wrapping in `new Error()`:

```typescript
const errorObj = error instanceof Error 
  ? error 
  : new Error(
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as any).message)
        : String(error)
    );
```

### 3. Ensure fresh MOP config on payment screens
In `useMopDetailConfig()` in `src/hooks/usePaymentModuleConfig.ts`, set `staleTime: 0` on both `usePaymentConfig` calls so config is always refetched when navigating to payment screens. This requires a small refactor since `usePaymentConfig` is a shared hook — add a dedicated variant or pass options.

### 4. Defensive handling in PaymentDataEntry and C3Payments
Add a loading guard in both payment screens: while `useMopDetailConfig().isLoading` is true, disable the Process/Generate Receipt button to prevent submissions before config is resolved.

## Files Modified
1. **Database migration** — DROP duplicate `create_payment_with_receipt` overload
2. **`src/lib/globalErrorHandler.ts`** — Fix Supabase error object serialization
3. **`src/hooks/usePaymentModuleConfig.ts`** — Add `staleTime: 0` for MOP config queries
4. **`src/pages/cashier/C3Payments.tsx`** — Disable process button while config loading
5. **`src/pages/cashier/PaymentDataEntry.tsx`** — Disable generate button while config loading

