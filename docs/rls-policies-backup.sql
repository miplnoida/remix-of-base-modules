-- ============================================================================
-- SSB SYSTEM - COMPLETE RLS POLICIES BACKUP SCRIPT
-- Generated: 2026-02-22
-- Total Tables with RLS: 225
-- Total Policies: 472
-- 
-- USAGE:
--   Section 1: DROP all existing policies (safe, uses IF EXISTS)
--   Section 2: ENABLE RLS on all tables
--   Section 3: CREATE all policies
--
-- PREREQUISITES:
--   The following helper functions must exist before running this script:
--     - public.has_role(uuid, app_role) -> boolean
--     - public.has_any_role(uuid, app_role[]) -> boolean
--     - public.is_admin(uuid) -> boolean
--     - public.has_permission(uuid, text, text) -> boolean
--   The enum type public.app_role must exist.
-- ============================================================================

-- ============================================================================
-- SECTION 1: DROP ALL EXISTING POLICIES
-- Run this section first to cleanly remove all policies before re-creating.
-- ============================================================================

DROP POLICY IF EXISTS "Admins can insert api_config_audit_logs" ON public.api_config_audit_logs;
DROP POLICY IF EXISTS "Authenticated users can read api_config_audit_logs" ON public.api_config_audit_logs;
DROP POLICY IF EXISTS "Admins can manage api_key_scope_assignments" ON public.api_key_scope_assignments;
DROP POLICY IF EXISTS "Authenticated users can read api_key_scope_assignments" ON public.api_key_scope_assignments;
DROP POLICY IF EXISTS "Authenticated users can insert api logs" ON public.api_logs;
DROP POLICY IF EXISTS "Authenticated users can view api logs" ON public.api_logs;
DROP POLICY IF EXISTS "Service role can insert api logs" ON public.api_logs;
DROP POLICY IF EXISTS "Admins can manage api_rate_limit_policies" ON public.api_rate_limit_policies;
DROP POLICY IF EXISTS "Authenticated users can read api_rate_limit_policies" ON public.api_rate_limit_policies;
DROP POLICY IF EXISTS "Admins can manage api_registry" ON public.api_registry;
DROP POLICY IF EXISTS "Anyone can read enabled api_registry" ON public.api_registry;
DROP POLICY IF EXISTS "Authenticated users can read api_registry" ON public.api_registry;
DROP POLICY IF EXISTS "Admins can manage API settings" ON public.api_settings;
DROP POLICY IF EXISTS "Only admins can read api_settings" ON public.api_settings;
DROP POLICY IF EXISTS "Admins can manage lockdown state" ON public.app_lockdown_state;
DROP POLICY IF EXISTS "Anyone can read lockdown state" ON public.app_lockdown_state;
DROP POLICY IF EXISTS "Admins can delete app_modules" ON public.app_modules;
DROP POLICY IF EXISTS "Admins can insert app_modules" ON public.app_modules;
DROP POLICY IF EXISTS "Admins can update app_modules" ON public.app_modules;
DROP POLICY IF EXISTS "Anyone can view enabled modules" ON public.app_modules;
DROP POLICY IF EXISTS "Authenticated can view app_modules" ON public.app_modules;
DROP POLICY IF EXISTS "Admins can manage au_ip_last_self_emp" ON public.au_ip_last_self_emp;
DROP POLICY IF EXISTS "Authenticated can read au_ip_last_self_emp" ON public.au_ip_last_self_emp;
DROP POLICY IF EXISTS "Admins can manage au_ip_self_employ" ON public.au_ip_self_employ;
DROP POLICY IF EXISTS "Authenticated can read au_ip_self_employ" ON public.au_ip_self_employ;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.audit_interviews;
DROP POLICY IF EXISTS "al_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "al_select" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff can view activity log" ON public.bema_activity_log;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_arrears_ledger;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_audit_cases;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_c3_line_items;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_c3_submissions;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_contributors;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_employee_interviews;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_field_activities;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_inspector_assignments;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_installments;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_payment_plans;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_registrations;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_remittance_calendar;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_vouchers;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_waivers;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_weekly_plans;
DROP POLICY IF EXISTS "Staff full access" ON public.bema_zones;
DROP POLICY IF EXISTS "Admins can delete c3_bonus_levy_exemptions" ON public.c3_bonus_levy_exemptions;
DROP POLICY IF EXISTS "Admins can update c3_bonus_levy_exemptions" ON public.c3_bonus_levy_exemptions;
DROP POLICY IF EXISTS "Allow authenticated insert on c3_bonus_levy_exemptions" ON public.c3_bonus_levy_exemptions;
DROP POLICY IF EXISTS "Allow authenticated read on c3_bonus_levy_exemptions" ON public.c3_bonus_levy_exemptions;
DROP POLICY IF EXISTS "Admins can manage configs" ON public.c3_calculation_config;
DROP POLICY IF EXISTS "Authenticated users can read active configs" ON public.c3_calculation_config;
DROP POLICY IF EXISTS "Admins can view config audit" ON public.c3_calculation_config_audit;
DROP POLICY IF EXISTS "Allow authenticated insert on c3_config_audit" ON public.c3_config_audit;
DROP POLICY IF EXISTS "Allow authenticated read on c3_config_audit" ON public.c3_config_audit;
DROP POLICY IF EXISTS "Admins can update c3_config_details" ON public.c3_config_details;
DROP POLICY IF EXISTS "Allow authenticated insert on c3_config_details" ON public.c3_config_details;
DROP POLICY IF EXISTS "Allow authenticated read on c3_config_details" ON public.c3_config_details;
DROP POLICY IF EXISTS "Admins can update c3_config_periods" ON public.c3_config_periods;
DROP POLICY IF EXISTS "Allow authenticated insert on c3_config_periods" ON public.c3_config_periods;
DROP POLICY IF EXISTS "Allow authenticated read on c3_config_periods" ON public.c3_config_periods;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.c3_line_items;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.c3_submissions;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.c3_unified_audit_log;
DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON public.c3_unified_audit_log;
DROP POLICY IF EXISTS "Admins can manage c3_wage_category" ON public.c3_wage_category;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.c3_wage_category;
DROP POLICY IF EXISTS "Authenticated can read c3_wage_category" ON public.c3_wage_category;
DROP POLICY IF EXISTS "Admins can delete cn_c3_reported" ON public.cn_c3_reported;
DROP POLICY IF EXISTS "Admins can update cn_c3_reported" ON public.cn_c3_reported;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.cn_c3_reported;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.cn_c3_reported;
DROP POLICY IF EXISTS "Admins can update cn_payment" ON public.cn_payment;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.cn_payment;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.cn_payment;
DROP POLICY IF EXISTS "Admins can update cn_payment_header" ON public.cn_payment_header;
DROP POLICY IF EXISTS "Authenticated users can insert payment headers" ON public.cn_payment_header;
DROP POLICY IF EXISTS "Authenticated users can view payment headers" ON public.cn_payment_header;
DROP POLICY IF EXISTS "Admins can update cn_receipt" ON public.cn_receipt;
DROP POLICY IF EXISTS "Authenticated users can insert receipts" ON public.cn_receipt;
DROP POLICY IF EXISTS "Authenticated users can view receipts" ON public.cn_receipt;
DROP POLICY IF EXISTS "Compliance staff can view activity log" ON public.compliance_activity_log;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.compliance_arrears;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.compliance_audits;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.compliance_payment_plans;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.compliance_registrations;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.compliance_waivers;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.contribution_vouchers;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.contributor_profiles;
DROP POLICY IF EXISTS "Admins can view policy audit log" ON public.data_policy_audit_log;
DROP POLICY IF EXISTS "Admins can manage data scope rules" ON public.data_scope_rules;
DROP POLICY IF EXISTS "Designation hierarchy manageable by admins" ON public.designation_hierarchy;
DROP POLICY IF EXISTS "Designation hierarchy viewable by authenticated users" ON public.designation_hierarchy;
DROP POLICY IF EXISTS "Designations manageable by admins" ON public.designations;
DROP POLICY IF EXISTS "Designations viewable by authenticated users" ON public.designations;
DROP POLICY IF EXISTS "Admins can manage email campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "elc_admin" ON public.email_layout_components;
DROP POLICY IF EXISTS "elc_select" ON public.email_layout_components;
DROP POLICY IF EXISTS "Authenticated users can manage email provider test logs" ON public.email_provider_test_logs;
DROP POLICY IF EXISTS "Admins can delete er_commence" ON public.er_commence;
DROP POLICY IF EXISTS "Admins can update er_commence" ON public.er_commence;
DROP POLICY IF EXISTS "Authenticated users can insert er_commence" ON public.er_commence;
DROP POLICY IF EXISTS "Authenticated users can view er_commence" ON public.er_commence;
DROP POLICY IF EXISTS "Admins can delete er_last_regno" ON public.er_last_regno;
DROP POLICY IF EXISTS "Admins can update er_last_regno" ON public.er_last_regno;
DROP POLICY IF EXISTS "Authenticated users can insert er_last_regno" ON public.er_last_regno;
DROP POLICY IF EXISTS "Authenticated users can view er_last_regno" ON public.er_last_regno;
DROP POLICY IF EXISTS "Admins can delete er_locations" ON public.er_locations;
DROP POLICY IF EXISTS "Admins can update er_locations" ON public.er_locations;
DROP POLICY IF EXISTS "Authenticated users can insert er_locations" ON public.er_locations;
DROP POLICY IF EXISTS "Authenticated users can view er_locations" ON public.er_locations;
DROP POLICY IF EXISTS "Admins can delete er_master" ON public.er_master;
DROP POLICY IF EXISTS "Admins can update er_master" ON public.er_master;
DROP POLICY IF EXISTS "Admins can view er_master" ON public.er_master;
DROP POLICY IF EXISTS "Authenticated users can insert er_master" ON public.er_master;
DROP POLICY IF EXISTS "Admins can delete er_notes" ON public.er_notes;
DROP POLICY IF EXISTS "Admins can update er_notes" ON public.er_notes;
DROP POLICY IF EXISTS "Authenticated users can insert er_notes" ON public.er_notes;
DROP POLICY IF EXISTS "Authenticated users can view er_notes" ON public.er_notes;
DROP POLICY IF EXISTS "Admins can delete er_notification" ON public.er_notification;
DROP POLICY IF EXISTS "Admins can update er_notification" ON public.er_notification;
DROP POLICY IF EXISTS "Authenticated users can insert er_notification" ON public.er_notification;
DROP POLICY IF EXISTS "Authenticated users can view er_notification" ON public.er_notification;
DROP POLICY IF EXISTS "Admins can delete er_owner" ON public.er_owner;
DROP POLICY IF EXISTS "Admins can update er_owner" ON public.er_owner;
DROP POLICY IF EXISTS "Authenticated users can insert er_owner" ON public.er_owner;
DROP POLICY IF EXISTS "Authenticated users can view er_owner" ON public.er_owner;
DROP POLICY IF EXISTS "Admins can delete er_suit" ON public.er_suit;
DROP POLICY IF EXISTS "Admins can update er_suit" ON public.er_suit;
DROP POLICY IF EXISTS "Authenticated users can insert er_suit" ON public.er_suit;
DROP POLICY IF EXISTS "Authenticated users can view er_suit" ON public.er_suit;
DROP POLICY IF EXISTS "Admins can delete er_visit" ON public.er_visit;
DROP POLICY IF EXISTS "Admins can update er_visit" ON public.er_visit;
DROP POLICY IF EXISTS "Authenticated users can insert er_visit" ON public.er_visit;
DROP POLICY IF EXISTS "Authenticated users can view er_visit" ON public.er_visit;
DROP POLICY IF EXISTS "Admins can manage change logs" ON public.external_api_change_log;
DROP POLICY IF EXISTS "Anyone can read change logs of public APIs" ON public.external_api_change_log;
DROP POLICY IF EXISTS "Authenticated users can read change logs" ON public.external_api_change_log;
DROP POLICY IF EXISTS "Admins can view all execution logs" ON public.external_api_execution_logs;
DROP POLICY IF EXISTS "Users can insert execution logs" ON public.external_api_execution_logs;
DROP POLICY IF EXISTS "Users can view own execution logs" ON public.external_api_execution_logs;
DROP POLICY IF EXISTS "Admins can manage external APIs" ON public.external_api_master;
DROP POLICY IF EXISTS "Anyone can read public active APIs" ON public.external_api_master;
DROP POLICY IF EXISTS "Authenticated users can read active external APIs" ON public.external_api_master;
DROP POLICY IF EXISTS "Admins can manage request fields" ON public.external_api_request_fields;
DROP POLICY IF EXISTS "Anyone can read request fields of public APIs" ON public.external_api_request_fields;
DROP POLICY IF EXISTS "Authenticated users can read request fields" ON public.external_api_request_fields;
DROP POLICY IF EXISTS "Admins can manage response fields" ON public.external_api_response_fields;
DROP POLICY IF EXISTS "Anyone can read response fields of public APIs" ON public.external_api_response_fields;
DROP POLICY IF EXISTS "Authenticated users can read response fields" ON public.external_api_response_fields;
DROP POLICY IF EXISTS "Admins can manage role mappings" ON public.external_api_role_mapping;
DROP POLICY IF EXISTS "Authenticated users can read role mappings" ON public.external_api_role_mapping;
DROP POLICY IF EXISTS "Admins can manage field security rules" ON public.field_security_rules;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.in_app_notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.in_app_notifications;
DROP POLICY IF EXISTS "ian_insert" ON public.in_app_notifications;
DROP POLICY IF EXISTS "ian_select" ON public.in_app_notifications;
DROP POLICY IF EXISTS "ian_update" ON public.in_app_notifications;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.inspector_activities;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.inspector_assignments;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.inspector_weekly_plans;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.inspector_zones;
DROP POLICY IF EXISTS "Authenticated users can insert ip_application_documents" ON public.ip_application_documents;
DROP POLICY IF EXISTS "Authenticated users can update ip_application_documents" ON public.ip_application_documents;
DROP POLICY IF EXISTS "Authenticated users can view ip_application_documents" ON public.ip_application_documents;
DROP POLICY IF EXISTS "Users can insert ip_audit_log" ON public.ip_audit_log;
DROP POLICY IF EXISTS "Users can view all ip_audit_log" ON public.ip_audit_log;
DROP POLICY IF EXISTS "Admins can delete ip_depend" ON public.ip_depend;
DROP POLICY IF EXISTS "Admins can update ip_depend" ON public.ip_depend;
DROP POLICY IF EXISTS "ip_depend_insert" ON public.ip_depend;
DROP POLICY IF EXISTS "ip_depend_select" ON public.ip_depend;
DROP POLICY IF EXISTS "Allow all authenticated" ON public.ip_depend_staging;
DROP POLICY IF EXISTS "Admins can delete ip_documents" ON public.ip_documents;
DROP POLICY IF EXISTS "Admins can update ip_documents" ON public.ip_documents;
DROP POLICY IF EXISTS "Users can insert ip_documents" ON public.ip_documents;
DROP POLICY IF EXISTS "Users can view all ip_documents" ON public.ip_documents;
DROP POLICY IF EXISTS "Admins can update ip_employer" ON public.ip_employer;
DROP POLICY IF EXISTS "Users can insert ip_employer records" ON public.ip_employer;
DROP POLICY IF EXISTS "Users can view ip_employer records" ON public.ip_employer;
DROP POLICY IF EXISTS "Admins can manage ip_last_self_emp" ON public.ip_last_self_emp;
DROP POLICY IF EXISTS "Authenticated can read ip_last_self_emp" ON public.ip_last_self_emp;
DROP POLICY IF EXISTS "Users can insert ip_master" ON public.ip_master;
DROP POLICY IF EXISTS "Users can update ip_master" ON public.ip_master;
DROP POLICY IF EXISTS "Users can view all ip_master" ON public.ip_master;
DROP POLICY IF EXISTS "Admins can view conflicts" ON public.ip_master_column_conflicts;
DROP POLICY IF EXISTS "Users can insert ip_name" ON public.ip_name;
DROP POLICY IF EXISTS "Users can view all ip_name" ON public.ip_name;
DROP POLICY IF EXISTS "ip_notes_delete" ON public.ip_notes;
DROP POLICY IF EXISTS "ip_notes_insert" ON public.ip_notes;
DROP POLICY IF EXISTS "ip_notes_select" ON public.ip_notes;
DROP POLICY IF EXISTS "ip_notes_update" ON public.ip_notes;
DROP POLICY IF EXISTS "Allow all access to ip_self_category" ON public.ip_self_category;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.ip_self_category;
DROP POLICY IF EXISTS "Allow service role full access" ON public.ip_self_category;
DROP POLICY IF EXISTS "Allow all access to ip_self_commence" ON public.ip_self_commence;
DROP POLICY IF EXISTS "Admins can manage ip_self_employ" ON public.ip_self_employ;
DROP POLICY IF EXISTS "Authenticated can read ip_self_employ" ON public.ip_self_employ;
DROP POLICY IF EXISTS "Allow all access to ip_self_locations" ON public.ip_self_locations;
DROP POLICY IF EXISTS "Allow all access to ip_self_weeks_paid" ON public.ip_self_weeks_paid;
DROP POLICY IF EXISTS "Allow public read access" ON public.ip_status;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.ip_status;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.ip_vol_contrib;
DROP POLICY IF EXISTS "Allow service role full access" ON public.ip_vol_contrib;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.ip_vol_contrib_wages;
DROP POLICY IF EXISTS "Allow service role full access" ON public.ip_vol_contrib_wages;
DROP POLICY IF EXISTS "Admins can delete ip_wages" ON public.ip_wages;
DROP POLICY IF EXISTS "Admins can insert ip_wages" ON public.ip_wages;
DROP POLICY IF EXISTS "Admins can read ip_wages" ON public.ip_wages;
DROP POLICY IF EXISTS "Admins can update ip_wages" ON public.ip_wages;
DROP POLICY IF EXISTS "Users can view audit log" ON public.legal_admin_audit;
DROP POLICY IF EXISTS "Users can view audit log" ON public.legal_audit_log;
DROP POLICY IF EXISTS "Authorized users can create cases" ON public.legal_cases;
DROP POLICY IF EXISTS "Authorized users can update cases" ON public.legal_cases;
DROP POLICY IF EXISTS "Users can view non-confidential cases" ON public.legal_cases;
DROP POLICY IF EXISTS "Admins can manage code sets" ON public.legal_code_sets;
DROP POLICY IF EXISTS "Admins can manage complainant settings" ON public.legal_complainant_settings;
DROP POLICY IF EXISTS "Authorized users can view complainant settings" ON public.legal_complainant_settings;
DROP POLICY IF EXISTS "Users can manage own saved searches" ON public.legal_document_saved_searches;
DROP POLICY IF EXISTS "Authorized users can create shares" ON public.legal_document_shares;
DROP POLICY IF EXISTS "Authorized users can update shares" ON public.legal_document_shares;
DROP POLICY IF EXISTS "Authorized users can view shares" ON public.legal_document_shares;
DROP POLICY IF EXISTS "Authorized users can manage documents" ON public.legal_documents;
DROP POLICY IF EXISTS "Users can view documents for accessible cases" ON public.legal_documents;
DROP POLICY IF EXISTS "Authorized users can manage hearings" ON public.legal_hearings;
DROP POLICY IF EXISTS "Users can view hearings for accessible cases" ON public.legal_hearings;
DROP POLICY IF EXISTS "Admins can manage integrations" ON public.legal_integrations;
DROP POLICY IF EXISTS "Authorized users can create/update orders" ON public.legal_orders;
DROP POLICY IF EXISTS "Authorized users can update orders" ON public.legal_orders;
DROP POLICY IF EXISTS "Users can view orders for accessible cases" ON public.legal_orders;
DROP POLICY IF EXISTS "Authorized users can manage parties" ON public.legal_parties;
DROP POLICY IF EXISTS "Users can view parties for accessible cases" ON public.legal_parties;
DROP POLICY IF EXISTS "Users can view penalties, settlements, timeline, audit" ON public.legal_penalties;
DROP POLICY IF EXISTS "Users can manage own saved views" ON public.legal_saved_views;
DROP POLICY IF EXISTS "Users can view settlements" ON public.legal_settlements;
DROP POLICY IF EXISTS "Admins can manage SLA rules" ON public.legal_sla_rules;
DROP POLICY IF EXISTS "Admins can manage transitions" ON public.legal_status_transitions;
DROP POLICY IF EXISTS "Authorized users can manage tasks" ON public.legal_tasks;
DROP POLICY IF EXISTS "Users can view tasks for accessible cases" ON public.legal_tasks;
DROP POLICY IF EXISTS "Admins can manage templates" ON public.legal_templates;
DROP POLICY IF EXISTS "Users can view timeline events" ON public.legal_timeline_events;
DROP POLICY IF EXISTS "Admins can view login security events" ON public.login_security_events;
DROP POLICY IF EXISTS "Service role can insert login events" ON public.login_security_events;
DROP POLICY IF EXISTS "Service role can select login events" ON public.login_security_events;
DROP POLICY IF EXISTS "Allow authenticated all on meeting_api_logs" ON public.meeting_api_logs;
DROP POLICY IF EXISTS "Allow authenticated all on meeting_history" ON public.meeting_history;
DROP POLICY IF EXISTS "Authenticated users can read slot reservations" ON public.meeting_slot_reservations;
DROP POLICY IF EXISTS "Service role manages slot reservations" ON public.meeting_slot_reservations;
DROP POLICY IF EXISTS "Allow authenticated all on meetings" ON public.meetings;
DROP POLICY IF EXISTS "mfa_admin" ON public.mfa_config;
DROP POLICY IF EXISTS "mfa_select" ON public.mfa_config;
DROP POLICY IF EXISTS "Users can insert mi_tb_del_ip_depend" ON public.mi_tb_del_ip_depend;
DROP POLICY IF EXISTS "Users can view all mi_tb_del_ip_depend" ON public.mi_tb_del_ip_depend;
DROP POLICY IF EXISTS "Admins can delete module_actions" ON public.module_actions;
DROP POLICY IF EXISTS "Admins can insert module_actions" ON public.module_actions;
DROP POLICY IF EXISTS "Admins can manage actions" ON public.module_actions;
DROP POLICY IF EXISTS "Admins can update module_actions" ON public.module_actions;
DROP POLICY IF EXISTS "Anyone can view enabled actions" ON public.module_actions;
DROP POLICY IF EXISTS "Authenticated can view module_actions" ON public.module_actions;
DROP POLICY IF EXISTS "Admins can manage button bindings" ON public.module_button_bindings;
DROP POLICY IF EXISTS "Authenticated users can view button bindings" ON public.module_button_bindings;
DROP POLICY IF EXISTS "Admins can manage module tables" ON public.module_tables;
DROP POLICY IF EXISTS "nl_insert" ON public.notification_logs;
DROP POLICY IF EXISTS "nl_select" ON public.notification_logs;
DROP POLICY IF EXISTS "nl_update" ON public.notification_logs;
DROP POLICY IF EXISTS "Admins can manage providers" ON public.notification_providers;
DROP POLICY IF EXISTS "Authenticated users can view providers" ON public.notification_providers;
DROP POLICY IF EXISTS "np_admin" ON public.notification_providers;
DROP POLICY IF EXISTS "ntal_insert" ON public.notification_template_audit_logs;
DROP POLICY IF EXISTS "ntal_select" ON public.notification_template_audit_logs;
DROP POLICY IF EXISTS "ntv_admin" ON public.notification_template_versions;
DROP POLICY IF EXISTS "ntv_select" ON public.notification_template_versions;
DROP POLICY IF EXISTS "nt_admin" ON public.notification_templates;
DROP POLICY IF EXISTS "nt_select" ON public.notification_templates;
DROP POLICY IF EXISTS "Admins can insert office_locations" ON public.office_locations;
DROP POLICY IF EXISTS "Admins can manage office locations" ON public.office_locations;
DROP POLICY IF EXISTS "Admins can update office_locations" ON public.office_locations;
DROP POLICY IF EXISTS "Authenticated users can view office_locations" ON public.office_locations;
DROP POLICY IF EXISTS "ph_insert" ON public.password_history;
DROP POLICY IF EXISTS "ph_own" ON public.password_history;
DROP POLICY IF EXISTS "pp_admin" ON public.password_policies;
DROP POLICY IF EXISTS "pp_select" ON public.password_policies;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.payment_plan_installments;
DROP POLICY IF EXISTS "Admins can read pii_unlock_logs" ON public.pii_unlock_logs;
DROP POLICY IF EXISTS "Authenticated can insert pii_unlock_logs" ON public.pii_unlock_logs;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own or admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access on public_api_access_logs" ON public.public_api_access_logs;
DROP POLICY IF EXISTS "Service role full access on public_api_keys" ON public.public_api_keys;
DROP POLICY IF EXISTS "Service role full access on public_api_rate_limits" ON public.public_api_rate_limits;
DROP POLICY IF EXISTS "qa_ailog_admin_all" ON public.qa_ai_generation_log;
DROP POLICY IF EXISTS "Admin full access to qa_change_requests" ON public.qa_change_requests;
DROP POLICY IF EXISTS "Authenticated users can create change requests" ON public.qa_change_requests;
DROP POLICY IF EXISTS "Admin full access to qa_enforcement_log" ON public.qa_enforcement_log;
DROP POLICY IF EXISTS "qa_runs_admin_write" ON public.qa_execution_runs;
DROP POLICY IF EXISTS "qa_runs_authenticated_read" ON public.qa_execution_runs;
DROP POLICY IF EXISTS "qa_knowledge_admin_write" ON public.qa_knowledge_entries;
DROP POLICY IF EXISTS "qa_knowledge_authenticated_read" ON public.qa_knowledge_entries;
DROP POLICY IF EXISTS "qa_dependencies_admin_write" ON public.qa_module_dependencies;
DROP POLICY IF EXISTS "qa_dependencies_authenticated_read" ON public.qa_module_dependencies;
DROP POLICY IF EXISTS "qa_settings_admin_write" ON public.qa_pipeline_settings;
DROP POLICY IF EXISTS "qa_settings_authenticated_read" ON public.qa_pipeline_settings;
DROP POLICY IF EXISTS "qa_testcases_admin_write" ON public.qa_test_cases;
DROP POLICY IF EXISTS "qa_testcases_authenticated_read" ON public.qa_test_cases;
DROP POLICY IF EXISTS "qa_results_admin_write" ON public.qa_test_results;
DROP POLICY IF EXISTS "qa_results_authenticated_read" ON public.qa_test_results;
DROP POLICY IF EXISTS "Compliance staff full access" ON public.remittance_schedule;
DROP POLICY IF EXISTS "Role hierarchy manageable by admins" ON public.role_hierarchy;
DROP POLICY IF EXISTS "Role hierarchy viewable by authenticated users" ON public.role_hierarchy;
DROP POLICY IF EXISTS "Admins can delete role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can insert role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Authenticated can view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "rp_admin" ON public.role_permissions;
DROP POLICY IF EXISTS "rp_select" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can delete non-system roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.roles;
DROP POLICY IF EXISTS "Anyone can view roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can manage route_security_config" ON public.route_security_config;
DROP POLICY IF EXISTS "Authenticated can read route_security_config" ON public.route_security_config;
DROP POLICY IF EXISTS "Applicants can update draft applications or resubmit" ON public.sample_applications;
DROP POLICY IF EXISTS "Users can create their own applications" ON public.sample_applications;
DROP POLICY IF EXISTS "Users can delete applications" ON public.sample_applications;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.sample_applications;
DROP POLICY IF EXISTS "Only admins can insert schema change approvals" ON public.schema_change_approvals;
DROP POLICY IF EXISTS "Only admins can view schema change approvals" ON public.schema_change_approvals;
DROP POLICY IF EXISTS "Admins can view migration logs" ON public.schema_migration_logs;
DROP POLICY IF EXISTS "Admins can manage security_ip_blocks" ON public.security_ip_blocks;
DROP POLICY IF EXISTS "Anyone can read active ip blocks" ON public.security_ip_blocks;
DROP POLICY IF EXISTS "Admins can manage security_policy_config" ON public.security_policy_config;
DROP POLICY IF EXISTS "Authenticated can read security_policy_config" ON public.security_policy_config;
DROP POLICY IF EXISTS "Admins can view audit trail" ON public.system_audit_trail;
DROP POLICY IF EXISTS "Authenticated can insert audit trail" ON public.system_audit_trail;
DROP POLICY IF EXISTS "Admins can view business events" ON public.system_business_events;
DROP POLICY IF EXISTS "Authenticated can insert business events" ON public.system_business_events;
DROP POLICY IF EXISTS "Admins can view error logs" ON public.system_error_logs;
DROP POLICY IF EXISTS "Authenticated can insert error logs" ON public.system_error_logs;
DROP POLICY IF EXISTS "Admins can view integration logs" ON public.system_integration_logs;
DROP POLICY IF EXISTS "Authenticated can insert integration logs" ON public.system_integration_logs;
DROP POLICY IF EXISTS "Admins can view performance metrics" ON public.system_performance_metrics;
DROP POLICY IF EXISTS "Authenticated can insert performance metrics" ON public.system_performance_metrics;
DROP POLICY IF EXISTS "Admins can view security logs" ON public.system_security_logs;
DROP POLICY IF EXISTS "Authenticated can insert security logs" ON public.system_security_logs;
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can view technical logs" ON public.system_technical_logs;
DROP POLICY IF EXISTS "Authenticated can insert technical logs" ON public.system_technical_logs;
DROP POLICY IF EXISTS "Allow read access for anonymous users" ON public.tb_activity;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.tb_activity;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.tb_c3_status;
DROP POLICY IF EXISTS "Allow authenticated users to read tb_country" ON public.tb_country;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.tb_deductions_tax_table_details;
DROP POLICY IF EXISTS "Allow service role full access" ON public.tb_deductions_tax_table_details;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.tb_deductions_tax_table_header;
DROP POLICY IF EXISTS "Allow service role full access" ON public.tb_deductions_tax_table_header;
DROP POLICY IF EXISTS "Allow authenticated users to read tb_dependent_relation" ON public.tb_dependent_relation;
DROP POLICY IF EXISTS "Allow read access for anonymous users" ON public.tb_district;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.tb_district;
DROP POLICY IF EXISTS "Allow authenticated users to read tb_eye_color" ON public.tb_eye_color;
DROP POLICY IF EXISTS "Allow read access for anonymous users" ON public.tb_indus;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.tb_indus;
DROP POLICY IF EXISTS "Allow read access for anonymous users" ON public.tb_inspector;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.tb_inspector;
DROP POLICY IF EXISTS "Admins can manage legal status" ON public.tb_legal_status;
DROP POLICY IF EXISTS "Authenticated users can read legal status" ON public.tb_legal_status;
DROP POLICY IF EXISTS "Allow authenticated insert on tb_levy_slab_details" ON public.tb_levy_slab_details;
DROP POLICY IF EXISTS "Allow authenticated read access on tb_levy_slab_details" ON public.tb_levy_slab_details;
DROP POLICY IF EXISTS "Allow authenticated update on tb_levy_slab_details" ON public.tb_levy_slab_details;
DROP POLICY IF EXISTS "Allow authenticated insert on tb_levy_slabs" ON public.tb_levy_slabs;
DROP POLICY IF EXISTS "Allow authenticated read access on tb_levy_slabs" ON public.tb_levy_slabs;
DROP POLICY IF EXISTS "Allow authenticated update on tb_levy_slabs" ON public.tb_levy_slabs;
DROP POLICY IF EXISTS "Admins can manage marital statuses" ON public.tb_marital;
DROP POLICY IF EXISTS "Anon can read marital statuses" ON public.tb_marital;
DROP POLICY IF EXISTS "Authenticated users can read marital statuses" ON public.tb_marital;
DROP POLICY IF EXISTS "Allow authenticated users to read tb_occup" ON public.tb_occup;
DROP POLICY IF EXISTS "Allow read access for anonymous users" ON public.tb_office;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.tb_office;
DROP POLICY IF EXISTS "Allow read access to tb_office" ON public.tb_office;
DROP POLICY IF EXISTS "Admins can insert departments" ON public.tb_office_departments;
DROP POLICY IF EXISTS "Admins can update departments" ON public.tb_office_departments;
DROP POLICY IF EXISTS "Allow read access to tb_office_departments" ON public.tb_office_departments;
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.tb_office_departments;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.tb_penalty;
DROP POLICY IF EXISTS "Allow service role full access" ON public.tb_penalty;
DROP POLICY IF EXISTS "Allow authenticated users to read tb_postal_district" ON public.tb_postal_district;
DROP POLICY IF EXISTS "tb_relation_select" ON public.tb_relation;
DROP POLICY IF EXISTS "Allow read access for anonymous users" ON public.tb_sector;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.tb_sector;
DROP POLICY IF EXISTS "Allow all access to tb_self_emp_contrib_rate" ON public.tb_self_emp_contrib_rate;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.tb_self_emp_contrib_rate;
DROP POLICY IF EXISTS "Allow service role full access" ON public.tb_self_emp_contrib_rate;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.tb_ssc_rates;
DROP POLICY IF EXISTS "Allow service role full access" ON public.tb_ssc_rates;
DROP POLICY IF EXISTS "Allow authenticated read access on tb_vc_contrib_rate" ON public.tb_vc_contrib_rate;
DROP POLICY IF EXISTS "tb_vc_contrib_rate_modify" ON public.tb_vc_eligibility_config;
DROP POLICY IF EXISTS "tb_vc_contrib_rate_select" ON public.tb_vc_eligibility_config;
DROP POLICY IF EXISTS "Allow authenticated users to read tb_verify" ON public.tb_verify;
DROP POLICY IF EXISTS "Allow read access for anonymous users" ON public.tb_villages;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.tb_villages;
DROP POLICY IF EXISTS "Users can delete tmp_ip_dependents" ON public.tmp_ip_dependents;
DROP POLICY IF EXISTS "Users can insert tmp_ip_dependents" ON public.tmp_ip_dependents;
DROP POLICY IF EXISTS "Users can update tmp_ip_dependents" ON public.tmp_ip_dependents;
DROP POLICY IF EXISTS "Users can view all tmp_ip_dependents" ON public.tmp_ip_dependents;
DROP POLICY IF EXISTS "Users can delete tmp_ip_master" ON public.tmp_ip_master;
DROP POLICY IF EXISTS "Users can insert tmp_ip_master" ON public.tmp_ip_master;
DROP POLICY IF EXISTS "Users can update tmp_ip_master" ON public.tmp_ip_master;
DROP POLICY IF EXISTS "Users can view all tmp_ip_master" ON public.tmp_ip_master;
DROP POLICY IF EXISTS "Users can delete tmp_ip_notes" ON public.tmp_ip_notes;
DROP POLICY IF EXISTS "Users can insert tmp_ip_notes" ON public.tmp_ip_notes;
DROP POLICY IF EXISTS "Users can update tmp_ip_notes" ON public.tmp_ip_notes;
DROP POLICY IF EXISTS "Users can view all tmp_ip_notes" ON public.tmp_ip_notes;
DROP POLICY IF EXISTS "Admins can read unauthorized_access_logs" ON public.unauthorized_access_logs;
DROP POLICY IF EXISTS "Anyone can insert unauthorized_access_logs" ON public.unauthorized_access_logs;
DROP POLICY IF EXISTS "Admins can manage user data overrides" ON public.user_data_overrides;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "unp_admin" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "unp_own" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "upo_admin" ON public.user_permission_overrides;
DROP POLICY IF EXISTS "upo_select" ON public.user_permission_overrides;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "us_admin" ON public.user_sessions;
DROP POLICY IF EXISTS "us_own" ON public.user_sessions;
DROP POLICY IF EXISTS "Allow admins write workflow_action_configurations" ON public.workflow_action_configurations;
DROP POLICY IF EXISTS "Allow authenticated read workflow_action_configurations" ON public.workflow_action_configurations;
DROP POLICY IF EXISTS "Users with workflow permission can delete field updates" ON public.workflow_action_field_updates;
DROP POLICY IF EXISTS "Users with workflow permission can insert field updates" ON public.workflow_action_field_updates;
DROP POLICY IF EXISTS "Users with workflow permission can update field updates" ON public.workflow_action_field_updates;
DROP POLICY IF EXISTS "Users with workflow permission can view field updates" ON public.workflow_action_field_updates;
DROP POLICY IF EXISTS "Admins can manage action notifications" ON public.workflow_action_notifications;
DROP POLICY IF EXISTS "Authenticated users can view action notifications" ON public.workflow_action_notifications;
DROP POLICY IF EXISTS "Allow admins write workflow_action_outcomes" ON public.workflow_action_outcomes;
DROP POLICY IF EXISTS "Allow authenticated read workflow_action_outcomes" ON public.workflow_action_outcomes;
DROP POLICY IF EXISTS "Allow admins write workflow_action_types" ON public.workflow_action_types;
DROP POLICY IF EXISTS "Allow authenticated read workflow_action_types" ON public.workflow_action_types;
DROP POLICY IF EXISTS "Allow admins write workflow_api_configurations" ON public.workflow_api_configurations;
DROP POLICY IF EXISTS "Allow authenticated read workflow_api_configurations" ON public.workflow_api_configurations;
DROP POLICY IF EXISTS "workflow_api_execution_log_insert_authenticated" ON public.workflow_api_execution_log;
DROP POLICY IF EXISTS "workflow_api_execution_log_select_authenticated" ON public.workflow_api_execution_log;
DROP POLICY IF EXISTS "Admins can manage workflow definitions" ON public.workflow_definitions;
DROP POLICY IF EXISTS "Authenticated users can view workflow definitions" ON public.workflow_definitions;
DROP POLICY IF EXISTS "Admins can view workflow logs" ON public.workflow_execution_logs;
DROP POLICY IF EXISTS "Authenticated can insert workflow logs" ON public.workflow_execution_logs;
DROP POLICY IF EXISTS "Authenticated users can create workflow instances" ON public.workflow_instances;
DROP POLICY IF EXISTS "Authenticated users can update their workflow instances" ON public.workflow_instances;
DROP POLICY IF EXISTS "Authenticated users can view workflow instances" ON public.workflow_instances;
DROP POLICY IF EXISTS "Authenticated users can view logs" ON public.workflow_logs;
DROP POLICY IF EXISTS "System can create logs" ON public.workflow_logs;
DROP POLICY IF EXISTS "Authenticated users can manage workflow meeting departments" ON public.workflow_meeting_departments;
DROP POLICY IF EXISTS "Admins can view workflow security audit logs" ON public.workflow_security_audit_log;
DROP POLICY IF EXISTS "System can insert workflow security audit logs" ON public.workflow_security_audit_log;
DROP POLICY IF EXISTS "workflow_step_action_api_delete_admin" ON public.workflow_step_action_api;
DROP POLICY IF EXISTS "workflow_step_action_api_insert_admin" ON public.workflow_step_action_api;
DROP POLICY IF EXISTS "workflow_step_action_api_select_authenticated" ON public.workflow_step_action_api;
DROP POLICY IF EXISTS "workflow_step_action_api_update_admin" ON public.workflow_step_action_api;
DROP POLICY IF EXISTS "workflow_step_action_api_body_delete_admin" ON public.workflow_step_action_api_body;
DROP POLICY IF EXISTS "workflow_step_action_api_body_insert_admin" ON public.workflow_step_action_api_body;
DROP POLICY IF EXISTS "workflow_step_action_api_body_select_authenticated" ON public.workflow_step_action_api_body;
DROP POLICY IF EXISTS "workflow_step_action_api_body_update_admin" ON public.workflow_step_action_api_body;
DROP POLICY IF EXISTS "Admins can manage step actions" ON public.workflow_step_actions;
DROP POLICY IF EXISTS "Authenticated users can view step actions" ON public.workflow_step_actions;
DROP POLICY IF EXISTS "Admins can manage workflow steps" ON public.workflow_steps;
DROP POLICY IF EXISTS "Authenticated users can view workflow steps" ON public.workflow_steps;
DROP POLICY IF EXISTS "System can manage tasks" ON public.workflow_tasks;
DROP POLICY IF EXISTS "Users can view assigned tasks by role or user" ON public.workflow_tasks;
DROP POLICY IF EXISTS "Admins can manage triggers" ON public.workflow_triggers;
DROP POLICY IF EXISTS "Authenticated users can view triggers" ON public.workflow_triggers;


