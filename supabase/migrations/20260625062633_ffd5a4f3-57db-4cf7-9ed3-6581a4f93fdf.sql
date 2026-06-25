
-- Hide menu entries previously added for pre-existing /legal pages
UPDATE app_modules SET show_in_menu = false, is_enabled = false
 WHERE name IN (
   'lg_ops_dashboard','lg_classic_dashboard','lg_delinquent_cases','lg_appeals',
   'lg_evidence','lg_order_registry','lg_templates_library',
   'lg_rpt_cases_by_stage','lg_rpt_aging','lg_rpt_recovery','lg_rpt_costs_fees',
   'lg_rpt_pending_hearings','lg_rpt_performance',
   'lg_set_reference_data','lg_set_courts','lg_set_hearing_types','lg_set_case_statuses',
   'lg_set_legal_roles','lg_set_fee_mappings','lg_set_territory','lg_set_workflow',
   'lg_admin_intake_validation','lg_admin_ref_verification','lg_admin_workflow_rules',
   'lg_grp_operations','lg_grp_reports_sub','lg_grp_settings'
 );

-- Revert show_in_menu changes for pre-existing admin entries
UPDATE app_modules SET show_in_menu = false
 WHERE name IN ('lg_admin_complainant','lg_admin_stage_templates','lg_admin_stage_refs');

-- Re-parent the three genuinely new pages under existing Legal Admin group
UPDATE app_modules
   SET parent_id = '1e9a1000-0000-0000-0000-000000000120',
       show_in_menu = true, is_enabled = true,
       sort_order = CASE name
         WHEN 'lg_admin_sla_rules' THEN 210
         WHEN 'lg_admin_referral_integrity' THEN 220
         WHEN 'lg_admin_case_integrity' THEN 230
       END
 WHERE name IN ('lg_admin_sla_rules','lg_admin_referral_integrity','lg_admin_case_integrity');
