

# Enhance Parent Module Dropdown in Module Management

## Summary
Replace the basic `Select` dropdown for "Parent Module" in the Add/Edit Module dialog with a `SearchableSelect` component. Filter eligible parents to only modules with no route (null/empty), while preserving the currently assigned parent during edits.

## Changes

### 1. `src/pages/admin/ModuleManagement.tsx`

**Parent Module dropdown (lines 656-692)**:
- Replace `Select` with `SearchableSelect` from `@/components/ui/searchable-select`
- Build options list filtered to modules where `!m.route` (no route = container modules only)
- Keep existing filters: exclude self, exclude descendants, must be enabled
- **Edit exception**: if `selectedModule?.parent_id` points to a module with a route, include it in the options so the current assignment remains visible/selectable
- Add `includeAllOption="None (top level)"` to handle the "no parent" case (maps to empty string → `null`)

**Validation in `handleSaveModule` (lines 409-416)**:
- Before save, if `moduleForm.parent_id` is set, look up the target module
- If the target module has a non-empty `route`, block save with a toast: "A module with a route cannot be used as a parent module"
- This is a client-side safety net; the filtering already prevents this in normal flow

**No backend changes needed** — the `app_modules` table is already fully loaded client-side via `useAppModules()`. Filtering is done in the component using the existing dataset. The `SearchableSelect` handles large lists efficiently via `cmdk` client-side filtering.

### Technical Detail

```text
Current:  <Select> with static list, no search
Proposed: <SearchableSelect> with:
  - options = modules.filter(m => !m.route && !isSelf && !isDescendant && isEnabled)
  - Plus current parent (if editing and parent has a route — edit exception)
  - includeAllOption="None (top level)"
  - searchPlaceholder="Search parent modules..."
  - Custom filter via searchText for module name matching
```

### Files Changed
| File | Change |
|------|--------|
| `src/pages/admin/ModuleManagement.tsx` | Replace Parent Module `Select` with `SearchableSelect`, add save validation |

