# Epic 2.0.4 — Enterprise Registration Pipeline

**Status**: Standardisation. Final Enterprise Core epic before Social Security Shared Domain implementation begins.

**Purpose**: Convert the currently manual capability registration flow into a single, mandatory pipeline. Every future domain, module, framework or reusable capability delivered in this repository **must** follow this pipeline. No future prompt should need to re-specify menu, permissions, `app_modules`, catalogue registration or operational readiness — they are all covered here.

**Scope**: Planning and standardisation only. No schema, route, menu, `app_modules`, permission or code changes are introduced by this epic.

---

## 1. Repository discovery — what already exists

| Concern | Current state | Automated? |
|---|---|---|
| Enterprise Catalogue UI | `/admin/platform/enterprise-catalogue` (Epic 2.0.2) with Registry / Consumers / Dependencies / Health tabs and search. | ✅ read-side |
| Capability Registry (data) | `enterprise_capability_registry` table with capability, category, grouping, owner, status, version, canonical route, menu module, permission hint, consumers[], dependencies[], docs/architecture/acceptance links, seven health flags + overall rollup, `capability_key` unique (idempotent upserts). | ✅ storage |
| Platform Admin shell | `src/pages/admin/PlatformAdmin.tsx` — grouped cards, single canonical shell. | ✅ |
| Menu source of truth | `app_modules` (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu, routes_enabled, actions_enabled). Sidebar reads live from this table. | ✅ storage; ❌ registration still manual |
| Actions & Permissions | `module_actions` (view/manage/admin/approve/retire/import/export) + `role_permissions` (role_id × module_id × action_id, `is_granted`). Idempotent `NOT EXISTS` inserts used across Epic 1.1/2.0.x. | ✅ storage; ❌ per-epic SQL |
| Role model | `roles` table (Admin, Application Admin, ComplianceAdmin, LEGAL_ADMIN, BN_*, …). No `Super Admin`. `user_roles.role` (text) resolves to `roles.role_name`. | ✅ |
| Documentation structure | `docs/enterprise/EPIC_*.md` (standards, plans, acceptance). `docs/social-security/` for programme-level planning. | ✅ convention |
| Acceptance documents | One per epic (e.g. `EPIC_2_0_1_ORGANISATION_FOUNDATION_ACTIVATION_ACCEPTANCE.md`, `EPIC_2_0_2_ENTERPRISE_SERVICE_CATALOGUE_ACCEPTANCE.md`). | ✅ convention |
| Governance rails | `SCREEN_AND_LEGACY_TABLE_GOVERNANCE_RULES.md`, `BEMA_LEGACY_TABLE_IMPACT_NOTE.md`, `EPIC_1_1_REFERENCE_FRAMEWORK_STANDARD.md`, `EPIC_2_0_3_COMMON_CONSUMPTION_MODEL.md`. | ✅ |
| Current-user access verification | Ad-hoc SQL each epic (Epic 2.0.1, verification note). | ❌ manual |
| Rollback documentation | Per-epic in acceptance doc. | ❌ manual |
| Health flag update on delivery | Manual `UPDATE enterprise_capability_registry`. | ❌ manual |

**Manual steps that must become standardised**:
1. `app_modules` row insert.
2. `module_actions` insert for the standard action vocabulary.
3. `role_permissions` grant to `Admin` + `Application Admin` (+ role-owner if applicable).
4. `enterprise_capability_registry` upsert (create on start, update on completion, flip health flags).
5. Route registration in `src/components/routing/AppRoutes.tsx`.
6. Acceptance document creation.
7. Rollback block in acceptance document.
8. Current-user access verification query.

**Steps already automated**: sidebar rendering, permission resolution, catalogue UI, capability search, health rollup display.

---

## 2. The Standard Enterprise Registration Pipeline (one pipeline, seven phases)

Every implementation — framework, domain, module, facade, screen or capability — **must** pass through these seven phases in order. Skipping a phase is a governance violation.

```text
[P1 Discover] → [P2 Design] → [P3 Register] → [P4 Implement] → [P5 Verify] → [P6 Publish] → [P7 Retire]
```

### P1 — Discover (before writing any code)

Mandatory inspection outputs, captured in the epic's opening response:

- **Reuse map**: existing canonical screens, routes, tables, services, hooks that overlap with the requested capability.
- **Legacy map**: BEMA / `tb_*` / `ip_*` / `er_*` / `cl_*` / `cn_*` / `au_*` / `ia_*` / `lg_*` / `bema_*` tables in scope.
- **Duplicate risk**: any parallel screen, table, service or hook that would be created if the request were implemented naïvely.
- **Governance check**: does the change touch BEMA? If yes, `BEMA_LEGACY_TABLE_IMPACT_NOTE.md` must be updated *before* execution.

### P2 — Design (single decision record)

Capture in the acceptance draft:

