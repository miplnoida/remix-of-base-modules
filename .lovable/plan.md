

# Fix: CyberSource Toggle — Use Only Local Auth

## Current Issue
Line 83 still sends `loginId` and `password` to the C3-Wizard API via `toggleCyberSourceStatus(id, login_id, password)`. The C3-Wizard backend only has self-employed and employer users, so this would fail or be meaningless.

## Changes

### 1. `CyberSourceSettings.tsx` (line 83)
After local Supabase auth succeeds, call `toggleCyberSourceStatus` with only the setting `id` — no credentials:
```ts
await toggleCyberSourceStatus(toggleRow!.id);
```

### 2. `wizReconciliationService.ts` — `toggleCyberSourceStatus`
Update signature to only accept `id`. Send just `{ id }` to the C3-Wizard API action `toggle_cybersource_status` (no login_id/password).

## Result
- User identity is verified locally via Supabase auth (already working)
- C3-Wizard receives only the setting ID to toggle, with no credentials

