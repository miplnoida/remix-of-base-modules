

# Payment Save API Migration: Flat Endpoint + Component Persistence

## Summary

Migrate the external Payment Save API from `/api/v1/api/payment/save/{payerId}/{payerType}` to `/api/v1/api/payment/save` (flat POST). Move `payerId`/`payerType` into the request body. Add `periodMonth`, `periodYear`, `scheduleNumber` handling and persist `c3_payment_components` records.

## Changes

### 1. Database Migration — Recreate `public_api_payment_save(JSONB)`

Drop the old 3-param signature `(TEXT, TEXT, JSONB)` and create a single-param version `(JSONB)`:

- Extract `payerId`, `payerType`, `periodMonth`, `periodYear`, `scheduleNumber` from `p_payload`
- Validate: return error JSON if `payerId`, `payerType`, `periodMonth` (1-12), or `periodYear` (4-digit) are missing/invalid
- **cn_payment.period**: Change from `date_trunc('month', NOW())` to `make_date(periodYear, periodMonth, 1)` — a proper DATE
- **New block after each cn_payment insert**: Insert into `c3_payment_components` for each paymentHeaders object:

| c3_payment_components column | Source |
|---|---|
| `payment_id` | Newly created `v_payment_id` |
| `payment_code` | `paymentCode` from header object |
| `fund_code` | `fundCode` from header object |
| `component_amount` | `paymentAmount` from header object |
| `period` | `LPAD(periodMonth, 2, '0') || '/' || periodYear` (TEXT, e.g. `01/2026`) |
| `sequence_no` | `scheduleNumber` from request body |
| `sort_order` | Loop iteration index |

All inserts remain inside the existing advisory-lock transaction block — atomic, no partial failures.

### 2. Edge Function — `supabase/functions/public-api/index.ts`

**Route match** (line ~900-904): Replace the regex with a flat path check:
```
// OLD: const paymentMatch = path.match(/^\/api\/v1\/api\/payment\/save\/([^/]+)\/([^/]+)$/);
// NEW: if (path === "/api/v1/api/payment/save" && method === "POST")
//        → { handler: "paymentSave", params: {} }
```

**Handler** (`handlePaymentSave`, lines 754-769):
- Remove `params` argument entirely
- Extract and validate `payerId`, `payerType` from `payload` (required strings)
- Validate `periodMonth` (integer 1-12), `periodYear` (4-digit integer)
- `scheduleNumber` — optional integer
- Call RPC with single param: `public_api_payment_save({ p_payload: payload })`

**Switch case** (line 960): Update to `handlePaymentSave(supabase, _payload as Record<string, unknown>)` — no `routeParams`.

### 3. No Frontend Changes

This API is consumed exclusively by the external C3-Wizard portal. No `src/` files reference `/payment/save`. Internal cashier payments use `create_c3_payment_with_receipt` RPC directly.

## Files Changed

| File | Change |
|---|---|
| New migration SQL | Drop `public_api_payment_save(TEXT,TEXT,JSONB)`, create `public_api_payment_save(JSONB)` with body-sourced params, computed period, c3_payment_components inserts |
| `supabase/functions/public-api/index.ts` | Flat route match, refactored handler signature, updated switch case |

## Validation & Error Responses

| Condition | Response |
|---|---|
| Missing `payerId` | 400: "payerId is required in request body" |
| Missing `payerType` | 400: "payerType is required in request body" |
| Missing/invalid `periodMonth` | 400: "periodMonth must be an integer between 1 and 12" |
| Missing/invalid `periodYear` | 400: "periodYear must be a valid 4-digit year" |
| Empty `paymentHeaders` | 400: "paymentHeaders array is required" |

## Period Column Formats

| Table | Column Type | Format |
|---|---|---|
| `cn_payment.period` | DATE | `2026-01-01` (via `make_date`) |
| `c3_payment_components.period` | TEXT | `01/2026` (MM/YYYY) |

