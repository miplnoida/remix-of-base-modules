

## Problem

The `ModuleTreeItem` component on line 153 passes `children={[]}` (empty array) when rendering child modules recursively. This means grandchildren and deeper levels never render — the tree stops at depth 1.

```text
Current behavior:
  Parent Module
    └── Child Module (actions shown)
         └── (grandchildren NEVER rendered — children={[]} hardcoded)

Expected behavior:
  Parent Module
    └── Child Module (actions shown)
         └── Grandchild Module (actions shown)
              └── ... (any depth)
```

## Root Cause

In `src/pages/admin/RolePermissionManagement.tsx`, line 150-153:
```tsx
<ModuleTreeItem
  module={child}
  children={[]}        // ← BUG: always empty
  level={level + 1}
  ...
/>
```

The `childModulesMap` is built correctly in the parent component but is never passed down to `ModuleTreeItem`, so recursive children can't look up their own children.

## Fix (single file change)

**File: `src/pages/admin/RolePermissionManagement.tsx`**

1. **Add `allChildrenMap` prop** to `ModuleTreeItemProps` so the component can look up children for any module at any depth.

2. **Pass the map** from the parent render and within the recursive render.

3. **Replace `children={[]}`** on line 153 with `children={allChildrenMap.get(child.id) || []}`.

4. **Update "Expand All"** button (line 347) to expand all module IDs (not just parents) so deeply nested modules can also be toggled open.

5. **Update search filtering** to also match deeply nested modules (recursive search through `childModulesMap`).

No backend or database changes needed — `useAppModules` already fetches all modules with their `parent_id` and actions. The `childModulesMap` already maps every parent to its direct children at all levels. The only issue is the frontend not passing this map into the recursive component.

