# Compliance & Enforcement — Screen Catalog (Delivery 2)

Generated for the rebuilt Compliance menu. Each leaf in the sidebar (parent `ca000000-…-001`, namespace `cer_*`) is documented below with: **Purpose**, **Primary role**, **Source tables/views**, **Required filters** (none unless stated), **Default optional filters**, **Key actions**, **Upstream / Downstream links**, **Test data** (employer `663363` Gulab Singh Rawat + seed employers `SEED-COMP-001..005`), **Expected result**.

Conventions:
- Lists default to *last 90 days, all offices, all statuses* with debounced search by `regno`, name, case/violation no.
- Every employer-scoped screen accepts `?regno=<regno>` and deep-links back to `Employer 360`.
- "Coming Soon" entries are placeholders to be replaced in Delivery 5.

---

## 1. Workbench (`cer_sec_workbench`)
Personal/team landing zone. No employer pre-selection required.

### 1.1 My Work — `/compliance/my-work-queue` (`cer_wb_my_work`)
- **Purpose**: All open items assigned to the logged-in user across violations, cases, follow-ups, plan items.
- **Role**: Any compliance role.
- **Sources**: `ce_case_assignments`, `ce_violation_assignments`, `ce_follow_up_actions`, `ce_weekly_plan_items` (filtered by `assigned_to = auth user`).
- **Filters**: status (default *open*), type (case/violation/follow-up/visit), due window.
- **Actions**: open record, reassign, mark done.
- **Upstream**: assignment engine. **Downstream**: Case Detail, Violation Detail, Visit Workspace.
- **Test**: log in as inspector; should see items for `SEED-COMP-002..005`.

### 1.2 Team Queues — `/compliance/workbench/queues` (`cer_wb_team_queues`)
- **Purpose**: Supervisor view of all queues (`ce_assignment_queues`) and their backlog.
- **Sources**: `ce_assignment_queues`, `ce_queue_members`, `ce_assignment_routing_rules`.
- **Actions**: drill into queue → bulk reassign.
- **Links**: → My Work for individual member.

### 1.3 Manager Dashboard — `/compliance/workbench/manager` (`cer_wb_mgr_dash`)
- **Purpose**: KPIs for compliance head — open cases, overdue notices, breach count, recovery value.
- **Sources**: `ce_cases`, `ce_arrangement_breaches`, `ce_employer_financial_ledger`, dashboard views.
- **Links**: → Violations, Cases, Recovery sections.

### 1.4 Inspector Dashboard — `/compliance/workbench/inspector` (`cer_wb_insp_dash`)
- **Purpose**: Field-officer KPIs — visits done, inspections open, findings pending verification.
- **Sources**: `ce_inspections`, `ce_planned_visits`, `ce_weekly_plan_items`, `ce_inspectors`.
- **Links**: → Field section.

### 1.5 Monitoring Dashboard — `/compliance/workbench/monitoring` (`cer_wb_monitor`)
- **Purpose**: Live ops board — job runs, posting queue depth, sync log health.
- **Sources**: `ce_automation_runs`, `ce_job_run_log`, `ce_posting_queue`, `ce_payment_ledger_sync_log`.

### 1.6 Analytics Dashboard — `/compliance/workbench/analytics` (`cer_wb_analytics`)
- **Purpose**: Cross-cutting analytics (recovery trend, risk band shifts).
- **Sources**: `ce_risk_score_history`, `ce_employer_financial_ledger`, report views.

---

## 2. Employer Compliance (`cer_sec_employer`)
**Central employer-centric hub.** Every screen accepts `?regno=`.

### 2.1 Employer 360 — `/compliance/field/employer-360` (`cer_emp_360`)
- **Purpose**: One-page profile linking everything for an employer (Gulab Singh Rawat / 663363).
- **Sources**: `er_master`, `ce_employer_compliance_status`, `ce_employer_compliance_flags`, `ce_employer_financial_ledger`, `ce_cases`, `ce_violations`, `ce_payment_arrangements`, `ce_notices`, `ce_legal_referrals`, `ce_inspections`.
- **Required filters**: `regno` (search box at top — auto-completes).
- **Actions**: open Ledger, Arrears, Cases, Violations, Arrangements, Notices, Legal Referrals, Inspection History.
- **Downstream**: every link in this section + Recovery + Legal Escalation for this employer.

