# Continue CE Workflow Engine Rollout — Remaining Entities

The foundation (RPC `ce_apply_status_transition`, `ceWorkflowStatusService`, `useCeStatusActions`, `StatusActionBar`, workflow_steps from→to columns, Violations migrated) is live. This plan covers the remaining entities and hardening.

## Scope

Migrate every direct `.update({ status })` on CE entities to flow through `requestTransition()` / `ce_apply_status_transition`, seed the workflow catalog for each, and add safety rails.

## Entities to migrate (in order)

1. **Cases** (`ce_cases`) — `case.status.*` events: `START_REVIEW`, `ASSIGN`, `ESCALATE`, `RESOLVE`, `CLOSE`, `REOPEN`. Refactor `caseLifecycleService`, `CaseDetails` action buttons. Omit `CLOSED → OPEN` (only via explicit `REOPEN` with reason).
2. **Notices** (`ce_notices`) — `notice.status.*`: `SEND`, `ACKNOWLEDGE`, `RESPOND`, `CANCEL`, `EXPIRE`. Refactor `noticeService`, notice detail/list actions, and the `ce-send-notice` edge function.
3. **Inspections** (`ce_inspections`) — `inspection.status.*`: `SCHEDULE`, `CHECK_IN`, `START_FIELDWORK`, `SUBMIT_FINDINGS`, `COMPLETE`, `CANCEL`. Refactor `inspectionLifecycleService` and mobile check-in flow.
4. **Payment Arrangements** (`ce_payment_arrangements`) — `arrangement.status.*`: `SUBMIT_FOR_APPROVAL`, `APPROVE`, `REJECT`, `ACTIVATE`, `COMPLETE`, `DEFAULT`, `CANCEL`. Refactor `arrangementService`, approval screens.
5. **Arrangement Breaches** (`ce_arrangement_breaches`) — `breach.status.*`: `ACKNOWLEDGE`, `CURE`, `RESOLVE`, `ESCALATE`.
6. **Waiver Requests** (`ce_waivers`) — `waiver.status.*`: `SUBMIT`, `APPROVE`, `REJECT`, `WITHDRAW`.
7. **Legal Escalations / Referrals** (`ce_legal_escalations`, `ce_legal_referrals`) — `legal.status.*`: `REFER`, `ACCEPT`, `RETURN`, `CLOSE`. Coordinate with existing Legal handoff rules.

## Per-entity work pattern

For each entity:
- Add event keys to `COMPLIANCE_EVENT_KEYS` in `complianceWorkflowMappingService.ts`.
- Add `workflow_steps` rows (from_status → result_status_on_complete / on_reject) seeded inside the "CE Status — Trivial Transitions" workflow_definition, or a per-entity definition if action sets diverge.
- Add default `ce_workflow_mappings` rows (`enabled=false`, `fallback_behavior='DIRECT_APPLY'`).
- Extend `ce_apply_status_transition` RPC's entity dispatch to support the new `p_entity_type` + write to the corresponding `*_history` table.
- Refactor service + detail page to use `useCeStatusActions` + `<StatusActionBar>`. Delete any in-file transition matrices.
- Remove unsafe UI actions that represent disallowed backward transitions (mirroring the Violations "Return to Open" fix).

## Hardening (after entity migrations)

8. **Repo-wide lint** — `scripts/lint-no-direct-ce-status.ts`: fails CI if any file outside the RPC/service writes `ce_*.status`. Run in `package.json` `lint` script.
9. **Workflow Step editor UI** — extend the existing Workflow Designer step form with `from_status`, `result_status_on_complete`, `result_status_on_reject` selectors (entity-aware dropdown populated from each entity's status enum). Admin-only.
10. **Audit verification** — spot-check `system_audit_trail` + each `*_history` table to confirm every transition writes both rows with `user_code`, `from_status`, `to_status`, `action_code`, `notes`.

## Sequencing

Suggested order of build turns (each one independently reviewable):
- Turn A: Cases + Notices (highest user-facing impact)
- Turn B: Inspections + Mobile flows
- Turn C: Payment Arrangements + Breaches + Waivers
- Turn D: Legal Escalations + Referrals
- Turn E: Lint script + Workflow Designer step editor UI

## Out of scope (unchanged)

- No new admin UI beyond extending existing Workflow Designer step form.
- No emergency override.
- Maker-checker, approval gates, capability bundles, dashboards continue to read `ce_*.status` unchanged.
- `ce_investigations` / `ce_appeals` / `ce_enforcement_actions` stay folded into `ce_cases` / `ce_violations`.

## Confirm before I start

1. Proceed with **Turn A (Cases + Notices) first**, or a different entity priority?
2. Keep all transitions inside the single "CE Status — Trivial Transitions" workflow_definition, or split per entity (e.g., "CE Cases Workflow", "CE Notices Workflow") so admins can clone/customize per entity?
3. Any backward transitions you explicitly want **kept** (e.g., Notice `SENT → DRAFT` for corrections) or explicitly **removed** beyond the Violations `UNDER_REVIEW → OPEN` fix?
