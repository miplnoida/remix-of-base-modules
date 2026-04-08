

# Risk Assessment — Null Department & Data Loss on Edit

## Root Cause Analysis

### Issue 1: Department showing as "—" (null) in the table

The department column is **not actually null** in the database. The data is intact:

- `ia_department_functions.department_id` is `NOT NULL` — so every function has a department.
- However, 4 risk assessment records point to functions whose **departments have been deactivated** (`is_active = false`): Administration, Benefits, and Compliance.
- The department dropdown (`useIADepartments`) filters by `is_active = true`, so these deactivated departments are excluded from the `deptMap`.
- The table column renders `deptMap.get(fn.department_id)?.name || '—'` — since the department isn't in the map, it shows "—".

**Affected records:**
| Function | Department (deactivated) |
|---|---|
| System Administration | Administration |
| Claim Processing | Benefits |
| Pension | Benefits |
| Compliance Monitoring | Compliance |

### Issue 2: Data loss when editing the department field

When the user clicks Edit on one of these records, `openEdit()` runs:

```typescript
const fn = funcMap[r.function_id];
setSelectedDeptId(fn?.department_id || '');  // Sets to the deactivated dept ID
```

The department ID is set, but it doesn't appear in the `<Select>` dropdown (because it's filtered out). So the `<Select>` renders as empty/placeholder. When the user changes the department dropdown to a new value, `onValueChange` fires:

```typescript
setSelectedDeptId(v);
setSelectedFunctionId('');  // ← THIS clears the function
```

This clears the function selection, and because `deptFunctions` now fetches functions for the *new* department, the previously loaded function is gone. The form visually appears to "lose data" because the cascading reset wipes the function.

## Proposed Fix

### 1. Include deactivated departments/functions in edit context

When loading data for display and editing, also fetch deactivated departments so they appear correctly in the table and in the edit form's dropdown (marked as deactivated).

**File: `src/pages/audit/RiskAssessment.tsx`**

- Add a separate query for **all departments** (including inactive) for display purposes (`deptMapAll`).
- Use `deptMapAll` in the table columns and `openEdit` resolution.
- In the Department `<Select>`, include the record's current department even if deactivated (append it with a "(Deactivated)" label so the user sees it selected).
- Only clear `selectedFunctionId` when the department actually changes to a *different* value, not when it's re-set to the same value.

### 2. Preserve function when department hasn't changed

**File: `src/pages/audit/RiskAssessment.tsx`**

Update the department `onValueChange` handler:

```typescript
onValueChange={(v) => {
  if (v !== selectedDeptId) {
    setSelectedDeptId(v);
    setSelectedFunctionId('');
  }
}}
```

This prevents the cascading reset when the Select re-fires with the same value.

### 3. Show deactivated department name in table

Update the table's department column to resolve from `allFunctions` joined with a full department map (including inactive), so deactivated departments show their name instead of "—".

### Summary of Changes

| File | Change |
|---|---|
| `src/pages/audit/RiskAssessment.tsx` | Add query for all departments (incl. inactive) for display; use in table + edit form; guard cascading reset; show deactivated label |

**No database changes required.** The data integrity is sound — the issue is purely a UI filtering problem.

