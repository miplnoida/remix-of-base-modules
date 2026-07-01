# Organization Communication Management — Approved Architecture

Status: **APPROVED with modifications** (2026-07-01). Executing phased.

## Approved decisions

1. **Five-stage lifecycle IA** — Foundation → Brand Assets → Library → Configuration Center → Validation.
2. **Route redesign** with 301-style redirects from `?tab=*` URLs (see §Routes).
3. **Generic engine**: build `core_configuration_assignment` (NOT a comm-specific table). Communication is the **first consumer**; workflow / numbering / branding / reporting / AI / future domains plug in the same way.
4. **Communication Configuration Center** = first consumer UI on top of the generic engine.
5. **Scope precedence hierarchy** documented up-front (see `docs/architecture/scope-precedence.md`).
6. **Runtime resolution preview** built into the Configuration Center from day one.
7. **Backward compatible** — legacy tables and routes kept behind view shims + redirects until Phase 8.

## Menu (5 sections)

```
Organization Management
├── Foundation           (Organization, Locations, Departments, Modules)
├── Brand Assets         (Media, Letterheads, Signatures, Headers/Footers, Fonts, Themes, Categories)
├── Communication Library (Templates, Text Blocks, Tokens, Categories, Channels, Languages)
├── Configuration Center (generic assignment grid — Communication is first tab)
└── Validation & Impact  (Health, Usage Graph, Impact Analysis)
```

## Routes

| Old | New |
|---|---|
| `/admin/organization-management?tab=organization`   | `/admin/org/foundation/profile` |
| `/admin/organization-management?tab=locations`      | `/admin/org/foundation/locations` |
| `/admin/organization-management?tab=departments`    | `/admin/org/foundation/departments` |
| `/admin/organization-management?tab=modules`        | `/admin/org/foundation/modules` |
| `/admin/organization-management?tab=assets`         | `/admin/org/assets/media` |
| `/admin/organization-management?tab=asset-categories` | `/admin/org/assets/categories` |
| `/admin/organization-management?tab=text-blocks`    | `/admin/org/library/text-blocks` |
| `/admin/organization-management?tab=assignments`    | `/admin/org/configuration-center?domain=communication` |
| `/admin/organization-management?tab=usage`          | `/admin/org/validation` |

Landing `/admin/organization-management` (no tab) → `/admin/org/foundation/profile`.

## Generic Configuration Assignment Engine

One table serves every configuration domain:

```
core_configuration_assignment
  domain           text     -- 'communication' | 'workflow' | 'numbering' | 'branding' | 'reporting' | 'ai' | ...
  business_event   text     -- domain-specific intent key
  scope_level      text     -- 'GLOBAL'|'ORG'|'MODULE'|'DEPARTMENT'|'LOCATION'|'WORKFLOW'|'WORKFLOW_STAGE'|'USER'
  scope_ref        jsonb    -- keys per level (module_code, department_code, location_id, workflow_code, stage_code, user_id, ...)
  resource_type    text     -- 'TEMPLATE' | 'MEDIA_ASSET' | 'LETTERHEAD' | 'SIGNATURE' | 'TEXT_BLOCK' | 'NUMBER_SEQUENCE' | 'THEME' | 'AI_MODEL' | ...
  resource_ref     jsonb    -- { id?, code? } — either
  rule_set         jsonb    -- channel, language, fallback, condition, priority overrides
  priority         int      -- higher wins within a scope tier
  effective_from   timestamptz
  effective_to     timestamptz
  is_active        boolean
```

Communication uses domain `'communication'`. Workflow (Phase 5+) uses `'workflow'` with `resource_type='WORKFLOW_TEMPLATE'`. Numbering uses `'numbering'` with `resource_type='NUMBER_SEQUENCE'`. No new tables needed per domain.

Scope precedence documented in `docs/architecture/scope-precedence.md`.

## Phase plan

- **Phase 1 (done)** — Docs, new shell + 5 sections, migration for `core_configuration_assignment` (empty, non-breaking).
- **Phase 2 (done)** — Foundation re-parenting under `/admin/org/foundation/*`; legacy `/admin/organization-management?tab=*` now redirects to the new routes via `OrganizationManagementAdmin` (Navigate).
- **Phase 3 (done)** — Brand Assets shell now exposes Media, Letterheads, Document Assets, Portal Branding, Categories under `/admin/org/assets/*`.
- **Phase 4 (done)** — Library shell exposes Text Blocks and Notification Templates under `/admin/org/library/*`; legacy `?tab=letterheads|document-assets|portal-branding|notification-templates` redirects added.
- **Phase 5 (done)** — Configuration Center is live: assignment grid with add/enable/disable/delete, and `resolveConfiguration()` with full scope-precedence trace exposed via a "Test Resolve" preview dialog. Backed by `src/lib/configuration/resolver.ts`.
- **Phase 6 (done)** — Validation & Impact page (`ValidationImpactPage`) surfaces engine health: coverage matrix by (domain, resource_type) × scope tier, missing GLOBAL fallbacks, duplicate priorities, and expired-but-active rows. Wired into the shell as `validation/engine`.
- **Phase 7 (done)** — Cutover scaffolding: `VITE_CONFIG_ENGINE_ENABLED` feature flag (`src/lib/configuration/featureFlag.ts`), CI lint `scripts/lint-no-direct-comm.ts` guarding module code from touching `comm_*` tables directly, and cutover playbook in `docs/architecture/phase-7-runtime-cutover.md`.
- **Phase 8 (done — code)** — Cleanup completed on the code side:
  - `AssetAssignmentsPage` deleted; its route re-exports `ConfigurationCenterPage` so any deep link still lands on the engine UI.
  - `useEngineResolver()` / `isEngineResolverEnabled()` collapsed to `() => true`; the `VITE_CONFIG_ENGINE_ENABLED` flag is retired and the legacy `comm_asset_assignment` read path is gone.
  - Legacy `?tab=*` redirector kept intentionally (bookmarks) — will be removed in a follow-up release once traffic is zero.
  - **DB drops deferred**: `comm_asset_assignment` is empty in both environments and safe to drop; `comm_asset_mapping` still has rows in Test. Awaiting user confirmation before issuing the destructive migration.

## Backward compatibility guarantees

- Every old `?tab=*` URL still 301-redirects to its new home.
- Engine is now the single source of truth for all configuration resolution.