-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE public.api_config_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_scope_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_lockdown_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.au_ip_last_self_emp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.au_ip_self_employ ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_arrears_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_audit_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_c3_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_c3_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_employee_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_field_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_inspector_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_remittance_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bema_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c3_bonus_levy_exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c3_calculation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c3_calculation_config_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c3_config_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c3_config_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c3_config_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c3_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c3_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c3_unified_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c3_wage_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cn_c3_reported ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cn_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cn_payment_header ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cn_receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_arrears ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_policy_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_scope_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designation_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_layout_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_provider_test_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.er_commence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.er_last_regno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.er_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.er_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.er_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.er_notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.er_owner ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.er_suit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.er_visit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_api_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_api_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_api_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_api_request_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_api_response_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_api_role_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_security_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspector_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspector_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspector_weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspector_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_depend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_depend_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_employer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_last_self_emp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_master_column_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_name ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_self_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_self_commence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_self_employ ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_self_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_self_weeks_paid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_vol_contrib ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_vol_contrib_wages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_wages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_admin_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_code_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_complainant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_document_saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_slot_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mi_tb_del_ip_depend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_button_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_template_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pii_unlock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_api_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ai_generation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_enforcement_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_module_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_pipeline_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remittance_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_security_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_change_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_ip_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_policy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_business_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_technical_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_c3_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_country ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_deductions_tax_table_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_deductions_tax_table_header ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_dependent_relation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_district ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_eye_color ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_indus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_inspector ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_legal_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_levy_slab_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_levy_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_marital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_occup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_office ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_office_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_penalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_postal_district ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_relation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_sector ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_self_emp_contrib_rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_ssc_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_vc_contrib_rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_vc_eligibility_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_verify ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmp_ip_dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmp_ip_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmp_ip_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unauthorized_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_action_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_action_field_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_action_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_action_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_api_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_api_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_meeting_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_action_api ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_action_api_body ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_triggers ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SECTION 3: CREATE ALL RLS POLICIES (472 policies)
-- ============================================================================

