# Epic 1.1.2A — Reference Framework Access, CRUD & Permission Governance Plan

**Status:** Planned + minimum configuration alignment applied.
**Parents:** Epic 1.1, Epic 1.1.1, Epic 1.1.2.
**Scope:** planning + a small, reversible config change (menu + permissions).
No reference data migration. `/admin/master-data/*` unchanged. BN Product
Builder remains ON HOLD.

---

## 1. Current state (as inspected)

| Concern | Finding |
|---|---|
| `/admin/reference-framework` page | Present, `ReferenceFramework.tsx`, wired in `AppRoutes.tsx` (line 1803). Console is **read/analytics-only** today (categories, groups, ownership, hierarchy, consumers, health tabs). |
| `/admin/master-data/*` pages | ~40 CRUD screens under `parent_id = admin_master_data` (`e1a00000-…003`). Each has its own `app_modules` row and standard `view/create/edit/delete` actions. |
| `app_modules` row for the console | **Was missing.** Now added as `admin_reference_framework` under Master Data. |
| Roles / permissions model | `roles` + `module_actions` + `role_permissions (role_id, module_id, action_id, is_granted)`. No RLS (per project rule). |
| Current admin roles | `Admin`, `Application Admin`, `Supervisor`, `ComplianceAdmin`, module-specific admins. |
| PlatformAdmin.tsx link | Already exposes "Reference Framework" under the **Governance** card → `/admin/reference-framework`. No change needed. |

---

## 2. CRUD ownership decision

| Surface | Owner today | Owner future | Rationale |
|---|---|---|---|
| `/admin/master-data/*` | Operational CRUD | **Stays operational CRUD** through Wave N. | 40 stable screens already used by staff. |
| `/admin/reference-framework` | Governance / readiness console (read-only) | Progressively upgraded to governed CRUD **on framework tables only** (categories, aliases, external codes, translations, lifecycle transitions). | Framework surfaces have no equivalent in `/admin/master-data/*`. |
| Categories | none | **Framework console** (safe to add now) | New table, no existing UI competes. |
| Groups metadata (governance fields only) | none | **Framework console** (safe to add now) | Governance-only fields (owner, steward, version_strategy, i18n/external flags); does not conflict with existing group CRUD. |
| Values (label, code, sort, status) | `/admin/master-data/*` | **Stays** in master-data screens until per-group cutover in Wave N. | Avoid dual-write races. |
| Aliases | none | **Framework console** (safe to add now) | New table introduced by 1.1.1. |
| External Codes | none | **Framework console** (safe to add now) | New table introduced by 1.1.1. |
| Translations (i18n) | none | **Framework console** (safe to add now) | New table introduced by 1.1.1. |
| Lifecycle / retirement (SUPERSEDED, RETIRED) | none | **Framework console** — **wait** until value CRUD is in framework console for that group. | Mixing lifecycle transitions with legacy edit screens is unsafe. |
| Approvals / promotion workflow | none | Framework console — **wait** for Epic 1.1.4+. | Depends on workflow engine binding. |
| Bulk Import / Export | none | Framework console — **wait**. Governance-approved CSV/JSON only. | Requires audit + rollback tooling. |

**Guiding rule.** For any given reference group, only *one* surface owns
value CRUD at a time. Cutover happens per group in a later adoption wave.

---

## 3. Menu / access model

- Menus are **`app_modules`-driven** (live, DB). Static `masterDataMenuItems.ts` is not the source of truth and is not modified.
- A new row `admin_reference_framework` was inserted under Master Data (`parent_id = e1a00000-…003`) with `route = /admin/reference-framework`, `is_enabled = true`, `show_in_menu = true`, `sort_order = 0` (pinned to top of Master Data).
- `PlatformAdmin.tsx` already links the same route under the **Governance** card — kept.

*Placement rationale:* Master Data is the closest existing parent group and every business user who cares about reference data already goes there. A dedicated "Governance" parent can be introduced in Epic 1.1.4 without breaking this row.

