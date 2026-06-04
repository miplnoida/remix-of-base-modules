
## Goal

Produce two deliverables in `/mnt/documents/` that you can hand to Claude AI to sync data into the transformed .NET (MS-SQL) database:

1. **`pg_master_config_data.sql`** — a single file containing all rows from Postgres for the master/configuration tables that are currently empty (0 rows) in the .NET DB.
2. **`schema_gap_report.md`** — a Markdown gap-analysis report comparing the PG schema vs. the .NET schema you provided.

## Scope rules (from your answers)

- **Tables included:** Only **master + configuration** tables that appear in your "0 rows" list. I will NOT export logs, audits, transactional, staging (`tmp_*`, `au_*`, `mi_*`), HangFire, AspNet Identity, or `__EFMigrationsHistory`.
- **Name mapping:** I use the PG table names as-is (e.g. `ip_master`, `c3_submissions`, `ce_inspectors`). You/Claude will resolve `ip_master → ip_masters`, `c3_submissions → c3submissions`, etc. on the .NET side.
- **One file only:** All inserts in a single `.sql` file, grouped with section headers per table.

## Tables to be exported (master + config, currently empty in .NET)

Grouped, ~180 tables total. Examples:

- **Lookups (`tb_*`):** `tb_bank_code`, `tb_currencies`, `tb_income_codes`, `tb_pay_periods`, `tb_penalty`, `tb_receipt_status`, `tb_payer_type`, `tb_designations`, `tb_office_departments`, `tb_payment_sources`, `tb_vc_contrib_rate`, `tb_vc_eligibility_config`, `tb_ssc_rates`, `tb_deductions_tax_table_header/_details`, `tb_invoice_status/_types`, `tb_merchant`, `tb_batch_status`, etc.
- **App/System config:** `system_settings`, `feature_flags`, `password_policies`, `mfa_config`, `office_locations`, `office_ip_addresses`, `public_holidays`, `route_security_config`, `field_security_rules`, `data_scope_rules`, `security_policy_config`, `module_button_bindings`, `module_doc_*`, `module_tables`, `notification_templates`, `notification_providers`, `notification_types`, `email_layout_components`, `release_registry`, `payment_module_config` (if empty), `themes`.
- **C3 config:** `c3_calculation_config_audit`, `c3_config_audit`, `c3_holiday_pay_policy_exceptions`, `c3_income_code_policy_default/_exceptions`, `c3_line_items`, `c3_payment_components`, `c3_payment_methods`, `c3_pending_holiday_pay`, `c3_submissions`, `c3_wage_category`, `c3_electronic_uploads`.
- **Compliance (CE) config:** `ce_settings`, `ce_risk_configs/bands/policies/policy_factors`, `ce_arrangement_policies`, `ce_assignment_queues/routing_rules`, `ce_audit_comm_*` templates/policies, `ce_calculation_rules`, `ce_case_severity_rules/merge_rules/reopen_rules/status_masters`, `ce_completion_gate_config`, `ce_detection_rules`, `ce_document_section_library/template/template_section/template_setting`, `ce_escalation_rules/prerequisite`, `ce_legal_escalation_policy/_rule`, `ce_legal_handoff_rules`, `ce_notice_templates`, `ce_number_sequences/templates`, `ce_online_response_policy/settings`, `ce_org_document_foundation`, `ce_plan_revision_reasons`, `ce_planner_bucket_policy`, `ce_violation_types`, `ce_waiver_rules`, `ce_workflow_mappings`, `ce_zones`, `ce_zone_office_mapping`, `ce_village_zone_mapping`, `ce_compliance_policies`, `ce_automation_jobs`.
- **BN config:** `bn_branch`, `bn_country*`, `bn_calculation_rule`, `bn_claim_status_def`, `bn_claim_transition_rules`, `bn_doc_requirement`, `bn_document_profile`, `bn_eligibility_rule`, `bn_escalation_policies`, `bn_evidence_checklist`, `bn_field_metadata`, `bn_formula_template`, `bn_interaction_rule`, `bn_override_policies`, `bn_product/_version`, `bn_reason_code`, `bn_rule_group`, `bn_scheme`, `bn_screen_template`, `bn_service_doc_type`, `bn_timeline_rule`, `bn_workflow_template`.
- **IA config:** `ia_activity_types`, `ia_audit_config`, `ia_checklist_templates/_items`, `ia_control_effectiveness_levels`, `ia_distribution_templates/recipients`, `ia_document_section_library/template_section/template_setting/templates`, `ia_escalation_rule`, `ia_execution_gate_config`, `ia_mitigation_template`, `ia_notification_trigger`, `ia_org_document_foundation`, `ia_planning_parameters/scoring_weights`, `ia_risk_band_frequency_policy`, `ia_risk_config_master`, `ia_risk_criteria/_weights`, `ia_risk_impact_levels`, `ia_risk_likelihood_levels`, `ia_sla_rules`, `ia_template_policy_matrix`, `ia_holidays`.
- **Legal config:** `legal_code_sets`, `legal_complainant_settings`, `legal_sla_rules`, `legal_templates`, `legal_workflow_stages`, `legal_status_transitions`, `legal_integrations`.
- **Cashier/Payments config:** `cashier_currency_config`, `cashier_currency_denominations`, `cn_head_cashier_assignment/_default/_override`, `cn_office_opening_balance`, `cn_cashier_office_override`, `cn_card_machine`, `cn_fee_*` if present.
- **API/Integration config:** `api_registry`, `api_settings`, `api_rate_limit_policies`, `api_key_scope_assignments`, `api_test_environments/suites/saved_cases`, `external_api_master`, `external_api_request_fields/response_fields/role_mapping`, `public_api_keys`, `public_api_rate_limits`.
- **Workflow config:** `workflow_definitions`, `workflow_triggers`, `workflow_steps`, `workflow_step_actions`, `workflow_step_notifications`, `workflow_action_configurations`, `workflow_action_field_updates`, `workflow_action_outcomes`, `workflow_action_types`, `workflow_api_configurations`, `workflow_meeting_departments`, `workflow_role_assignments`, `workflow_step_action_api/_body`.
- **Validation/Document config:** `er_validation_config`, `ip_validation_config`, `ip_card_config`, `document_purpose_rules`, `config_promotion_items`, `config_promotion_packs`.
- **Knowledge Base (config-like content):** `kb_articles`, `kb_article_links`, `kb_faqs`, `kb_field_help`, `kb_process_guides`, `kb_release_notes`.
- **QA/Schema tooling:** `qa_pipeline_settings`, `qa_test_cases`, `qa_module_dependencies`, `schema_change_approvals`.
- **Dev Info / DB Diagram metadata:** `dev_info_actions/dependencies/fields/logic/screens/table_maps`, `db_diagram_modules` (already 1 row, skipping), `db_diagram_relationships` (already 35, skipping), `db_diagram_saved_layouts`.