-- ── api_config_audit_logs ──
CREATE POLICY "Admins can insert api_config_audit_logs" ON public.api_config_audit_logs
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Authenticated users can read api_config_audit_logs" ON public.api_config_audit_logs
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── api_key_scope_assignments ──
CREATE POLICY "Admins can manage api_key_scope_assignments" ON public.api_key_scope_assignments
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Authenticated users can read api_key_scope_assignments" ON public.api_key_scope_assignments
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── api_logs ──
CREATE POLICY "Authenticated users can insert api logs" ON public.api_logs
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view api logs" ON public.api_logs
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can insert api logs" ON public.api_logs
  AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

-- ── api_rate_limit_policies ──
CREATE POLICY "Admins can manage api_rate_limit_policies" ON public.api_rate_limit_policies
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Authenticated users can read api_rate_limit_policies" ON public.api_rate_limit_policies
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── api_registry ──
CREATE POLICY "Admins can manage api_registry" ON public.api_registry
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Anyone can read enabled api_registry" ON public.api_registry
  AS PERMISSIVE FOR SELECT TO public
  USING ((is_enabled = true));

CREATE POLICY "Authenticated users can read api_registry" ON public.api_registry
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── api_settings ──
CREATE POLICY "Admins can manage API settings" ON public.api_settings
  AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can read api_settings" ON public.api_settings
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

