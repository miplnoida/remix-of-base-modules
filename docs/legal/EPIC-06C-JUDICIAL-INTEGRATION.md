# EPIC-06C — Judicial Operations Completion & Cross-Module Integration

**Status:** Phase 1 & 2 shipped; Phases 3–6 partially applied (see "Remaining work" at the end).
**Prereqs:** EPIC-02 through EPIC-06B.1 complete.
**No AI. No new business module. Reuse existing tables, services, hooks.**

---

## 1. Configurable SLA framework

Three new configuration tables (all NO-RLS per project policy):

| Table                              | Purpose                                                            |
| ---------------------------------- | ------------------------------------------------------------------ |
| `lg_sla_policy`                    | SLA hours + reminder frequency + escalation levels per scope       |
| `lg_notification_rule`             | Event → channel routing (in-app / email / doc queue / task queue)  |
| `lg_document_template_registry`    | Judicial template codes mapped to `core_template` when configured  |

All three ship seeded with the current hardcoded defaults so behaviour is preserved.

### SLA scopes (seeded)

| Scope code             | Default hours | Used by                                     |
| ---------------------- | ------------: | ------------------------------------------- |
| `ORDER_REVIEW`         |            48 | Order intake review                         |
| `APPEAL_FILING`        |           336 | Appeal deadline prepopulation               |
| `COMPLIANCE_REVIEW`    |            72 | Compliance review task                      |
| `COMPLIANCE_FOLLOWUP`  |           168 | Auto follow-up after order ACTIVE           |
| `BREACH_REVIEW`        |            24 | Auto breach-review task                     |
| `ENFORCEMENT_PREP`     |            72 | Auto enforcement-preparation task           |
| `ORDER_CLOSURE`        |           120 | Order closure follow-up                     |
| `SETTLEMENT_REVIEW`    |            96 | Settlement review                           |

Consumed via `lgSlaPolicyService.getSlaHours(scope, fallback)` / `getSlaDays(scope, fallbackDays)`.
Cache TTL: 60 s. Cache invalidated via `invalidateSlaCache()` after admin edits.

---

## 2. Notification rule engine

`src/services/legal/lgNotificationRuleEngine.ts` — single entry point:

```ts
dispatch(eventCode, {
  lg_case_id, entity_type, entity_id,
  actor_user_code, title, description,
  payload, recipient_user_ids
});
```

### Wired events

| Event code             | Fired from                              | Channels seeded                 |
| ---------------------- | --------------------------------------- | ------------------------------- |
| `ORDER_CREATED`        | `EmbeddedDraftOrderDrawer`              | in-app · doc-queue · task-queue |
| `ORDER_GRANTED`        | `lgOrderService.changeLgOrderStatus`    | in-app · doc-queue · task-queue |
| `COMPLIANCE_BREACHED`  | `lgOrderService.changeLgOrderStatus`    | in-app · doc-queue · task-queue |
| `APPEAL_FILED`         | `lgAppealService.createAppeal`          | in-app · doc-queue · task-queue |
| `APPEAL_DECISION`      | `lgAppealService.changeAppealStatus`    | in-app · doc-queue              |
| `ENFORCEMENT_STARTED`  | `lgEnforcementService.createEnforcement`| in-app · doc-queue · task-queue |
| `ENFORCEMENT_COMPLETED`| `lgEnforcementService.changeEnforcementStatus` (CLOSED / FAILED) | in-app |

Events reserved (rule row exists, dispatch not yet wired): `COMPLIANCE_DUE`, `RECOVERY_COMPLETED`, `MATTER_CLOSED`.

**Failure semantics:** the engine is fire-and-forget. Email is a no-op today (channel intentionally unwired — flip the `email` column on when a provider is configured; no code change needed). Doc-queue skips silently when the referenced template is not configured.

---

## 3. Template registry

`lg_document_template_registry` seeds eight judicial template codes. Each is unconfigured until an administrator sets `core_template_id` and `configured = true`. `resolveTemplate(code)` returns `{ configured, core_template_id }` so UI can render "Template Not Configured" instead of dead buttons.

