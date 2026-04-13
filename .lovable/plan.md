

## Add Module-Based Template Filtering to Workflow Notification Configuration

### Summary

The `notification_templates` table already has a `module_id` foreign key to `app_modules`, and both `StepNotificationFormData` and `NotificationFormData` already carry a `module_id` field. No schema changes needed. This is a **UI-only enhancement** to add a searchable Module dropdown that filters the Template dropdown.

### Current State

- Both "Step Entry Notifications" and "Action Notifications" show a Template dropdown listing ALL templates unfiltered
- `module_id` exists in the form data interfaces but is never exposed in the UI for selection
- `parentModules` (app_modules with no parent) are already fetched in the component
- The `SearchableSelect` component already exists at `src/components/ui/searchable-select.tsx`

### Changes

**File: `src/pages/admin/workflows/WorkflowForm.tsx`**

1. **Replace Template `<Select>` with Module + Template pair in Step Entry Notifications** (lines 1373-1389):
   - Add a "Module" column using `SearchableSelect` bound to `sn.module_id`, populated from `parentModules`
   - Replace the Template `<Select>` with a `SearchableSelect` that filters `templates` by the selected `module_id`
   - When Module changes, reset `template_id` to `null`
   - Adjust grid from `grid-cols-5` to `grid-cols-6` to accommodate the new column

2. **Replace Template `<Select>` with Module + Template pair in Action Notifications** (lines 1676-1692):
   - Same pattern: add Module `SearchableSelect` bound to `notif.module_id`
   - Filter Template `SearchableSelect` by selected `module_id`
   - When Module changes, reset `template_id` to `null`
   - Adjust grid from `grid-cols-5` to `grid-cols-6`

3. **Add helper logic** for filtered templates:
   - Create a simple inline filter: `templates?.filter(t => !moduleId || t.module_id === moduleId)` for each notification row
   - Both dropdowns use `SearchableSelect` for search support

4. **Backward compatibility**: If `module_id` is `null`, show all templates (unfiltered) — existing configs remain functional

### No Other File Changes Required

- No migration needed (`module_id` FK already exists on `notification_templates`)
- No edge function changes (the processor already reads `module_id` from both tables)
- No `useWorkflows.ts` changes (`module_id` is already persisted in both save paths)

### Technical Details

- Import `SearchableSelect` at the top of `WorkflowForm.tsx`
- Map `parentModules` to `SearchableSelectOption[]` format: `{ value: id, label: display_name }`
- Map filtered `templates` to `SearchableSelectOption[]`: `{ value: id, label: name }`
- Use `includeAllOption="All Modules"` on the Module dropdown so users can clear selection
- Both dropdowns get search-as-you-type via the existing `SearchableSelect` component