- Canonical owner (Platform / Enterprise Core / Organisation / Shared Domain / Business Application).
- Framework dependency (Reference Framework, MDP, Organisation Foundation, Common Consumption Model, …).
- Consumers (which products consume this).
- Route + menu placement (existing parent `app_modules` row).
- Permission vocabulary (subset of view / manage / admin / approve / retire / import / export).
- Roles that receive grants (Admin, Application Admin always; optionally role-owner).
- Facade / hook surface (per `EPIC_2_0_3_COMMON_CONSUMPTION_MODEL.md`).
- Adapter view(s) for legacy compatibility, if any.
- Rollback plan (must be a single reversible block).

### P3 — Register (before/with implementation, idempotent SQL)

Executed as one migration or one insert block per capability. All statements are idempotent (`ON CONFLICT DO UPDATE`, `WHERE NOT EXISTS`).

1. **Capability Registry (create)** — insert into `enterprise_capability_registry` with `status IN ('planning','development')` and initial health flags.
2. **`app_modules`** — insert one row with fixed UUID, correct `parent_id`, `route`, `icon`, `sort_order`, `is_enabled=true`, `show_in_menu=<intent>`, `routes_enabled=true`, `actions_enabled=true`.
3. **`module_actions`** — insert the permission vocabulary chosen in P2.
4. **`role_permissions`** — grant every action to `Admin` and `Application Admin` (+ role-owner) via `NOT EXISTS` guard.

### P4 — Implement (code)

- Add page(s) under `src/pages/…` **only if no canonical screen exists**. Otherwise add a tab/leaf inside the canonical shell.
- Add facade/hook(s) under `src/services/…` and `src/hooks/…`, exported through the shared barrel (per Common Consumption Model).
- Register route(s) in `src/components/routing/AppRoutes.tsx` using lazy import and Suspense fallback.
- Additive-only schema. Never alter BEMA/legacy structure. Adapter views (`v_*`) only.
- New tables always followed by `GRANT` block (`authenticated`, `service_role`, optional `anon` read) in the same migration.

### P5 — Verify (mandatory before closing the epic)

Run and record in the acceptance doc:

- **Menu visibility**: `app_modules` row present with `is_enabled=true` + `show_in_menu` as intended; no static menu file relied on.
- **Permission wiring**: `module_actions` rows exist; `role_permissions` grants exist for Admin + Application Admin.
- **Current-user check**: run the standard verification query (Automation Guide §3.4) confirming at least one active admin inherits every action through role mapping.
- **Route health**: every new route resolves; no parallel/duplicate route registered.
- **Governance**: no BEMA structural change; no static menu edit; no duplicate screen.

### P6 — Publish (flip to live)

- Update `enterprise_capability_registry`: `status='active'`, `version` bumped, health flags → `green` where verified, `overall_health` computed.
- Register consumers in the `consumers[]` array as each product adopts the capability.
- Publish acceptance document under `docs/enterprise/EPIC_<n>_<slug>_ACCEPTANCE.md` (or `docs/social-security/…` for domain waves).

### P7 — Retire (when deprecated)

- Flip `enterprise_capability_registry.status='deprecated'` and `overall_health='amber'`/`red`.
- Set `app_modules.is_enabled=false` and `show_in_menu=false` (never delete rows referenced by `role_permissions`).
- Leave adapter views in place until dependent modules migrate.
- Record retirement rationale + successor `capability_key` in the acceptance doc.

---

## 3. Owner responsibilities

| Role | Owns |
|---|---|
| Implementing agent (per epic) | P1–P6 execution end-to-end. Must produce the acceptance doc with all checklist items ticked. |
| Enterprise Data Governance | Reference groups, MDP hosting, catalogue schema evolution. |
| Enterprise Platform Team | `app_modules`, `module_actions`, `role_permissions`, Platform Admin shell, catalogue UI. |
| Organisation Platform Team | Organisation Foundation canonical assets, calendar/holidays/working-week. |
| Module owners | Adoption of shared facades in P5 of their own delivery. |

---

## 4. Non-negotiable rules (restated)

1. Reuse before extend, extend before add. Never a second screen/table/service/hook for the same capability.
2. Menu is `app_modules`-driven. No static menu files. No hard-coded links except from within Platform Admin cards.
3. No BEMA / legacy structural change without `BEMA_LEGACY_TABLE_IMPACT_NOTE.md` amendment first. Adapter views only.
4. Every table CREATE is followed by GRANTs in the same migration.
5. Every capability lands in `enterprise_capability_registry`. No "silent" capabilities.
6. Every epic ships with a rollback block.
7. BN Product Builder (Epic 0.40) is on hold and must not be modified.

---

## 5. Acceptance for this epic

- ✅ One canonical pipeline defined (§2), covering discover → design → register → implement → verify → publish → retire.
- ✅ Manual vs automated steps enumerated (§1).
- ✅ Owner responsibilities allocated (§3).
- ✅ Rails restated in one place (§4).
- ✅ Companion **Implementation Checklist** (`EPIC_2_0_4_IMPLEMENTATION_CHECKLIST.md`) and **Automation Guide** (`EPIC_2_0_4_AUTOMATION_GUIDE.md`) delivered alongside.
- ✅ No code, schema, route, menu, `app_modules` or permission change made.
