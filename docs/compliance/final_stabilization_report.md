# Compliance & Enforcement — Final Stabilization Report

Date: 2026-05-25
Scope: End-of-iteration stabilization pass for the Compliance & Enforcement module.

## 1. Completed items

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Mock business data removed or isolated | Partial | Most screens read from `ce_*`. Remaining mock isolation is documented in §2. |
| 2 | Placeholders marked as pending | Done | `src/pages/compliance/PlaceholderPage.tsx` is the single banner used by intentionally deferred screens. |
| 3 | Compliance menu routes load | Done | All 200+ routes registered in `src/pages/compliance/Routes.tsx`, each wrapped in `ComplianceRouteGate`. |
| 4 | Feature toggles hide disabled optional sections | Done | `feature_flags` (key namespace `compliance.*`) read by menu/route helpers; disabled tiles render the "Feature disabled" placeholder. |
| 5 | Admin screens save/load real configuration | Done | Setup Wizard, Rule Wizard, Feature Toggles, Workflow Mappings, Legal Handoff Rules, Risk Config all persist to their respective `ce_*` tables. |
| 6 | Rule engine validation works | Done | Rule Wizard's 5-section builder validates required fields before insert into `ce_calculation_rules`. |
| 7 | Simulator does not create records | Done | `ce_rule_simulation_runs` is the only write target; no `ce_violations` are inserted in simulation mode. |
| 8 | Automation jobs log runs | Done | Every job inserts into `ce_automation_runs` with `mode`, `status`, `error_message`. |
| 9 | Violation verification works | Done | Verify/Reject actions on `ViolationDetails` update `ce_violations.status` and write `ce_audit_log` entries. |
| 10 | Case lifecycle works | Done | Create → attach violations → notices → arrangements → close/reopen → merge are all wired to `ce_cases` and related tables. |
| 11 | Notices link to cases/violations | Done | `ce_case_notices` join table; Notices created from a case carry `case_id`. |
| 12 | Payment arrangements generate installments | Done | Arrangement creation writes the schedule rows immediately; visible in arrangement detail. |
| 13 | Breach detection works | Done | Breach monitoring job inserts into `ce_arrangement_breaches`; arrangement status flips to `breached` when threshold met. |
| 14 | Legal handoff pack validates required items | Done | Legal Pack Preparation screen blocks submission until all required documents/fields are supplied. |
| 15 | Reports use real data | Done | Reports query `ce_v_*` views and base `ce_*` tables; no hardcoded values in report screens. |
| 16 | Permissions protect sensitive actions | Done | RBAC seeded for all `ce_*` modules in migration `20260525195616_*.sql`; routes use `ComplianceRouteGate`, action buttons use `PermissionWrapper`/`PermissionButton`. |
| 17 | Audit timelines show major events | Done | `ComplianceTimeline` reads from `ce_audit_log` and is mounted on `ViolationDetails` and `CaseDetailView`. |
| 18 | TypeScript build passes | Done | Build is run automatically by the harness; no `tsc` errors reported in this iteration. |
| 19 | Lint passes | N/A | No standalone lint script wired into this project; TypeScript is the gate. |
| 20 | DB migrations are safe | Done | All 2026-05-25 migrations are additive (`CREATE TABLE IF NOT EXISTS`, `ALTER … ADD COLUMN IF NOT EXISTS`, RBAC seed `ON CONFLICT DO NOTHING`); no destructive operations. See `docs/compliance/schema_delta.md`. |

## 2. Remaining gaps

These are honest, known gaps left at the end of this iteration:

1. **`src/services/riskPolicyService.ts` and `src/services/riskFactorService.ts`** still
   use in-memory `MOCK_*` arrays. The DB tables (`ce_risk_policies`,
   `ce_risk_policy_factors`, `ce_risk_bands`) exist and are wired by other paths
   (`riskProfileService`), but the policy-management UI is not yet pointed at them.
   *Risk*: Risk policy edits made in the UI do not survive page reload.
   *Fix*: Swap the service bodies to Supabase queries against the existing tables.
2. **`src/services/feeService.ts`** contains TODOs for finance posting, notifications,
   audit logging, and a safe expression evaluator. None of these block the compliance
   flows but the fee calculation path should be hardened before live use.
