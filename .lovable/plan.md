## C3 Email Templates Module — Implementation Plan

### Discovery Summary

- Existing pattern: `c3_site_settings` + `c3_email_config` already follow the master-mirror sync model via `wiz-settings-sync` edge function and `wizSettingsService.ts`.
- The Settings Configuration screen (`/c3-management/settings-configuration`) **exists but is not currently in the sidebar** — only reachable via redirect from CyberSource.
- C3 sidebar (`c3MenuItems.ts`) already has a "Settings" subgroup containing scheme/levy/file configurations — we will add a new **"Settings"** parent group at the C3 Management level (or rename existing) holding the two requested children. To keep existing scheme settings intact, I'll **add a new "Settings" group** alongside (named "System Settings" to avoid collision with the existing scheme "Settings" subgroup).
- 13 production templates from CSV must seed the new `c3_email_templates` table. Schema follows guide DDL but adapted to our project conventions (UUID PK, sync columns, `created_by`/`updated_by` as VARCHAR(50) user_code per project standards).

### Recommendations / Improvements over the Guide

1. **Use UUID PK + `is_synced` / `sync_error` columns** — matches our existing `c3_site_settings`/`c3_email_config` pattern and the unified `usePublishAll`/`useRetrySync` hooks. The `template_key` UNIQUE constraint stays as the upsert anchor for sync.
2. **Reuse `wiz-settings-sync` edge function** — extend it with `sync_email_templates` / `retry_email_template` actions instead of creating a new function. Single sync surface, single secret, consistent error handling.
3. **Single unified `usePendingCount**` — extend to count pending email templates so the "Publish All" button publishes all three tables in one call.
4. **Soft delete + audit** — `is_deleted` flag, `created_by`/`updated_by` populated with current user_code (project standard).
5. **Monaco editor for HTML body** with a sandboxed iframe live preview — sample variable substitution before publish.
6. **Variable validation** — parse `{{variable}}` tokens from subject + body and warn if not declared in `variables[]`.
7. **Naming**: avoid renaming the existing C3 `"Settings"` (scheme configs). Add a new top-level group **"System Settings"** under C3 Management with the two children. (Confirm in question below.)

### Plan

**Phase 1 — Database**

- Migration creating `public.c3_email_templates`:
  - `id UUID PK default gen_random_uuid()`
  - `template_key VARCHAR(100) UNIQUE NOT NULL`
  - `template_name VARCHAR(200) NOT NULL`
  - `subject VARCHAR(500) NOT NULL`
  - `html_body TEXT NOT NULL`, `text_body TEXT`
  - `from_module VARCHAR(50) NOT NULL DEFAULT 'notifications'`
  - `variables JSONB DEFAULT '[]'`
  - `is_active BOOLEAN DEFAULT true`, `is_deleted BOOLEAN DEFAULT false`
  - `is_synced BOOLEAN DEFAULT false`, `sync_error TEXT`, `last_synced_at TIMESTAMPTZ`
  - `created_at`, `updated_at` (TIMESTAMPTZ), `created_by`, `updated_by` (VARCHAR(50) user_code)
  - Partial index on `(template_key) WHERE is_deleted=false AND is_active=true`
  - `updated_at` BEFORE UPDATE trigger
- Seed all 13 templates from the CSV (`SEED-` audit tag in `created_by`).

**Phase 2 — Service & Hooks**

- Extend `src/services/wizSettingsService.ts`:
  - `fetchEmailTemplates(fromModule?)`, `saveEmailTemplate(id, updates, userCode)`, `createEmailTemplate(...)`, `softDeleteEmailTemplate(id)`, `toggleActive(id, isActive)`.
- Extend `src/hooks/useSettingsConfiguration.ts`:
  - `useEmailTemplates`, `useSaveEmailTemplate`, `useCreateEmailTemplate`, `useDeleteEmailTemplate`.
  - Update `usePendingCount` to include templates.

**Phase 3 — Edge Function**

- Add to `supabase/functions/wiz-settings-sync/index.ts`:
  - Action `sync_email_templates` → POSTs all non-deleted templates to wiz-admin-api `sync_email_templates`, marks rows synced/failed per response.
  - Action `retry_email_template` → re-sends a single failed row.
  - `publish_all` extended to include templates.

**Phase 4 — UI**

- New page `src/pages/c3Management/EmailTemplates.tsx`:
  - List view: filterable table (module dropdown, status toggle, search by key/subject) with sync badges (Synced/Pending/Failed).
  - Edit dialog: Template Key (locked when editing), Name, From Module dropdown, Subject, HTML body (textarea — Monaco optional later), Text body, Variables (tag input), Active toggle.
  - Live preview pane: sandboxed iframe rendering subject + html_body with sample variable values.
  - Top-right: "Publish" button (disabled when no pending) + "Retry" for failed rows.
  - Per-row actions: Edit · Preview · Activate/Deactivate · Delete (soft).
- Add route in `src/components/routing/AppRoutes.tsx`: `/c3-management/email-templates`.

**Phase 5 — Sidebar Reorganization**

- Edit `src/components/sidebar/menuItems/c3MenuItems.ts`:
  - Add new top-level subgroup `"System Settings"` (icon: Settings) under C3 Management, BEFORE the existing "Reports":
    - `Email Templates` → `/c3-management/email-templates`
    - `Settings & Configuration` → `/c3-management/settings-configuration`
- Existing scheme "Settings" subgroup (Levy/SS/Severance/Injury/C3 File) stays untouched to avoid disrupting current users.

**Phase 6 — Knowledge Repository**

- Add memory entry `mem://features/c3-management/email-templates` documenting the table, sync flow, and UI conventions. Update `mem://index.md`.

### Files to Create / Modify

- **Create**: migration SQL, `src/pages/c3Management/EmailTemplates.tsx`, memory file.
- **Modify**: `wizSettingsService.ts`, `useSettingsConfiguration.ts`, `wiz-settings-sync/index.ts`, `c3MenuItems.ts`, `AppRoutes.tsx`, `mem://index.md`.

### Clarifying Questions

1. **Sidebar naming**: The existing C3 "Settings" subgroup (Levy/SS/Severance/Injury/C3 File configs) would conflict if we add another "Settings" parent. Options: - **Add new group as "System Settings"** (recommended, no disruption) - **Rename existing "Settings" to "Scheme Settings"**, then add new "Settings" parent with the two children - **Move everything into one mega "Settings" group** (Scheme settings + Email Templates + Settings & Configuration)

2. **HTML editor**: For the template HTML body field, do you want:
  - **Plain textarea now**, upgrade to Monaco later (fastest delivery)
  - **Monaco editor with HTML syntax highlighting** from day one  
    
  answer -1 => Existing functionality should not be impacted, just use the different name if it doesnt conflicst with the existing one.  
  answer -2 => use the best one that is properly should be future  proof.

&nbsp;