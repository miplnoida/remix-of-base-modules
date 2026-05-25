# Compliance & Enforcement — End-to-End Validation Scenarios

Date: 2026-05-25
Audience: QA engineers and developers exercising the Compliance module.

## How to use this document

- All scenarios assume the **existing RBAC chain** (`app_modules` → `module_actions` →
  `role_permissions` → `user_roles`) governs access. No role names are hard-coded; test
  by *permission*, not by login name.
- "Workflow triggered" refers to records in `workflow_tasks` / `workflow_instances`
  produced via the standard workflow engine.
- "Audit entries" refers to rows written to `ce_audit_log` (via
  `complianceAuditService.logAudit`) unless otherwise stated.
- "Reports affected" lists views/dashboards whose counts must change after the scenario.
- "Feature disabled" tests reference toggles in `feature_flags` (key namespace:
  `compliance.*`) and activation flags in `ce_settings` (`category='setup'`).

Test data conventions: all seed records use the `SEED-` prefix per project standing rule.

---

## 1. Late C3 filing detection

- **Preconditions**: Employer `SEED-ER-001` active; C3 for period `2026-04` not filed;
  `feature_flags.compliance.late_filing_detection.is_enabled = true`; detection rule
  active in `ce_detection_rules`.
- **Steps**:
  1. Run the late-filing automation job from Admin → Automation Jobs.
  2. Observe `ce_automation_runs` row created with status `running` → `completed`.
- **Expected result**: One `ce_violations` row created with `violation_type='LATE_FILING'`,
  `status='detected'`, linked to `SEED-ER-001`.
- **Data created/updated**: `ce_violations`, `ce_automation_runs`, `ce_violation_history`.
- **Workflow triggered**: Violation verification workflow (per
  `ce_workflow_mappings.entity='violation'`).
- **Audit entries**: `entity_type='violation'`, `action='created'`, `performed_by='SYSTEM'`.
- **Reports affected**: `ce_v_violation_trends`, Command Center "New Violations" tile.

## 2. Unpaid contribution after filing

- **Preconditions**: C3 for `SEED-ER-001` filed for `2026-04` but `pending_amount > 0`
  on payment ledger; detection rule `UNPAID_CONTRIBUTION` active.
- **Steps**: Run unpaid-contribution detection job; inspect Violations Register.
- **Expected result**: Violation row with `violation_type='UNPAID_CONTRIBUTION'`,
  amount equal to ledger pending amount.
- **Data**: `ce_violations`, `ce_employer_financial_ledger` referenced.
- **Workflow**: Verification workflow.
- **Audit**: violation `created` entry.
- **Reports**: `ce_v_employer_payment_status`, Arrears report.

## 3. Short / partial payment

- **Preconditions**: C3 filed amount = 1000; payment posted = 600;
  `ce_payment_allocations` shows shortfall.
- **Steps**: Run short-payment detection.
- **Expected result**: Violation `SHORT_PAYMENT` with `amount=400`; allocation row
  flagged `is_short=true`.
- **Data**: `ce_violations`, `ce_payment_allocations`.
- **Workflow**: Verification.
- **Audit**: violation `created`; allocation `updated` if recalculated.
- **Reports**: `ce_v_payment_reconciliation_exceptions`.

## 4. Duplicate violation detection

- **Preconditions**: Open violation already exists for employer/period/type.
- **Steps**: Trigger detection job again; check `ce_violation_grouping_decisions`.
- **Expected result**: New violation **not** inserted; a grouping decision row written
  with `decision='duplicate_suppressed'` referencing the prior violation.
- **Data**: `ce_violation_grouping_decisions`.
- **Workflow**: None (suppressed).
- **Audit**: `entity_type='violation'`, `action='duplicate_suppressed'`.
- **Reports**: Duplicate counter on Command Center.

## 5. Manual violation from officer

