# Epic 1.1.4 — Enterprise Framework Blueprint

**Status:** Planning / Documentation only.
**Type:** Standards & Blueprint (no code, schema, routes, `app_modules`, menus, permissions, feature flags, or data changes).

**Parents / Sources:**
- `docs/enterprise/EPIC_1_1_ENTERPRISE_REFERENCE_FRAMEWORK.md`
- `docs/enterprise/EPIC_1_1_1_REFERENCE_FRAMEWORK_ACCEPTANCE.md`
- `docs/enterprise/EPIC_1_1_2_REFERENCE_GOVERNANCE_ACCEPTANCE.md`
- `docs/enterprise/EPIC_1_1_2A_REFERENCE_ACCESS_CRUD_PERMISSION_PLAN.md`
- `docs/enterprise/EPIC_1_1_3_REFERENCE_ADOPTION_WAVE_1_ACCEPTANCE.md`

---

## 1. Purpose

Define the **single reusable blueprint** that every future enterprise
framework at Misha Infotech must follow. This blueprint standardizes
route structure, navigation, permissions, CRUD boundaries, governance,
menu registration, and adoption lifecycle — so no team designs a new
framework from scratch and no product ends up with a bespoke governance
model.

The blueprint is derived from the Enterprise Reference Framework
(Epics 1.1 → 1.1.3), which serves as the **first reference
implementation** and the template every subsequent framework mirrors.

---

## 2. In-scope frameworks

The blueprint governs all ten enterprise frameworks:

| # | Framework | Owner (default) | Purpose |
|---|---|---|---|
| 1 | Reference Framework | Platform | Governed value sets, i18n, aliases, external codes. |
| 2 | Lookup Framework | Platform | Short-lived UI dropdown/list sources not requiring full governance. |
| 3 | Master Data Framework | Platform | Business entities (Person, Employer, Bank, Country) with lifecycle. |
| 4 | Configuration Framework | Platform | System / module / org / user scoped settings. |
| 5 | Validation Framework | Platform | Rules, constraints, cross-field checks. |
| 6 | Metadata Framework | Platform | Field-level definitions, form/table schemas, UI metadata. |
| 7 | Attachment Framework | Platform | Files, storage, retention, virus scan, classification. |
| 8 | Numbering Framework | Platform | Sequences, reference numbers, formatting rules. |
| 9 | Workflow Framework | Platform | Maker/checker, approvals, routing, SLAs. |
| 10 | Notification Framework | Platform | Channels, providers, templates, delivery. |

---

## 3. Standard route structure

Every framework MUST expose the same route skeleton under
`/admin/{framework-name}` (kebab-case, singular concept plural of
"framework" dropped):

```
/admin/{framework-name}                     -> redirect to /dashboard
/admin/{framework-name}/dashboard           -> overview + KPIs
/admin/{framework-name}/catalogue           -> browse governed items
/admin/{framework-name}/governance          -> ownership, stewards, lifecycle
/admin/{framework-name}/operations          -> CRUD / import / export / bulk
/admin/{framework-name}/impact              -> consumers + dependencies
/admin/{framework-name}/audit               -> change log + versions
/admin/{framework-name}/settings            -> framework-level configuration
```

Optional sub-tabs are allowed inside a route (e.g. `?tab=…`) but the
top-level segments above are **canonical** and must not be renamed by
individual frameworks.

Concrete example (Reference Framework, already shipped):

- `/admin/reference-framework` (12-tab console covering all segments above).

---

## 4. Standard navigation model

Every framework console must present these logical sections (as tabs,
side-nav, or grouped cards — presentation is free, taxonomy is fixed):

| Section | Required | Purpose |
|---|---|---|
| Dashboard | ✅ | KPIs, coverage, health snapshot. |
| Catalogue | ✅ | Browsable inventory of governed items. |
| CRUD / Operations | ✅ | Create, edit, delete, activate/deactivate. |
| Import / Export | ✅ | Bulk load, extract, round-trip. |
| Lifecycle | ✅ | Draft → Active → Superseded → Retired transitions. |
| Versioning | ✅ | Version strategy, supersedes/superseded-by. |
| Approval | ✅ | Maker/checker path via Workflow Framework. |
| Consumers | ✅ | Who reads this framework. |
| Dependencies | ✅ | What this framework depends on. |
| Health | ✅ | Missing metadata, orphans, duplicates, staleness. |
| Audit | ✅ | Immutable change log. |
| Settings | ✅ | Framework-level configuration + feature flags. |

