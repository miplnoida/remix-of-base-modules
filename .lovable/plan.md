
# EPIC-06C — Judicial Operations Completion & Cross-Module Integration

Goal: raise the Judicial lifecycle from 9.4 → 10.0 by embedding workflows, unifying timelines/notifications/SLA, and drilling liabilities everywhere. No new modules, no AI, no duplication.

I'll execute this in **6 sequenced phases** so each phase leaves the app typecheck-clean and shippable.

---

## Phase 1 — Foundations (config + shared services)

Small DB migration + shared TS services. Everything else in later phases consumes these.

**DB migration** (single migration):
- `lg_sla_policy` — configurable SLA rules (scope: ORDER_REVIEW, APPEAL_FILING, COMPLIANCE_REVIEW, COMPLIANCE_FOLLOWUP, BREACH_REVIEW, ENFORCEMENT_PREP, ORDER_CLOSURE, SETTLEMENT_REVIEW; hours, reminder_frequency_hours, escalation_level_1/2 hours, active). Seeded with current hardcoded defaults so existing behavior is preserved.
- `lg_notification_rule` — event → channels mapping (event_code, in_app, email, doc_queue, task_queue, template_code, recipients_json, active). Seeded for the 10 events listed in Part 6.
- `lg_document_template_registry` — resolves template codes (LG_COURT_ORDER, LG_JUDGMENT, LG_COMPLIANCE_NOTICE, LG_BREACH_NOTICE, LG_APPEAL_NOTICE, LG_ENFORCEMENT_NOTICE, LG_SETTLEMENT_LETTER, LG_RECOVERY_CLOSURE) to `core_template` when configured.

All three get GRANTs for `authenticated`/`service_role`, no RLS (matches project NO-RLS policy).

**New services** (all pure TS, no UI):
- `src/services/legal/lgSlaPolicyService.ts` — `getSlaHours(scope, fallback)`, cached via React Query.
- `src/services/legal/lgNotificationRuleEngine.ts` — `dispatch(eventCode, context)`; resolves rule, fans out to in-app (`in_app_notifications`), email (skipped if channel not configured — never throws), doc queue, task queue. Idempotent by `(event_code, source_id)`.
- `src/services/legal/lgTemplateRegistryService.ts` — `resolveTemplate(code)` returns `{ configured, templateId }`; UI shows "Template Not Configured" cleanly when not present.

**Refactor**:
- `lgJudicialAutomationService.ts` reads SLA hours from `lgSlaPolicyService` instead of literals.
- All existing `lg_case_activity` inserts routed through a single `logJudicialActivity()` helper (added to `lgUnifiedTimelineService`) to guarantee single-source events.

---

## Phase 2 — Embedded Draft Order + Court Ops synchronization (Parts 1, 8)

- New `src/components/legal/order/EmbeddedDraftOrderDrawer.tsx` — drawer opened from `HearingOutcomeDialog` when outcome is `ORDER_ISSUED` / `JUDGMENT_DELIVERED`.
- Prepopulates matter, hearing, court, judge, liabilities (from `lg_hearing_liability`), officer, order type, compliance due, appeal deadline (from SLA policy).
- Uses existing `lgJudicialOrderWorkbenchService.createOrder` + `LiabilityLinkDialog` internals — no duplicated create logic.
- On save: stays in hearing flow, invalidates hearing/matter/recovery/timeline query keys, fires `ORDER_CREATED` notification rule.
- Removes URL handoff fallback (kept as secondary "Open full editor" link).
- HearingOutcomeDialog wired to invalidate: `lg_case`, `lg_recoverable_liability`, `lg_recovery_workbench`, `lg_unified_timeline`, court dashboard keys, tasks. No manual refresh.

---

## Phase 3 — Liability drilldown + Recovery Workbench + Matter Workspace polish (Parts 2, 9, 10)

- Shared `src/components/legal/liability/LinkedLiabilityDrillRow.tsx` — expandable row rendering fund, period, principal/interest/penalty/costs, outstanding, recovery %, allocations, all four statuses, health, next action. Reuses `lgRecoveryHealth.ts` and `lgLiabilityService` — no new calculations.
- Wired into: `OrderLinkedLiabilitiesTab`, new `AppealLinkedLiabilitiesTab`, new `EnforcementLinkedLiabilitiesTab`, and Recovery Workbench child drawer.
- Recovery Workbench health inputs extended (already partially done in EPIC-06B.1): explicit inclusion of active orders, appeals, enforcement, compliance due/breach flags, high risk, recovery delay, next recommended action — sourced from `lgRecoveryHealth`.
- Matter Workspace header chips: Active Orders / Appeals / Enforcement / Compliance / Breaches (counts from existing services).
- Snapshot rail additions: upcoming deadlines, appeal deadline, compliance due, enforcement status, high-risk liabilities, linked orders, recent judicial activity (last 5 from unified timeline).

