# SSB Admin → C3-Wizard Team: Request to Implement Manage Users Actions

> **From:** SSB Admin Team  
> **To:** C3-Wizard Team  
> **Date:** 2026-03-23  
> **Priority:** High  
> **Subject:** 16 new actions required in `wiz-admin-api` for Manage Users module  
> **Endpoint:** `POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api`

---

## 1. Summary

We have completed the SSB Admin frontend implementation for the **Manage Users** module (4 sub-modules: Employer Users, Self-Employed Users, Role Permission, Role Master) based on the implementation guide you shared on 2026-03-22.

However, when testing, all Manage Users actions return:

```json
{ "status": "error", "error": "Unknown action: <action_name>" }
```

This confirms the **backend handler has not yet been deployed**. Per Section 7 of the guide, a new handler file `supabase/functions/wiz-admin-api/handlers/manage-users.ts` needs to be created and registered in the main router.

---

## 2. Actions Required

Please implement and deploy the following **16 actions** in `wiz-admin-api`, as specified in Section 6 of the guide:

### Module 1: Employer Users

| # | Action | Params | Expected Response |
|---|--------|--------|-------------------|
| 1 | `get_company_dropdown` | `{}` | `{ companies: [{ id, company_name, registration_number, parent_company_id }] }` |
| 2 | `get_company_users` | `{ company_id: number }` | `{ users: [{ id, first_name, last_name, username, email, role_id, role_label, company_id, created_at, is_active, is_locked, auth_user_id }] }` |
| 3 | `save_company_user` | `{ company_id, first_name, last_name, login_id, email, role_id }` | `{ success: true, message: "User created successfully" }` |
| 4 | `update_company_user` | `{ user_id, first_name, last_name, email, role_id?, company_id? }` | `{ success: true, message: "User updated successfully" }` |
| 5 | `get_user_for_edit` | `{ user_id: number }` | `{ user: { id, first_name, last_name, username, email, role_id, company_id } }` |
| 6 | `toggle_user_status` | `{ user_id: number }` | `{ success: true, message: "...", is_active: boolean }` |
| 7 | `reset_user_password` | `{ user_id: number }` | `{ success: true, message: "Password reset email sent" }` |
| 8 | `change_user_password` | `{ user_id, new_password, confirm_password }` | `{ success: true, message: "Password changed successfully" }` |

### Module 2: Self-Employed Users

| # | Action | Params | Expected Response |
|---|--------|--------|-------------------|
| 9 | `get_se_users` | `{}` | `{ users: [{ employee_id, user_id, full_name, ssn, email, mobile, inserted_on, is_active }] }` |

> **Note:** Toggle, reset, and change password for SE users use the same actions (#6, #7, #8) with the SE user's `user_id`.

### Module 3: Role Permission

| # | Action | Params | Expected Response |
|---|--------|--------|-------------------|
| 10 | `get_role_permissions` | `{ role_id: number }` | `{ permissions: [{ module_id, module_name, module_code, parent_id, is_parent, view_permission, add_permission, update_permission, delete_permission, is_preview, is_print, is_submitted, is_pay }] }` |
| 11 | `save_role_permissions` | `{ permissions: Array<ModulePermission> }` | `{ success: true, message: "Permissions saved successfully" }` |

### Module 4: Role Master

| # | Action | Params | Expected Response |
|---|--------|--------|-------------------|
| 12 | `get_roles_by_category` | `{}` | `{ roles: [{ role_id, role_name, description, role_category }] }` |
| 13 | `get_role_by_id` | `{ role_id: number }` | `{ role: { role_id, role_name, description, role_category } }` |
| 14 | `save_role` | `{ role_name, description, role_category }` | `{ success: true, message: "Role created successfully" }` |
| 15 | `update_role` | `{ role_id, role_name, description }` | `{ success: true, message: "Role updated successfully" }` |
| 16 | `delete_role` | `{ role_id: number }` | `{ success: true, message: "Role deleted successfully" }` |

---

## 3. Scope Filtering Reminder

As per the guide, the following scope restrictions apply:

- **`get_company_dropdown`**: Exclude SSB (`company_name != 'SSB'`), filter `is_deleted = false`
- **`get_roles_by_category`**: Only return roles where `role_category IN ('Company', 'SelfEmployee')` and `is_deleted = false`
- **`delete_role`**: Guard against `role_id <= 6` (system defaults cannot be deleted)
- **`get_se_users`**: Join `c3_self_employed` + `c3_users` — please use the `!<foreign_key_name>` hint to disambiguate the relationship (reference: existing bug fix request in `docs/C3_WIZARD_BUG_FIX_REQUEST_SELF_EMPLOYED_EMBED.md`)

---

## 4. Handler Registration

The new handler must be registered in the main `wiz-admin-api/index.ts` router. Based on existing patterns, this should look like:

```typescript
// In index.ts switch/router
case "get_company_dropdown":
case "get_company_users":
case "get_se_users":
case "toggle_user_status":
case "reset_user_password":
case "change_user_password":
case "get_user_for_edit":
case "save_company_user":
case "update_company_user":
case "get_roles_by_category":
case "get_role_permissions":
case "save_role_permissions":
case "get_role_by_id":
case "save_role":
case "update_role":
case "delete_role":
  return handleManageUsers(action, params, supabaseAdmin);
```

---

## 5. Verification

Once deployed, we will verify with:

```bash
# Test 1: Company Dropdown
curl -X POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: <key>" \
  -d '{"action": "get_company_dropdown", "params": {}}'

# Test 2: SE Users
curl -X POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: <key>" \
  -d '{"action": "get_se_users", "params": {}}'

# Test 3: Roles
curl -X POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: <key>" \
  -d '{"action": "get_roles_by_category", "params": {}}'
```

**Expected:** HTTP 200 with `"status": "success"` for all three.

---

## 6. Blocking

The following SSB Admin pages are **non-functional** until these actions are deployed:

- `/c3-management/users/employers` — Employer Users
- `/c3-management/users/self-employed` — Self-Employed Users
- `/c3-management/users/role-permission` — Role Permission
- `/c3-management/users/role-master` — Role Master

---

**Contact:** SSB Admin Development Team  
**Status:** Frontend complete, awaiting backend deployment