---

## 5. Standard permission model

Frameworks MUST use this fixed action vocabulary. Extra actions require
architectural approval.

| Action | Meaning |
|---|---|
| `view` | Read catalogue + dashboard. |
| `create` | Add a new item / group / definition. |
| `update` | Edit existing item metadata. |
| `delete` | Soft-delete or physical delete when allowed. |
| `manage` | Umbrella for create/update/delete (assigned to stewards). |
| `approve` | Sign off draft / pending items in the approval queue. |
| `publish` | Move approved item to `ACTIVE`. |
| `archive` | Move to `ARCHIVED` (recoverable). |
| `retire` | Move to `RETIRED` (terminal, immutable). |
| `import` | Bulk load. |
| `export` | Bulk extract. |
| `admin` | Configure framework settings, ownership, categories. |

Mapping to Reference Framework (already seeded via Epic 1.1.2A):
`view`, `manage`, `approve`, `retire`, `import`, `export`. Future
frameworks should add the remaining actions as they need them, but MUST
NOT invent new verbs.

---

## 6. Standard CRUD boundary model (phased)

To prevent dual-write races and duplicated screens during migration,
every framework moves through **four boundary phases**:

**Phase A — Legacy owns CRUD**
- Existing operational screens (e.g. `/admin/master-data/*`) keep full
  CRUD.
- Framework console is **read-only** and analytics/governance only.
- No consumer is asked to switch.

**Phase B — Framework reuses legacy CRUD components**
- Framework console embeds or reuses the same CRUD components as the
  legacy screen.
- Still a single writer; two entry points render the same forms.
- Users can start using the framework console without risk.

**Phase C — Framework becomes the public entry point**
- Menu links, docs, and internal training point at
  `/admin/{framework-name}/operations`.
- Legacy route remains reachable but is no longer promoted.
- Deep links from external systems continue to work.

**Phase D — Legacy routes redirect (after one full release)**
- Legacy `/admin/master-data/{x}` performs a 301-style redirect to the
  framework operations route.
- Legacy component code is removed in the release after the redirect
  ships.
- Rollback = restore the redirect target for one release only.

Reference Framework is currently at **Phase A** (Epic 1.1.2A).

---

## 7. Standard governance model

Every framework must publish, per governed item and per framework:

- **Business owner** — accountable business role.
- **Technical owner** — accountable engineering team.
- **Steward** — day-to-day custodian.
- **Lifecycle** — `DRAFT | ACTIVE | INACTIVE | SUPERSEDED | ARCHIVED | RETIRED`.
- **Versioning strategy** — one of `IMMUTABLE_CODES`, `SEMVER`,
  `EFFECTIVE_DATED`, `SUPERSEDES_CHAIN`.
- **Scope** — `PLATFORM | ORG | MODULE | USER` with optional
  `scope_org_id` / `scope_module_code`.
- **Consumers** — modules / services / UIs that read the framework.
- **Dependencies** — frameworks / services this framework depends on.
- **Health** — computed metrics (missing owner, orphaned items,
  duplicate codes, stale entries).
- **Audit** — every write recorded with actor, timestamp, before/after.

---

## 8. Standard `app_modules` registration

Every framework MUST be registered in `app_modules` so the live menu
renders it. The row template:

| Column | Value |
|---|---|
| `code` | `admin_{framework_name}` (snake_case) |
| `name` | e.g. "Reference Framework" |
| `parent_code` | `admin_master_data` for data frameworks, `admin_platform` for infra frameworks |
| `route` | `/admin/{framework-name}` |
| `icon` | Lucide icon name (from `src/data/lucideIcons.ts`) |
| `show_in_menu` | `true` |
| `sort_order` | 10 / 20 / 30 … within its parent group |
| `is_active` | `true` |

Permission mapping (seeded in `module_actions` + `role_permissions`):

- Every action from §5 that the framework actually implements gets a
  `module_actions` row keyed to the module `code`.
- Assign `view` + `manage` to the **Admin** and **Application Admin**
  roles at launch; higher-privilege actions (`approve`, `retire`,
  `admin`) go to a dedicated framework-steward role.

Concrete precedent: Epic 1.1.2A registered `admin_reference_framework`
under parent `Master Data` with actions `view / manage / approve /
retire / import / export` granted to Admin and Application Admin.

---

## 9. Standard adoption lifecycle

Every framework moves through **seven stages** — no stage may be
skipped and each stage has its own acceptance epic.

