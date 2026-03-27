

# Hide Developer Info FAB via Backend-Only Setting

## Approach

Insert a `developer_info_enabled` row into `system_settings` with `is_editable = false`. This prevents it from appearing in the Global Settings admin UI (which only shows editable settings), so it can only be changed directly in the database. The FAB component reads this value and hides itself when `false`.

## Changes

### 1. Insert setting row (data insert, not migration)

Insert into `system_settings`:
- `setting_key`: `developer_info_enabled`
- `setting_value`: `false`
- `setting_type`: `boolean`
- `display_name`: `Developer Information`
- `description`: `Show/hide Developer Info FAB for Admin users. Editable only from backend.`
- `category`: `System`
- `is_editable`: **false** ← hides from Global Settings UI

### 2. Update `src/components/developer-info/DeveloperInfoFAB.tsx`

- Import `useSystemSettingsContext`
- Read: `getSetting('developer_info_enabled', 'false') === 'true'`
- Guard: `if (!isAdmin || !devInfoEnabled) return null`

To enable the FAB, an administrator would run directly in the database:
```sql
UPDATE system_settings SET setting_value = 'true' WHERE setting_key = 'developer_info_enabled';
```