-- ── app_lockdown_state ──
CREATE POLICY "Admins can manage lockdown state" ON public.app_lockdown_state
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Anyone can read lockdown state" ON public.app_lockdown_state
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);

-- ── app_modules ──
CREATE POLICY "Admins can delete app_modules" ON public.app_modules
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Admins can insert app_modules" ON public.app_modules
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Admins can update app_modules" ON public.app_modules
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Anyone can view enabled modules" ON public.app_modules
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (((is_enabled = true) OR has_role(auth.uid(), 'Admin'::app_role)));

CREATE POLICY "Authenticated can view app_modules" ON public.app_modules
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── au_ip_last_self_emp ──
CREATE POLICY "Admins can manage au_ip_last_self_emp" ON public.au_ip_last_self_emp
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Authenticated can read au_ip_last_self_emp" ON public.au_ip_last_self_emp
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── au_ip_self_employ ──
CREATE POLICY "Admins can manage au_ip_self_employ" ON public.au_ip_self_employ
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Authenticated can read au_ip_self_employ" ON public.au_ip_self_employ
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── audit_interviews ──
CREATE POLICY "Compliance staff full access" ON public.audit_interviews
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── audit_logs ──
CREATE POLICY "al_insert" ON public.audit_logs
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "al_select" ON public.audit_logs
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

