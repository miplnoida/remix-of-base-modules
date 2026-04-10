

# Plan: Multi-Channel Notification Template Manager

## Summary

Rename `EmailTemplateManager` to `NotificationTemplateManager`, add top-level channel tabs (Email, SMS, Push, In-App), and parameterize all queries/mutations by channel. The database already supports all four channels via the `notification_channel` enum — no schema migration needed.

## Architecture

The 975-line component will be restructured with a top-level channel tab bar. The existing Email tab content (templates list, audit logs, filters, editor, preview, version history, layout editor) stays unchanged. The three new channel tabs reuse the same template list, filters, CRUD dialogs, and audit log — differing only in:

- **Query filter**: `.eq('channel', activeChannel)` instead of hardcoded `'email'`
- **Editor fields**: Channel-specific fields in the create/edit dialog
- **Layout Editor button**: Only visible on Email tab
- **Preview rendering**: Plain text for SMS, structured card for Push/In-App

### Channel-Specific Editor Differences

| Field | Email | SMS | Push | In-App |
|-------|-------|-----|------|--------|
| Subject | Yes | No | Yes (as Title) | Yes (as Title) |
| HTML Body | Yes | No | No | No |
| Plain Text Body | Toggle | Yes (with char counter) | Yes (255 max) | Yes (markdown) |
| Action URL | No | No | Yes | Yes |
| Layout Editor | Yes | No | No | No |
| Character Counter | No | Yes (160/320) | Yes (255) | No |

## Implementation Steps

### 1. Rename file and component

- Rename `src/pages/admin/notifications/EmailTemplateManager.tsx` → `NotificationTemplateManager.tsx`
- Export `NotificationTemplateManager` as default
- Update import in `AppRoutes.tsx`

### 2. Add top-level channel tabs

Above the existing "Templates / Audit Logs" tabs, add a channel selector:
```
[Email] [SMS] [Push] [In-App]
```
State: `const [activeChannel, setActiveChannel] = useState<'email'|'sms'|'push'|'in_app'>('email');`

### 3. Parameterize all data queries by channel

- Template list query: `.eq('channel', activeChannel)` with query key `['templates-full', activeChannel]`
- All mutation invalidations use the same channel-scoped key
- Save mutation sets `channel: activeChannel` in payload

### 4. Channel-aware editor dialog

- Email tab: Current editor unchanged (HTML body, subject, layout notice)
- SMS tab: Plain textarea with live character counter showing `N/160` or `N/320`, no subject field, no HTML toggle
- Push tab: Title field (required), short body (255 char max), optional Action URL field
- In-App tab: Title field, plain textarea body, optional Action URL field

### 5. Channel-aware preview

- Email: Current iframe preview with layout header/footer (unchanged)
- SMS: Plain text card with phone mockup styling
- Push: Card mimicking a push notification (icon, title, body)
- In-App: Card with title, body, optional action link

### 6. Conditional Layout Editor visibility

Layout Editor button and Layout Status Cards only render when `activeChannel === 'email'`.

### 7. Update sidebar menu item

In `systemAdminMenuItems.ts`: rename "Email Templates" to "Notification Templates".

### 8. Update AppRoutes.tsx

Change import from `EmailTemplateManager` to `NotificationTemplateManager`. Route path stays the same (`/admin/notifications/email-templates`) for backward compatibility, or optionally add an alias.

### 9. Activate SMS/Push notification types (data update)

Set `is_active = true` for SMS and Push entries in `notification_types` table.

## Files Modified

| File | Change |
|---|---|
| `src/pages/admin/notifications/EmailTemplateManager.tsx` | Rename to `NotificationTemplateManager.tsx`, add channel tabs, parameterize queries, add channel-specific editor/preview |
| `src/components/routing/AppRoutes.tsx` | Update import to `NotificationTemplateManager` |
| `src/components/sidebar/menuItems/systemAdminMenuItems.ts` | Rename menu item to "Notification Templates" |
| **Data update** | `notification_types` — activate SMS and Push |

## No Database Schema Changes

The `notification_templates` table already has the `channel` column with enum values `email`, `sms`, `push`, `in_app`. All existing email templates continue to work unchanged.

