

# Rename `designations` → `tb_designations` and Create Master Data Screen

## Current Usage Analysis

The `designations` table **IS actively used** across the application:

| Location | Usage |
|----------|-------|
| `profiles.designation_id` | FK column referencing designations |
| `designation_hierarchy` table | FK columns `designation_id`, `parent_designation_id` |
| `workflow_tasks.assigned_designation` | References designation |
| `workflow_steps.assigned_designation` | References designation |
| `workflow_steps.approver_designation_ids` | References designation |
| `ia_distribution_recipients.designation` | References designation |
| `UserEdit.tsx`, `UserCreate.tsx` | Dropdown for designation selection |
| `DesignationManagement.tsx` | Existing CRUD screen (non-standard, at `/admin/designations`) |
| `DesignationHierarchy.tsx` | Hierarchy management screen |
| `useDesignations.ts` | Data hook for all CRUD operations |
| `AppRoutes.tsx` | Routes for both screens |

Despite being used, the table does not follow the `tb_` naming convention. The existing CRUD screen is also not in the master data section.

---

## Plan

### 1. Database Migration — Rename Table
Rename `designations` → `tb_designations` (the `designation_hierarchy` table stays as-is since the user only asked about the designations table; its FKs will be updated to point to the renamed table).

```sql
ALTER TABLE designations RENAME TO tb_designations;
```

### 2. Update Hook — `useDesignations.ts`
Change all `.from('designations')` calls to `.from('tb_designations')` (using `as any` cast for type safety until types regenerate). Keep all hook names and exports the same for backward compatibility.

### 3. Create Master Data Screen — `src/pages/admin/master-data/DesignationManagement.tsx`
Create a new master data page following the existing pattern (like `ActivityManagement.tsx`):
- Uses `PermissionWrapper` and `useActionPermissions` with module `"md_designations"`
- Full CRUD: View, Add, Edit, Delete with proper dialogs
- Uses `PageShell` for consistent layout
- Queries `tb_designations` directly via Supabase client
- Columns: Name, Description, Status (Active/Inactive), Actions
- Audit fields: `created_by`/`updated_by` populated via `useUserCode()`

### 4. Add to Master Data Menu — `masterDataMenuItems.ts`
Add a "Designations" entry under the General sub-group:
```typescript
{ title: "Designations", url: "/admin/master-data/designations", icon: Award, requiresPermission: "master_data" }
```

### 5. Update Routes — `AppRoutes.tsx`
- Add new route: `/admin/master-data/designations` → new `DesignationManagement` page
- Keep existing `/admin/designations` route pointing to old page (or redirect) to avoid breaking `DesignationHierarchy` and user management flows
- Update old `DesignationManagement` import if needed

### 6. Update Dependent Files
- **`UserEdit.tsx`** and **`UserCreate.tsx`**: Already use `useDesignations()` hook — no change needed since hook API stays the same
- **`DesignationHierarchy.tsx`**: Uses `useDesignations()` and `useDesignationHierarchy()` hooks — the hierarchy hook queries `designation_hierarchy` table which still references `tb_designations` via FK; update the join references in the hook

### Files Changed

| File | Action |
|------|--------|
| Database migration | Rename `designations` → `tb_designations` |
| `src/hooks/useDesignations.ts` | Update table name from `'designations'` to `'tb_designations'` |
| `src/pages/admin/master-data/DesignationManagement.tsx` | **Create** — new master data CRUD page |
| `src/components/sidebar/menuItems/masterDataMenuItems.ts` | Add Designations menu entry |
| `src/components/routing/AppRoutes.tsx` | Add master data route |

