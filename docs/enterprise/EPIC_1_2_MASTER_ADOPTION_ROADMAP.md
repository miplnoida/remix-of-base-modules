# Epic 1.2 — Master Adoption Roadmap

**Status:** Architecture (documentation only)
**Scope:** Wave-based rollout of the Master Data Platform across all catalogued masters.

## Guiding Principles

1. **One master per wave.** No big-bang migration.
2. **Additive only.** No existing screen, service, or table is replaced without a follow-up epic.
3. **Enterprise before Business.** Tier E and O migrate first; Tier B follows.
4. **Reference Framework already governs Tier R** — no MDP work needed for R.
5. **BN and SSP business logic are frozen** for the duration of this roadmap.
6. Each wave follows the 7-stage adoption lifecycle from `EPIC_1_1_4_ENTERPRISE_FRAMEWORK_BLUEPRINT.md`.

## Wave 0 — Platform Foundations (Epics 1.2.1 – 1.2.2)

| Epic | Deliverable |
|------|-------------|
| **1.2.1** | MDP schema hardening — create `master_registry`, `master_consumer`, `master_version_snapshot`, `master_change_request`. Additive migration only. |
| **1.2.2** | MDP Governance Console at `/admin/master-data-platform` — catalogue, registry, governance, lifecycle, versioning, impact. No CRUD replacement. |
| **1.2.2A** | MDP Access, CRUD & Permission Plan — mirrors Epic 1.1.2A pattern. |

## Wave 1 — Low-Risk Enterprise Masters (Epics 1.2.3 – 1.2.5)

| Wave | Epic | Master | Rationale |
|------|------|--------|-----------|
| 1a | 1.2.3 | **Currency** (`tb_currencies`) | ISO 4217, minimal churn, single consumer today, ideal pilot |
| 1b | 1.2.4 | **Public Holidays** (`public_holidays`) | Cross-product calendar, simple schema |
| 1c | 1.2.5 | **Language** (`core_language`) | i18n foundation, small dataset |

Success criteria: three enterprise masters registered, governed, and versioned via MDP; existing screens untouched.

## Wave 2 — Geography (Epics 1.2.6 – 1.2.9)

| Wave | Epic | Master | Notes |
|------|------|--------|-------|
| 2a | 1.2.6 | **Country** (`tb_country`) | Reconcile with `bn_country` — BN keeps overlay |
| 2b | 1.2.7 | **District** (`tb_district`) | |
| 2c | 1.2.8 | **Postal District** | |
| 2d | 1.2.9 | **Village** | |

## Wave 3 — Finance Enterprise Masters (Epics 1.2.10 – 1.2.12)

| Wave | Epic | Master | Notes |
|------|------|--------|-------|
| 3a | 1.2.10 | **Enterprise Bank** | Consolidate `tb_bank_code` + `bn_bank_master`; publish single MDP master; BN retains view |
| 3b | 1.2.11 | **Bank Branch** | Child of Enterprise Bank |
| 3c | 1.2.12 | **Industry / Occupation** | Cross-product employment |

## Wave 4 — Organisation Masters (Epics 1.2.13 – 1.2.16)

| Wave | Epic | Master | Notes |
|------|------|--------|-------|
| 4a | 1.2.13 | **Organisation** (`core_organization`) | |
| 4b | 1.2.14 | **Department** — consolidate `core_department` + `tb_dept` | |
| 4c | 1.2.15 | **Office** — consolidate `office_locations` + `core_department_location` + `tb_office` | |
| 4d | 1.2.16 | **Team** (`core_team`) | |

## Wave 5 — Person Enterprise Masters (Epics 1.2.17 – 1.2.18)

| Wave | Epic | Master | Notes |
|------|------|--------|-------|
| 5a | 1.2.17 | **Employer** (`er_master`) | Highest-risk enterprise master; long adoption cycle |
| 5b | 1.2.18 | **Insured Person** (`ip_master`) | Highest-risk enterprise master; long adoption cycle |

Waves 5a/5b will each be broken into their own multi-stage sub-epics (schema, service, adoption, cutover) and will run in parallel with normal SSP work for at least two releases.

## Wave 6 — Business Master Cataloguing (Epics 1.2.19 – 1.2.21)

Register Tier B masters into MDP for **cataloguing + governance only** — no CRUD change:

| Wave | Epic | Scope |
|------|------|-------|
| 6a | 1.2.19 | Legal Business Masters (Courts, Matter Types, Fee Rules, SLA Policies, Templates) |
| 6b | 1.2.20 | Compliance Business Masters (Zones, Queues, Violation Types, Risk Bands, Notice Templates) |
| 6c | 1.2.21 | Internal Audit Business Masters (Departments, Auditors, Universe) |

BN Business masters are **excluded** from this roadmap while Epic 0.40 is on hold.

## Wave 7 — Retirement of Duplicates (Epics 1.2.22 – 1.2.24)

Only after the surviving master is PUBLISHED and consumed by all products:

| Wave | Epic | Retirement |
|------|------|------------|
| 7a | 1.2.22 | Retire `tb_dept` (in favour of `core_department`) |
| 7b | 1.2.23 | Retire `tb_office` / `core_department_location` shims (in favour of Enterprise Office) |
| 7c | 1.2.24 | Retire `tb_bank_code` shim (in favour of Enterprise Bank) |

## Per-Wave Acceptance Template

Every wave must produce `docs/enterprise/EPIC_1_2_<n>_<MASTER>_ADOPTION.md` containing:

1. Master identity block
2. Schema diff (additive)
3. Registry row inserted
4. Consumer registrations
5. Impact report before/after
6. Verification checklist (10 items minimum)
7. Rollback steps
8. Sign-off: Business Owner, Technical Owner, Steward, Architecture

## Out of Scope (Whole Epic 1.2)

- ❌ BN Product Builder (Epic 0.40) — remains ON HOLD
- ❌ SSP business logic changes
- ❌ Replacement of existing `/admin/master-data/*` CRUD screens
- ❌ Physical deletion of any existing table
- ❌ Any change to Reference Framework (Epic 1.1) — already stable

## Sequencing Summary

```
1.2 (this)  → Charter + Catalogue + Classification + Template + Governance + Roadmap
  1.2.1     → MDP schema hardening (additive)
  1.2.2     → MDP Governance Console
  1.2.2A    → MDP Access, CRUD & Permission plan
  1.2.3–5   → Wave 1: Currency, Public Holidays, Language
  1.2.6–9   → Wave 2: Geography
  1.2.10–12 → Wave 3: Finance
  1.2.13–16 → Wave 4: Organisation
  1.2.17–18 → Wave 5: Employer, Insured Person (long)
  1.2.19–21 → Wave 6: Business master cataloguing
  1.2.22–24 → Wave 7: Duplicate retirement
```

At the end of Epic 1.2, every current master is classified, catalogued, and either governed by MDP (E/O), governed by Reference Framework (R), or catalogued for product-owned governance (B). Every future master follows the single Template Standard.