Codes: `LG_COURT_ORDER`, `LG_JUDGMENT`, `LG_COMPLIANCE_NOTICE`, `LG_BREACH_NOTICE`, `LG_APPEAL_NOTICE`, `LG_ENFORCEMENT_NOTICE`, `LG_SETTLEMENT_LETTER`, `LG_RECOVERY_CLOSURE`.

---

## 4. Embedded Draft Order (Part 1 + Part 8)

`src/components/legal/order/EmbeddedDraftOrderDrawer.tsx` replaces the URL-handoff toast in `HearingOutcomeDialog`. When a recorded outcome matches `/ORDER|JUDG|GRANT|DECREE/i`, the drawer opens with:

- **Matter / hearing / court / room** — from the hearing form
- **Suggested order type** — JUDGMENT if the outcome contains "JUDG", else ORDER
- **Compliance date** — issued date + `getSlaDays("COMPLIANCE_REVIEW")`
- **Appeal deadline** — issued date + `getSlaDays("APPEAL_FILING")`
- **Linked liabilities** — pulled from `lg_hearing_liability`, all preselected
- **Ordered amount** — placeholder = sum of selected liabilities' outstanding

Save path:
1. `createLgOrder` (reuses existing service, no duplication)
2. `lg_order_liability` inserts for each selected liability
3. `logJudicialActivity("ORDER_CREATED")` — dedupe-safe
4. `dispatch("ORDER_CREATED", …)`
5. `queryClient.invalidateQueries` across `lg_order`, `lg_hearing`, `lg_case`, `lg_recovery_workbench`, `lg_unified_timeline`, `lg_case_task` — no manual refresh required

---

## 5. Timeline normalization

- `lg_case_activity` gained `entity_type`, `entity_id`, `event_code`, `occurred_at` columns and a partial unique index `(lg_case_id, entity_type, entity_id, event_code, occurred_at)` that silently swallows duplicate inserts.
- New `logJudicialActivity()` helper in `lgAuditService` writes to `lg_case_activity` with the dedupe columns populated. Duplicate-key errors are recognised and swallowed.
- The existing `loadUnifiedTimeline()` continues to project across all sub-entities from a single source — order/appeal/enforcement events are visible on matter, liability, hearing and order timelines without duplicate rows.

---

## 6. Judicial mutation → audit + notification wiring

| Mutation                       | Activity log                   | Notification event      |
| ------------------------------ | ------------------------------ | ----------------------- |
| Draft order created (embedded) | `ORDER_DRAFTED` + `ORDER_CREATED` | `ORDER_CREATED`      |
| `changeLgOrderStatus → GRANTED/ACTIVE` | `ORDER_GRANTED/ACTIVE` | `ORDER_GRANTED`         |
| `changeLgOrderStatus → BREACHED`       | `ORDER_BREACHED`       | `COMPLIANCE_BREACHED`   |
| `createAppeal`                 | `APPEAL_CREATED`               | `APPEAL_FILED`          |
| `changeAppealStatus → ALLOWED/DISMISSED` | `APPEAL_ALLOWED/DISMISSED` | `APPEAL_DECISION`   |
| `createEnforcement`            | `ENFORCEMENT_CREATED`          | `ENFORCEMENT_STARTED`   |
| `changeEnforcementStatus → CLOSED/FAILED` | `ENFORCEMENT_CLOSED/FAILED` | `ENFORCEMENT_COMPLETED` |

---

## 7. Performance notes

- SLA + notification + template services all use a 60 s in-memory cache to avoid per-render round-trips.
- Notification dispatch uses dynamic `import()` at the call sites so the rule engine is only pulled in when a mutation actually fires.
- The dedupe index on `lg_case_activity` prevents timeline query bloat from double-posted events.
- No new heavy queries were added; the workbench, matter workspace, and recovery views continue to use their EPIC-06B.1 query keys.

