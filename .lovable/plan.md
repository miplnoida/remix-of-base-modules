

# Fix: Remove Duplicate Notification Types

## Problem

The last migration inserted two new rows with codes `PUSH` and `IN_APP`, but the table already had entries with codes `Push` and `In-App` (different casing). This created duplicates:

| Code | Display Name | Created | Status |
|------|-------------|---------|--------|
| Push | Push | Original | inactive |
| **PUSH** | Push Notification | Migration | inactive |
| In-App | In-App | Original | active |
| **IN_APP** | In-App Message | Migration | active |

## Fix

Delete the two duplicate rows inserted by the migration (the `PUSH` and `IN_APP` ones), and activate the original `Push` and `In-App` entries instead — along with `SMS` which was already correctly updated.

### Data operations (via insert tool):

```sql
-- Delete duplicates created by the migration
DELETE FROM notification_types WHERE id = 'bb330d18-01db-4b8e-8ac3-4f5dca6be4b1'; -- PUSH duplicate
DELETE FROM notification_types WHERE id = 'de41e867-0244-4c9b-9c43-e7b01ae402ce'; -- IN_APP duplicate

-- Activate the original Push entry
UPDATE notification_types SET is_active = true, updated_at = now() WHERE id = '70a9e159-3aa7-4d00-954f-c3c41511fe61';

-- SMS was already activated; In-App is already active — no further changes needed
```

## Files Modified

None — data-only fix.

