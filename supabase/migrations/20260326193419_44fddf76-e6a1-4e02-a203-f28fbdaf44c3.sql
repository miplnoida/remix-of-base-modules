
-- ============================================================
-- Widen all user_code-related columns to varchar(50)
-- to match profiles.user_code datatype (109 columns, 50+ tables)
-- Safe, non-destructive column widenings — no data loss
-- ============================================================

-- === varchar(5) → varchar(50) (24 columns) ===
ALTER TABLE au_ip_self_employ ALTER COLUMN entered_by TYPE varchar(50);
ALTER TABLE au_ip_self_employ ALTER COLUMN verified_by TYPE varchar(50);
ALTER TABLE c3_config_audit ALTER COLUMN changed_by TYPE varchar(50);
ALTER TABLE c3_config_details ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE c3_config_details ALTER COLUMN modified_by TYPE varchar(50);
ALTER TABLE c3_config_periods ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE c3_config_periods ALTER COLUMN modified_by TYPE varchar(50);
ALTER TABLE cn_batch ALTER COLUMN entered_by TYPE varchar(50);
ALTER TABLE cn_batch ALTER COLUMN posted_by TYPE varchar(50);
ALTER TABLE cn_batch ALTER COLUMN verified_by TYPE varchar(50);
ALTER TABLE cn_receipt_prints ALTER COLUMN printed_by TYPE varchar(50);
ALTER TABLE er_master ALTER COLUMN entered_by TYPE varchar(50);
ALTER TABLE er_master ALTER COLUMN modified_by TYPE varchar(50);
ALTER TABLE er_master ALTER COLUMN verified_by TYPE varchar(50);
ALTER TABLE er_suit ALTER COLUMN entered_by TYPE varchar(50);
ALTER TABLE er_suit ALTER COLUMN modified_by TYPE varchar(50);
ALTER TABLE er_suit ALTER COLUMN verified_by TYPE varchar(50);
ALTER TABLE ip_master ALTER COLUMN entered_by TYPE varchar(50);
ALTER TABLE ip_self_employ ALTER COLUMN entered_by TYPE varchar(50);
ALTER TABLE ip_self_employ ALTER COLUMN verified_by TYPE varchar(50);
ALTER TABLE tb_levy_slab_details ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE tb_levy_slab_details ALTER COLUMN modified_by TYPE varchar(50);
ALTER TABLE tb_levy_slabs ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE tb_levy_slabs ALTER COLUMN modified_by TYPE varchar(50);

-- === varchar(8) → varchar(50) ===
ALTER TABLE cn_receipt ALTER COLUMN cancel_user TYPE varchar(50);

-- === varchar(10) → varchar(50) (receipt & payment tables) ===
ALTER TABLE cn_receipt ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE cn_receipt ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE c3_unified_audit_log ALTER COLUMN changed_by TYPE varchar(50);
ALTER TABLE cashier_currency_config ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE cashier_currency_denominations ALTER COLUMN updated_by TYPE varchar(50);

-- === varchar(10) → varchar(50) (ce_* compliance tables) ===
ALTER TABLE ce_arrangement_breaches ALTER COLUMN resolved_by TYPE varchar(50);
ALTER TABLE ce_audit_log ALTER COLUMN performed_by TYPE varchar(50);
ALTER TABLE ce_automation_jobs ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_automation_jobs ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_calculation_rules ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_calculation_rules ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_case_history ALTER COLUMN performed_by TYPE varchar(50);
ALTER TABLE ce_case_violations ALTER COLUMN linked_by TYPE varchar(50);
ALTER TABLE ce_cases ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_cases ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_detection_rules ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_detection_rules ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_escalation_rules ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_escalation_rules ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_inspection_findings ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_inspections ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_inspections ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_legal_documents ALTER COLUMN generated_by TYPE varchar(50);
ALTER TABLE ce_legal_escalations ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_legal_escalations ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_notices ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_notices ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_number_templates ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_number_templates ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_payment_arrangements ALTER COLUMN approved_by TYPE varchar(50);
ALTER TABLE ce_payment_arrangements ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_payment_arrangements ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_risk_config ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_risk_config ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_risk_profiles ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_risk_profiles ALTER COLUMN override_by TYPE varchar(50);
ALTER TABLE ce_risk_profiles ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_risk_score_history ALTER COLUMN calculated_by TYPE varchar(50);
ALTER TABLE ce_settings ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_violation_history ALTER COLUMN performed_by TYPE varchar(50);
ALTER TABLE ce_violation_types ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_violation_types ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_violations ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_violations ALTER COLUMN discovered_by TYPE varchar(50);
ALTER TABLE ce_violations ALTER COLUMN resolved_by TYPE varchar(50);
ALTER TABLE ce_violations ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ce_waivers ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ce_waivers ALTER COLUMN requested_by TYPE varchar(50);
ALTER TABLE ce_waivers ALTER COLUMN updated_by TYPE varchar(50);

-- === varchar(10) → varchar(50) (other operational tables) ===
ALTER TABLE ip_application_documents ALTER COLUMN transferred_by TYPE varchar(50);
ALTER TABLE ip_employer ALTER COLUMN entered_by TYPE varchar(50);
ALTER TABLE ip_employer ALTER COLUMN modified_by TYPE varchar(50);
ALTER TABLE ip_other_payments ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE ip_other_payments ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE ip_vol_contrib_wages ALTER COLUMN entered_by TYPE varchar(50);
ALTER TABLE ip_vol_contrib_wages ALTER COLUMN modified_by TYPE varchar(50);
ALTER TABLE meeting_api_logs ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE meetings ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE meetings ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE tb_batch_status ALTER COLUMN entered_by TYPE varchar(50);
ALTER TABLE tb_batch_status ALTER COLUMN modified_by TYPE varchar(50);
ALTER TABLE tb_currencies ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE tb_currencies ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE tb_payer_type ALTER COLUMN entered_by TYPE varchar(50);
ALTER TABLE tb_payer_type ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE tb_receipt_status ALTER COLUMN entered_by TYPE varchar(50);
ALTER TABLE tb_receipt_status ALTER COLUMN modified_by TYPE varchar(50);
ALTER TABLE tb_vc_eligibility_config ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE tb_vc_eligibility_config ALTER COLUMN updated_by TYPE varchar(50);

-- === varchar(10) → varchar(50) (workflow tables) ===
ALTER TABLE workflow_action_configurations ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE workflow_action_configurations ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE workflow_action_outcomes ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE workflow_action_outcomes ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE workflow_action_types ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE workflow_action_types ALTER COLUMN updated_by TYPE varchar(50);
ALTER TABLE workflow_api_configurations ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE workflow_api_configurations ALTER COLUMN updated_by TYPE varchar(50);

-- === varchar(20) → varchar(50) ===
ALTER TABLE ce_arrangement_breaches ALTER COLUMN detected_by TYPE varchar(50);
ALTER TABLE ce_automation_runs ALTER COLUMN triggered_by TYPE varchar(50);
ALTER TABLE dev_info_access_log ALTER COLUMN accessed_by TYPE varchar(50);
ALTER TABLE dev_info_screens ALTER COLUMN created_by TYPE varchar(50);
ALTER TABLE dev_info_screens ALTER COLUMN reviewed_by TYPE varchar(50);
ALTER TABLE dev_info_screens ALTER COLUMN updated_by TYPE varchar(50);

-- === varchar(30) → varchar(50) ===
ALTER TABLE er_commence ALTER COLUMN modified_by TYPE varchar(50);
