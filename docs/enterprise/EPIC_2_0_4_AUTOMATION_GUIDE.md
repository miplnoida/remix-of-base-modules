# Epic 2.0.4 — Automation Guide

**Purpose**: give every future epic a copy-paste path through the Enterprise Registration Pipeline. Reuse the primitives here; do not invent new ones.

**Reuse first**: everything below runs against tables and screens that already exist. No new automation infrastructure is required. If a future capability needs something not covered here, add it to this guide rather than to a per-epic playbook.

---

## 1. What is already automated

| Concern | Primitive | Location |
|---|---|---|
| Sidebar rendering | `app_modules` live query filtered by `is_enabled`, `show_in_menu`, joined to `role_permissions.view`. | Sidebar renderer (existing). |
| Permission resolution | `user_roles.role` (text) → `roles.role_name` → `role_permissions` (role_id × module_id × action_id). | Existing auth resolver. |
| Catalogue UI (Registry / Consumers / Dependencies / Health / Search) | Reads `enterprise_capability_registry` live. | `src/pages/admin/EnterpriseServiceCatalogue.tsx`. |
| Platform Admin card index | Static cards grouped by area; canonical shell. | `src/pages/admin/PlatformAdmin.tsx`. |
| Health rollup display | Renders per-flag icons + `overall_health` from registry row. | Catalogue Health tab. |
| Idempotent registration SQL pattern | `ON CONFLICT (…) DO UPDATE` for registry; `NOT EXISTS` guard for `module_actions` and `role_permissions`. | Migrations across Epics 1.1.x, 2.0.x. |

**Consequence**: registering a new capability is a purely additive data-plus-code exercise. The UI, permission resolver and menu already react to it.

---

## 2. Minimum additions needed (none for now)

No new automation infrastructure is required for Phase 2. If, later, we want to eliminate the four idempotent SQL blocks per epic, the minimum additions would be:

- A single SQL function `public.register_capability(...)` wrapping the four upserts (registry + `app_modules` + `module_actions` + `role_permissions`) atomically. Optional — the current copy-paste templates are already idempotent and reviewable.
- A single SQL function `public.retire_capability(capability_key)` mirroring section 3.5.

Neither is created in this epic. They are recorded here so any future prompt that wants to build them knows the intended surface.

---

## 3. Copy-paste templates

Replace all `<…>` tokens. Every block is idempotent — safe to re-run.

### 3.1 Register a capability (registry + menu + actions + grants)

```sql
-- (a) Capability Registry
INSERT INTO public.enterprise_capability_registry (
  capability_key, capability_name, category, grouping, owner,
  status, version, canonical_route, menu_module_name, permission_hint,
  consumers, dependencies,
  documentation_link, architecture_link, acceptance_link,
  health_architecture, health_implementation, health_menu,
  health_permissions, health_documentation, health_acceptance,
  health_migration, overall_health,
  description, sort_order
) VALUES (
  '<capability_key>', '<Capability Name>', '<Category>', '<Grouping>', '<Owner>',
  'development', '0.1', '<canonical_route or NULL>', '<app_modules.name or NULL>', '<permission_hint or NULL>',
  ARRAY[<'Consumer1','Consumer2'>], ARRAY[<'dep_capability_key1'>],
  '<docs/enterprise/EPIC_x_x_STANDARD.md>', '<architecture doc or NULL>', '<acceptance doc or NULL>',
  'green','planned','planned','planned','green','planned','planned','amber',
  '<one-line description>', <sort_order>
)
ON CONFLICT (capability_key) DO UPDATE SET
  capability_name=EXCLUDED.capability_name, category=EXCLUDED.category, grouping=EXCLUDED.grouping,
  owner=EXCLUDED.owner, status=EXCLUDED.status, version=EXCLUDED.version,
  canonical_route=EXCLUDED.canonical_route, menu_module_name=EXCLUDED.menu_module_name,
  permission_hint=EXCLUDED.permission_hint, consumers=EXCLUDED.consumers, dependencies=EXCLUDED.dependencies,
  documentation_link=EXCLUDED.documentation_link, architecture_link=EXCLUDED.architecture_link,
  acceptance_link=EXCLUDED.acceptance_link,
  health_architecture=EXCLUDED.health_architecture, health_implementation=EXCLUDED.health_implementation,
  health_menu=EXCLUDED.health_menu, health_permissions=EXCLUDED.health_permissions,
  health_documentation=EXCLUDED.health_documentation, health_acceptance=EXCLUDED.health_acceptance,
  health_migration=EXCLUDED.health_migration, overall_health=EXCLUDED.overall_health,
  description=EXCLUDED.description, sort_order=EXCLUDED.sort_order, updated_at=now();

-- (b) app_modules row (menu source of truth)
INSERT INTO public.app_modules (
  id, name, display_name, description, icon, route, parent_id,
  sort_order, is_enabled, show_in_menu, routes_enabled, actions_enabled
) VALUES (
  '<fixed-uuid>', '<module_name>', '<Display Name>', '<one-line description>',
  '<lucide-icon>', '<canonical_route or NULL>', '<parent_app_modules_uuid>',
  <sort_order>, true, <true|false>, true, true
)
ON CONFLICT (id) DO UPDATE SET
  display_name=EXCLUDED.display_name, description=EXCLUDED.description, icon=EXCLUDED.icon,
  route=EXCLUDED.route, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order,
  is_enabled=true, show_in_menu=EXCLUDED.show_in_menu, routes_enabled=true, actions_enabled=true;

-- (c) Standard action vocabulary
INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT '<fixed-uuid>', a, initcap(a), true
FROM unnest(ARRAY[<'view','manage','admin'>]) AS a
WHERE NOT EXISTS (
  SELECT 1 FROM public.module_actions ma
  WHERE ma.module_id='<fixed-uuid>' AND ma.action_name=a
);

-- (d) Grants to Admin + Application Admin (+ optional role-owner)
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, a.module_id, a.id, true
FROM public.roles r
CROSS JOIN public.module_actions a
WHERE r.role_name IN ('Admin','Application Admin' /*, '<RoleOwner>' */)
  AND a.module_id='<fixed-uuid>'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id=r.id AND rp.module_id=a.module_id AND rp.action_id=a.id
  );
```

