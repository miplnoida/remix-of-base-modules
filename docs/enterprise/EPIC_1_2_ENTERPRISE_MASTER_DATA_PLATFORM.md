# Epic 1.2 — Enterprise Master Data Platform (MDP)

**Status:** Architecture & Planning (no code changes)
**Date:** 2026-07-05
**Owner:** Enterprise Architecture / Misha Infotech
**Depends on:** Epic 1.1 (Enterprise Reference Framework), Epic 1.1.4 (Enterprise Framework Blueprint)

---

## 1. Purpose

The **Enterprise Master Data Platform (MDP)** is the reusable, cross-product platform that governs **every master entity** used by every Misha Infotech product — present and future:

- Social Security Platform (SSP)
- HRMS
- DMS / EDRMS
- Licensing
- Prison Management
- Budgeting
- Payroll
- Asset Management
- Compliance & Enforcement
- Future Government Platforms

It is **not** a CRUD module, not a set of screens, and not a migration. It is the **shared platform layer** through which all business masters are registered, catalogued, governed, versioned, published, consumed, and retired.

## 2. Non-Goals (What This Epic Does NOT Do)

- ❌ Does not build individual master screens
- ❌ Does not migrate any existing business masters
- ❌ Does not modify BN (New Benefit)
- ❌ Does not modify SSP business logic
- ❌ Does not replace existing CRUD screens under `/admin/master-data/*`
- ❌ Does not create duplicate master tables
- ❌ No code implementation in this epic — architecture only

## 3. Relationship to Prior Frameworks

| Layer | Framework | Scope | Status |
|-------|-----------|-------|--------|
| L1 | **Reference Framework** (Epic 1.1) | Small, closed, code-driven lookups (codes, statuses, types, enums) | ✅ Implemented (foundation) |
| L2 | **Master Data Platform** (Epic 1.2 — THIS) | Large, governed, business-critical entities with lifecycle, relationships, dependencies | 📐 Architecture only |
| L3 | Lookup Framework (Epic 1.3, future) | Volatile UI dropdowns cached from L1/L2 | Deferred |
| L4 | Configuration Framework (future) | Tenant/module configuration bindings | Deferred |

**Rule:** MDP consumes and extends the Reference Framework. It does not replicate it.

## 4. Definition of a "Master"

A **Master** is a named, governed dataset that:

1. Represents a **real-world entity** (Employer, Bank, Country, Office, Employee, Court, Village, Currency).
2. Is **referenced by transactions** across one or more products.
3. Has **stable identity** (a code or UUID) that survives across releases.
4. Requires **governance** — ownership, versioning, approval, audit.
5. Is **not** a pure code list (those belong to the Reference Framework).

## 5. Platform Capabilities (15 Pillars)

| # | Capability | Description |
|---|-----------|-------------|
| 1 | **Master Registry** | Central table of every master known to the platform |
| 2 | **Master Catalogue** | Browsable index (UI + API) of all registered masters |
| 3 | **Master Templates** | Reusable schema/UI/governance templates |
| 4 | **Common CRUD Pattern** | Standard create/read/update/delete/list contract |
| 5 | **Import / Export** | CSV / XLSX / JSON with schema validation |
| 6 | **Bulk Operations** | Bulk activate, deactivate, retire, reassign |
| 7 | **Dependency Analysis** | Which masters reference this master |
| 8 | **Change Impact** | Which transactions/products break if a record changes |
| 9 | **Versioning** | Snapshot every published state |
| 10 | **Lifecycle** | Draft → Review → Approved → Published → Retired |
| 11 | **Ownership** | Business owner, technical owner, steward |
| 12 | **Permission Model** | Fixed action vocabulary applied per master |
| 13 | **Menu Placement** | Standard `/admin/master-data-platform/*` and per-master mount points |
| 14 | **`app_modules` Standard** | Every master registered as a module row |
| 15 | **Adoption Lifecycle** | 7-stage rollout, one master at a time |

## 6. Platform Surface

```
/admin/master-data-platform/
├── dashboard              # KPIs across all masters
├── catalogue              # Browse every registered master
├── registry               # Register / configure a master
├── governance             # Ownership, stewards, approvals
├── lifecycle              # Draft / review / publish / retire
├── versioning             # Snapshots and rollbacks
├── impact                 # Dependency + change impact analysis
├── import-export          # Bulk file operations
├── operations             # Bulk actions across masters
├── audit                  # Cross-master audit trail
└── settings               # Platform-level configuration
```

Per-master routes remain **owned by the master** (`/admin/master-data/<name>`) — MDP orchestrates, it does not replace CRUD screens.

## 7. Deliverables (This Epic)

All under `docs/enterprise/`:

| File | Purpose |
|------|---------|
| `EPIC_1_2_ENTERPRISE_MASTER_DATA_PLATFORM.md` | This document — the platform charter |
| `EPIC_1_2_MASTER_CATALOGUE.md` | Inventory of every existing master in the repo |
| `EPIC_1_2_MASTER_CLASSIFICATION.md` | Classification of each master into 5 tiers |
| `EPIC_1_2_MASTER_TEMPLATE_STANDARD.md` | The single template every future master must follow |
| `EPIC_1_2_MASTER_GOVERNANCE_MODEL.md` | Ownership, lifecycle, permissions, audit |
| `EPIC_1_2_MASTER_ADOPTION_ROADMAP.md` | Wave-based adoption plan across all masters |

## 8. Success Criteria

- ✅ Every existing master in the repository is inventoried and classified
- ✅ A reusable Master Data Platform architecture is defined
- ✅ A single Master Template exists that all future masters must follow
- ✅ Governance model is documented (ownership, lifecycle, versioning, permissions)
- ✅ Adoption roadmap sequences future implementation waves
- ✅ No code implemented, no data migrated, no existing screens changed

## 9. Next Epics (Sequenced)

- **1.2.1** — MDP Schema Hardening (registry tables, additive only)
- **1.2.2** — MDP Governance Console (`/admin/master-data-platform`)
- **1.2.3** — MDP Adoption Wave 1 (one low-risk enterprise master, e.g. Currency or Bank)
- **1.2.4** — MDP Adoption Wave 2 (Country, District, Postal District)
- **1.2.5** — MDP Adoption Wave 3 (Office, Organisation, Department)

Each wave follows the 7-stage lifecycle in `EPIC_1_1_4_ENTERPRISE_FRAMEWORK_BLUEPRINT.md`.
