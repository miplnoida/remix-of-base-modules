## Fix: Group "Email Templates" + "Settings & Configuration" under a real Settings parent

### Root cause

The sidebar is **database-driven** (built from `app_modules` via `useDynamicNavigation`), not from `c3MenuItems.ts`. The earlier edit to `c3MenuItems.ts` had zero effect — that file is dead code. That's why "Settings & Configuration" still shows as a top-level entry and "Email Templates" doesn't appear in the sidebar at all.

### Current DB state (verified)

- `Settings & Configuration` (`aa1a72a6-...0025`) → parent = C3 Management root, sort 25 → renders as top-level child
- `Email Templates` → **does not exist** in `app_modules`
- An old disabled `c3_wizard_settings` ("Settings", `c3010000-...0030`) parent exists but is `is_enabled=false, show_in_menu=false`

### Fix (single DB migration)

1. **Re-enable** `c3_wizard_settings` row → set `display_name='Settings'`, `is_enabled=true`, `show_in_menu=true`, `icon='Settings'`, `sort_order=85` (places it near other admin items, after Reconciliation, before Reports). Reuse this existing parent so we don't pollute the table.
2. **Re-parent** `Settings & Configuration` (`aa1a72a6-...0025`) → set `parent_id = c3010000-...0030`, sort_order=20.
3. **Insert** `Email Templates` row → parent_id=`c3010000-...0030`, route=`/c3-management/email-templates`, icon=`Mail`, sort_order=10, enabled, visible.
4. **Cleanup**: leave the two stale disabled children (`c3_self_employed_settings`, `c3_cybersource_settings`) under it — they are already `is_enabled=false, show_in_menu=false`, so they won't render.  (make it enable true i want to show these as well)
5. **Delete dead code**: remove the unused `c3MenuItems.ts` (or at minimum strip its `System Settings` block) so future devs don't get misled. *(Actually only drop the block we added since the file isn't imported anywhere — safest is to leave the file untouched and just note it's dead. I'll strip our recently-added "System Settings" block to keep the file accurate as historical reference.)   - dont delete anything just add the comment* 
6. **Permissions**: also add the two new modules to whatever role/permission grant the user already has for "Settings & Configuration" so they appear in the sidebar (the RPC `get_user_accessible_modules` filters by role grants). Will inspect `app_module_role_permissions` (or equivalent) and mirror the grants from the existing `Settings & Configuration` row to the new parent + Email Templates.

### Result

Sidebar under **C3 Management** will show:

```
…
Reconciliation
Settings              ← new parent (uses existing row)
  ├─ Email Templates
  └─ Settings & Configuration
Reports
…
```

### Files touched

- **New migration** (re-enable parent, re-parent existing child, insert Email Templates row, mirror role grants)
- `**src/components/sidebar/menuItems/c3MenuItems.ts**` — remove the dead "System Settings" block I added earlier so the file doesn't mislead

### Verification step after deploy

Reload the app → expand "C3 Management" → confirm "Settings" parent shows with both children, and "Settings & Configuration" no longer appears at the top level.  
  
  
Important Note : show this `c3_self_employed_settings`, `c3_cybersource_settings in the same main menu` Settings.  
