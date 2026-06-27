
# Enterprise Administration Refactor — Phased Plan

This is a large, cross-cutting change. I will deliver it in reviewable phases, audit first, and only then move code/routes. Nothing existing will be deleted; old routes will redirect.

## Phase 1 — Administration Audit (deliverable: report only, no code moves)

Produce `docs/architecture/admin-audit.md` containing one row per Administration page with:

| Menu Name | Route | Parent Menu | Module (app_modules.name) | Purpose | Keep? | Move? | Merge With | Duplicate Of | Recommended New Group |

Sources scanned:
- `src/config/routes.ts` (all `/admin/**`, `/bema/admin/**`, workflow, data-access, master-data, organization).
- `src/pages/admin/**` and `src/pages/admin/*/`.
- `app_modules` table (DB-driven sidebar — `useNavigationMenu`).
- `src/components/sidebar/menuItems/*` (legacy static lists).
- `src/lib/enterprise/*` resolvers already in place.

Output also includes a duplication matrix (e.g. Department comm vs Document profile vs Communication assets; Roles vs RolePermissions vs RoleHierarchy; NotificationTemplates vs core_template; OfficeManagement vs core_department_location).

## Phase 2 — Target Group Taxonomy (DB seed, additive)

Insert seven top-level Administration groups in `app_modules` (parent_id = null, is_enabled, show_in_menu). No child links yet — purely structural:

1. Organization Management
2. Identity & Security
3. Master Data
4. Workflow & Automation
5. Communication & Document Engine
6. Integrations
7. System Administration

Each existing Administration module then gets `parent_id` updated to point at its new group, plus `sort_order` reset. Old `parent_id`s captured in a backup table `app_modules_reorg_backup` for rollback.

## Phase 3 — Route Compatibility Layer

- Keep every existing route file & component in place.
- Add `src/routes/adminRedirects.tsx` — a thin list of `<Route path="/admin/old" element={<Navigate to="/admin/new" replace />} />` for any URL that actually moves.
- Update `routes.ts` constants only for renamed/moved entries; old keys remain as deprecated aliases that point to the new path so call sites keep compiling.

## Phase 4 — Dedup via Inheritance (resolver-only changes)

Wire pages that re-read the same config to go through existing `@/lib/enterprise` resolvers:

- Department comm fields → `resolveCommunication` / `resolvePortalBranding`.
- Document profile branding → `resolvePortalBranding`.
- Locations duplicated on department profile → `LocationResolver` (new thin wrapper around `core_department_location`).
- Asset pickers across templates/profiles → `assetSlotResolver`.

No table schema changes; just remove direct `from('comm_*')` / `from('core_template')` calls from screens.

## Phase 5 — Navigation UX

`DynamicSidebarContent` already supports nested groups. Additions:

- Collapsible groups (persist open state in `localStorage`).
- New `AdminCommandPalette` (Cmd-K) over `app_modules` rows scoped to admin.
- Breadcrumbs component fed from `app_modules` parent chain.
- Favourites + Recently Visited stored per-user in `profiles` (or a new `user_admin_prefs` table).

## Phase 6 — Context Awareness

New `<ConfigDependencyPanel moduleCode="...">` rendered at the top of each admin page. Reads from new `config_dependency_map` table (seeded from the audit) — shows "Uses" and "Where Used".

## Phase 7 — Configuration Health Dashboard

`/admin/organization/health` — runs `runHealthChecks()` (already exists in `@/lib/enterprise`) plus new checks: missing org defaults, unused assets, broken refs, orphaned overrides, duplicate masters. Each finding has a CTA deep-link.

## Phase 8 — Acceptance gates

- `tsgo` clean.
- Existing routes either work or redirect (smoke-tested via Playwright on a sample of 10).
- `has_permission` checks unchanged — permissions follow modules, module `name` slugs preserved.
- No screen imports `comm_*` / `core_template` tables directly (grep gate).

---

## How I want to proceed

Phases 1–2 are large but mechanical and reversible. Phases 3–7 are each meaningful PRs.

**I will start by delivering Phase 1 only — the audit document — and stop for your review before touching `app_modules`, routes, or screens.** That keeps the cost bounded and lets you correct the target taxonomy before any move happens.

Reply "go" to start Phase 1, or tell me which group taxonomy items to add/rename/drop first.
