# Epic 1.2 — Master Classification

**Status:** Architecture (documentation only)
**Purpose:** Define the classification tiers and assignment rules used by the Master Catalogue.

## 1. Five Tiers

| Tier | Name | Definition | Governance | Example |
|------|------|------------|------------|---------|
| **R** | Reference Data | Small (< ~200 rows), closed, code-driven lookup used to constrain fields | Reference Framework (Epic 1.1) | Marital Status, Payment Type, Case Stage |
| **E** | Enterprise Master | Large, shared across ≥ 2 products, business-critical identity | **MDP (Epic 1.2)** | Bank, Country, Currency, Employer, Insured Person |
| **O** | Organisation Master | Describes the internal org structure of the operating institution | MDP + Organisation module | Organisation, Department, Team, Office, Role |
| **B** | Business Master | Owned by a single product; may reference E/O masters | Product owns CRUD, MDP governs metadata | BN Product, CE Zone, LG Court, IA Auditor |
| **T** | Transactional | Records events, not entities | Not a master — excluded | Claims, Cases, Payments, Notices |

## 2. Assignment Rules

A master is **R** when ALL apply:
- ≤ ~200 rows
- Values are code-driven (short code + label)
- No child records / no lifecycle beyond active/inactive
- No dependencies on other masters (or only on other R)

A master is **E** when ANY apply:
- Referenced by ≥ 2 products
- Sourced from an external standard (ISO, SWIFT, national registry)
- Has a business owner outside a single product team
- Requires versioning, effective dating, or approval workflow

A master is **O** when:
- Describes the operating organisation (org unit, position, role, office)
- Drives permissions, routing, delegation, or approval matrices

A master is **B** when:
- Only one product consumes it
- Product team owns CRUD, business rules, and lifecycle
- May still be catalogued and audited by MDP

A dataset is **T** (excluded) when:
- Rows represent events with a timestamp and an actor
- Records are appended, not curated

## 3. Tie-Breakers

| Situation | Rule |
|-----------|------|
| Row count borderline but code-driven | R |
| Row count borderline but referenced by 2+ products | E |
| Two overlapping tables exist | Pick the more governed one; retire the other (see Catalogue §J) |
| Product-specific overlay of an Enterprise master | Keep both — E is the source of truth, B is the overlay |
| Legacy `tb_*` code list already migrated to `core_reference_group` | Treat as R governed by Reference Framework; retire the `tb_*` after adoption |

## 4. Governance Assignment Matrix

| Tier | Catalogue | Registry | Template | Lifecycle | Versioning | Import/Export | Impact Analysis | CRUD |
|------|-----------|----------|----------|-----------|------------|---------------|-----------------|------|
| R | ✅ Reference Framework | — | RF template | ✅ | Optional | ✅ | ✅ | Reference Framework console + legacy `/admin/master-data/*` |
| E | ✅ MDP | ✅ | MDP template | ✅ | ✅ | ✅ | ✅ | Dedicated master screen, MDP-orchestrated |
| O | ✅ MDP | ✅ | MDP template | ✅ | ✅ | ✅ | ✅ | Organisation module screens |
| B | ✅ MDP (catalogued) | Optional | Product-defined | Product | Product | Product | MDP tracks | Product-owned |
| T | ❌ Excluded | — | — | — | — | — | — | Product-owned |

## 5. Change Rules

- Reclassifying a master from B → E requires: (a) documented second consumer, (b) migration plan, (c) new business owner assignment.
- Reclassifying R → E is rare; usually happens when a code list grows into a curated entity (e.g. Bank codes → Bank master).
- Reclassifying anything → T is forbidden.

## 6. Applied Classification

Full applied classification per master is in `EPIC_1_2_MASTER_CATALOGUE.md` (Tier column).
