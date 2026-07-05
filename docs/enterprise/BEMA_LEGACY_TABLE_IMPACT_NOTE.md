# BEMA / Legacy Table Impact Note

Status: ACTIVE — living document
Owner: Enterprise Architecture
Governed by: `SCREEN_AND_LEGACY_TABLE_GOVERNANCE_RULES.md` (Sections 3–5)

This document is the **single register** of every proposed or executed change
to a BEMA (`bema_*`) or other legacy table. No such change may be executed
until its entry here is approved.

---

## How to add an entry

Copy the template below, fill in every field, and open it for review. Do NOT
run the migration until the "Approval" line is signed off.

### Entry template

```
### <table_name> — <short change title>

- Table name: <schema.table>
- Current usage:
  - Screens: <routes / components>
  - Services / hooks: <files>
  - Reports / exports / jobs: <list>
- Proposed change: <exact DDL / semantic change>
- Why the change is required: <business / technical driver>
- Alternative approach considered:
  - [ ] Read-only adapter
  - [ ] SQL view
  - [ ] Compatibility service
  - [ ] Mapping table (enterprise_id <-> legacy_id)
  - [ ] Facade hook
  - [ ] New enterprise table referencing legacy id
  - Why the alternative was rejected: <reason>
- Risk:
  - Data loss: <yes/no + detail>
  - Screen breakage: <list screens at risk>
  - Semantic drift: <describe>
  - Downstream consumers: <adapters, edge functions, reports>
- Rollback plan:
  - SQL: <reverse migration>
  - Code: <files to revert>
- Approval required before execution: <role / named owner>
- Status: PROPOSED | APPROVED | EXECUTED | REJECTED
- Approved by: <name, date>
- Executed on: <migration file / date>
```

---

## Current entries

*None. No BEMA or legacy table changes have been proposed or approved at
this time. The Enterprise Reference Framework, Reference Governance,
Reference Adoption Wave 1, Enterprise MDP planning, and Organisation
Foundation planning epics have all been additive and have not mutated any
`bema_*` or legacy table.*

---

## Protected table families (non-exhaustive)

Any change to a table matching these patterns requires an entry above:

- `bema_*` — BEMA Compliance & Enforcement
- `tb_*` — legacy transactional / master tables (e.g. `tb_office`, `tb_dept`,
  `tb_designations`, `tb_bank_code`)
- `lg_*` — Legal module legacy tables
- `ia_*` — Internal Audit legacy tables (e.g. `ia_holidays`)
- `system_office_settings`
- `bn_*` legacy master duplicates (e.g. `bn_bank_master`) — coordinate with
  BN Product Builder governance (currently ON HOLD)

## Related Documents

- `SCREEN_AND_LEGACY_TABLE_GOVERNANCE_RULES.md`
- `EPIC_2_0_ORGANISATION_GAP_ANALYSIS.md`
- `EPIC_1_2_MASTER_CATALOGUE.md`
