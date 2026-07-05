# Epic 1.2 — Master Governance Model

**Status:** Architecture (documentation only)
**Scope:** Ownership, lifecycle, versioning, permissions, audit, change control for every master governed by the MDP.

## 1. Roles

| Role | Responsibility |
|------|----------------|
| **Business Owner** | Accountable for data correctness, approves publish, sets policy |
| **Technical Owner** | Owns schema, service, UI; delivers changes |
| **Steward** | Day-to-day data quality; reviews imports, resolves duplicates |
| **Consumer** | Product/module that reads the master |
| **Administrator** | Configures registry entry, permissions, lifecycle |

Every master **must** have exactly one Business Owner, one Technical Owner, and one Steward.

## 2. Lifecycle

```
DRAFT ── review ──▶ REVIEW ── approve ──▶ APPROVED ── publish ──▶ PUBLISHED ── retire ──▶ RETIRED
  ▲                                                                   │
  └───────────────────────── amend (creates new DRAFT version) ◀──────┘
```

| State | Meaning | Who can transition |
|-------|---------|--------------------|
| DRAFT | Editable, not consumable | Steward, Technical Owner |
| REVIEW | Locked, awaiting review | Steward submits |
| APPROVED | Locked, awaiting publish window | Business Owner |
| PUBLISHED | Live, consumed by products | Business Owner publishes |
| RETIRED | Not consumable; historic references preserved | Business Owner retires |

## 3. Versioning Strategies

| Strategy | Behaviour | Use For |
|----------|-----------|---------|
| `IMMUTABLE_CODES` | Codes never change; rows may be added/inactivated | Countries, Currencies, ISO code lists |
| `VERSIONED_ROWS` | Each change writes a new row with `effective_from`/`effective_to` | Rates, Tariffs, Fee Rules |
| `SNAPSHOT_ON_PUBLISH` | Full master state snapshotted on each PUBLISHED transition | Banks, Offices, Organisation |

## 4. Permission Model

Fixed action vocabulary applied per master:

| Action | Default Roles |
|--------|---------------|
| `view` | Admin, Application Admin, Consumer roles |
| `create`, `update`, `delete` | Steward, Technical Owner |
| `manage` | Steward, Technical Owner |
| `approve` | Business Owner |
| `publish` | Business Owner |
| `retire` | Business Owner |
| `import`, `export` | Steward |
| `admin` | Application Admin only |

Permissions live in `role_permissions`, keyed by `module_actions.action_code` on the master's `app_modules` row.

## 5. Audit

Every mutation (CRUD, lifecycle transition, permission change, import) writes to `system_audit_trail` with:

- `entity_type` = master code
- `entity_id`
- `action`
- `actor` (UserCode per project standard)
- `before` / `after` snapshots
- `reason` (mandatory for retire, publish, approve)

## 6. Change Control

| Change | Requires |
|--------|----------|
| Row create/update in DRAFT | Steward |
| Bulk import (upsert) | Steward + import approval if > 100 rows |
| DRAFT → REVIEW | Steward |
| REVIEW → APPROVED | Business Owner |
| APPROVED → PUBLISHED | Business Owner + change window compliance |
| Retire a code referenced by transactions | Impact report + Business Owner |
| Schema change (columns added) | Technical Owner + Architecture review |
| Reclassification (tier change) | Architecture review + updated Catalogue |

## 7. Dependency & Impact Analysis

The MDP maintains a dependency graph populated from:
- Foreign keys discovered in `information_schema`
- Explicit `master_consumer` registrations
- Reference Framework linkages (`core_reference_value` FKs)

Before any RETIRE or code-change, the MDP produces an **Impact Report**:
- Consumer tables
- Row counts referencing this master value
- Product modules affected
- Suggested mitigation (soft-retire, alias, migration)

## 8. Data Quality

Each master declares:
- **Uniqueness** — which columns are unique
- **Required fields**
- **Cross-field rules** (e.g. `effective_to > effective_from`)
- **External source of truth** (if any) — ISO, national registry, SWIFT

Steward is responsible for reconciliation.

## 9. Retention

- RETIRED rows are never physically deleted from Enterprise or Organisation masters.
- Soft-deleted rows (`deleted_at`) are hidden from `list()` but visible to `history()` and audit.
- Physical purge only via a documented retention policy per master (defaults: never).

## 10. Cross-Product Contract

When a product consumes an Enterprise master it must:
1. Read via the master service (never join across schemas informally)
2. Never write to the master
3. Register itself as a consumer in `master_consumer`
4. Handle `RETIRED` codes gracefully (display, do not fail)
5. Subscribe to publish events (future: MDP change bus)

## 11. Non-Compliance

- A master without a Registry row → cannot be routed by MDP; flagged for adoption
- A master without owners → blocked from PUBLISHED transitions
- A master screen that bypasses the service contract → fails Architecture review

## 12. Alignment with Reference Framework

Reference Framework (Epic 1.1) applies the same governance vocabulary at a smaller scale. MDP and Reference Framework share:
- Lifecycle states
- Permission actions
- Audit conventions
- Ownership roles

This ensures governance is consistent whether a dataset is R, E, O, or B.