---

## 4. Permission model

Module `admin_reference_framework` exposes six governance actions
(seeded in this epic):

| Action | Purpose | Enabled now? |
|---|---|---|
| `view` | Read the governance console + framework analytics. | ✅ |
| `manage` | CRUD on categories, group governance metadata, aliases, external codes, translations. Value CRUD stays in master-data screens until per-group cutover. | ✅ (permission exists; UI CRUD lands in Epic 1.1.4) |
| `approve` | Approve reference version / promotion. | Permission seeded, UI later. |
| `retire` | Retire / supersede reference values. | Permission seeded, UI later. |
| `import` | Bulk import reference data. | Permission seeded, UI later. |
| `export` | Export reference data. | Permission seeded, UI later. |

Naming maps to the project's existing `module_actions` shape
(`module_id + action_name`). Where the task text says
`reference_framework.view`, it corresponds to
`(module=admin_reference_framework, action=view)`.

---

## 5. Role assignments applied

| Role | Granted actions |
|---|---|
| `Admin` | `view`, `manage` |
| `Application Admin` | `view`, `manage` |

`approve`, `retire`, `import`, `export` remain **unassigned** until
their UI ships. Other roles (Supervisor, ComplianceAdmin, module
admins) get no grants in this epic — assign explicitly per business
policy in Epic 1.1.4.

---

## 6. Changes applied in this epic

1. **DB (idempotent migration):**
   - Inserted `app_modules` row `admin_reference_framework` (route `/admin/reference-framework`, parent Master Data, `show_in_menu=true`, `rollout_state=public`).
   - Inserted six `module_actions`: `view, manage, approve, retire, import, export`.
   - Granted `view` + `manage` to roles `Admin` and `Application Admin` via `role_permissions`.
2. **Code:** none. `PlatformAdmin.tsx` link already existed; `AppRoutes.tsx` route already existed; static menu file untouched.
3. **Reference data:** untouched.
4. **`/admin/master-data/*`:** untouched.

---

## 7. Verification

| # | Check | Expected |
|---|---|---|
| 1 | `SELECT name, route FROM app_modules WHERE name='admin_reference_framework'` | 1 row, route `/admin/reference-framework`. |
| 2 | Governance actions exist | 6 rows in `module_actions` for that module. |
| 3 | Admin roles can hit console | `role_permissions` has `view` + `manage` for `Admin` and `Application Admin`. |
| 4 | Live menu (app_modules-driven) surfaces the entry for those roles | Visible under Administration → Master Data. |
| 5 | `/admin/master-data/*` app_modules rows | Unchanged (~40 rows, `sort_order` intact). |
| 6 | Reference data rows | Unchanged. |
| 7 | BN Product Builder | Still ON HOLD. |

---

## 8. Rollback

Reversible in one migration; no schema change to undo.

```sql
DO $$
DECLARE v_module_id uuid;
BEGIN
  SELECT id INTO v_module_id FROM public.app_modules
   WHERE name = 'admin_reference_framework';
  IF v_module_id IS NULL THEN RETURN; END IF;

  DELETE FROM public.role_permissions WHERE module_id = v_module_id;
  DELETE FROM public.module_actions   WHERE module_id = v_module_id;
  DELETE FROM public.app_modules      WHERE id        = v_module_id;
END $$;
```

The `/admin/reference-framework` page (Epic 1.1.2) and the reference
framework schema (Epic 1.1.1) remain untouched by this rollback.

---

## 9. Next epics

- **1.1.4** — Framework-console CRUD for categories + aliases + external codes + translations (safe additive surfaces). Wire `approve`, `retire`, `import`, `export` UIs.
- **1.1.5** — Per-group value CRUD cutover (starts with `CORE_TIMEZONE` from Wave 1).
- **0.36D** — SSP read-only façades (still on hold).
- **0.40** — BN Product Builder (still on hold).