-- ── bema_activity_log ──
CREATE POLICY "Staff can view activity log" ON public.bema_activity_log
  AS PERMISSIVE FOR SELECT TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_arrears_ledger ──
CREATE POLICY "Staff full access" ON public.bema_arrears_ledger
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_audit_cases ──
CREATE POLICY "Staff full access" ON public.bema_audit_cases
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_c3_line_items ──
CREATE POLICY "Staff full access" ON public.bema_c3_line_items
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_c3_submissions ──
CREATE POLICY "Staff full access" ON public.bema_c3_submissions
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_contributors ──
CREATE POLICY "Staff full access" ON public.bema_contributors
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_employee_interviews ──
CREATE POLICY "Staff full access" ON public.bema_employee_interviews
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_field_activities ──
CREATE POLICY "Staff full access" ON public.bema_field_activities
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_inspector_assignments ──
CREATE POLICY "Staff full access" ON public.bema_inspector_assignments
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_installments ──
CREATE POLICY "Staff full access" ON public.bema_installments
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_payment_plans ──
CREATE POLICY "Staff full access" ON public.bema_payment_plans
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_registrations ──
CREATE POLICY "Staff full access" ON public.bema_registrations
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_remittance_calendar ──
CREATE POLICY "Staff full access" ON public.bema_remittance_calendar
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_vouchers ──
CREATE POLICY "Staff full access" ON public.bema_vouchers
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_waivers ──
CREATE POLICY "Staff full access" ON public.bema_waivers
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_weekly_plans ──
CREATE POLICY "Staff full access" ON public.bema_weekly_plans
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── bema_zones ──
CREATE POLICY "Staff full access" ON public.bema_zones
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── c3_bonus_levy_exemptions ──
CREATE POLICY "Admins can delete c3_bonus_levy_exemptions" ON public.c3_bonus_levy_exemptions
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Admins can update c3_bonus_levy_exemptions" ON public.c3_bonus_levy_exemptions
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Allow authenticated insert on c3_bonus_levy_exemptions" ON public.c3_bonus_levy_exemptions
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read on c3_bonus_levy_exemptions" ON public.c3_bonus_levy_exemptions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── c3_calculation_config ──
CREATE POLICY "Admins can manage configs" ON public.c3_calculation_config
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can read active configs" ON public.c3_calculation_config
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_active = true));

-- ── c3_calculation_config_audit ──
CREATE POLICY "Admins can view config audit" ON public.c3_calculation_config_audit
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- ── c3_config_audit ──
CREATE POLICY "Allow authenticated insert on c3_config_audit" ON public.c3_config_audit
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read on c3_config_audit" ON public.c3_config_audit
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── c3_config_details ──
CREATE POLICY "Admins can update c3_config_details" ON public.c3_config_details
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Allow authenticated insert on c3_config_details" ON public.c3_config_details
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read on c3_config_details" ON public.c3_config_details
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── c3_config_periods ──
CREATE POLICY "Admins can update c3_config_periods" ON public.c3_config_periods
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Allow authenticated insert on c3_config_periods" ON public.c3_config_periods
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read on c3_config_periods" ON public.c3_config_periods
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── c3_line_items ──
CREATE POLICY "Compliance staff full access" ON public.c3_line_items
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── c3_submissions ──
CREATE POLICY "Compliance staff full access" ON public.c3_submissions
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── c3_unified_audit_log ──
CREATE POLICY "Authenticated users can insert audit logs" ON public.c3_unified_audit_log
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read audit logs" ON public.c3_unified_audit_log
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── c3_wage_category ──
CREATE POLICY "Admins can manage c3_wage_category" ON public.c3_wage_category
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Allow authenticated read access" ON public.c3_wage_category
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read c3_wage_category" ON public.c3_wage_category
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── cn_c3_reported ──
CREATE POLICY "Admins can delete cn_c3_reported" ON public.cn_c3_reported
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Admins can update cn_c3_reported" ON public.cn_c3_reported
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Allow authenticated insert" ON public.cn_c3_reported
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read access" ON public.cn_c3_reported
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── cn_payment ──
CREATE POLICY "Admins can update cn_payment" ON public.cn_payment
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Authenticated users can insert payments" ON public.cn_payment
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view payments" ON public.cn_payment
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── cn_payment_header ──
CREATE POLICY "Admins can update cn_payment_header" ON public.cn_payment_header
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Authenticated users can insert payment headers" ON public.cn_payment_header
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view payment headers" ON public.cn_payment_header
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── cn_receipt ──
CREATE POLICY "Admins can update cn_receipt" ON public.cn_receipt
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Authenticated users can insert receipts" ON public.cn_receipt
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view receipts" ON public.cn_receipt
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── compliance_activity_log ──
CREATE POLICY "Compliance staff can view activity log" ON public.compliance_activity_log
  AS PERMISSIVE FOR SELECT TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── compliance_arrears ──
CREATE POLICY "Compliance staff full access" ON public.compliance_arrears
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── compliance_audits ──
CREATE POLICY "Compliance staff full access" ON public.compliance_audits
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── compliance_payment_plans ──
CREATE POLICY "Compliance staff full access" ON public.compliance_payment_plans
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── compliance_registrations ──
CREATE POLICY "Compliance staff full access" ON public.compliance_registrations
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── compliance_waivers ──
CREATE POLICY "Compliance staff full access" ON public.compliance_waivers
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── contribution_vouchers ──
CREATE POLICY "Compliance staff full access" ON public.contribution_vouchers
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── contributor_profiles ──
CREATE POLICY "Compliance staff full access" ON public.contributor_profiles
  AS PERMISSIVE FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── data_policy_audit_log ──
CREATE POLICY "Admins can view policy audit log" ON public.data_policy_audit_log
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

-- ── data_scope_rules ──
CREATE POLICY "Admins can manage data scope rules" ON public.data_scope_rules
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

-- ── designation_hierarchy ──
CREATE POLICY "Designation hierarchy manageable by admins" ON public.designation_hierarchy
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Designation hierarchy viewable by authenticated users" ON public.designation_hierarchy
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── designations ──
CREATE POLICY "Designations manageable by admins" ON public.designations
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Designations viewable by authenticated users" ON public.designations
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── email_campaigns ──
CREATE POLICY "Admins can manage email campaigns" ON public.email_campaigns
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

-- ── email_layout_components ──
CREATE POLICY "elc_admin" ON public.email_layout_components
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "elc_select" ON public.email_layout_components
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── email_provider_test_logs ──
CREATE POLICY "Authenticated users can manage email provider test logs" ON public.email_provider_test_logs
  AS PERMISSIVE FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── er_commence ──
CREATE POLICY "Admins can delete er_commence" ON public.er_commence AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update er_commence" ON public.er_commence AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can insert er_commence" ON public.er_commence AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can view er_commence" ON public.er_commence AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── er_last_regno ──
CREATE POLICY "Admins can delete er_last_regno" ON public.er_last_regno AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update er_last_regno" ON public.er_last_regno AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can insert er_last_regno" ON public.er_last_regno AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can view er_last_regno" ON public.er_last_regno AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── er_locations ──
CREATE POLICY "Admins can delete er_locations" ON public.er_locations AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update er_locations" ON public.er_locations AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can insert er_locations" ON public.er_locations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can view er_locations" ON public.er_locations AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── er_master ──
CREATE POLICY "Admins can delete er_master" ON public.er_master AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update er_master" ON public.er_master AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can view er_master" ON public.er_master AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can insert er_master" ON public.er_master AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

-- ── er_notes ──
CREATE POLICY "Admins can delete er_notes" ON public.er_notes AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update er_notes" ON public.er_notes AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can insert er_notes" ON public.er_notes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can view er_notes" ON public.er_notes AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── er_notification ──
CREATE POLICY "Admins can delete er_notification" ON public.er_notification AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update er_notification" ON public.er_notification AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can insert er_notification" ON public.er_notification AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can view er_notification" ON public.er_notification AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── er_owner ──
CREATE POLICY "Admins can delete er_owner" ON public.er_owner AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update er_owner" ON public.er_owner AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can insert er_owner" ON public.er_owner AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can view er_owner" ON public.er_owner AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── er_suit ──
CREATE POLICY "Admins can delete er_suit" ON public.er_suit AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update er_suit" ON public.er_suit AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can insert er_suit" ON public.er_suit AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can view er_suit" ON public.er_suit AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── er_visit ──
CREATE POLICY "Admins can delete er_visit" ON public.er_visit AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update er_visit" ON public.er_visit AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can insert er_visit" ON public.er_visit AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can view er_visit" ON public.er_visit AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── external_api_change_log ──
CREATE POLICY "Admins can manage change logs" ON public.external_api_change_log AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Anyone can read change logs of public APIs" ON public.external_api_change_log AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1 FROM external_api_master WHERE ((external_api_master.id = external_api_change_log.api_id) AND (external_api_master.is_public = true) AND (external_api_master.is_active = true)))));
CREATE POLICY "Authenticated users can read change logs" ON public.external_api_change_log AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── external_api_execution_logs ──
CREATE POLICY "Admins can view all execution logs" ON public.external_api_execution_logs AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Users can insert execution logs" ON public.external_api_execution_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((executed_by = auth.uid()));
CREATE POLICY "Users can view own execution logs" ON public.external_api_execution_logs AS PERMISSIVE FOR SELECT TO authenticated USING ((executed_by = auth.uid()));

-- ── external_api_master ──
CREATE POLICY "Admins can manage external APIs" ON public.external_api_master AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Anyone can read public active APIs" ON public.external_api_master AS PERMISSIVE FOR SELECT TO public USING (((is_public = true) AND (is_active = true)));
CREATE POLICY "Authenticated users can read active external APIs" ON public.external_api_master AS PERMISSIVE FOR SELECT TO authenticated USING ((is_active = true));

