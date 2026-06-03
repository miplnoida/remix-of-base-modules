-- =====================================================================
-- Internal Audit Module — Reset Transactional + Configuration Data
-- Keeps master/reference data only.
--
-- KEPT (masters): ia_departments, ia_department_functions, ia_auditors,
--   ia_activity_types, ia_holidays, ia_risk_categories, ia_risk_criteria,
--   ia_risk_impact_levels, ia_risk_likelihood_levels,
--   ia_control_effectiveness_levels
--
-- Safe to re-run. Uses session_replication_role=replica so FK order and
-- audit triggers do not block the wipe.
-- =====================================================================

BEGIN;

SET session_replication_role = 'replica';

-- ---------- Configuration data ----------
TRUNCATE TABLE
  public.ia_audit_config,
  public.ia_audit_settings,
  public.ia_risk_config_master,
  public.ia_risk_classification_thresholds,
  public.ia_risk_band_frequency_policy,
  public.ia_risk_criteria_weights,
  public.ia_risk_scoring_models,
  public.ia_planning_parameters,
  public.ia_planning_scoring_weights,
  public.ia_planning_assumptions,
  public.ia_escalation_rules,
  public.ia_sla_rules,
  public.ia_notification_triggers,
  public.ia_execution_gate_config,
  public.ia_template_policy_matrix,
  public.ia_org_document_foundation,
  public.ia_communication_stages,
  public.ia_mitigation_templates,
  public.ia_checklist_templates,
  public.ia_checklist_template_items,
  public.ia_document_templates,
  public.ia_document_template_sections,
  public.ia_document_template_settings,
  public.ia_document_section_library,
  public.ia_distribution_templates,
  public.ia_distribution_recipients,
  public.ia_audit_plan_templates,
  public.ia_config_change_requests
RESTART IDENTITY CASCADE;

-- ---------- Transactional data ----------
TRUNCATE TABLE
  -- Planning
  public.ia_annual_plans,
  public.ia_plan_versions,
  public.ia_plan_version_engagements,
  public.ia_plan_workflow_bindings,
  public.ia_plan_amendments,
  public.ia_plan_distribution_logs,
  public.ia_plan_artifacts,
  public.ia_plan_carry_forward,
  public.ia_plan_change_log,
  public.ia_planning_wizard_state,
  public.ia_planning_score_explanations,
  public.ia_auto_plan_candidates,
  public.ia_audit_plan_functions,
  public.ia_audit_plan_profiles,
  -- Universe & Risk
  public.ia_audit_universe,
  public.ia_risk_assessments,
  public.ia_risk_assessment_factors,
  public.ia_risk_register,
  public.ia_risk_reviews,
  public.ia_risk_mitigation_actions,
  -- Engagements
  public.ia_audit_engagements,
  public.ia_engagement_execution_log,
  public.ia_engagement_risk_overrides,
  public.ia_preparation_checklists,
  public.ia_preparation_documents,
  public.ia_department_audits,
  -- Programs / checklists / queries
  public.ia_audit_programs,
  public.ia_audit_procedures,
  public.ia_audit_checklists,
  public.ia_audit_queries,
  -- RCM & control testing
  public.ia_rcm_processes,
  public.ia_rcm_risks,
  public.ia_rcm_controls,
  public.ia_rcm_tests,
  public.ia_control_tests,
  public.ia_control_test_results,
  -- Evidence / papers / findings
  public.ia_evidence,
  public.ia_working_papers,
  public.ia_findings,
  public.ia_recommendations,
  public.ia_management_responses,
  -- Actions / follow-up / closure
  public.ia_action_tracking,
  public.ia_action_plan_updates,
  public.ia_action_plan_milestones,
  public.ia_follow_ups,
  public.ia_audit_closure,
  -- Reports / comms
  public.ia_audit_reports,
  public.ia_communications,
  public.ia_discussion_threads,
  public.ia_discussion_comments,
  public.ia_document_requests,
  -- Notifications / approvals / changes
  public.ia_notification_queue,
  public.ia_notification_logs,
  public.ia_auto_notification_log,
  public.ia_approval_actions,
  public.ia_change_events,
  -- Resources / workload / leave / time
  public.ia_resource_recommendations,
  public.ia_auditor_workload,
  public.ia_availability_conflicts,
  public.ia_leave_requests,
  public.ia_time_logs,
  -- Quality
  public.ia_quality_reviews,
  public.ia_quality_review_checklist,
  -- Misc
  public.ia_activities
RESTART IDENTITY CASCADE;

SET session_replication_role = 'origin';

COMMIT;

-- ---------------------------------------------------------------------
-- Verification (run manually if desired):
--
-- SELECT table_name,
--        (xpath('/row/c/text()',
--               query_to_xml(format('SELECT COUNT(*) AS c FROM public.%I', table_name),
--                            true, true, '')))[1]::text::int AS row_count
-- FROM information_schema.tables
-- WHERE table_schema='public' AND table_name LIKE 'ia\_%'
-- ORDER BY table_name;
-- ---------------------------------------------------------------------