- **Preconditions**: Logged-in user holds `ce_manual_violation_entry:create`.
- **Steps**: Navigate to Violations → Manual Entry → submit form.
- **Expected result**: Violation persisted with `source='manual'`, `created_by=user_code`.
- **Data**: `ce_violations`, optional `ce_violation_notes`.
- **Workflow**: Verification workflow.
- **Audit**: `created`, `performed_by=user_code`.
- **Reports**: Officer activity dashboard.
- **Negative test**: User without permission sees disabled button and gets 403 on direct
  service call.

## 6. Inspection finding → violation

- **Preconditions**: Inspection report exists in `ce_audit_report_entries` with a
  finding marked "convert to violation".
- **Steps**: From inspection detail, click "Create Violation" (gated by
  `ce_violations:create`).
- **Expected result**: New violation linked to inspection via
  `ce_audit_prior_matter_links`.
- **Data**: `ce_violations`, `ce_audit_prior_matter_links`.
- **Workflow**: Verification workflow.
- **Audit**: `created` with `description='Converted from inspection finding <id>'`.
- **Reports**: Inspection-to-violation conversion KPI.

## 7. Violation verification approval

- **Preconditions**: Violation in `status='detected'`; verification task assigned to
  current user; user holds `ce_violations:approve`.
- **Steps**: Open Verification Queue → Approve.
- **Expected result**: Violation `status='verified'`; workflow task completed.
- **Data**: `ce_violations`, `workflow_tasks`.
- **Workflow**: Verification task completes; case-creation/attach workflow may start.
- **Audit**: `action='approved'`, `workflow_task_id` populated.
- **Reports**: Pending verification queue drops by 1.

## 8. Violation rejected as invalid

- **Preconditions**: Same as #7; user holds `ce_violations:reject`.
- **Steps**: Reject with mandatory `reason`.
- **Expected result**: `status='rejected'`; reason captured.
- **Audit**: `action='rejected'`, `reason` populated.
- **Reports**: Rejection rate KPI.

## 9. Violation attached to existing case

- **Preconditions**: Open `ce_cases` row for same employer; user holds
  `ce_violations:assign`.
- **Steps**: From verified violation choose "Attach to case" → pick existing case.
- **Expected result**: `ce_case_violations` row inserted; violation
  `status='in_case'`.
- **Data**: `ce_case_violations`, `ce_violations`.
- **Audit**: `action='attached_to_case'` on both entities.
- **Reports**: Case violation count.

## 10. New case created from violation

- **Preconditions**: Verified violation, no eligible open case.
- **Steps**: "Create Case" action (permission `ce_cases:create`).
- **Expected result**: New `ce_cases` row, snapshot in `ce_case_employer_snapshot`,
  violation attached.
- **Workflow**: Case-handling workflow starts.
- **Audit**: case `created`, violation `attached_to_case`.
- **Reports**: Active cases tile.

## 11. Notice generated and approved

- **Preconditions**: Case in status requiring notice; user holds
  `ce_notices:create` and an approver holds `ce_notices:approve`.
- **Steps**: Generate notice from template → submit for approval → approver approves.
- **Expected result**: `ce_notices` row `status='approved'`; delivery queued in
  `ce_notice_delivery_log`.
- **Workflow**: Notice approval task assigned then completed.
- **Audit**: `created`, `approved`.
- **Reports**: Notices issued count.
- **Negative**: Approver lacking permission cannot approve; button hidden.

## 12. Employer response — dispute

- **Preconditions**: Notice delivered; employer portal user logs in.
- **Steps**: Submit dispute via online response screen.
- **Expected result**: `ce_audit_employer_responses` row with
  `response_type='dispute'`; `ce_audit_finding_dispute_submissions` row.
- **Workflow**: Dispute-review task assigned to compliance reviewer per workflow
  mapping.
- **Audit**: response `created`.
- **Reports**: Open disputes tile.

## 13. Employer uploads evidence