-- ── external_api_request_fields ──
CREATE POLICY "Admins can manage request fields" ON public.external_api_request_fields AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Anyone can read request fields of public APIs" ON public.external_api_request_fields AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1 FROM external_api_master WHERE ((external_api_master.id = external_api_request_fields.api_id) AND (external_api_master.is_public = true) AND (external_api_master.is_active = true)))));
CREATE POLICY "Authenticated users can read request fields" ON public.external_api_request_fields AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── external_api_response_fields ──
CREATE POLICY "Admins can manage response fields" ON public.external_api_response_fields AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Anyone can read response fields of public APIs" ON public.external_api_response_fields AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1 FROM external_api_master WHERE ((external_api_master.id = external_api_response_fields.api_id) AND (external_api_master.is_public = true) AND (external_api_master.is_active = true)))));
CREATE POLICY "Authenticated users can read response fields" ON public.external_api_response_fields AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── external_api_role_mapping ──
CREATE POLICY "Admins can manage role mappings" ON public.external_api_role_mapping AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can read role mappings" ON public.external_api_role_mapping AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── field_security_rules ──
CREATE POLICY "Admins can manage field security rules" ON public.field_security_rules AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

-- ── in_app_notifications ──
CREATE POLICY "Users can update their own notifications" ON public.in_app_notifications AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view their own notifications" ON public.in_app_notifications AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "ian_insert" ON public.in_app_notifications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ian_select" ON public.in_app_notifications AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "ian_update" ON public.in_app_notifications AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- ── inspector_activities ──
CREATE POLICY "Compliance staff full access" ON public.inspector_activities AS PERMISSIVE FOR ALL TO public USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── inspector_assignments ──
CREATE POLICY "Compliance staff full access" ON public.inspector_assignments AS PERMISSIVE FOR ALL TO public USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── inspector_weekly_plans ──
CREATE POLICY "Compliance staff full access" ON public.inspector_weekly_plans AS PERMISSIVE FOR ALL TO public USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── inspector_zones ──
CREATE POLICY "Compliance staff full access" ON public.inspector_zones AS PERMISSIVE FOR ALL TO public USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── ip_application_documents ──
CREATE POLICY "Authenticated users can insert ip_application_documents" ON public.ip_application_documents AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ip_application_documents" ON public.ip_application_documents AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view ip_application_documents" ON public.ip_application_documents AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── ip_audit_log ──
CREATE POLICY "Users can insert ip_audit_log" ON public.ip_audit_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view all ip_audit_log" ON public.ip_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── ip_depend ──
CREATE POLICY "Admins can delete ip_depend" ON public.ip_depend AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update ip_depend" ON public.ip_depend AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "ip_depend_insert" ON public.ip_depend AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ip_depend_select" ON public.ip_depend AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── ip_depend_staging ──
CREATE POLICY "Allow all authenticated" ON public.ip_depend_staging AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- ── ip_documents ──
CREATE POLICY "Admins can delete ip_documents" ON public.ip_documents AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update ip_documents" ON public.ip_documents AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Users can insert ip_documents" ON public.ip_documents AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view all ip_documents" ON public.ip_documents AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── ip_employer ──
CREATE POLICY "Admins can update ip_employer" ON public.ip_employer AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Users can insert ip_employer records" ON public.ip_employer AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view ip_employer records" ON public.ip_employer AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── ip_last_self_emp ──
CREATE POLICY "Admins can manage ip_last_self_emp" ON public.ip_last_self_emp AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated can read ip_last_self_emp" ON public.ip_last_self_emp AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── ip_master ──
CREATE POLICY "Users can insert ip_master" ON public.ip_master AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update ip_master" ON public.ip_master AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can view all ip_master" ON public.ip_master AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── ip_master_column_conflicts ──
CREATE POLICY "Admins can view conflicts" ON public.ip_master_column_conflicts AS PERMISSIVE FOR SELECT TO public USING (true);

-- ── ip_name ──
CREATE POLICY "Users can insert ip_name" ON public.ip_name AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view all ip_name" ON public.ip_name AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── ip_notes ──
CREATE POLICY "ip_notes_delete" ON public.ip_notes AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "ip_notes_insert" ON public.ip_notes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ip_notes_select" ON public.ip_notes AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "ip_notes_update" ON public.ip_notes AS PERMISSIVE FOR UPDATE TO authenticated USING (true);

-- ── ip_self_category ──
CREATE POLICY "Allow all access to ip_self_category" ON public.ip_self_category AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read access" ON public.ip_self_category AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access" ON public.ip_self_category AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── ip_self_commence ──
CREATE POLICY "Allow all access to ip_self_commence" ON public.ip_self_commence AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- ── ip_self_employ ──
CREATE POLICY "Admins can manage ip_self_employ" ON public.ip_self_employ AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated can read ip_self_employ" ON public.ip_self_employ AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── ip_self_locations ──
CREATE POLICY "Allow all access to ip_self_locations" ON public.ip_self_locations AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- ── ip_self_weeks_paid ──
CREATE POLICY "Allow all access to ip_self_weeks_paid" ON public.ip_self_weeks_paid AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- ── ip_status ──
CREATE POLICY "Allow public read access" ON public.ip_status AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.ip_status AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── ip_vol_contrib ──
CREATE POLICY "Allow authenticated read access" ON public.ip_vol_contrib AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access" ON public.ip_vol_contrib AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── ip_vol_contrib_wages ──
CREATE POLICY "Allow authenticated read access" ON public.ip_vol_contrib_wages AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access" ON public.ip_vol_contrib_wages AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── ip_wages ──
CREATE POLICY "Admins can delete ip_wages" ON public.ip_wages AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can insert ip_wages" ON public.ip_wages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can read ip_wages" ON public.ip_wages AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update ip_wages" ON public.ip_wages AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

-- ── legal_admin_audit ──
CREATE POLICY "Users can view audit log" ON public.legal_admin_audit AS PERMISSIVE FOR SELECT TO public USING (true);

-- ── legal_audit_log ──
CREATE POLICY "Users can view audit log" ON public.legal_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── legal_cases ──
CREATE POLICY "Authorized users can create cases" ON public.legal_cases AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['Clerk'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));
CREATE POLICY "Authorized users can update cases" ON public.legal_cases AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['Clerk'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));
CREATE POLICY "Users can view non-confidential cases" ON public.legal_cases AS PERMISSIVE FOR SELECT TO authenticated USING (((NOT confidential) OR has_any_role(auth.uid(), ARRAY['LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role])));

-- ── legal_code_sets ──
CREATE POLICY "Admins can manage code sets" ON public.legal_code_sets AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'Admin'::app_role));

-- ── legal_complainant_settings ──
CREATE POLICY "Admins can manage complainant settings" ON public.legal_complainant_settings AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authorized users can view complainant settings" ON public.legal_complainant_settings AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));

-- ── legal_document_saved_searches ──
CREATE POLICY "Users can manage own saved searches" ON public.legal_document_saved_searches AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));

-- ── legal_document_shares ──
CREATE POLICY "Authorized users can create shares" ON public.legal_document_shares AS PERMISSIVE FOR INSERT TO public WITH CHECK (has_any_role(auth.uid(), ARRAY['LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));
CREATE POLICY "Authorized users can update shares" ON public.legal_document_shares AS PERMISSIVE FOR UPDATE TO public USING (has_any_role(auth.uid(), ARRAY['LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));
CREATE POLICY "Authorized users can view shares" ON public.legal_document_shares AS PERMISSIVE FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['Clerk'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));

-- ── legal_documents ──
CREATE POLICY "Authorized users can manage documents" ON public.legal_documents AS PERMISSIVE FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['Clerk'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));
CREATE POLICY "Users can view documents for accessible cases" ON public.legal_documents AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM legal_cases WHERE ((legal_cases.id = legal_documents.case_id) AND ((NOT legal_documents.confidential) OR has_any_role(auth.uid(), ARRAY['LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]))))));

-- ── legal_hearings ──
CREATE POLICY "Authorized users can manage hearings" ON public.legal_hearings AS PERMISSIVE FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));
CREATE POLICY "Users can view hearings for accessible cases" ON public.legal_hearings AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM legal_cases WHERE ((legal_cases.id = legal_hearings.case_id) AND ((NOT legal_cases.confidential) OR has_any_role(auth.uid(), ARRAY['LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]))))));

-- ── legal_integrations ──
CREATE POLICY "Admins can manage integrations" ON public.legal_integrations AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'Admin'::app_role));

-- ── legal_orders ──
CREATE POLICY "Authorized users can create/update orders" ON public.legal_orders AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));
CREATE POLICY "Authorized users can update orders" ON public.legal_orders AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));
CREATE POLICY "Users can view orders for accessible cases" ON public.legal_orders AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM legal_cases WHERE ((legal_cases.id = legal_orders.case_id) AND ((NOT legal_cases.confidential) OR has_any_role(auth.uid(), ARRAY['LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]))))));

-- ── legal_parties ──
CREATE POLICY "Authorized users can manage parties" ON public.legal_parties AS PERMISSIVE FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['Clerk'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));
CREATE POLICY "Users can view parties for accessible cases" ON public.legal_parties AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM legal_cases WHERE ((legal_cases.id = legal_parties.case_id) AND ((NOT legal_cases.confidential) OR has_any_role(auth.uid(), ARRAY['LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]))))));

-- ── legal_penalties ──
CREATE POLICY "Users can view penalties, settlements, timeline, audit" ON public.legal_penalties AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── legal_saved_views ──
CREATE POLICY "Users can manage own saved views" ON public.legal_saved_views AS PERMISSIVE FOR ALL TO authenticated USING ((auth.uid() = user_id));

-- ── legal_settlements ──
CREATE POLICY "Users can view settlements" ON public.legal_settlements AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── legal_sla_rules ──
CREATE POLICY "Admins can manage SLA rules" ON public.legal_sla_rules AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'Admin'::app_role));

-- ── legal_status_transitions ──
CREATE POLICY "Admins can manage transitions" ON public.legal_status_transitions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'Admin'::app_role));

-- ── legal_tasks ──
CREATE POLICY "Authorized users can manage tasks" ON public.legal_tasks AS PERMISSIVE FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['Clerk'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]));
CREATE POLICY "Users can view tasks for accessible cases" ON public.legal_tasks AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM legal_cases WHERE ((legal_cases.id = legal_tasks.case_id) AND ((NOT legal_cases.confidential) OR has_any_role(auth.uid(), ARRAY['LegalOfficer'::app_role, 'Supervisor'::app_role, 'Admin'::app_role]))))));

-- ── legal_templates ──
CREATE POLICY "Admins can manage templates" ON public.legal_templates AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'Admin'::app_role));

-- ── legal_timeline_events ──
CREATE POLICY "Users can view timeline events" ON public.legal_timeline_events AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── login_security_events ──
CREATE POLICY "Admins can view login security events" ON public.login_security_events AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Service role can insert login events" ON public.login_security_events AS PERMISSIVE FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can select login events" ON public.login_security_events AS PERMISSIVE FOR SELECT TO service_role USING (true);

