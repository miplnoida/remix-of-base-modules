# SSB Admin → C3-Wizard Team: CyberSource Toggle API Change Request

> **From:** SSB Admin Team  
> **To:** C3-Wizard Team  
> **Date:** 2026-03-16  
> **Re:** Remove user validation from `toggle_cybersource_status` API action  
> **Status:** Change Request — Action Required from Wizard Team

---

## Background

The CyberSource Settings admin screen has been **migrated from C3-Wizard to the SSB Admin project**. Previously, when this screen was part of C3-Wizard, the `toggle_cybersource_status` action validated the user's credentials against the C3-Wizard user database before toggling the status.

Since the migration, the user databases are **different** — SSB Admin users do not exist in the C3-Wizard database, and vice versa. Therefore, sending SSB Admin credentials to C3-Wizard for validation is incorrect and will always fail.

---

## New Architecture

### Current (Broken) Flow
```
SSB Admin UI → sends login_id + password + id → C3-Wizard API
                                                  ↓
                                          Validates credentials ❌ (users don't exist)
                                                  ↓
                                          Returns 400: "login_id and password are required"
```

### Proposed (Correct) Flow
```
SSB Admin UI → Validates user credentials locally (SSB Admin DB) 
                  ↓
            Validation fails? → Show error on SSB Admin side (handled locally)
                  ↓
            Validation succeeds? → Send ONLY { id } → C3-Wizard API
                                                        ↓
                                                  Toggle status + update reverse status
                                                        ↓
                                                  Return result
```

---

## 🔴 CHANGES REQUIRED (C3-Wizard Team)

### 1. Remove User Validation from `toggle_cybersource_status`

**Current API behavior:**
- Expects `login_id` and `password` in the payload
- Validates credentials against C3-Wizard user table
- Returns 400 if credentials are missing or invalid
- Toggles status only after successful validation

**Required API behavior:**
- Accept **only** `id` in the payload
- **Do NOT** validate any user credentials
- Toggle the status for the given `id`
- Update the reverse status (ensure both statuses cannot be active simultaneously)
- Return the result

### 2. Updated Payload Format

**Current payload:**
```json
{
  "action": "toggle_cybersource_status",
  "params": {
    "id": 1,
    "login_id": "user@example.com",
    "password": "secretpassword"
  }
}
```

**New payload (required):**
```json
{
  "action": "toggle_cybersource_status",
  "params": {
    "id": 1
  }
}
```

### 3. Expected Response Format

**Success:**
```json
{
  "success": true,
  "message": "CyberSource status toggled successfully",
  "data": {
    "id": 1,
    "is_active": true
  }
}
```

**Error (e.g., invalid ID):**
```json
{
  "success": false,
  "error": "Setting not found for id: 1"
}
```

---

## ✅ What SSB Admin Will Handle (No Action from Wizard Team)

| Responsibility | Handled By |
|---|---|
| User credential validation | **SSB Admin** (local Supabase auth) |
| Showing validation errors to user | **SSB Admin** |
| Re-authentication prompt UI | **SSB Admin** |
| Calling `toggle_cybersource_status` after successful validation | **SSB Admin** |
| API authentication (via `x-admin-api-key` header) | **Both** (existing, no change) |

---

## Security Note

- The API is already protected by the shared `x-admin-api-key` header — this remains unchanged.
- User identity verification is now performed on the SSB Admin side **before** the API call is made.
- The C3-Wizard API does not need to know *who* is toggling — only *what* to toggle.

---

## Summary of Actions

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Remove `login_id` and `password` requirement from `toggle_cybersource_status` | **Wizard Team** | Required |
| 2 | Update action to accept only `{ id }` and toggle status + reverse status | **Wizard Team** | Required |
| 3 | Remove credential validation logic from toggle action | **Wizard Team** | Required |
| 4 | Update SSB Admin service call to send only `{ id }` | **SSB Admin Team** | Will implement after Wizard changes |
| 5 | Confirm updated API is deployed | **Wizard Team** | Pending |

---

## Implementation Guide for SSB Admin (Post-Change)

Once the Wizard team deploys the updated API, the SSB Admin code will be updated as follows:

### Service Layer (`wizReconciliationService.ts`)
```typescript
// BEFORE (current)
export async function toggleCyberSourceStatus(id: number, login_id: string, password: string): Promise<void> {
  await callWizApi('toggle_cybersource_status', { id, login_id, password });
}

// AFTER (once Wizard API is updated)
export async function toggleCyberSourceStatus(id: number): Promise<void> {
  await callWizApi('toggle_cybersource_status', { id });
}
```

### Component Layer (`CyberSourceSettings.tsx`)
```typescript
// Local re-authentication (already implemented via temporary Supabase client)
const tempClient = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const { error } = await tempClient.auth.signInWithPassword({ email: loginId, password });

if (error) {
  // Handle locally — show error toast
  return;
}

// Only after successful local auth, call Wizard API with just the ID
await toggleCyberSourceStatus(toggleRow.id);
```

---

*End of Change Request — SSB Admin Team*