1. **Architecture** — capability, scope, boundaries (planning epic).
2. **Implementation** — additive schema + service layer (no consumer
   changes).
3. **Governance** — categories, ownership, stewards, lifecycle,
   analytics console (read-only).
4. **Access & Permissions** — `app_modules`, `module_actions`,
   `role_permissions`, menu link.
5. **Pilot Adoption** — one low-risk, platform-owned item fully
   governed (Wave 1). Proves all capabilities end-to-end.
6. **Migration Waves** — grouped by risk (Wave 2 = low-impact org
   data, Wave 3 = financial / legal data, Wave 4 = benefits / SSP
   data). Each wave is its own epic with its own rollback.
7. **Legacy Retirement** — redirect legacy routes (Phase D), remove
   legacy code one release later.

Reference Framework has completed stages **1 → 5**:

| Stage | Epic | Status |
|---|---|---|
| Architecture | 1.1 | ✅ |
| Implementation | 1.1.1 | ✅ |
| Governance | 1.1.2 | ✅ |
| Access & Permissions | 1.1.2A | ✅ |
| Pilot Adoption | 1.1.3 (`CORE_TIMEZONE`) | ✅ |
| Migration Waves | 1.1.4+ | ⏳ pending |
| Legacy Retirement | future | ⏳ pending |

---

## 10. Reference Framework as the first implementation

The Enterprise Reference Framework is hereby declared the **canonical
reference implementation** of this blueprint. Every future framework
must be able to answer: *"how does the Reference Framework do this?"*
before choosing a different path.

Reference implementation checklist (all satisfied):

- ✅ Additive schema — no legacy tables dropped or renamed.
- ✅ Categories, i18n, external codes, aliases, hierarchy, lifecycle,
  versioning columns.
- ✅ Read-first service layer (`coreReferenceDataService`).
- ✅ Governance analytics service (`referenceGovernanceService`).
- ✅ 12-tab governance console at `/admin/reference-framework`.
- ✅ `app_modules` + `module_actions` + `role_permissions` seeded.
- ✅ Pilot adoption of `CORE_TIMEZONE` with alias / external-code / i18n
  probes.
- ✅ Rollback documented at every step.
- ✅ Zero disruption to existing `/admin/master-data/*` screens.
- ✅ BN Product Builder (Epic 0.40) untouched and still ON HOLD.

Any deviation from the blueprint in a future framework requires an
explicit ADR referencing this document.

---

## 11. Next framework recommendation

Two candidates are ready for Epic **1.2**:

**Option A — Enterprise Lookup Framework**
- Scope: short-lived UI dropdown/list sources (screen-local pick
  lists, filter chips, static option sets) that do NOT need full
  governance.
- Pro: small, quick, unblocks consistent dropdown UX everywhere.
- Con: low strategic value; overlaps with Reference Framework for many
  items and risks becoming a "reference-lite" side road.

**Option B — Enterprise Master Data Framework** ⭐ recommended
- Scope: governed **business entities** (Person, Employer, Bank,
  Country, Office, Department, Designation) with lifecycle, dedupe,
  merge/split, cross-module identity, and consumer registry.
- Pro:
  - Directly unblocks SSP, HRMS, DMS, Prison, Licensing, Payroll — all
    of which need a shared Person / Employer identity.
  - Consumes the Reference Framework (proves the pattern chains).
  - Removes the biggest source of duplicate-data risk in the
    enterprise.
- Con: larger than Lookup; requires careful phased CRUD boundary work
  because legacy Employer / Person screens are heavily used.

**Recommendation:** proceed with **Option B — Enterprise Master Data
Framework** as Epic 1.2, using the exact seven-stage adoption
lifecycle above. Lookup Framework can follow as Epic 1.3 once master
data has proven the second full traversal of the blueprint.

---

## 12. Acceptance

| # | Criterion | Status |
|---|---|---|
| 1 | No code, schema, route, `app_modules`, menu, permission, feature-flag, or data change. | ✅ Documentation only. |
| 2 | Blueprint defines route, navigation, permission, CRUD boundary, governance, `app_modules`, and adoption standards for all ten enterprise frameworks. | ✅ §3 – §9. |
| 3 | Reference Framework documented as the first reference implementation. | ✅ §10. |
| 4 | Next implementation epic clearly recommended. | ✅ §11 — Enterprise Master Data Framework. |
| 5 | BN Product Builder (Epic 0.40) remains ON HOLD. | ✅ Untouched. |