### 2.2 Employer Ledger — `/compliance/coming-soon/employer-ledger` (`cer_emp_ledger`)
- **Purpose** (Delivery 5): chronological `core_employer_ledger_transaction` view with running balance.
- **Sources**: `core_employer_ledger_transaction`, `core_employer_ledger_balance`.
- **Status**: stub (ComingSoon).

### 2.3 Arrears / Liability Statement — `/compliance/coming-soon/arrears-statement` (`cer_emp_arrears`)
- **Purpose** (Delivery 5): printable C3 / contribution arrears with penalty + interest split.
- **Sources**: `cn_arrears`, `cn_arrears_liab`, `cn_fines_journal`.
- **Status**: stub.

### 2.4 Risk Profile — `/compliance/risk/score-details` (`cer_emp_risk`)
- **Purpose**: Current risk score, band, factor breakdown, history.
- **Sources**: `ce_risk_profiles`, `ce_risk_score_history`, `ce_risk_policy_factors`, `ce_risk_bands`.
- **Links**: → Detection Results (recent triggers), Case Queue.

### 2.5 Compliance History — `/compliance/coming-soon/compliance-history` (`cer_emp_history`)
- **Purpose** (Delivery 5): unified timeline (cases, notices, payments, inspections).
- **Sources**: `ce_case_history`, `ce_violation_history`, `ce_notice_delivery_log`, `ce_inspections`.
- **Status**: stub.

---

## 3. Violations (`cer_sec_violations`)

### 3.1 Detection Results — `/compliance/violations/rule-detected` (`cer_vio_detected`)
- **Purpose**: Output of detection rules — raw candidate violations awaiting verification/promotion.
- **Sources**: `ce_violations` where `source = 'rule'`, joined to `ce_detection_rules`.
- **Filters**: rule, severity, detection date, regno.
- **Actions**: verify → promotes to managed violation; reject.
- **Downstream**: Verification Queue, Case Queue (on grouping).

### 3.2 Verification Queue — `/compliance/violations/verification-queue` (`cer_vio_verify`)
- **Purpose**: Violations needing supervisor verification before becoming actionable.
- **Sources**: `ce_violations` where `status = 'pending_verification'`.
- **Actions**: verify, reject (with reason), reassign.

### 3.3 Manual Violation Entry — `/compliance/violations/manual-entry` (`cer_vio_manual`)
- **Purpose**: Officer-entered violations (e.g. uncovered worker found on visit).
- **Sources**: writes `ce_violations` + `ce_violation_employer_snapshot`.
- **Actions**: save draft, submit for verification.

### 3.4 Violation Management — `/compliance/violations` (`cer_vio_mgmt`)
- **Purpose**: Master list of all violations across sources.
- **Sources**: `ce_violations`, `ce_violation_types`.
- **Filters**: status (default *open*), type, severity, employer, date.
- **Links**: → Violation Detail → Case (when grouped).

### 3.5 Duplicate / Merge Review — `/compliance/violations/duplicate-review` (`cer_vio_dup`)
- **Purpose**: Reconcile near-duplicate violations / cases.
- **Sources**: `ce_case_merge_rules`, `ce_case_merge_history`, `ce_violation_grouping_decisions`.
- **Actions**: merge, keep separate, send back to grouping engine.

---

## 4. Cases (`cer_sec_cases`)

### 4.1 Case Management — `/compliance/cases` (`cer_case_mgmt`)
- **Purpose**: All cases (master list).
- **Sources**: `ce_cases`, `ce_case_status_masters`.
- **Filters**: status (default *active*), severity, owner, employer, opened-date.
- **Links**: → Case Detail.

### 4.2 Case Queue — `/compliance/cases/queue` (`cer_case_queue`)
- **Purpose**: Triage view — unassigned + pending intake.
- **Sources**: `ce_cases` (status `new`/`pending_assignment`), `ce_case_requests`.
- **Actions**: assign, set severity, link to case family.

### 4.3 Case Families / Grouping — `/compliance/admin/case-families` (`cer_case_families`)
- **Purpose**: Manage grouped cases for an employer or group.
- **Sources**: `ce_case_families`, `ce_employer_group_membership`.

