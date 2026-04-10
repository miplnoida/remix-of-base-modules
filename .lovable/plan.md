

# Merged Plan: SMS/Push Provider Tabs + Notification Types Management

## Summary

Refactor `/admin/notifications/providers` into a **4-tab layout**:
1. **Email Providers** — existing functionality (no changes)
2. **SMS Providers** — new CRUD for SMS provider configs
3. **Push Providers** — new CRUD for Push provider configs
4. **Notification Types** — new CRUD to manage dynamic notification types (replacing hardcoded arrays)

## Current State

- `notification_providers` table already has a `channel` enum: `email | sms | push | in_app`
- Page currently only queries `channel = 'email'` and renders email-specific forms
- `email_provider_type` column exists but no equivalent for SMS/Push provider subtypes
- `WorkflowForm.tsx` line 168: `const NOTIFICATION_TYPES = ['Email', 'SMS', 'Push', 'In-App']` — hardcoded
- `NotificationTemplates.tsx` and `NotificationLogs.tsx` have hardcoded `CHANNELS` arrays

## Database Changes

### Migration 1: Add `notification_types` table + SMS/Push columns

```sql
-- 1. Add provider subtype columns for SMS and Push
ALTER TABLE public.notification_providers
  ADD COLUMN IF NOT EXISTS sms_provider_type TEXT,
  ADD COLUMN IF NOT EXISTS push_provider_type TEXT;

-- 2. Create notification_types table
CREATE TABLE public.notification_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Seed existing types
INSERT INTO public.notification_types (code, display_name, description, display_order)
VALUES
  ('Email', 'Email', 'Email notifications via configured provider', 1),
  ('SMS', 'SMS', 'SMS text message notifications', 2),
  ('Push', 'Push', 'Push notifications to devices', 3),
  ('In-App', 'In-App', 'In-application notifications', 4);

-- 4. Create set_sms_provider_default and set_push_provider_default RPCs
-- (mirror existing set_email_provider_default logic)
```

## UI Changes

### File: `src/pages/admin/notifications/ProviderSettings.tsx`

Major refactor into tabbed layout:

- **Tab 1 (Email Providers)**: Keep existing code as-is, wrapped in a `TabsContent`
- **Tab 2 (SMS Providers)**: New provider form with SMS-specific fields:
  - Provider subtypes: Twilio, MessageBird, Custom Gateway
  - Fields: Account SID, Auth Token, From Number, API URL (varies by subtype)
  - Test: Dialog asks for phone number, logs result
- **Tab 3 (Push Providers)**: New provider form with Push-specific fields:
  - Provider subtypes: FCM, OneSignal, Custom
  - Fields: Server Key, Project ID, App ID, API Key (varies by subtype)
  - Test: Dialog asks for device token/topic
- **Tab 4 (Notification Types)**: CRUD management:
  - Table listing all types with code, display name, active toggle
  - Add/Edit dialog for code, display_name, description, display_order
  - Inline toggle for is_active

Each SMS/Push tab will use the same `notification_providers` table with `channel = 'sms'` or `channel = 'push'`, and store config in the existing `config` JSONB column.

### File: `src/hooks/useNotificationTypes.ts` (new)

- `useNotificationTypes()` — fetch all types for admin CRUD
- `useActiveNotificationTypes()` — fetch only `is_active = true` for dropdowns
- Mutations for create, update, toggle

### File: `src/pages/admin/workflows/WorkflowForm.tsx`

- Remove `const NOTIFICATION_TYPES = ['Email', 'SMS', 'Push', 'In-App']` (line 168)
- Import `useActiveNotificationTypes()` and use dynamic data in dropdowns (lines 1181, 1441)

### File: `src/pages/admin/NotificationTemplates.tsx`

- Replace hardcoded `CHANNELS` array with `useActiveNotificationTypes()` hook

### File: `src/pages/admin/NotificationLogs.tsx`

- Replace hardcoded `CHANNELS` array with `useActiveNotificationTypes()` hook

## SMS Provider Config Fields by Subtype

| Subtype | Fields |
|---|---|
| **Twilio** | Account SID, Auth Token (secret), From Number, Messaging Service SID |
| **MessageBird** | API Key (secret), Originator |
| **Custom Gateway** | API URL, API Key (secret), From Number, HTTP Method |

## Push Provider Config Fields by Subtype

| Subtype | Fields |
|---|---|
| **FCM** | Server Key (secret), Project ID, Sender ID |
| **OneSignal** | App ID, REST API Key (secret) |
| **Custom** | API URL, API Key (secret), Headers (JSON) |

## Files Modified

| File | Change |
|---|---|
| **Migration** | Add `sms_provider_type`, `push_provider_type` columns; create `notification_types` table with seed data; create SMS/Push default RPCs |
| `src/pages/admin/notifications/ProviderSettings.tsx` | Refactor into 4-tab layout with SMS, Push, and Notification Types management |
| `src/hooks/useNotificationTypes.ts` | New hook for CRUD + active-only fetching |
| `src/pages/admin/workflows/WorkflowForm.tsx` | Replace hardcoded array with dynamic hook |
| `src/pages/admin/NotificationTemplates.tsx` | Replace hardcoded `CHANNELS` with hook |
| `src/pages/admin/NotificationLogs.tsx` | Replace hardcoded `CHANNELS` with hook |

## Impact

- No regression: existing email provider functionality unchanged
- `notification_types` seeded with current hardcoded values for backward compatibility
- Deactivating a type immediately removes it from all dropdowns
- SMS/Push providers stored in existing table using the `channel` enum — no new tables needed for providers