---

## Phase 4 — Command Centre judicial widgets + timeline + notifications wiring (Parts 3, 5, 6, 12)

- 12 new widgets on `LegalDashboard.tsx` / Command Centre, backed by a single `lgJudicialDashboardService.ts` (one aggregated query, cached). Every widget deep-links via URL filters into Orders/Appeals/Enforcement workbenches.
- Timeline normalization: audit every `lg_case_activity` insert site; route through `logJudicialActivity()` with a stable `(entity_type, entity_id, event_code)` dedupe key. `lgUnifiedTimelineService` extended to project events across Matter/Liability/Hearing/Order/Appeal/Enforcement/Audit timelines from the single source (no per-tab duplicate inserts).
- Every judicial mutation (create/edit/grant order, compliance event, appeal filed/decision, enforcement started/completed, payment allocated, liability updated, matter closed) fires:
  1. `logJudicialActivity()` (activity + timeline + audit),
  2. `lgNotificationRuleEngine.dispatch(eventCode, ctx)`.

---

## Phase 5 — Template rendering, permissions, performance, terminology (Parts 4 recap, 7, 11, 13, 14)

- Replace placeholder document buttons with `TemplateActionButton` that calls `lgTemplateRegistryService.resolveTemplate`; renders via existing template engine when configured, otherwise shows "Template Not Configured" tooltip and disables click.
- Terminology sweep: standardize on Matter/Order/Judgment/Appeal/Enforcement/Compliance/Recovery/Liability/Officer in judicial UI strings. Legacy "Case" labels retained only where the DB column is `lg_case` (schema unchanged).
- Permissions audit: extend `useLgAccess.ts` with `configureSlaPolicy`, `configureNotificationRule`, `configureTemplateRegistry`, `viewJudicialTimeline`. Admin role inherits all; documented in permission matrix.
- Performance:
  - Consolidate Order Detail / Matter Workspace / Recovery Workbench query keys; share cached liability rollups via a `useLgLiabilityRollup(caseId)` hook.
  - Lazy-load Appeals/Enforcement/Compliance tabs in Order Detail and Matter Workspace via `React.lazy`.
  - Remove redundant per-tab rollup fetches now that unified timeline + rollup hook exist.

---

## Phase 6 — Documentation + UAT + typecheck

- New: `docs/legal/EPIC-06C-JUDICIAL-INTEGRATION.md` covering embedded order flow, timeline rules, notification rules, SLA rules, liability integration, performance notes, known limitations, future extension points, and the three UAT scenarios (Compliance→Closure, Benefit Overpayment, Multi-liability Employer) with step-by-step expected results.
- Update EPIC-04, EPIC-05, EPIC-06A, EPIC-06B docs with cross-links to 06C sections.
- Final `bunx tsgo --noEmit` sweep; fix any regressions.

---

## Technical notes

- No RLS (project policy). All new public tables get explicit GRANTs.
- No mock data — SLA/notification/template rows are seeded from current defaults.
- Notification engine is fire-and-forget; email failures never break the mutation path.
- Timeline dedupe uses `(entity_type, entity_id, event_code, occurred_at)` unique index on `lg_case_activity` (added in Phase 1 migration, guarded by `ON CONFLICT DO NOTHING`).
- All query invalidations centralized in `src/services/legal/lgQueryKeys.ts` so cross-module refresh stays consistent.

---

## Deliverable per phase

Each phase ends with: files created, files modified, typecheck result. Phase 6 returns the full EPIC-06C summary (files, perf/timeline/notification improvements, remaining limitations).

## Open questions before I start

1. **Email channel**: use the existing project email pipeline (Resend via edge function) or leave email as "queued but not sent" until an admin wires a provider? I recommend the latter to avoid coupling this EPIC to email infra — safe fallback.
2. **Command Centre placement**: extend the existing `LegalDashboard.tsx` with a "Judicial Operations" section, or create a dedicated `/legal/judicial-dashboard` route? I recommend extending the existing dashboard so users see one command centre.
3. **Sequencing**: OK to ship phase-by-phase (each phase merges independently and stays typecheck-clean), or do you want the whole EPIC in one push?

Reply with answers (or "go with your recommendations") and I'll start with Phase 1.
