# Screen & Legacy Table Governance Rules

Status: ACTIVE — MANDATORY for all future epics
Owner: Enterprise Architecture
Applies to: Every product, module, wave, and adoption epic across the platform
Supersedes: nothing (this is a governance layer on top of existing epic acceptance docs)

---

## 1. No Parallel Screen Development

Before creating any new page, route, or screen the implementer MUST:

1. Inspect existing pages/routes for the same capability.
2. Prefer, in this order:
   - **Reuse** the existing screen as-is.
   - **Extend** the existing screen if safe.
   - **Add a tab** inside the existing canonical screen.
   - **Link** to the existing canonical screen from Platform Admin / `app_modules`.
   - **Redirect** legacy routes into the canonical screen.
3. Only if all of the above are impossible, propose a new screen via Section 2.

### Protected canonical surfaces — DO NOT duplicate

A second screen MUST NOT be created for any of the following unless the existing
screen is confirmed unusable AND that unsuitability is documented per Section 2:

| Domain | Canonical screen(s) |
| --- | --- |
| Organisation profile | `/admin/organization/profile` (and related canonical org pages) |
| Offices | `/admin/offices` (tabs: offices, ip, locations) — see `src/pages/admin/OfficesAdmin.tsx` |
| Departments | `/admin/departments` (tabs: departments, profiles, mapping) — see `src/pages/admin/DepartmentsAdmin.tsx` |
| Designations | `/admin/designations` (tabs: list, hierarchy) — see `src/pages/admin/DesignationsAdmin.tsx` |
| Calendars | Canonical calendar surface (to be introduced under `/admin/organization/calendar`) |
| Holidays | Canonical holidays surface (must consolidate `ia_holidays` etc.) |
| Branding | `comm_*` branding admin surfaces |
| Settings | `/admin/settings` and product-scoped settings under their canonical roots |
| Users / Roles / Permissions | Platform Admin identity & access surfaces |
| Master data | `/admin/master-data/*` (CRUD) and `/admin/reference-framework` (governance) |

The Reference Framework console (`/admin/reference-framework`) is a
**governance overlay** on top of `/admin/master-data/*` — it is not a
duplicate CRUD screen and does not violate this rule (see
`EPIC_1_1_2A_REFERENCE_ACCESS_CRUD_PERMISSION_PLAN.md`).

---

## 2. Screen Ownership Documentation (required when a new screen is unavoidable)

If a new screen is genuinely required, the epic MUST publish a Screen Ownership
Note under `docs/enterprise/screens/` containing:

- **Why** the existing screen cannot be reused, extended, tabbed, or linked.
- **Canonical route** for the new screen.
- **Legacy / duplicate routes** it replaces or coexists with.
- **`app_modules` entry** (route, parent, icon, permission, sort order,
  `show_in_menu`).
- **Permission model** (module + actions), matching the Enterprise Framework
  Blueprint (`EPIC_1_1_4_ENTERPRISE_FRAMEWORK_BLUEPRINT.md`).
- **Retirement / redirect plan** for the old screen(s), with target release.

No new screen ships without this note approved.

---

## 3. BEMA / Legacy Table Protection

Any table that predates the Enterprise Framework work — in particular the
`bema_*` family and other legacy tables (`tb_*`, `lg_*`, `ia_*`,
`system_office_settings`, etc.) — is protected. Before any change:

- **Do NOT** alter, rename, drop, or repurpose the table.
- **Do NOT** change existing columns (type, nullability, default, meaning).
- **Do NOT** change existing semantics of existing values.
- **Do NOT** break any existing BEMA screen, route, service, or hook.
- **First** document the proposed change per Section 5 and obtain approval
  before executing anything.

Additive, backward-compatible changes (e.g. a new nullable column that no
legacy code reads) still require the impact note in Section 5.

---

## 4. Preferred BEMA / Legacy Integration Approach

When enterprise frameworks (Reference, Master Data, Lookup, etc.) need to
consume or govern legacy data, use non-invasive patterns:

**Preferred**
- Read-only adapters (see `src/adapters/*`).
- SQL views over legacy tables.
- Compatibility services that wrap legacy CRUD.
- Mapping tables that link enterprise IDs to legacy IDs.
- Facade hooks in the UI layer.
- New enterprise tables that **reference** legacy IDs by foreign key or soft
  link, without mutating the legacy row.

**Prohibited without approved impact note**
- Direct structural changes to BEMA / legacy tables.
- Destructive migrations (`DROP`, `TRUNCATE`, `ALTER COLUMN TYPE`, `RENAME`).
- Forced migration without a documented rollback.
- Any change to legacy semantics, even if the column shape is unchanged.

---

## 5. Mandatory BEMA / Legacy Change Report

If any BEMA-related table (or other legacy table) is touched or is proposed
for future work, the epic MUST create or update:

    docs/enterprise/BEMA_LEGACY_TABLE_IMPACT_NOTE.md

Each entry MUST include:

- **Table name**
- **Current usage** (screens, services, hooks, reports, exports)
- **Proposed change**
- **Why the change is required**
- **Alternative adapter / view / mapping approach considered**
- **Risk** (data loss, screen breakage, semantic drift, downstream consumers)
- **Rollback plan** (SQL + code)
- **Approval required before execution** (named role/owner)

No BEMA / legacy table change may be executed until the corresponding entry
in `BEMA_LEGACY_TABLE_IMPACT_NOTE.md` is approved.

---

## Enforcement

- Every future epic acceptance document MUST include a short "Screen &
  Legacy Table Compliance" section confirming adherence to Sections 1–5.
- Reviewers MUST reject any migration that mutates a legacy/BEMA table
  without a matching, approved entry in
  `docs/enterprise/BEMA_LEGACY_TABLE_IMPACT_NOTE.md`.
- Reviewers MUST reject any new page/route that duplicates a canonical
  screen listed in Section 1 without a Screen Ownership Note per Section 2.

## Related Documents

- `EPIC_1_1_4_ENTERPRISE_FRAMEWORK_BLUEPRINT.md` — framework standards
- `EPIC_1_1_2A_REFERENCE_ACCESS_CRUD_PERMISSION_PLAN.md` — CRUD boundary
- `EPIC_2_0_ORGANISATION_GAP_ANALYSIS.md` — legacy org tables to retire
- `EPIC_1_2_MASTER_CATALOGUE.md` — legacy master inventory