- **Preconditions**: Notice / case open; employer authenticated.
- **Steps**: Upload document via online response submission.
- **Expected result**: `ce_audit_employer_uploaded_documents` row referencing storage
  object.
- **Audit**: `action='evidence_uploaded'`.
- **Reports**: Document count on case timeline.

## 14. Payment arrangement requested

- **Preconditions**: Case with outstanding liability; user holds
  `ce_payment_arrangements:create`.
- **Steps**: Submit arrangement (down payment, installments, dates).
- **Expected result**: `ce_payment_arrangements` row `status='pending_approval'`;
  schedule rows generated.
- **Workflow**: Arrangement approval task.
- **Audit**: arrangement `created`.

## 15. Arrangement approved

- **Preconditions**: Arrangement in `pending_approval`; approver holds `:approve`.
- **Steps**: Approve.
- **Expected result**: `status='active'`; first installment due date set.
- **Audit**: `approved`, `workflow_task_id` linked.
- **Reports**: Active arrangements KPI.

## 16. Installment paid

- **Preconditions**: Active arrangement; payment posted matching installment.
- **Steps**: Payment posting service allocates payment via
  `ce_payment_allocations`.
- **Expected result**: Installment marked paid; arrangement progress updated.
- **Audit**: allocation `created`, installment `paid`.
- **Reports**: `ce_v_arrangement_health`.

## 17. Installment missed → breach

- **Preconditions**: Active arrangement; installment due-date passed unpaid.
- **Steps**: Run breach-monitoring job.
- **Expected result**: `ce_arrangement_breaches` row; arrangement `status='breached'`
  if rule threshold met.
- **Workflow**: Breach-handling workflow (escalation task).
- **Audit**: `breached`.
- **Reports**: Breached arrangements tile, Command Center alert.

## 18. Waiver requested and approved

- **Preconditions**: Case with penalty; user holds `ce_waivers:create`;
  approver holds `ce_waivers:approve`.
- **Steps**: Create waiver → submit → approve.
- **Expected result**: `ce_waivers` `status='approved'`; `ce_waiver_decisions` row;
  ledger adjustment row.
- **Workflow**: Waiver approval task.
- **Audit**: `created`, `approved`.

## 19. Waiver rejected

- **Steps**: Approver chooses Reject with reason.
- **Expected result**: `status='rejected'`, `reason` recorded.
- **Audit**: `rejected`.

## 20. Legal escalation recommended

- **Preconditions**: Case meets escalation rule; user holds
  `ce_legal_referrals:escalate`.
- **Steps**: From case → Recommend Legal Escalation.
- **Expected result**: `ce_legal_recommendations` row; case
  `legal_status='recommended'`.
- **Workflow**: Legal-approval task per `ce_legal_handoff_rules`.
- **Audit**: `escalation_recommended`.

## 21. Legal pack incomplete

- **Preconditions**: Recommendation exists; required documents missing.
- **Steps**: Open Legal Pack Preparation screen.
- **Expected result**: UI shows missing-items list; "Submit" disabled; no
  `ce_legal_referrals` row created.
- **Audit**: none (no state change).

## 22. Legal pack approved and handed off

- **Preconditions**: Pack complete; approver holds `ce_legal_referrals:approve`.
- **Steps**: Approve → handoff.
- **Expected result**: `ce_legal_referrals` + `ce_legal_referral_lines`; case
  `legal_status='referred'`; snapshot frozen.
- **Workflow**: Legal-handoff task completes; downstream Legal-module task started
  when integration enabled.
- **Audit**: `legal_handoff_approved`.
- **Reports**: Legal escalations tile.

## 23. Case closure

- **Preconditions**: All linked violations resolved; arrangements complete or waived;
  user holds `ce_cases:approve` (close).
- **Steps**: Close case with closure reason.
- **Expected result**: `status='closed'`, `closed_at` populated.
- **Audit**: `closed`, `reason` captured.
- **Reports**: Active cases decreases.

## 24. Case reopen

