# Plan: CyberSource Toggle — Confirm Current Implementation is Correct

## Analysis

The current implementation **already does what you described**:

1. When toggling Active/Inactive, a "Confirm Action" modal opens asking for **UserId** and **Password**
2. These credentials are sent to the **C3-Wizard API** via `toggleCyberSourceStatus(id, login_id, password)` — which calls the `toggle_cybersource_status` action on `wiz-admin-api`
3. The C3-Wizard backend validates the user belongs to that system before allowing the status change

## What's Already Working

- `CyberSourceSettings.tsx` line 82: calls `toggleCyberSourceStatus(toggleRow!.id, loginId, password)`
- `wizReconciliationService.ts` line 49-51: sends `{ id, login_id, password }` to the C3-Wizard `wiz-admin-api` endpoint
- No local Supabase auth is involved — verification is entirely delegated to C3-Wizard

## Conclusion

**No code changes are needed.** The toggle verification flow already calls the C3-Wizard API with the entered credentials, and the C3-Wizard backend handles user validation. The screenshot you shared confirms the modal is working as expected.

If the C3-Wizard API is rejecting valid credentials or not responding correctly, that would be a backend issue on the C3-Wizard side rather than a frontend implementation issue.  
  
  
Note: It should not be validated from the c3-wizard exposed apis, it should be validated from this project that the user who wants to change the status is legitimate or same who loggin.  
so this will call the users database in this project because in the c3-wizard theres only a self and employers users.

&nbsp;