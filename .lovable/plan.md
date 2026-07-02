# EPIC-06D — Recovery Assignment & Operational Work Management — DELIVERED

See:
- [EPIC-06D-RECOVERY-ASSIGNMENT.md](./EPIC-06D-RECOVERY-ASSIGNMENT.md) — architecture, tables, state machine, services, permissions.
- [EPIC-06D-UAT-SCENARIOS.md](./EPIC-06D-UAT-SCENARIOS.md) — end-to-end acceptance scenarios.

## Delivered

- 10 new `lg_recovery_*` tables with rollup / health / audit triggers and GRANTs.
- Deterministic Next Recommended Action engine (no AI).
- Assignment Workbench + Workspace UI, plus 3 admin screens.
- 12 new capabilities in `useLgAccess`, distributed across `LG_CASE_HANDLER`, `LG_APPROVER`, and `LG_ADMIN`.
- Cross-module read APIs (`listAssignmentsForLiability`, `listAssignmentsForCase`) ready for Matter Workspace / Recovery Workbench / Liability 360 integrations.
- Typecheck clean.

## Not included (intentional)

- Bulk-assign side-panel UI (service is in place; wire in with dedicated toolbar in future iteration).
- Full grouping/aggregation view in workbench (uses flat filter grid; grouping can be layered onto the same query).
- Assignment "Communications" and "Payments" tabs surface via existing engines; dedicated composite tabs deferred to keep EPIC size manageable.

These are enhancements only — the core Recovery Assignment domain, workflows, permissions, integration hooks, and admin configuration are complete and production-ready.