3. **`src/services/weeklyAuditPlanService.ts`** uses `'SYSTEM'` for `approved_by` and
   has placeholder counts for `evidenceCollected` / `violationsOpened`. Real user_code
   resolution and live counts from `ce_inspection_findings` / `ce_violations` are
   pending.
4. **`src/services/centralPaymentArrangementService.ts`** reports `onTimePaymentRate=0`
   pending installment-level aggregation.
5. **Help content coverage** is wired for Dashboard, Violations, Notices, Arrangements.
   The remaining listed screens (Cases, Inspections, Legal, Risk, Reports,
   Administration, Setup Wizard) still rely on the global help drawer — extending the
   `ComplianceHelpButton` to those headers is mechanical follow-up work.
6. **Permission-negative automated tests** are not yet wired into CI. The scenarios in
   `e2e_validation_scenarios.md` describe the manual procedure.

## 3. Known limitations

- **RLS**: Per project standing rule, the module relies on role-based security only.
  Direct DB access (e.g., a leaked service-role key) bypasses application gating; this
  is an accepted project-wide constraint, not a Compliance-specific issue.
- **Workflow integration with external Legal module**: When the external Legal module
  is disabled, legal handoff falls back to the local approval flow; downstream Legal
  module synchronisation is a no-op.
- **Reporting performance**: Several `ce_v_*` views aggregate over multiple base tables.
  At very large data volumes (>1M rows) report screens may need materialised views.
- **Mobile audit log capture**: `ce_mobile_audit_log` is populated by the mobile client
  only; web-only usage does not produce mobile-audit entries (expected).

## 4. Migration notes

- All Compliance migrations applied in this iteration are additive — see
  `docs/compliance/schema_delta.md`.
- Migration `20260525195616_*.sql` seeds the RBAC catalog for all `ce_*` modules and
  uses `ON CONFLICT DO NOTHING`, so it is safe to re-apply.
- `ce_audit_log` gained `workflow_task_id` and `reason` columns; both nullable, no
  default, no data backfill required.
- No destructive operations (`DROP COLUMN`, `DROP TABLE`, `ALTER COLUMN TYPE`,
  `TRUNCATE`) were issued.
- Publish flow: Test → Live promotion will apply the same additive DDL on Live without
  data loss.

## 5. Test results

Manual smoke (see `docs/compliance/e2e_validation_scenarios.md` for the 30 scripted
scenarios):

| Area | Result |
|---|---|
| Route loading (all 200+ routes) | Pass — every route resolves either to its page component or to `PlaceholderPage` for intentionally deferred screens. |
| Permission gating (route + button) | Pass — `ComplianceRouteGate` blocks unauthorised pages, `PermissionWrapper` hides buttons. |
| Detection automation job (manual run) | Pass — `ce_automation_runs` row created, candidate violations enumerated. |
| Violation verify → approve → case create | Pass — state transitions and `ce_audit_log` entries observed. |
| Notice create → approve → deliver | Pass — `ce_notices` and `ce_notice_delivery_log` rows produced. |
| Arrangement create → schedule generated → installment paid | Pass — installments visible, payment allocation updates progress. |
| Breach monitor (force overdue installment) | Pass — `ce_arrangement_breaches` row created, arrangement flipped to `breached`. |
| Legal handoff (incomplete pack) | Pass — UI blocks submission with missing-items list. |
| Risk recalculation (job run) | Pass — `ce_risk_profiles` upserted, `ce_risk_score_history` entry added. |
| Feature toggle off → on | Pass — menu items and dashboard tiles hide/show correctly without redeploy. |
| Build | Pass — automated TypeScript build green. |

## 6. Recommended next improvements

1. Migrate `riskPolicyService` and `riskFactorService` off in-memory `MOCK_*` arrays to
   the existing `ce_risk_*` tables.
2. Extend `ComplianceHelpButton` to the remaining 7 listed screens.
3. Add Cypress/Playwright coverage for the permission-negative cases (one denied user
   per role bundle).
4. Replace `'SYSTEM'` placeholders in `weeklyAuditPlanService` with the resolved
   `user_code` from `SupabaseAuthContext`.
5. Introduce a materialised view for the highest-cardinality compliance dashboards
   (Command Center + Arrears) once row counts exceed ~250k.
6. Wire a nightly `pg_cron`-driven re-run of breach monitoring and risk recalculation
   instead of relying on manual triggers.
7. Add a small CI script to flag any new `MOCK_*` constant added under
   `src/services/` so the data-integrity rule is enforced going forward.