-- ── meeting_api_logs ──
CREATE POLICY "Allow authenticated all on meeting_api_logs" ON public.meeting_api_logs AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── meeting_history ──
CREATE POLICY "Allow authenticated all on meeting_history" ON public.meeting_history AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── meeting_slot_reservations ──
CREATE POLICY "Authenticated users can read slot reservations" ON public.meeting_slot_reservations AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages slot reservations" ON public.meeting_slot_reservations AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── meetings ──
CREATE POLICY "Allow authenticated all on meetings" ON public.meetings AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── mfa_config ──
CREATE POLICY "mfa_admin" ON public.mfa_config AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "mfa_select" ON public.mfa_config AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── mi_tb_del_ip_depend ──
CREATE POLICY "Users can insert mi_tb_del_ip_depend" ON public.mi_tb_del_ip_depend AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view all mi_tb_del_ip_depend" ON public.mi_tb_del_ip_depend AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── module_actions ──
CREATE POLICY "Admins can delete module_actions" ON public.module_actions AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can insert module_actions" ON public.module_actions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can manage actions" ON public.module_actions AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update module_actions" ON public.module_actions AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Anyone can view enabled actions" ON public.module_actions AS PERMISSIVE FOR SELECT TO authenticated USING (((is_enabled = true) OR has_role(auth.uid(), 'Admin'::app_role)));
CREATE POLICY "Authenticated can view module_actions" ON public.module_actions AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── module_button_bindings ──
CREATE POLICY "Admins can manage button bindings" ON public.module_button_bindings AS PERMISSIVE FOR ALL TO public USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view button bindings" ON public.module_button_bindings AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));

-- ── module_tables ──
CREATE POLICY "Admins can manage module tables" ON public.module_tables AS PERMISSIVE FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ── notification_logs ──
CREATE POLICY "nl_insert" ON public.notification_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nl_select" ON public.notification_logs AS PERMISSIVE FOR SELECT TO authenticated USING (((recipient_user_id = auth.uid()) OR has_role(auth.uid(), 'Admin'::app_role)));
CREATE POLICY "nl_update" ON public.notification_logs AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

-- ── notification_providers ──
CREATE POLICY "Admins can manage providers" ON public.notification_providers AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can view providers" ON public.notification_providers AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "np_admin" ON public.notification_providers AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

-- ── notification_template_audit_logs ──
CREATE POLICY "ntal_insert" ON public.notification_template_audit_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ntal_select" ON public.notification_template_audit_logs AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));

-- ── notification_template_versions ──
CREATE POLICY "ntv_admin" ON public.notification_template_versions AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "ntv_select" ON public.notification_template_versions AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── notification_templates ──
CREATE POLICY "nt_admin" ON public.notification_templates AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "nt_select" ON public.notification_templates AS PERMISSIVE FOR SELECT TO authenticated USING (((is_enabled = true) OR has_role(auth.uid(), 'Admin'::app_role)));

-- ── office_locations ──
CREATE POLICY "Admins can insert office_locations" ON public.office_locations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can manage office locations" ON public.office_locations AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update office_locations" ON public.office_locations AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can view office_locations" ON public.office_locations AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── password_history ──
CREATE POLICY "ph_insert" ON public.password_history AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "ph_own" ON public.password_history AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));

-- ── password_policies ──
CREATE POLICY "pp_admin" ON public.password_policies AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "pp_select" ON public.password_policies AS PERMISSIVE FOR SELECT TO authenticated USING ((is_active = true));

-- ── payment_plan_installments ──
CREATE POLICY "Compliance staff full access" ON public.payment_plan_installments AS PERMISSIVE FOR ALL TO public USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── pii_unlock_logs ──
CREATE POLICY "Admins can read pii_unlock_logs" ON public.pii_unlock_logs AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated can insert pii_unlock_logs" ON public.pii_unlock_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

-- ── profiles ──
CREATE POLICY "Authenticated users can update profiles" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (((auth.uid() = id) OR has_role(auth.uid(), 'Admin'::app_role)));
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can view own or admin can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = id) OR has_role(auth.uid(), 'Admin'::app_role)));

-- ── public_api_access_logs ──
CREATE POLICY "Service role full access on public_api_access_logs" ON public.public_api_access_logs AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- ── public_api_keys ──
CREATE POLICY "Service role full access on public_api_keys" ON public.public_api_keys AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- ── public_api_rate_limits ──
CREATE POLICY "Service role full access on public_api_rate_limits" ON public.public_api_rate_limits AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- ── qa_ai_generation_log ──
CREATE POLICY "qa_ailog_admin_all" ON public.qa_ai_generation_log AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── qa_change_requests ──
CREATE POLICY "Admin full access to qa_change_requests" ON public.qa_change_requests AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can create change requests" ON public.qa_change_requests AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((requested_by = auth.uid()));

-- ── qa_enforcement_log ──
CREATE POLICY "Admin full access to qa_enforcement_log" ON public.qa_enforcement_log AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));

-- ── qa_execution_runs ──
CREATE POLICY "qa_runs_admin_write" ON public.qa_execution_runs AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "qa_runs_authenticated_read" ON public.qa_execution_runs AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── qa_knowledge_entries ──
CREATE POLICY "qa_knowledge_admin_write" ON public.qa_knowledge_entries AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "qa_knowledge_authenticated_read" ON public.qa_knowledge_entries AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── qa_module_dependencies ──
CREATE POLICY "qa_dependencies_admin_write" ON public.qa_module_dependencies AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "qa_dependencies_authenticated_read" ON public.qa_module_dependencies AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── qa_pipeline_settings ──
CREATE POLICY "qa_settings_admin_write" ON public.qa_pipeline_settings AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "qa_settings_authenticated_read" ON public.qa_pipeline_settings AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── qa_test_cases ──
CREATE POLICY "qa_testcases_admin_write" ON public.qa_test_cases AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "qa_testcases_authenticated_read" ON public.qa_test_cases AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── qa_test_results ──
CREATE POLICY "qa_results_admin_write" ON public.qa_test_results AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "qa_results_authenticated_read" ON public.qa_test_results AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── remittance_schedule ──
CREATE POLICY "Compliance staff full access" ON public.remittance_schedule AS PERMISSIVE FOR ALL TO public USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

-- ── role_hierarchy ──
CREATE POLICY "Role hierarchy manageable by admins" ON public.role_hierarchy AS PERMISSIVE FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Role hierarchy viewable by authenticated users" ON public.role_hierarchy AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── role_permissions ──
CREATE POLICY "Admins can delete role_permissions" ON public.role_permissions AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can insert role_permissions" ON public.role_permissions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated can view role_permissions" ON public.role_permissions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "rp_admin" ON public.role_permissions AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "rp_select" ON public.role_permissions AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── roles ──
CREATE POLICY "Admins can delete non-system roles" ON public.roles AS PERMISSIVE FOR DELETE TO authenticated USING ((has_role(auth.uid(), 'Admin'::app_role) AND (NOT is_system_role)));
CREATE POLICY "Admins can insert roles" ON public.roles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update roles" ON public.roles AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Anyone can view roles" ON public.roles AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── route_security_config ──
CREATE POLICY "Admins can manage route_security_config" ON public.route_security_config AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated can read route_security_config" ON public.route_security_config AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── sample_applications ──
CREATE POLICY "Applicants can update draft applications or resubmit" ON public.sample_applications AS PERMISSIVE FOR UPDATE TO public USING ((((auth.uid() = applicant_id) AND ((status = 'Draft'::text) OR (status = 'More Info Requested'::text))) OR has_permission(auth.uid(), 'sample_application'::text, 'edit'::text)));
CREATE POLICY "Users can create their own applications" ON public.sample_applications AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = applicant_id));
CREATE POLICY "Users can delete applications" ON public.sample_applications AS PERMISSIVE FOR DELETE TO public USING ((((auth.uid() = applicant_id) AND (status = 'Draft'::text)) OR has_permission(auth.uid(), 'sample_application'::text, 'delete'::text)));
CREATE POLICY "Users can view their own applications" ON public.sample_applications AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = applicant_id) OR has_permission(auth.uid(), 'sample_application'::text, 'view'::text)));

-- ── schema_change_approvals ──
CREATE POLICY "Only admins can insert schema change approvals" ON public.schema_change_approvals AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'Admin'::app_role)))));
CREATE POLICY "Only admins can view schema change approvals" ON public.schema_change_approvals AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'Admin'::app_role)))));

-- ── schema_migration_logs ──
CREATE POLICY "Admins can view migration logs" ON public.schema_migration_logs AS PERMISSIVE FOR SELECT TO public USING (true);

-- ── security_ip_blocks ──
CREATE POLICY "Admins can manage security_ip_blocks" ON public.security_ip_blocks AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Anyone can read active ip blocks" ON public.security_ip_blocks AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_active = true) AND (expires_at > now())));

-- ── security_policy_config ──
CREATE POLICY "Admins can manage security_policy_config" ON public.security_policy_config AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated can read security_policy_config" ON public.security_policy_config AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── system_audit_trail ──
CREATE POLICY "Admins can view audit trail" ON public.system_audit_trail AS PERMISSIVE FOR SELECT TO public USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can insert audit trail" ON public.system_audit_trail AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));

-- ── system_business_events ──
CREATE POLICY "Admins can view business events" ON public.system_business_events AS PERMISSIVE FOR SELECT TO public USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can insert business events" ON public.system_business_events AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));

-- ── system_error_logs ──
CREATE POLICY "Admins can view error logs" ON public.system_error_logs AS PERMISSIVE FOR SELECT TO public USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can insert error logs" ON public.system_error_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));

-- ── system_integration_logs ──
CREATE POLICY "Admins can view integration logs" ON public.system_integration_logs AS PERMISSIVE FOR SELECT TO public USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can insert integration logs" ON public.system_integration_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));

-- ── system_performance_metrics ──
CREATE POLICY "Admins can view performance metrics" ON public.system_performance_metrics AS PERMISSIVE FOR SELECT TO public USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can insert performance metrics" ON public.system_performance_metrics AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));

-- ── system_security_logs ──
CREATE POLICY "Admins can view security logs" ON public.system_security_logs AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can insert security logs" ON public.system_security_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

-- ── system_settings ──
CREATE POLICY "Admins can manage system settings" ON public.system_settings AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'Admin'::app_role)))));
CREATE POLICY "Admins can view system settings" ON public.system_settings AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));

-- ── system_technical_logs ──
CREATE POLICY "Admins can view technical logs" ON public.system_technical_logs AS PERMISSIVE FOR SELECT TO public USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can insert technical logs" ON public.system_technical_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));

-- ── tb_activity ──
CREATE POLICY "Allow read access for anonymous users" ON public.tb_activity AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.tb_activity AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_c3_status ──
CREATE POLICY "Allow read access to all authenticated users" ON public.tb_c3_status AS PERMISSIVE FOR SELECT TO public USING (true);

-- ── tb_country ──
CREATE POLICY "Allow authenticated users to read tb_country" ON public.tb_country AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_deductions_tax_table_details ──
CREATE POLICY "Allow authenticated read access" ON public.tb_deductions_tax_table_details AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access" ON public.tb_deductions_tax_table_details AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── tb_deductions_tax_table_header ──
CREATE POLICY "Allow authenticated read access" ON public.tb_deductions_tax_table_header AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access" ON public.tb_deductions_tax_table_header AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── tb_dependent_relation ──
CREATE POLICY "Allow authenticated users to read tb_dependent_relation" ON public.tb_dependent_relation AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_district ──
CREATE POLICY "Allow read access for anonymous users" ON public.tb_district AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.tb_district AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_eye_color ──
CREATE POLICY "Allow authenticated users to read tb_eye_color" ON public.tb_eye_color AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_indus ──
CREATE POLICY "Allow read access for anonymous users" ON public.tb_indus AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.tb_indus AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_inspector ──
CREATE POLICY "Allow read access for anonymous users" ON public.tb_inspector AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.tb_inspector AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_legal_status ──
CREATE POLICY "Admins can manage legal status" ON public.tb_legal_status AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can read legal status" ON public.tb_legal_status AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_levy_slab_details ──
CREATE POLICY "Allow authenticated insert on tb_levy_slab_details" ON public.tb_levy_slab_details AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated read access on tb_levy_slab_details" ON public.tb_levy_slab_details AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update on tb_levy_slab_details" ON public.tb_levy_slab_details AS PERMISSIVE FOR UPDATE TO authenticated USING (true);

