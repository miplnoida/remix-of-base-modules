# Internal Audit — Reset Script (keep Masters only)

## Goal
Provide a re-runnable SQL script that deletes **all transactional and configuration data** from the Internal Audit module so users can configure and operate the module from scratch, while **preserving master / reference data** (departments, functions, auditors, risk dimensions, holidays, activity types).

## Classification of `ia_*` tables

### KEEP — Master / Reference data (not touched)
- `ia_departments`
- `ia_department_functions`
- `ia_auditors`
- `ia_activity_types`
- `ia_holidays`
- `ia_risk_categories`
- `ia_risk_criteria`
- `ia_risk_impact_levels`
- `ia_risk_likelihood_levels`
- `ia_control_effectiveness_levels`

### DELETE — Configuration data
`ia_audit_config`, `ia_audit_settings`, `ia_risk_config_master`, `ia_risk_classification_thresholds`, `ia_risk_band_frequency_policy`, `ia_risk_criteria_weights`, `ia_risk_scoring_models`, `ia_planning_parameters`, `ia_planning_scoring_weights`, `ia_planning_assumptions`, `ia_escalation_rules`, `ia_sla_rules`, `ia_notification_triggers`, `ia_execution_gate_config`, `ia_template_policy_matrix`, `ia_org_document_foundation`, `ia_communication_stages`, `ia_mitigation_templates`, `ia_checklist_templates`, `ia_checklist_template_items`, `ia_document_templates`, `ia_document_template_sections`, `ia_document_template_settings`, `ia_document_section_library`, `ia_distribution_templates`, `ia_distribution_recipients`, `ia_audit_plan_templates`, `ia_config_change_requests`

### DELETE — Transactional data
All remaining `ia_*` tables: annual plans & versions, plan workflow/amendments/distribution/artifacts/carry-forward/change-log, planning wizard state, auto plan candidates, audit universe, risk assessments + factors, risk register, risk reviews, risk mitigation actions, engagements (incl. execution log, risk overrides, preparation checklists/documents), audit programs/procedures, audit checklists, audit queries, RCM (processes/risks/controls/tests), control tests + results, evidence, working papers, findings, recommendations, management responses, action tracking + plan updates + milestones, follow-ups, audit closure, audit reports, communications, discussion threads/comments, document requests, notifications (queue/logs/auto), approval actions, change events, resource recommendations, auditor workload, availability conflicts, leave requests, time logs, quality reviews + checklist, department audits, activities, plan version engagements.

## Deliverable

**File:** `supabase/migrations/<timestamp>_reset_internal_audit_data.sql`

Structure:
1. Header comment listing kept vs deleted tables and re-run safety note.
2. `BEGIN;`
3. `SET session_replication_role = 'replica';` — disables FK + triggers so order doesn't matter and audit triggers don't fire during the wipe.
4. `TRUNCATE TABLE <each non-master ia_* table> RESTART IDENTITY CASCADE;` grouped by section (config / transactional) with comments.
5. `SET session_replication_role = 'origin';`
6. `COMMIT;`
7. Verification `SELECT` block (commented) showing row counts for all `ia_*` tables.

Idempotent — safe to re-run any time to reset. Will be delivered as a migration so it runs on Test first; you can re-run it manually against Live from Cloud → Run SQL when ready.

## Open questions before I build it

1. **Templates** (checklist, document, audit-plan, distribution, mitigation, document section library, org document foundation) — I've classified these as **configuration** (deleted) so users rebuild from scratch. Confirm, or should any template family be preserved as master?
2. **`ia_auditors`** — kept as master (people registry). Confirm — or also wipe?
3. Run target: should the script also be provided as a standalone `.sql` file under `scripts/` (in addition to the migration) so it can be re-run on demand outside of the migration system?
