

# Fix: Access Denied on Card Machine Change Requests Screen

## Root Cause
The `CardMachineChangeRequests.tsx` page wraps its content in `<PermissionWrapper moduleName="cashier_operations">`. However, in the Roles & Permissions admin, the module is registered as **"Batch Detail Change Requests"** (or a similar dedicated module name). Since the user's role has permission for that specific module — not `cashier_operations` — the permission check fails and shows "Access Denied".

## Fix

### 1. Update `src/pages/cashier/CardMachineChangeRequests.tsx`
Change the `PermissionWrapper` module name from `"cashier_operations"` to `"batch_detail_change_requests"` (matching the module slug used in the permissions system). Also update any `useActionPermissions` calls if present.

### 2. Update `src/components/sidebar/menuItems/cashierMenuItems.ts`
Change `requiresPermission: "cashier_operations"` to `requiresPermission: "batch_detail_change_requests"` for the "Card Machine Change Requests" menu entry.

### 3. Add to `MODULE_NAMES` in `src/hooks/useActionPermission.ts`
Add a constant: `BATCH_DETAIL_CHANGE_REQUESTS: 'batch_detail_change_requests'`

### Files Changed

| File | Change |
|------|--------|
| `src/pages/cashier/CardMachineChangeRequests.tsx` | Update `moduleName` in `PermissionWrapper` |
| `src/components/sidebar/menuItems/cashierMenuItems.ts` | Update `requiresPermission` for menu item |
| `src/hooks/useActionPermission.ts` | Add module name constant |