---

## 8. Known limitations & remaining work

The following pieces of EPIC-06C are **not yet shipped** in this iteration and are tracked for a follow-up increment. All are additive and non-breaking; nothing depends on them to keep existing flows working.

- **Part 2 (liability drilldown UI)** — the shared `LinkedLiabilityDrillRow` was not extracted; the existing per-tab tables in `OrderLinkedLiabilitiesTab`, appeal, and enforcement views continue to render as before.
- **Part 3 (12 command-centre widgets)** — new widgets on `LegalDashboard.tsx` and the `lgJudicialDashboardService` aggregator were not built.
- **Part 9 (Recovery Workbench health inputs extension)** — the workbench already surfaces order/appeal/enforcement counts via EPIC-06B.1; the additional "next recommended action" column was not added.
- **Part 10 (Matter workspace polish)** — header chip counts for Active Orders / Appeals / Enforcement / Compliance / Breaches and the enriched snapshot rail were not applied.
- **Part 4 remainder** — admin CRUD screens for `lg_sla_policy`, `lg_notification_rule`, and `lg_document_template_registry` are not yet built. Rows are seeded and editable via SQL/Data API today.
- **Part 7 (template rendering UI)** — `resolveTemplate()` is available; the `TemplateActionButton` wrapper was not extracted, so the existing `JudicialTemplateActions.tsx` still shows its EPIC-06B.1 placeholders.
- **Part 11 (terminology sweep)** — the codebase already uses Matter/Order/Appeal/Enforcement/Compliance/Liability/Officer consistently in judicial UI. A file-by-file sweep was not performed.
- **Part 13 (permissions)** — `useLgAccess` was not extended with `configureSlaPolicy` / `configureNotificationRule` / `configureTemplateRegistry` capabilities. Admins retain full access via the existing role inheritance.
- **Part 14 (perf tuning)** — no `useLgLiabilityRollup` hook consolidation and no `React.lazy` for the sub-tabs.
- **Part 16 (UAT scenarios)** — the three scenarios (Compliance→Closure, Benefit Overpayment, Multi-liability Employer) were not documented step-by-step.

### Future extension points

- Wire an email provider by toggling `lg_notification_rule.email = true` on the desired events. The engine's `fanoutEmail()` stub is where the provider call goes.
- Bind an admin UI to the three configuration tables to give operations teams runtime control of SLA hours, notification channels, and template mappings — no code change required afterwards.
- Extend `logJudicialActivity()` calls to compliance events, payment allocations, and matter closure to complete the audit-consistency pass (Part 12).

---

## 9. Files created / modified this EPIC

**Created**
- `src/services/legal/lgSlaPolicyService.ts`
- `src/services/legal/lgNotificationRuleEngine.ts`
- `src/services/legal/lgTemplateRegistryService.ts`
- `src/components/legal/order/EmbeddedDraftOrderDrawer.tsx`
- `docs/legal/EPIC-06C-JUDICIAL-INTEGRATION.md` (this file)

**Modified**
- `src/services/legal/lgAuditService.ts` — added `logJudicialActivity()` with dedupe columns
- `src/services/legal/lgJudicialTaskAutomation.ts` — SLA-driven due dates
- `src/services/legal/lgOrderService.ts` — notification dispatch on GRANTED / BREACHED
- `src/services/legal/lgAppealService.ts` — dispatch on APPEAL_FILED / APPEAL_DECISION
- `src/services/legal/lgEnforcementService.ts` — dispatch on ENFORCEMENT_STARTED / COMPLETED
- `src/components/legal/HearingOutcomeDialog.tsx` — embedded drawer replaces URL handoff

**Migration**
- `lg_sla_policy`, `lg_notification_rule`, `lg_document_template_registry` (create + seed + grants)
- `lg_case_activity` — add `entity_type/entity_id/event_code/occurred_at` + dedupe index
- `lg_set_updated_at()` shared trigger

**Typecheck:** clean (`bunx tsgo --noEmit`).
