# BN Gap Modules — Integration Boundaries

Gap modules NEVER duplicate canonical platforms. They call in through published façades.

## Canonical platform ownership

| Concern                | Owned by                                                     | Gap-module usage             |
| ---------------------- | ------------------------------------------------------------ | ---------------------------- |
| Workflow / tasks       | `core_workflow_*` runtime                                     | Create/read via workflow API |
| Communications         | Communication Hub (`sendCommunication` façade)                | Fire events, never send raw  |
| Documents              | DMS (`core_dms_*`)                                            | Link, never store bytes      |
| Legal referrals        | Legal module (`lg_*`)                                         | Create referral, never own state |
| Finance & ledger       | `core_ledger_*` and Finance adapters                          | Post transactions, never journal directly |
| Person / IP data       | IP module (`ip_master`)                                       | READ-ONLY. Death events sourced from IP feed only |
| Audit                  | `system_audit_trail` via `bnAuditService`                     | Write via pipeline `AuditWriter`; never bypass |
| Rollout & permissions  | `app_modules`, `role_permissions`, `core_permission_registry` | Read via portable API client |
| Templates & branding   | `core_template*` + `comm_*` assets                            | Consume, never store         |

## Direction of dependency

```
[Gap Modules]  ─────depends-on─────▶ [Canonical Platforms]
      │                                       │
      └── never write directly ────────────────┘
```

The reverse is false: canonical platforms MUST NOT depend on gap modules. If a canonical platform needs data owned by a gap module, expose a query in the gap module and let the platform pull.

## Integration event contract

Gap modules emit named events onto the outbox:

| Event                                                | Emitted by            | Consumers                              |
| ---------------------------------------------------- | --------------------- | -------------------------------------- |
| `bn.mortality.verified`                              | Mortality             | Awards, Overpayments, Comm Hub         |
| `bn.mortality.awards_terminated`                     | Mortality             | Awards, Legal (estate), Finance        |
| `bn.overpayment.assessed`                            | Overpayments          | Comm Hub, Finance                       |
| `bn.overpayment.recalculated`                        | Overpayments          | Finance, Comm Hub                       |
| `bn.appeal.decided`                                  | Appeals               | Source module (Awards / Overpayments / Means / Medical) |
| `bn.appeal.implemented`                              | Appeals               | Source module                           |
| `bn.means_test.overturned_via_appeal`                | Means-Tests           | Eligibility engine                      |
| `bn.risk.payment_held`                               | Risk                  | Awards, Comm Hub                         |
| `bn.risk.hold_released`                              | Risk                  | Awards, Comm Hub                         |
| `bn.uprating.executed`                               | Uprating              | Awards, Comm Hub, Finance                |
| `bn.uprating.reconciled`                             | Uprating              | Finance                                  |

## Read-side integration

- Award 360, Person 360, Claim 360 read from gap module read views.
- Every gap module ships a `v_bn_<module>_summary` view for cross-module composition. Views are the ONLY stable read surface for external consumers.

## Legal handoff

- Gap module writes `bn_legal_referral` row through the Legal façade.
- Never write to `lg_*` tables directly.

## Finance handoff

- Gap module posts a `core_ledger_transaction` through Finance's `postJournal(...)` façade.
- Idempotency key: `<module_code>:<entity_id>:<event_code>`.

## DMS handoff

- Documents produced (letters, decision packets) are stored via `core_dms_document_link` with retention policy `bn.<module>.default`.

## IP module boundary

- IP module is the only owner of person master data.
- Gap modules join to `ip_master(ip_master_id)` READ-ONLY.
- Death authoritative source: registrar feed → `ip_master.date_of_death` → mortality subscriber.
