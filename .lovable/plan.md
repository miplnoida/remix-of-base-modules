

# Fix: Move 'V' (Verified) Status to Registered Employers Tab

## Problem

In `src/hooks/useEmployerRegistration.ts`, the status grouping arrays are:
- `PENDING_STATUSES = ['Z', 'P', 'V']` ← V is here incorrectly
- `REGISTERED_STATUSES = ['A']`

Employers with status `'V'` (Verified) appear in the "Pending Verification" tab instead of "Registered Employers".

## Fix

**File**: `src/hooks/useEmployerRegistration.ts` (line 427-428)

Move `'V'` from `PENDING_STATUSES` to `REGISTERED_STATUSES`:

```typescript
const PENDING_STATUSES = ['Z', 'P'];
const REGISTERED_STATUSES = ['A', 'V'];
```

Single-line change, no other files affected. The counts and data queries already use these arrays dynamically.

