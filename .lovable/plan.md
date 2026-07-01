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
- **Phase 3** — Brand Assets consolidation shell.
- **Phase 4** — Library shell (Templates absorbed).
- **Phase 5** — Communication Configuration Center + runtime preview (first consumer of engine).
- **Phase 6** — Validation & Impact graph.
- **Phase 7** — Runtime cutover: `resolveCommunication()` reads only from engine; add lint against direct `comm_*` reads from modules.
- **Phase 8** — Cleanup: drop legacy routes, drop legacy assignment tables (view shims removed).

## Backward compatibility guarantees

- `comm_asset_assignment` stays; `comm_asset_assignment_v` view over the generic table added in Phase 5.
- Every old `?tab=*` URL 301-redirects to its new home for at least one release.
- Legacy `resolveCommunication()` path kept alongside engine-based path behind a feature flag until Phase 7.
