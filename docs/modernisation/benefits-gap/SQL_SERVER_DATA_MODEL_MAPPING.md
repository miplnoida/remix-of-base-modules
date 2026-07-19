# BN Gap Modules — SQL Server Data Model Mapping

**Scope:** Structures newly introduced by the six gap modules. Existing canonical tables (`bn_award`, `bn_claim`, `ip_master`, `bn_payment_*`, `communication_*`, `core_workflow_*`, `core_ledger_*`) are unchanged — the .NET port re-uses the same **table and field semantics**; only physical types differ.

## Type mapping baseline

See `docs/bn/contracts/data-type-mapping.md`. Reproduced summary:

| Concern       | PostgreSQL       | SQL Server                     | .NET               |
| ------------- | ---------------- | ------------------------------ | ------------------ |
| Identifier    | `uuid`           | `uniqueidentifier`             | `Guid`             |
| UTC timestamp | `timestamptz`    | `datetimeoffset(3)`            | `DateTimeOffset`   |
| Money         | `numeric(18,2)`  | `decimal(18,2)`                | `decimal`          |
| Percent       | `numeric(9,6)`   | `decimal(9,6)`                 | `decimal`          |
| Row version   | `bigint`         | `rowversion`                   | `byte[]`           |
| Enum          | `text` + CHECK   | `varchar(64)` + CHECK          | typed C# enum      |
| JSON          | `jsonb`          | `nvarchar(max) json`           | `JsonDocument`     |
| Boolean       | `boolean`        | `bit`                          | `bool`             |

## Appeals module

### `bn_appeal`

| Column                        | PostgreSQL           | SQL Server                    | Null | PK/FK | Index                        | Notes |
| ----------------------------- | -------------------- | ----------------------------- | ---- | ----- | ---------------------------- | ----- |
| appeal_id                     | uuid                 | uniqueidentifier              | N    | PK    |                              | default `newsequentialid()` |
| appeal_number                 | text                 | varchar(32)                   | N    |       | UQ(appeal_number)            | assigned by number sequence |
| status                        | text CHECK           | varchar(32) CHECK             | N    |       | IX(status)                   | see state machine |
| appeal_type_code              | text CHECK           | varchar(32) CHECK             | N    |       |                              | catalogue-validated |
| source_entity_type            | text                 | varchar(32)                   | N    |       | IX(source_entity_type, source_entity_id) | |
| source_entity_id              | uuid                 | uniqueidentifier              | N    | FK    |                              | logical FK |
| appellant_person_id           | uuid                 | uniqueidentifier              | N    | FK ip_master | IX(appellant_person_id)      | |
| filed_at                      | timestamptz          | datetimeoffset(3)             | N    |       |                              | |
| statutory_deadline_at         | timestamptz          | datetimeoffset(3)             | Y    |       |                              | |
| outcome                       | text CHECK           | varchar(32) CHECK             | Y    |       |                              | |
| outcome_reason                | text                 | nvarchar(1000)                | Y    |       |                              | |
| decided_by                    | uuid                 | uniqueidentifier              | Y    |       |                              | |
| decided_at                    | timestamptz          | datetimeoffset(3)             | Y    |       |                              | |
| requires_hearing              | boolean              | bit                           | N    |       |                              | default false |
| assigned_to                   | uuid                 | uniqueidentifier              | Y    |       | IX(assigned_to)              | |
| row_version                   | bigint               | rowversion                    | N    |       |                              | optimistic concurrency |
| created_at / updated_at       | timestamptz          | datetimeoffset(3)             | N    |       |                              | trigger-updated |
| created_by / updated_by       | text                 | varchar(64)                   | N    |       |                              | `user_code` |

**Row-count estimate:** ~5 000/year initial, growing 10%/year.
**Migration order:** Level 1 (before evidence/hearing/decision).

### `bn_appeal_decision_snapshot`

Immutable snapshot of the source decision at appeal filing. Columns: `snapshot_id (PK)`, `appeal_id (FK)`, `snapshot_json (nvarchar(max) json)`, `source_row_version (varchar(64))`, `created_at`.
No UPDATE/DELETE permitted (SQL Server: `INSTEAD OF UPDATE/DELETE` trigger that raises error).

