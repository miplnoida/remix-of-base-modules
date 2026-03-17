# Fix: Remove Incorrect Local Edge Function, Use C3-Wizard APIs Directly

## Problem Analysis

The current architecture has a critical flaw:

1. **All 6 frontend services** (`wizAdminApiService.ts`, `wizReportsService.ts`, `wizReconciliationService.ts`, `wizPaymentService.ts`, `wizC3DetailsService.ts`, `wizSelfEmployedService.ts`) correctly call the **external C3-Wizard API** at `https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api`.
2. **A local edge function** (`supabase/functions/wiz-admin-api/index.ts`, 1292 lines) was mistakenly created in the SSB Admin project. This function:
  - Queries C3-Wizard tables (`c3_companies`, `c3_users`, `c3_self_employed`, etc.) that **do not exist** in the SSB Admin database
  - Reimplements backend logic that already exists in the C3-Wizard system
  - Uses a dual-client pattern to proxy requests to the external project — completely unnecessary since the frontend already calls the external URL directly
3. **The local edge function is never called** by any frontend code (all services point to `nfvtlyvxfxzbhoqzprkr`), making it dead code that causes confusion.

## Root Cause

Previous iterations tried to "fix" the `Unknown action` errors by implementing the report handlers locally, when the real fix was to ensure those actions exist on the **C3-Wizard's deployed edge function** (the external project).

## Plan

### Step 1: Delete the local edge function

- **Delete** `supabase/functions/wiz-admin-api/index.ts` (and its directory)
- This function is never called by the frontend and only creates confusion
- All C3 data operations are handled by the external C3-Wizard project



### Step 2: Verify frontend services are correct

All 6 `wiz*.ts` services already call the external C3-Wizard URL directly — no changes needed. The `Unknown action` errors will only resolve when the C3-Wizard team deploys those action handlers on their side.

### Step 3: Prepare C3-Wizard team request

Document remaining dependency: the 15 report actions + any missing actions must be deployed to the C3-Wizard's `wiz-admin-api` edge function. The SSB Admin side is correctly configured as a pure API consumer.

## Summary of Changes


| Action    | File                                | Reason                                           |
| --------- | ----------------------------------- | ------------------------------------------------ |
| Delete    | `supabase/functions/wiz-admin-api/` | Dead code; reimplements C3-Wizard logic locally  |
| &nbsp;    | &nbsp;                              | &nbsp;                                           |
| No change | All `src/services/wiz*.ts` files    | Already correctly calling external C3-Wizard API |
