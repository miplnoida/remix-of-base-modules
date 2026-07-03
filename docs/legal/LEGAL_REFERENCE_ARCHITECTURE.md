# Legal Platform — Reference Data Map

**Version:** 1.0

| Reference Group | Table(s) | Purpose | Consumed By | Workflow Usage | Reporting | Validation |
|-----------------|----------|---------|-------------|----------------|-----------|------------|
| Matter Type | `lg_matter_type` | Classify legal cases | Intake, Case, Routing | Yes (routing) | Yes | Yes |
| Legal Status | `tb_legal_status` | Entity legal status | Employer, Case | — | Yes | Yes |
| Case Action Catalog | `lg_case_action_catalog` | Allowed actions per stage | Case | Yes | — | Yes |
| Court Registry | `lg_court`, `lg_court_division`, `lg_court_venue`, `lg_court_officer` | Judicial hierarchy | Hearings, Filings | Yes | Yes | Yes |
| Fee Rules | `lg_fee_rule`, `lg_fee_bundle`, `lg_fee_bundle_item` | Fee calculation | Fees, Cost | Yes | Yes | Yes |
| Waiver Policy | `lg_fee_waiver_policy`, `lg_fee_waiver_policy_tier` | Fee waiver rules | Fees | Yes (approval) | Yes | Yes |
| Recovery Strategy | `lg_recovery_strategy_type`, `lg_recovery_campaign_type` | Recovery classification | Recovery | Yes | Yes | — |
| Workload Rules | `lg_recovery_workload_rule` | Officer capacity | Recovery routing | Yes | — | Yes |
| Workflow Policy | `lg_workflow_policy`, `lg_stage_transition_rule`, `lg_stage_action_rule`, `lg_stage_document_rule`, `lg_stage_template_mapping`, `lg_stage_reference_mapping` | Stage rules | Case | Yes | — | Yes |
| Routing Policy | `lg_routing_policy`, `lg_routing_case_type`, `lg_routing_precedence`, `lg_routing_source_map`, `lg_routing_stage_override` | Intake routing | Intake | Yes | — | Yes |
| SLA Policy | `lg_sla_policy` | SLA calc | Case, Dashboard | Yes | Yes | Yes |
| Notification Rules | `lg_notification_rule` | Event → notification | Case activity | Yes | — | — |
| Legal References | `core_legal_reference`, `core_legal_reference_version`, `core_module_legal_reference`, `core_template_legal_reference` | Statutes / regulations | Templates, Orders | Yes | Yes | — |
| Document Templates | `lg_document_template_registry`, `core_template*` | Document generation | Orders, Notices | Yes | — | — |
| Code Sets | `legal_code_sets` | Misc legal codes | Various | — | — | Yes |
| Complainant Config | `legal_complainant_settings` | Complainant defaults | Intake | Yes | — | Yes |
| Primary Entity Type | `lg_primary_entity_type` | Subject type (ER/IP) | Intake, Case | — | — | Yes |
| Intake Sources | `lg_case_intake_source`, `lg_case_source_config`, `lg_case_source_stage`, `lg_case_source_case_type` | Intake source metadata | Intake | Yes | Yes | Yes |