### 4.4 Penalty Management — `/compliance/cases/penalties` (`cer_case_penalty`)
- **Purpose**: Apply, waive, recalculate penalties on cases.
- **Sources**: `ce_penalty_calculations`, `ce_waivers`, `ce_waiver_decisions`.
- **Links**: → Recovery (when penalty becomes payable), Waivers.

---

## 5. Field & Audit (`cer_sec_field`)

### 5.1 Plans — `/compliance/field/plan-builder` (`cer_fld_plans`)
- **Purpose**: Build weekly plans (supervisor).
- **Sources**: `ce_weekly_plans`, `ce_weekly_plan_items`, `ce_planner_candidate_actions`.

### 5.2 My Plans — `/compliance/field/my-plans` (`cer_fld_my_plans`)
- **Purpose**: Inspector view of own approved plan items.
- **Sources**: `ce_weekly_plan_items` (filtered by user).

### 5.3 Inspections — `/compliance/field/execution` (`cer_fld_insp`)
- **Purpose**: Open + recent inspections.
- **Sources**: `ce_inspections`, `ce_inspection_employer_interactions`.

### 5.4 Findings — `/compliance/field/findings` (`cer_fld_findings`)
- **Purpose**: Inspection findings awaiting conversion to violations / audit report.
- **Sources**: `ce_inspection_findings`, `ce_inspection_evidence`.

### 5.5 Visit Workspace — `/compliance/field/employer-statements` (`cer_fld_visit`)
- **Purpose**: On-visit data capture: interviews, working papers, evidence.
- **Sources**: `ce_audit_checklist_responses`, `ce_inspection_working_papers`, `ce_audit_employer_responses`.

### 5.6 Audit Reports — `/compliance/field/all-reports` (`cer_fld_audit_rpt`)
- **Purpose**: Generated audit reports (drafts + final + acknowledgements).
- **Sources**: `ce_employer_audit_reports`, `ce_audit_report_versions`, `ce_audit_report_acknowledgments`.

### 5.7 Weekly Reports — `/compliance/field/weekly-report` (`cer_fld_weekly`)
- **Purpose**: Inspector submits the week summary.
- **Sources**: `ce_weekly_plan_reviews`, `ce_inspector_performance`.

---

## 6. Recovery (`cer_sec_recovery`)

### 6.1 Notices — `/compliance/notices` (`cer_rec_notices`)
- **Purpose**: All compliance notices (demand, reminder, breach, intent to refer).
- **Sources**: `ce_notices`, `ce_notice_delivery_log`, `ce_notice_responses`, `ce_notice_templates`.
- **Links**: → Case Detail, Employer 360.

### 6.2 Payment Arrangements — `/compliance/enforcement/arrangements` (`cer_rec_arr`)
- **Purpose**: All payment arrangements with status and schedule.
- **Sources**: `ce_payment_arrangements`, `core_payment_arrangement`, `core_payment_schedule_installment`.
- **Links**: → Ledger, Case, Breach Monitoring, Legal Referral.

### 6.3 Breach Monitoring — `/compliance/enforcement/breaches` (`cer_rec_breach`)
- **Purpose**: Arrangements in breach / nearing breach.
- **Sources**: `ce_arrangement_breaches`, `ce_breach_monitoring`.
- **Actions**: trigger reminder, escalate.

### 6.4 Waivers / Overrides — `/compliance/enforcement/waivers` (`cer_rec_waivers`)
- **Purpose**: Approve/track waivers of penalty or interest.
- **Sources**: `ce_waivers`, `ce_waiver_decisions`, `ce_waiver_rules`.

---

## 7. Legal Escalation (`cer_sec_legal`)

### 7.1 Recommendation Queue — `/compliance/enforcement/recommendation-queue` (`cer_leg_recq`)
- **Purpose**: Cases recommended to legal awaiting review.
- **Sources**: `ce_legal_recommendations`, `ce_case_recommendations`.

### 7.2 Referral Wizard — `/compliance/enforcement/legal-referral` (`cer_leg_wizard`)
- **Purpose**: Stepper to assemble + send a referral.
- **Sources**: writes `ce_legal_referrals`, `ce_legal_referral_lines`; pulls snapshots from `ce_employer_snapshots`, `core_employer_ledger_transaction`.
- **Downstream**: Legal Pack Generation, lg_case_intake.

