
# Compliance & Enforcement — Restructure & Test Plan

This is a large, multi-phase change. To keep it safe (and to avoid one giant unreviewable commit), I propose splitting into **6 sequential deliveries**. You approve the plan once; I then ship the deliveries one at a time, you sanity-check after each.

---

## Delivery 1 — Menu reorganization (DB-driven sidebar)

Single migration that rewrites `app_modules` rows under the Compliance parent into the 9 target sections:

```text
Compliance
├── 1. Workbench      (My Work, Team Queues, Manager/Inspector/Monitoring/Analytics Dashboards)
├── 2. Employer Compliance (360, Ledger, Arrears, Risk Profile, History)
├── 3. Violations     (Detection, Verification Queue, Manual Entry, Management, Duplicate/Merge)
├── 4. Cases          (Management, Queue, Families/Grouping, Penalty Management)
├── 5. Field & Audit  (Plans, My Plans, Inspections, Findings, Visit Workspace, Audit Reports, Weekly Reports)
├── 6. Recovery       (Notices, Payment Arrangements, Breach Monitoring, Waivers/Overrides)
├── 7. Legal Escalation (Recommendation Queue, Referral Wizard, Pack Generation, Status, Outcome Tracking)
├── 8. Reports        (C3, Arrears, Arrangements, Legal, Inspector Perf, Trends)
└── 9. Admin          (Rules & Policies, Staff & Queues, Geography, Templates, Automation, Ledger Config, Tools)
```

Each leaf gets a `route`, `icon`, `sort_order`, and `role_permissions` (view) for Admin + ComplianceOfficer + Manager + Supervisor + Inspector (scoped per section). Missing-but-target items get **placeholder routes** (`/compliance/<area>/<slug>`) that render a "Coming in Delivery N" stub so the menu is complete day-one.

## Delivery 2 — Screen catalog (`docs/compliance/SCREEN_CATALOG.md`)

For every one of the ~45 screens, a row with: purpose · primary role · source tables/views · required filters · optional filters · actions · upstream screen · downstream links · test data needed · expected result. This becomes the source of truth driving Deliveries 3–6.

## Delivery 3 — Filter & mock-data cleanup

Per the catalog, sweep every Compliance page:

- Remove blocking pre-filters (mandatory office/zone/officer/status that hide test employers).
- Default each list to "last 90 days, all offices, all statuses" with debounced search.
- Replace hardcoded arrays (officers, queues, statuses, penalty rows, reassignment lists) with Supabase reads against existing `ce_*` tables.
- Tag any unavoidable demo screen with a visible `DemoOnlyBanner`.

## Delivery 4 — Screen link graph (Employer 360 as the hub)

Wire the cross-screen navigation exactly as you specified:

- **Employer 360** gets tabbed/linked buttons → Ledger · Arrears · Violations · Cases · Arrangements · Notices · Legal Referrals · Inspection History (all keyed by `regno`).
- **Violation detail** → employer · detection rule · grouped case · notices · documents · follow-ups.
- **Case detail** → employer · violations · penalties · notices · arrangement · legal referral.
- **Payment Arrangement detail** → employer ledger · case · legal case · schedule · receipts/allocations · breach history.
- **Legal Referral detail** → case · employer · ledger snapshot · documents · legal intake/case.

All links use `regno` for employer keys (consistent with the recent ledger realignment).

## Delivery 5 — Fill the known functional gaps

Replace mock-heavy or missing pieces with real implementations backed by existing `ce_*` tables (no new schema unless unavoidable):

| Gap | Resolution |
|---|---|
| Verification Queue (missing) | New page reading `ce_violations` where `status='detected'` + bulk verify/reject |
| Duplicate / Merge Review | Uses `ce_case_merge_rules` + `ce_case_merge_history` |
| Case Families / Grouping | Uses `ce_case_families` |
| Penalty Management (mock) | Uses `ce_penalty_calculations` |
| Breach auto-action (incomplete) | Hook into `ce_arrangement_breaches` + `ce_breach_monitoring` |
| Legal Pack Generation (gap) | Uses `ce_legal_pack_items` + `core_generated_document` |
| Payment Reconciliation (basic) | Uses `ce_payment_allocations` + `ce_reconciliation_exceptions` |

Anything that genuinely needs a new column/table I will surface as a separate migration with approval before running it.

## Delivery 6 — End-to-end test data + verification

Seed (tagged `SEED-`) 5 test employers covering all flows:

1. `SEED-COMP-001` Fully compliant
2. `SEED-COMP-002` Missing C3
3. `SEED-COMP-003` Underpaid
4. `SEED-COMP-004` Active arrangement
5. `SEED-COMP-005` Defaulted arrangement + legal referral

Then run a Playwright pass against the live preview that walks Flows A–E and asserts each Employer 360 tab loads, the right counts appear, and the link-graph navigation works. Output a short pass/fail report.

---

## What I will NOT do without separate approval

- Drop or rename existing `ce_*` tables.
- Change role/permission semantics beyond granting the new menu items.
- Delete legacy compliance pages — they get unlinked from the menu first, removed only after Delivery 6 passes.

## Open question before I start Delivery 1

The current sidebar has two parallel Compliance trees from earlier work (the older flat list + the partial reorg). **Do you want me to wipe the existing Compliance branch in `app_modules` and rebuild it cleanly, or preserve current IDs and reparent/rename in place?** Clean rebuild is simpler and faster; reparent preserves any external bookmarks to module IDs (rare).

Reply with "clean rebuild" or "reparent" and I'll start Delivery 1.
