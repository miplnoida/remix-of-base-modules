# Administration Cleanup — Execution Plan

Following the uploaded `Admin_Cleanup_Lovable_Playbook.md`. Small, scoped, verifiable prompts. I will execute in the same order the playbook recommends.

## Session 1 — Menu de-duplication (Prompts 1, 2, 4)

**File:** `src/components/sidebar/menuItems/systemAdminMenuItems.ts` (menu only, no route changes)

1. **Prompt 1** — Remove four flat duplicates from top-level System Administration:
   - `Module Management` (`/admin/modules`)
   - `Office Locations` (`/admin/offices`)
   - `Numbering` (`/admin/numbering`)
   - `Departments` (`/admin/departments`)
   These already live under Organization Management → Foundation / Configuration Center.

2. **Prompt 2** — Under `Notifications`, remove the `Notification Templates` sub-item (and its children). Keep Email Campaigns, Email Delivery Logs, Notification Log, Channel Settings. Templates now live only under Organization Management → Communication Library → Templates.

3. **Prompt 4** — Under Communication Library → Templates, add a top-level URL `/admin/notification-templates` on the parent so clicking the group header opens the Template Studio. Keep 12 type shortcuts.

Verification: preview shows the menu shape in §2 of the playbook; no route registration touched.

## Session 2 — Layouts leaf + Deprecated attic (Prompt 3, A, B, C)

- **Prompt 3** — Add Layouts leaf under Communication Library:
  - Add new section `library/layouts` in `src/pages/admin/organization/_sections.tsx` rendering `BaseLayoutsPage` + `LayoutBlocksPage` as tabs.
  - Add matching menu entry `Layouts → /admin/org/library/layouts`.
- **Prompt A** — Create `src/config/deprecatedRoutes.ts` with `DEPRECATED_ROUTES` seeded with `/admin/offices`, `/admin/departments`, `/admin/modules`, `/admin/numbering` → their replacements, status `QUARANTINED`.
- **Prompt B** — Create `src/pages/admin/DeprecatedScreensPage.tsx` at `/admin/system-cleanup/deprecated`, add sub-item under System Cleanup.
- **Prompt C** — Create `src/components/admin/DeprecatedBanner.tsx` and mount on `DepartmentsAdmin`, `OfficesAdmin`, `DesignationsAdmin` (skip `NotificationTemplatesAdmin` — it's canonical).

## Session 3 — Verification loop (§4)

Walk the menu leaf-by-leaf; for each: Loads / Reads / Writes / Inheritance. Fix in place, no new pages/resolvers. Run Broken References last.

## Session 4 — Configuration Center (Prompt 5)

Confirm `ConfigurationCenterPage.tsx` switches on `?domain=`; fix if it ignores it.

## Later — retirement lifecycle

`QUARANTINED` → `REDIRECT_ONLY` → `READY_TO_DELETE` per §5, using existing App.tsx audit interceptor to prove "no traffic".

## What I'll do right now

Execute **Session 1 only** (Prompts 1, 2, 4). One file changed. Then stop and let you verify the menu in preview before I start Session 2.

## Rules I'll follow throughout

- One theme per session; verify preview between sessions.
- Never touch routes when the prompt says "menu only".
- Never invent a parallel resolver; `resolveEffectiveSettingsBundle` + `@/platform/business-settings` remain canonical.
- Move deprecated screens under System Cleanup → Deprecated Screens; never hard-delete immediately.