### 7.3 Legal Pack Generation — `/compliance/legal/pack-preparation` (`cer_leg_pack`)
- **Purpose**: Build the legal document pack.
- **Sources**: `ce_legal_pack_items`, `core_generated_document`.

### 7.4 Referral Status — `/compliance/enforcement/legal-queue` (`cer_leg_status`)
- **Purpose**: Track referrals already sent (status, returned, accepted).
- **Sources**: `ce_legal_referrals`, `ce_legal_returns`, `ce_legal_escalations`.

### 7.5 Legal Outcome Tracking — `/compliance/enforcement/proceedings` (`cer_leg_outcome`)
- **Purpose**: Court outcomes mirrored back from Legal module.
- **Sources**: `ce_legal_proceedings`, plus joins to `lg_case`, `lg_order`.

---

## 8. Reports (`cer_sec_reports`)
All have date range + office multi-select; default last 90 days, all offices.

| Slug | Route | Source |
|---|---|---|
| C3 Compliance (`cer_rpt_c3`) | `/compliance/reports/c3-compliance` | `cn_c3_reported`, `cn_c3_missing` |
| Arrears (`cer_rpt_arrears`) | `/compliance/reports/arrears` | `cn_arrears`, `ce_arrears_report_entries` |
| Arrangements (`cer_rpt_arr`) | `/compliance/reports/arrangements` | `ce_arrangement_report_entries` |
| Legal Escalations (`cer_rpt_legal`) | `/compliance/reports/legal` | `ce_legal_escalations`, `ce_legal_referrals` |
| Inspector Performance (`cer_rpt_inspector`) | `/compliance/reports/inspector-performance` | `ce_inspector_performance`, `ce_inspections` |
| Trends (`cer_rpt_trends`) | `/compliance/reports/trends` | `ce_risk_score_history`, ledger views |

---

## 9. Compliance Admin (`cer_sec_admin`)
Admin/ComplianceHead only.

| Slug | Route | Source |
|---|---|---|
| Rules & Policies (`cer_adm_rules`) | `/compliance/admin/settings/rule-engine` | `ce_detection_rules`, `ce_calculation_rules`, `ce_compliance_policies` |
| Staff & Queues (`cer_adm_staff`) | `/compliance/admin/staff/officers` | `ce_inspectors`, `ce_assignment_queues`, `ce_queue_members` |
| Geography (`cer_adm_geo`) | `/compliance/admin/geography/zones` | `ce_zones`, `ce_village_zone_mapping`, `ce_zone_office_mapping` |
| Templates & Communications (`cer_adm_templates`) | `/compliance/admin/communication-templates` | `ce_audit_communication_templates`, `ce_notice_templates`, `core_template` |
| Automation (`cer_adm_automation`) | `/compliance/admin/automation/jobs` | `ce_automation_jobs`, `ce_automation_runs`, `ce_job_run_log` |
| Ledger Configuration (`cer_adm_ledger`) | `/compliance/admin/settings/ledger-admin` | `core_ledger_head`, `core_payment_allocation_rule`, `ce_settings` |
| Tools / Simulators (`cer_adm_tools`) | `/compliance/admin/tools/rule-simulator` | `ce_rule_simulation_runs`, `ce_rule_change_requests` |

---

## Test data
| Seed | Scenario | Expected key links |
|---|---|---|
| 663363 (Gulab Singh Rawat) | Existing employer used in manual smoke test | Employer 360 → Ledger, Arrears, Cases |
| SEED-COMP-001 | Fully compliant | Risk band Low, no open cases |
| SEED-COMP-002 | Missing C3 filing | Detection → Verification → Case → Notice |
| SEED-COMP-003 | Underpaid contributions | Case → Arrears → Arrangement |
| SEED-COMP-004 | Active arrangement | Arrangement → Schedule → Breach monitor (none) |
| SEED-COMP-005 | Defaulted + legal referral | Breach → Referral Wizard → Legal Pack → Proceedings |

---

## Notes for Delivery 3+
- Mark the three `coming-soon` routes for replacement in Delivery 5.
- All list screens must drop mandatory office/zone/officer prefilters per Phase 3 of the plan.
- Cross-screen `?regno=` deep-link parameter is the single contract used in Phase 4.
