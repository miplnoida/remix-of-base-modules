# Parent-Child Company Mapping — Legacy Parity Implementation

## Legacy Behavior (from screenshots)

**Screenshot 1 — Mapping Result Dialog**: After saving a mapping, a "Mapping Result" dialog appears showing three categories:

- **Mapped** (green ✅): Companies successfully linked (e.g., "A.D.T Incorporated")
- **Unmapped** (red ✗): Companies that failed to map ("None")
- **Already Linked** (yellow ⚠): Companies already linked to other parents (e.g., "A Fulton & Co. Ltd")

**Screenshot 2 — Unmap Confirmation Dialog**: When removing a child company from a parent, a "Confirm Action" dialog appears showing:

- Parent and child company names
- List of affected users (with person icons) who will lose access
- "Cancel" / "Yes, Remove" buttons
- Warning: "This action cannot be undone"

## Current Implementation Gaps


| Feature                 | Legacy                                              | Current                                                                 | Gap         |
| ----------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- | ----------- |
| Mapping result feedback | Detailed dialog with Mapped/Unmapped/Already Linked | Simple toast "Company mapping updated"                                  | **Missing** |
| Unmap confirmation      | Dialog listing affected users                       | Badge click instantly removes from array (no confirmation, no API call) | **Missing** |
| Affected users lookup   | Shows user names who lose access                    | No API call or UI                                                       | **Missing** |


## Implementation Plan

### 1. Add two new service functions in `wizAdminApiService.ts`

- `**removeCompanyMapping(parentId, childId)**` — calls `{ action: "remove_company_mapping", params: { parent_id, child_id } }`. Returns `{ affected_users: [{ name }] }`.
- `**getCompanyMappingUsers(parentId, childId)**` — calls `{ action: "get_mapping_users", params: { parent_id, child_id } }`. Returns `{ users: [{ id, first_name, last_name }] }`.

### 2. Update `WizEmployerList.tsx` — Mapping Result Dialog

After `saveMapping` succeeds, instead of a toast, parse the API response which should return:

```json
{
  "mapped": [{ "id": 1, "company_name": "..." }],
  "unmapped": [{ "id": 2, "company_name": "...", "reason": "..." }],
  "already_linked": [{ "id": 3, "company_name": "...", "current_parent": "..." }]
}
```

Display a **"Mapping Result" dialog** with three columns (green/red/yellow) matching the legacy layout. Include a "Close" button that dismisses and refreshes the list.

### 3. Update `WizEmployerList.tsx` — Unmap Confirmation Dialog

When a user clicks the `×` on a child company badge:

1. Call `getCompanyMappingUsers(parentId, childId)` to fetch affected users
2. Show a **"Confirm Action" dialog** with:
  - Parent and child company names (bold)
  - "Removing this mapping will revoke access for the following user(s):"
  - List of user names with person icons
  - "This action cannot be undone. Do you want to continue?"
  - "Cancel" and "Yes, Remove" buttons
3. On "Yes, Remove": call `removeCompanyMapping(parentId, childId)`, then remove from `childIds` state and refresh companies list

### 4. API Requirements from C3-Wizard

Two API actions are needed. Check if they already exist; if not, specify:

**Action: `get_mapping_users**`

- Request: `{ "action": "get_mapping_users", "params": { "parent_id": 123, "child_id": 456 } }`
- Response: `{ "status": "success", "data": { "users": [{ "id": 1, "first_name": "David", "last_name": "Walwyn" }] } }`

**Action: `remove_company_mapping**`

- Request: `{ "action": "remove_company_mapping", "params": { "parent_id": 123, "child_id": 456 } }`
- Response: `{ "status": "success", "data": { "affected_users": [...], "removed": true } }`

**Action: `update_company_mapping` (existing)** — Response should be enhanced to return:

```json
{
  "status": "success",
  "data": {
    "mapped": [{ "id": 1, "company_name": "A.D.T Incorporated" }],
    "unmapped": [],
    "already_linked": [{ "id": 2, "company_name": "A Fulton & Co. Ltd" }]
  }
}
```

### Files to Modify

- `src/services/wizAdminApiService.ts` — add `removeCompanyMapping`, `getCompanyMappingUsers`, and response types
- `src/pages/c3Management/employers/WizEmployerList.tsx` — add Mapping Result dialog, Unmap Confirmation dialog, and updated save flow

### Important Notes

- If the C3-Wizard APIs (`get_mapping_users`, `remove_company_mapping`) do not yet exist, they must be implemented on the wizard side first. The enhanced `update_company_mapping` response is also required.
- No hardcoded logic — all user/company data comes from API responses.
- Backward compatible — the existing mapping flow continues to work; we're adding result feedback and confirmation on top.