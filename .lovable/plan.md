## Plan: Remove redundant "Self Employed Settings" and "Cybersource Settings" menus & page

### Findings

**Sidebar (DB-driven via `app_modules`)** — both rows live under the `Settings` parent (`c3010000-…-030`):


| id     | name                        | display_name           | route                                   |
| ------ | --------------------------- | ---------------------- | --------------------------------------- |
| `…031` | `c3_self_employed_settings` | Self Employed Settings | `/c3-management/settings/self-employed` |
| `…032` | `c3_cybersource_settings`   | Cybersource Settings   | `/c3-management/settings/cybersource`   |


- **Self Employed Settings**: no React route, no page component — pure dead menu link (404 on click). Confirmed redundant.
- **Cybersource Settings**: route `/c3-management/settings/cybersource` already redirects to `/c3-management/settings-configuration` (the consolidated "Settings & Configuration" page covers it via the Payment Gateway tab using `useSiteSettings('PAYMENT_GATEWAY')`). The standalone page `CyberSourceSettings.tsx` is no longer reachable from the sidebar — only embedded as a legacy tab in `C3ConfigurationPage.tsx` which itself just renders a "moved" notice. Confirmed redundant.
  &nbsp;

### Changes

**1. DB migration — remove the two menu rows (and their permissions)**

```sql
DELETE FROM role_permissions
 WHERE module_id IN (
   'c3010000-0000-0000-0000-000000000031',
   'c3010000-0000-0000-0000-000000000032'
 );
DELETE FROM app_modules
 WHERE id IN (
   'c3010000-0000-0000-0000-000000000031',
   'c3010000-0000-0000-0000-000000000032'
 );
```

**Important note:- just remove the** `c3_self_employed_settings and c3_cybersource_settings menus nothing else.`  
`make sure dont impact any existing functionality.`  
`just remove the menu self employed as it is 4044 and seperate page of the cybersource as it is already in the system confifuration page.`  
`nothing more than that`