### `bn_appeal_ground`, `bn_appeal_evidence`, `bn_appeal_event`, `bn_appeal_hearing_link`

Straightforward child tables with FK to `bn_appeal(appeal_id)` ON DELETE NO ACTION.

## Mortality module (proposed schema)

| Table                            | Purpose                                             | Row-count est.   |
| -------------------------------- | --------------------------------------------------- | ---------------- |
| `bn_mortality_event`             | Aggregate root; status, DoD, source, IP link        | ~4 000/year      |
| `bn_mortality_event_history`     | Full audit trail of state transitions               | ~5x aggregate    |
| `bn_mortality_award_impact`      | Link table to affected awards + termination effect  | ~1.5x aggregate  |
| `bn_mortality_referral`          | Legal / survivor / funeral referrals raised         | ~1x aggregate    |

## Overpayments module (proposed schema)

Existing `bn_overpayment` (16 columns) is extended in-place — additive columns only:

| New column                | SQL Server type          | Purpose                                     |
| ------------------------- | ------------------------ | ------------------------------------------- |
| status                    | varchar(32) CHECK        | canonical state (was implicit)              |
| cause_code                | varchar(32) CHECK        | overpayment cause                           |
| arrangement_id            | uniqueidentifier         | FK to new `bn_overpayment_arrangement`       |
| row_version               | rowversion               | optimistic concurrency                       |
| decision_snapshot_json    | nvarchar(max) json       | frozen calc inputs at NOTIFIED             |

New tables: `bn_overpayment_arrangement`, `bn_overpayment_instalment`, `bn_overpayment_event`, `bn_overpayment_write_off`.

## Means-tests module

| Table                              | Purpose                                          |
| ---------------------------------- | ------------------------------------------------ |
| `bn_means_test`                    | Assessment header                                |
| `bn_means_test_evidence`           | Evidence items                                   |
| `bn_means_test_score`              | Component scores + rule-engine trace             |
| `bn_means_test_event`              | State-transition log                             |
| `bn_means_test_appeal_link`        | Link to `bn_appeal(appeal_id)` when appealed     |

## Risk management module

| Table                        | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `bn_risk_signal`             | Signal aggregate (severity, source, entity linkage)  |
| `bn_risk_event`              | State-transition log                                 |
| `bn_risk_investigation`      | Investigation notes + findings                       |
| `bn_risk_payment_hold`       | Payment holds linked to `bn_award`                   |
| `bn_risk_referral`           | Legal referrals                                      |

## Uprating module

| Table                              | Purpose                                                        |
| ---------------------------------- | -------------------------------------------------------------- |
| `bn_uprating_run`                  | Run aggregate; status, effective date, approver              |
| `bn_uprating_run_parameter`        | Parameters (rate table refs, indexation factors)               |
| `bn_uprating_run_snapshot_award`   | Frozen award snapshot at snapshot time                         |
| `bn_uprating_run_exclusion`        | Excluded awards + reason (`PENDING_MORTALITY`, ...)          |
| `bn_uprating_run_adjustment`       | Adjustment applied per award (delta, before, after)            |
| `bn_uprating_run_event`            | State-transition log                                           |

## Foundation tables (already present as PG-only in `bn_gap_*`)

| PG table                | Role                             | SQL Server equivalent                                    |
| ----------------------- | -------------------------------- | -------------------------------------------------------- |
| `bn_gap_idempotency`    | Idempotency store                 | `bn_gap_idempotency` (uniqueidentifier PK)               |
| `bn_gap_command_log`    | Command audit / outbox seed      | `bn_gap_command_log`                                     |

## Migration order (top-level)

1. Foundation: `bn_gap_idempotency`, `bn_gap_command_log`
2. Appeals aggregate (`bn_appeal*`)
3. Mortality aggregate
4. Overpayments extensions
5. Means-tests aggregate
6. Risk aggregate
7. Uprating aggregate
8. Cross-module read views + reporting objects

See `MIGRATION_SEQUENCE.md` for the data-migration cutover strategy.