**Explicitly EXCLUDED** (per "master + config only"):
- All `*_log`, `*_logs`, `*_audit`, `*_audit_log`, `audit_*`, `system_*_logs`, `notification_logs`, `email_send_logs`, `meeting_api_logs`, etc.
- All transactional/business records: `bema_*` ops tables, `ce_cases/violations/inspections/...`, `cn_payment/receipt/batch/...`, `cl_*`, `ip_master` rows (transactional), `er_master`, `c3_regn`, `meetings`, `online_applications`, `sample_applications`, `legal_cases/hearings/orders/...`, `bn_claim*`, `bn_calc_*`, `ia_audit_engagements/findings/...` etc.
- HangFire, AspNet*, Identity, `__EFMigrationsHistory`, `tmp_*`, `au_*`, `mi_*`, `pbcat*`.
- Tables that already have rows in your .NET DB (per the second list, only zero-row tables are in scope).

## Approach (single exec script)

1. Build the final include-list in Python by intersecting:
   - Your "0 rows in .NET" list.
   - The master/config classification above.
   - Tables that actually exist in PG (`information_schema.tables`, `table_schema='public'`).
2. For each included table, query PG and emit:
   ```
   -- =========================
   -- TABLE: <pg_table_name>  (rows: N)
   -- Columns: col1, col2, ...
   -- =========================
   INSERT INTO <pg_table_name> (col1, col2, ...) VALUES (...);
   ...
   ```
   - Values are properly quoted (strings escaped, NULL for nulls, ISO-8601 for timestamps, hex `0x...` for `bytea`, raw JSON-as-text for `jsonb`).
   - Batches of 500 rows per `INSERT` for compactness.
   - UTF-8, LF line endings.
3. Tables that turn out to have 0 rows in PG too are listed in the report but produce only a `-- (empty in source)` marker (no inserts).
4. Write `/mnt/documents/pg_master_config_data.sql`.
5. Generate `/mnt/documents/schema_gap_report.md` containing:
   - **Tables present in PG but not in .NET** (by exact name).
   - **Tables present in .NET but not in PG** (HangFire, AspNet*, BnAp*, Bn* PascalCase entity tables, etc.).
   - **Row-count delta table** for tables that exist on both sides (PG count vs. your provided .NET count, with the name pair when an obvious singular/plural mapping exists).
   - **Empty-in-.NET tables that are also empty in PG** (nothing to sync — informational only).
   - **Exported tables list** with row counts written into the SQL file.
   - **Excluded categories** with rationale.

## Notes / caveats to call out in the report

- I'm intentionally NOT exporting transactional data even where it's "missing" in .NET — those are live records that should not be bulk-copied between environments.
- Postgres-specific types in dumped values: `uuid`, `jsonb`, `timestamptz`, `bytea`, arrays. Claude will need to translate these to MS-SQL equivalents (`UNIQUEIDENTIFIER`, `NVARCHAR(MAX)`/`JSON`, `DATETIMEOFFSET`/`DATETIME2`, `VARBINARY(MAX)`, comma-joined or table-valued).
- Column-name differences (snake_case PG vs PascalCase EF Core) are out of scope of this export — Claude must map them on the .NET side using the column list emitted in each table's header comment.
- Identity / sequence resets on the .NET side (`SET IDENTITY_INSERT ON`) are not added; Claude can wrap inserts accordingly.

## Deliverables

- `/mnt/documents/pg_master_config_data.sql`
- `/mnt/documents/schema_gap_report.md`

Approve and I'll switch to build mode and generate both files.