- **Preconditions**: Closed case meets reopen rule (`ce_case_reopen_rules`); user
  holds `ce_cases:edit`.
- **Steps**: Reopen with justification.
- **Expected result**: `status='reopened'`; history row in `ce_case_history`.
- **Workflow**: New case-handling workflow instance.
- **Audit**: `reopened`.

## 25. Case merge

- **Preconditions**: Two open cases for same employer satisfying
  `ce_case_merge_rules`.
- **Steps**: Merge from Case Families screen.
- **Expected result**: `ce_case_merge_history` row; surviving case keeps all
  violations; merged case `status='merged'`.
- **Audit**: `merged` on both cases.
- **Reports**: Case Families view updated.

## 26. Rule simulator run

- **Preconditions**: User holds `ce_rule_simulator:run`.
- **Steps**: Configure scenario → Run simulation.
- **Expected result**: `ce_rule_simulation_runs` row with input/output; no real
  violations created.
- **Audit**: `simulation_run`.
- **Reports**: Simulation history list.

## 27. Automation job dry run

- **Preconditions**: User holds `ce_admin_automation:run`.
- **Steps**: Trigger job with `dry_run=true`.
- **Expected result**: `ce_automation_runs` row with `mode='dry_run'`; candidate count
  produced; no `ce_violations` inserts.
- **Audit**: `dry_run_executed`.

## 28. Automation job failure handling

- **Preconditions**: Job dependency unavailable (e.g., view returns error).
- **Steps**: Run job.
- **Expected result**: `ce_automation_runs.status='failed'`; `error_message` captured;
  alert via notification engine.
- **Audit**: `job_failed`.
- **Reports**: Failed-jobs widget.

## 29. Risk score recalculation

- **Preconditions**: `feature_flags.compliance.risk_scoring.is_enabled=true`;
  policy active in `ce_risk_policies`.
- **Steps**: Trigger recalculation (manual or scheduled).
- **Expected result**: `ce_risk_profiles` upserted; `ce_risk_score_history` row per
  employer; `ce_case_risk_snapshots` when linked to open cases.
- **Audit**: `risk_recalculated`.
- **Reports**: High-risk and Watchlist views refresh.

## 30. Feature disabled fallback

- **Preconditions**: Toggle a `feature_flags.compliance.*` flag to `is_enabled=false`
  (e.g., `compliance.legal_escalation`).
- **Steps**: Navigate to the related screens and try actions.
- **Expected result**:
  - Menu items hidden where flag-bound.
  - Related dashboard tiles show "Feature disabled".
  - Direct service calls return a shielded error: "This feature is currently disabled.".
  - No DB writes occur.
- **Audit**: none.
- **Reports**: Disabled tiles render placeholder.
- **Re-enable test**: Flip flag back; verify menus/buttons reappear without redeploy.

---

## Coverage matrix (normal / exception / disabled)

| Area | Normal | Exception | Disabled |
|---|---|---|---|
| Detection | 1, 2, 3 | 4 | 30 |
| Manual entry | 5 | 5 (no-perm) | 30 |
| Verification | 7 | 8 | — |
| Cases | 9, 10, 23 | 24, 25 | — |
| Notices | 11 | 11 (no-perm) | 30 |
| Employer response | 12, 13 | — | — |
| Arrangements | 14, 15, 16 | 17 | — |
| Waivers | 18 | 19 | — |
| Legal | 20, 22 | 21 | 30 |
| Rule engine | 26, 27 | 28 | 30 |
| Risk | 29 | — | 30 |

## Permission-negative test template

For every scenario that calls a sensitive action, repeat the steps as a user **without**
the required permission and verify:

1. The button is hidden or disabled in the UI (via `PermissionWrapper` /
   `PermissionButton`).
2. The direct service call (Supabase RPC or table write) is rejected at the server
   boundary or returns a shielded "Not authorised" error.
3. No row is inserted/updated.
4. An `auth_denied` entry is logged where the project's auth middleware records it.