-- ── tb_levy_slabs ──
CREATE POLICY "Allow authenticated insert on tb_levy_slabs" ON public.tb_levy_slabs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated read access on tb_levy_slabs" ON public.tb_levy_slabs AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update on tb_levy_slabs" ON public.tb_levy_slabs AS PERMISSIVE FOR UPDATE TO authenticated USING (true);

-- ── tb_marital ──
CREATE POLICY "Admins can manage marital statuses" ON public.tb_marital AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Anon can read marital statuses" ON public.tb_marital AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can read marital statuses" ON public.tb_marital AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_occup ──
CREATE POLICY "Allow authenticated users to read tb_occup" ON public.tb_occup AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_office ──
CREATE POLICY "Allow read access for anonymous users" ON public.tb_office AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.tb_office AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to tb_office" ON public.tb_office AS PERMISSIVE FOR SELECT TO public USING (true);

-- ── tb_office_departments ──
CREATE POLICY "Admins can insert departments" ON public.tb_office_departments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update departments" ON public.tb_office_departments AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Allow read access to tb_office_departments" ON public.tb_office_departments AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can view departments" ON public.tb_office_departments AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_penalty ──
CREATE POLICY "Allow authenticated read access" ON public.tb_penalty AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access" ON public.tb_penalty AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── tb_postal_district ──
CREATE POLICY "Allow authenticated users to read tb_postal_district" ON public.tb_postal_district AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_relation ──
CREATE POLICY "tb_relation_select" ON public.tb_relation AS PERMISSIVE FOR SELECT TO public USING (true);

-- ── tb_sector ──
CREATE POLICY "Allow read access for anonymous users" ON public.tb_sector AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.tb_sector AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_self_emp_contrib_rate ──
CREATE POLICY "Allow all access to tb_self_emp_contrib_rate" ON public.tb_self_emp_contrib_rate AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read access" ON public.tb_self_emp_contrib_rate AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access" ON public.tb_self_emp_contrib_rate AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── tb_ssc_rates ──
CREATE POLICY "Allow authenticated read access" ON public.tb_ssc_rates AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access" ON public.tb_ssc_rates AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── tb_vc_contrib_rate ──
CREATE POLICY "Allow authenticated read access on tb_vc_contrib_rate" ON public.tb_vc_contrib_rate AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_vc_eligibility_config ──
CREATE POLICY "tb_vc_contrib_rate_modify" ON public.tb_vc_eligibility_config AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tb_vc_contrib_rate_select" ON public.tb_vc_eligibility_config AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_verify ──
CREATE POLICY "Allow authenticated users to read tb_verify" ON public.tb_verify AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tb_villages ──
CREATE POLICY "Allow read access for anonymous users" ON public.tb_villages AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.tb_villages AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tmp_ip_dependents ──
CREATE POLICY "Users can delete tmp_ip_dependents" ON public.tmp_ip_dependents AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Users can insert tmp_ip_dependents" ON public.tmp_ip_dependents AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update tmp_ip_dependents" ON public.tmp_ip_dependents AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can view all tmp_ip_dependents" ON public.tmp_ip_dependents AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tmp_ip_master ──
CREATE POLICY "Users can delete tmp_ip_master" ON public.tmp_ip_master AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Users can insert tmp_ip_master" ON public.tmp_ip_master AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update tmp_ip_master" ON public.tmp_ip_master AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can view all tmp_ip_master" ON public.tmp_ip_master AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── tmp_ip_notes ──
CREATE POLICY "Users can delete tmp_ip_notes" ON public.tmp_ip_notes AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Users can insert tmp_ip_notes" ON public.tmp_ip_notes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update tmp_ip_notes" ON public.tmp_ip_notes AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can view all tmp_ip_notes" ON public.tmp_ip_notes AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── unauthorized_access_logs ──
CREATE POLICY "Admins can read unauthorized_access_logs" ON public.unauthorized_access_logs AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Anyone can insert unauthorized_access_logs" ON public.unauthorized_access_logs AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ── user_data_overrides ──
CREATE POLICY "Admins can manage user data overrides" ON public.user_data_overrides AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

-- ── user_notification_preferences ──
CREATE POLICY "Users can manage their own preferences" ON public.user_notification_preferences AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view their own preferences" ON public.user_notification_preferences AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "unp_admin" ON public.user_notification_preferences AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "unp_own" ON public.user_notification_preferences AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- ── user_permission_overrides ──
CREATE POLICY "upo_admin" ON public.user_permission_overrides AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "upo_select" ON public.user_permission_overrides AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'Admin'::app_role)));

-- ── user_roles ──
CREATE POLICY "Admins can delete user roles" ON public.user_roles AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can insert user roles" ON public.user_roles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can manage all roles" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Authenticated users can view roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── user_sessions ──
CREATE POLICY "Users can create their own sessions" ON public.user_sessions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can delete their own sessions" ON public.user_sessions AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view their own sessions" ON public.user_sessions AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "us_admin" ON public.user_sessions AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "us_own" ON public.user_sessions AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- ── workflow_action_configurations ──
CREATE POLICY "Allow admins write workflow_action_configurations" ON public.workflow_action_configurations AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read workflow_action_configurations" ON public.workflow_action_configurations AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── workflow_action_field_updates ──
CREATE POLICY "Users with workflow permission can delete field updates" ON public.workflow_action_field_updates AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Users with workflow permission can insert field updates" ON public.workflow_action_field_updates AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users with workflow permission can update field updates" ON public.workflow_action_field_updates AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users with workflow permission can view field updates" ON public.workflow_action_field_updates AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── workflow_action_notifications ──
CREATE POLICY "Admins can manage action notifications" ON public.workflow_action_notifications AS PERMISSIVE FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view action notifications" ON public.workflow_action_notifications AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── workflow_action_outcomes ──
CREATE POLICY "Allow admins write workflow_action_outcomes" ON public.workflow_action_outcomes AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read workflow_action_outcomes" ON public.workflow_action_outcomes AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── workflow_action_types ──
CREATE POLICY "Allow admins write workflow_action_types" ON public.workflow_action_types AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read workflow_action_types" ON public.workflow_action_types AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── workflow_api_configurations ──
CREATE POLICY "Allow admins write workflow_api_configurations" ON public.workflow_api_configurations AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read workflow_api_configurations" ON public.workflow_api_configurations AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── workflow_api_execution_log ──
CREATE POLICY "workflow_api_execution_log_insert_authenticated" ON public.workflow_api_execution_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "workflow_api_execution_log_select_authenticated" ON public.workflow_api_execution_log AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── workflow_definitions ──
CREATE POLICY "Admins can manage workflow definitions" ON public.workflow_definitions AS PERMISSIVE FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view workflow definitions" ON public.workflow_definitions AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── workflow_execution_logs ──
CREATE POLICY "Admins can view workflow logs" ON public.workflow_execution_logs AS PERMISSIVE FOR SELECT TO public USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can insert workflow logs" ON public.workflow_execution_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));

-- ── workflow_instances ──
CREATE POLICY "Authenticated users can create workflow instances" ON public.workflow_instances AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update their workflow instances" ON public.workflow_instances AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view workflow instances" ON public.workflow_instances AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── workflow_logs ──
CREATE POLICY "Authenticated users can view logs" ON public.workflow_logs AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can create logs" ON public.workflow_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

-- ── workflow_meeting_departments ──
CREATE POLICY "Authenticated users can manage workflow meeting departments" ON public.workflow_meeting_departments AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- ── workflow_security_audit_log ──
CREATE POLICY "Admins can view workflow security audit logs" ON public.workflow_security_audit_log AS PERMISSIVE FOR SELECT TO public USING (is_admin(auth.uid()));
CREATE POLICY "System can insert workflow security audit logs" ON public.workflow_security_audit_log AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);

-- ── workflow_step_action_api ──
CREATE POLICY "workflow_step_action_api_delete_admin" ON public.workflow_step_action_api AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM user_roles ur WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'Admin'::text)))));
CREATE POLICY "workflow_step_action_api_insert_admin" ON public.workflow_step_action_api AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM user_roles ur WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY (ARRAY['Admin'::text, 'Data Entry'::text]))))));
CREATE POLICY "workflow_step_action_api_select_authenticated" ON public.workflow_step_action_api AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "workflow_step_action_api_update_admin" ON public.workflow_step_action_api AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM user_roles ur WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY (ARRAY['Admin'::text, 'Data Entry'::text]))))));

-- ── workflow_step_action_api_body ──
CREATE POLICY "workflow_step_action_api_body_delete_admin" ON public.workflow_step_action_api_body AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM user_roles ur WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'Admin'::text)))));
CREATE POLICY "workflow_step_action_api_body_insert_admin" ON public.workflow_step_action_api_body AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM user_roles ur WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY (ARRAY['Admin'::text, 'Data Entry'::text]))))));
CREATE POLICY "workflow_step_action_api_body_select_authenticated" ON public.workflow_step_action_api_body AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "workflow_step_action_api_body_update_admin" ON public.workflow_step_action_api_body AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM user_roles ur WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY (ARRAY['Admin'::text, 'Data Entry'::text]))))));

-- ── workflow_step_actions ──
CREATE POLICY "Admins can manage step actions" ON public.workflow_step_actions AS PERMISSIVE FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view step actions" ON public.workflow_step_actions AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── workflow_steps ──
CREATE POLICY "Admins can manage workflow steps" ON public.workflow_steps AS PERMISSIVE FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view workflow steps" ON public.workflow_steps AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── workflow_tasks ──
CREATE POLICY "System can manage tasks" ON public.workflow_tasks AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can view assigned tasks by role or user" ON public.workflow_tasks AS PERMISSIVE FOR SELECT TO public USING (((assigned_to = auth.uid()) OR (assigned_role IN ( SELECT (ur.role)::text AS role FROM user_roles ur WHERE (ur.user_id = auth.uid()))) OR (assigned_designation IN ( SELECT d.name FROM (designations d JOIN profiles p ON ((p.designation_id = d.id))) WHERE (p.id = auth.uid()))) OR (EXISTS ( SELECT 1 FROM user_roles ur WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'Admin'::app_role))))));

-- ── workflow_triggers ──
CREATE POLICY "Admins can manage triggers" ON public.workflow_triggers AS PERMISSIVE FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view triggers" ON public.workflow_triggers AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- END OF RLS POLICIES BACKUP SCRIPT
-- 225 tables with RLS enabled, 472 policies total
-- ============================================================================
