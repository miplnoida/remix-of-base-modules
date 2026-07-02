# EPIC-06D — Recovery Assignment & Operational Work Management

**Status:** Delivered
**Depends on:** EPIC-06A (Recoverable Liability), EPIC-06B/C (Judicial, SLA, Notification, Audit)
**Feeds into:** EPIC-07 (Collections & Recovery Operations)

## Purpose

Recovery Officers must **not** work directly from Legal Matters or Recoverable Liabilities. This EPIC creates the operational layer — the **Recovery Assignment** — that sits between the Legal platform and future Collections module. Every officer touches only Assignments; Matters and Liabilities remain the legal system of record.

## Architecture

```text
Legal Matter ──┐
               ├─▶ Recoverable Liability ──┐
Judicial Order─┘                            ├─▶ Recovery Assignment ──▶ Officer diary / actions
                                            │        │
                Recovery Campaign ──────────┘        └─▶ Transfers / Escalations / Reports
```

Rollups (financials, order/appeal/enforcement counts, health) flow one-way from Liabilities → Assignment via `trg_lg_assignment_rollup`. Assignment status/audit trail is fully independent.

## Data Model

| Table | Purpose |
|---|---|
| `lg_recovery_assignment` | Core entity, with rollups, status, health, priority, strategy, campaign. |
| `lg_recovery_assignment_liability` | Junction to `lg_recoverable_liability`. |
| `lg_recovery_assignment_history` | Status changes, transfers, escalations. |
| `lg_recovery_assignment_action` | Officer diary — call/visit/letter/meeting/negotiation. |
| `lg_recovery_assignment_transfer` | Pending / decided transfer requests. |
| `lg_recovery_assignment_audit` | Field-level before/after diff. |
| `lg_recovery_campaign` | Campaign master + actual recovered rollup. |
| `lg_recovery_strategy_type` | Admin config with playbook JSON. |
| `lg_recovery_campaign_type` | Admin config. |
| `lg_recovery_workload_rule` | Capacity thresholds. |

Triggers: `trg_lg_assignment_rollup`, `trg_lg_assignment_health`, `trg_lg_assignment_audit`.

## State Machine

`DRAFT → ASSIGNED → ACTIVE → (SUSPENDED | ESCALATED) → COMPLETED → CLOSED`

Guarded by `src/services/legal/assignmentStateMachine.ts` and capability checks.

## Services

| Service | Responsibility |
|---|---|
| `lgRecoveryAssignmentService` | CRUD, link/unlink liabilities, status transitions, bulk assign, diary. |
| `lgRecoveryAssignmentWorkbenchService` | Grid + KPI aggregation. |
| `lgRecoveryStrategyService` | Rule-based Next Recommended Action engine (deterministic ladder). |
| `lgRecoveryCampaignService` | Campaigns, strategy types, campaign types, workload rules, officer workload lookup. |
| `lgRecoveryTransferService` | Request / approve / reject transfers with audit. |

All services reuse `lgLiabilityService`, `lgRecoveryHealth`, `lgSlaPolicyService`, `lgNotificationRuleEngine`, `lgAuditService`. No duplicated tables.

## UI

- `/legal/recovery/assignments` — Assignment Workbench (KPIs, filters, grid).
- `/legal/recovery/assignments/:id` — Assignment Workspace (Overview, Liabilities, Strategy, Diary, Transfers, Timeline, Audit).
- Admin screens:
  - `/legal/admin/recovery-strategies`
  - `/legal/admin/recovery-campaign-types`
  - `/legal/admin/recovery-workload-rules`

## Permissions (added to `useLgAccess`)

`viewRecoveryAssignment`, `createRecoveryAssignment`, `editRecoveryAssignment`,
`assignRecoveryOfficer`, `bulkAssignRecovery`,
`transferRecoveryAssignment`, `approveRecoveryTransfer`,
`escalateRecoveryAssignment`, `closeRecoveryAssignment`,
`configureRecoveryStrategy`, `configureRecoveryCampaign`, `configureWorkloadRules`.

Default grants: `LG_CASE_HANDLER` gets core operational caps; `LG_APPROVER` gets bulk + transfer approval + closure; `LG_ADMIN` gets full incl. all admin configuration. `LG_READ_ONLY` receives `viewRecoveryAssignment`.

## Next Recommended Action Rules

Deterministic ladder — no AI:
1. Enforcement active + Critical health → **Court follow-up**
2. Critical health → **Escalation**
3. Order exists + outstanding + no action > 14 d → **Court follow-up**
4. No contact ≥ 30 d → **Visit**
5. No contact ≥ 14 d → **Phone**
6. No contact ≥ 7 d → **Demand letter**
7. Otherwise → first step of configured strategy playbook

## Integration Map

| Module | Integration |
|---|---|
| Matter Workspace | Read-only "Recovery Assignments" link (via `listAssignmentsForCase`). |
| Recovery Workbench | Assignment officer/status columns available via `listAssignmentsForLiability`. |
| Court Ops / Orders / Appeals / Enforcement | Liability chips can open owning assignment. |
| Liability 360 Drawer | Section listing owning assignment(s). |

## Notes

- No AI, no mock data, additive schema only.
- RLS OFF (project standard); authorization enforced at the application layer via `useLgAccess`.
- Backwards compatible — no existing route or service was removed.