### 3.2 Add a new table (additive, with GRANTs)

```sql
CREATE TABLE IF NOT EXISTS public.<table> (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  <domain-columns>,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
GRANT ALL ON public.<table> TO service_role;
-- GRANT SELECT ON public.<table> TO anon;   -- only if publicly readable
```

Project rule: **no RLS**. Enforce access through `role_permissions` in the app layer.

### 3.3 Legacy adapter view (never alter the legacy table)

```sql
CREATE OR REPLACE VIEW public.v_<canonical_name> AS
SELECT
  <legacy_col> AS <canonical_col>,
  …
FROM public.<legacy_table>;

GRANT SELECT ON public.v_<canonical_name> TO authenticated, service_role;
```

Document the view in `BEMA_LEGACY_TABLE_IMPACT_NOTE.md` if it targets any BEMA / `tb_*` / `ip_*` / `er_*` / `cl_*` / `cn_*` / `au_*` / `ia_*` / `lg_*` / `bema_*` table.

### 3.4 Current-user access verification query

Run in the epic's Verify phase and paste the result into the acceptance doc.

```sql
SELECT p.email, ur.role, m.name AS module, a.action_name, rp.is_granted
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
JOIN public.roles r       ON r.role_name = ur.role
JOIN public.role_permissions rp ON rp.role_id = r.id
JOIN public.app_modules m ON m.id = rp.module_id
JOIN public.module_actions a ON a.id = rp.action_id
WHERE p.is_active = true
  AND m.id = '<fixed-uuid>'
  AND ur.role IN ('Admin','Application Admin')
ORDER BY p.email, a.action_name;
```

Pass criterion: at least one active admin user has every declared action with `is_granted=true`.

### 3.5 Retire a capability

```sql
UPDATE public.enterprise_capability_registry
   SET status='deprecated', overall_health='amber',
       description=coalesce(description,'') || ' [Deprecated; successor: <successor_key>]',
       updated_at=now()
 WHERE capability_key='<capability_key>';

UPDATE public.app_modules
   SET is_enabled=false, show_in_menu=false, updated_at=now()
 WHERE id='<fixed-uuid>';
```

Never `DELETE` from `app_modules` or `module_actions` — `role_permissions` history depends on those rows.

### 3.6 Rollback block (paste into acceptance doc)

```sql
DELETE FROM public.role_permissions WHERE module_id='<fixed-uuid>';
DELETE FROM public.module_actions   WHERE module_id='<fixed-uuid>';
DELETE FROM public.app_modules      WHERE id='<fixed-uuid>';
DELETE FROM public.enterprise_capability_registry WHERE capability_key='<capability_key>';
-- Optional: DROP any additive table created for this capability.
-- Never drop legacy or BEMA tables.
```

---

## 4. Code conventions (mandatory)

- **Routes**: register in `src/components/routing/AppRoutes.tsx` using `lazy(() => import('@/pages/…'))` and wrap in `<Suspense fallback={<div>Loading...</div>}>`. Legacy paths must `Navigate` to canonical, not render a parallel screen.
- **Screens**: reuse canonical shells (`OrganizationManagementShell`, `PlatformAdmin`, `ReferenceFramework`, canonical module shells). Add tabs/leaves instead of new routes when the capability belongs inside an existing shell.
- **Facades / hooks**: export from `src/services/<domain>/index.ts` and `src/hooks/<domain>/index.ts`. Never call raw Supabase tables from module code once a facade exists for that domain (per `EPIC_2_0_3_COMMON_CONSUMPTION_MODEL.md`).
- **Breadcrumbs**: use `PageHeader` with `Home → Administration → Platform → …` (or module-appropriate chain).
- **Icons**: `lucide-react` names only; match the sidebar renderer's icon map.
- **UUIDs for `app_modules`**: use a deterministic, hand-picked UUID per capability (e.g. `f0110002-…`). Document it in the acceptance doc.

---

## 5. Documentation conventions

Every epic ships two things:

1. **Acceptance document** at `docs/enterprise/EPIC_<n>_<slug>_ACCEPTANCE.md` (or `docs/social-security/…`) — contains the completed checklist from `EPIC_2_0_4_IMPLEMENTATION_CHECKLIST.md`, capability summary, verification queries and their results, and the rollback block from §3.6.
2. **Update** to `docs/enterprise/ENTERPRISE_MENU_PERMISSION_ACCESS_VERIFICATION.md` when the epic changes menu or permissions in a way that affects existing users.

Do not create additional planning documents; the Phase 2 Social Security Programme is the sole master plan.

---

## 6. What this guide does *not* do

- It does not introduce new tables, functions, screens or edge functions.
- It does not change RLS posture (project rule: no RLS; enforce via `role_permissions`).
- It does not alter BEMA / legacy tables.
- It does not modify BN or SSP surfaces.

---

## 7. Adoption

- From this epic forward, every implementation prompt should reference this guide by section number (e.g. "register via Automation Guide §3.1, verify via §3.4").
- Deviations require an explicit note in the epic's acceptance document explaining why and what compensating control replaces the standard.
