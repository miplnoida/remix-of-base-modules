-- =====================================================================
-- LEGAL DATA RESET — TEST / UAT ONLY
-- =====================================================================
-- ⚠️  DO NOT RUN ON PRODUCTION WITH REAL DATA.
-- Truncates every Legal operational table in dependency-safe order.
-- Run manually via Cloud → Run SQL against the Test environment only.
-- Located under scripts/ (NOT supabase/migrations/) so it never
-- auto-applies to Live on publish.
-- =====================================================================

BEGIN;

-- Guard: refuse to run if there are non-trivial rows in core business
-- masters that should never be touched by a legal reset. This is a
-- soft check; comment out only if you have confirmed the target env.
DO $$
BEGIN
  IF current_database() ILIKE '%prod%' THEN
    RAISE EXCEPTION 'Refusing to run legal reset on database %', current_database();
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- Junction tables (liability ↔ domain) — must go first
-- ---------------------------------------------------------------------
TRUNCATE TABLE
  lg_hearing_liability,
  lg_order_liability,
  lg_settlement_liability,
  lg_appeal_liability,
  lg_enforcement_liability,
  lg_consent_liability,
  lg_arrangement_liability,
  lg_filing_liability,
  lg_cost_liability,
  lg_document_liability,
  lg_task_liability,
  lg_recovery_assignment_liability
RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------
-- Audit / activity / history
-- ---------------------------------------------------------------------
TRUNCATE TABLE
  lg_case_activity,
  lg_case_task_audit,
  lg_liability_audit,
  lg_court_filing_audit,
  lg_consent_order_audit,
  lg_judgment_compliance_audit,
  lg_legal_cost_audit,
  lg_case_intake_audit,
  lg_recovery_assignment_audit,
  lg_recovery_assignment_history,
  lg_case_stage_history,
  lg_case_assignment_history,
  lg_intake_decision_audit,
  lg_liability_note,
  lg_case_note,
  legal_admin_audit,
  legal_audit_log,
  legal_referral_audit,
  legal_referral_sla_event,
  la_matter_audit,
  la_matter_activity,
  la_matter_stage_history
RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------
-- Documents, tasks, notices, deadlines
-- ---------------------------------------------------------------------
TRUNCATE TABLE
  lg_document_link,
  lg_case_task,
  lg_case_deadline,
  lg_case_calendar_event,
  lg_notice,
  lg_intake_info_request,
  lg_intake_checklist_response,
  lg_hearing_prep_checklist,
  lg_hearing_evidence,
  lg_hearing_communication,
  lg_hearing_attendee,
  lg_hearing_adjournment
RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------
-- Recovery / enforcement / appeals / consent
-- ---------------------------------------------------------------------
TRUNCATE TABLE
  lg_recovery_assignment_action,
  lg_recovery_assignment_transfer,
  lg_recovery_assignment,
  lg_recovery_campaign,
  lg_enforcement_action,
  lg_appeal,
  lg_consent_installment,
  lg_consent_variation,
  lg_consent_order,
  lg_settlement,
  lg_judgment_compliance,
  lg_order_compliance_event,
  lg_order,
  lg_court_filing,
  lg_court_proceeding,
  lg_hearing
RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------
-- Financial (liability + allocations + costs + fees)
-- ---------------------------------------------------------------------
TRUNCATE TABLE
  lg_payment_allocation,
  lg_payment_arrangement_link,
  lg_legal_cost,
  lg_fee_charge,
  lg_fee_waiver,
  lg_recoverable_liability
RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------
-- Case / intake / referral / parties / external counsel
-- ---------------------------------------------------------------------
TRUNCATE TABLE
  lg_case_action,
  lg_case_action_arrangement,
  lg_case_party,
  lg_case_referral,
  lg_case_assignment,
  lg_advice_assignment,
  lg_case,
  lg_case_intake,
  lg_external_counsel_invoice,
  lg_external_counsel_engagement,
  lg_external_counsel,
  legal_referral_source_task,
  legal_referral_info_request,
  legal_referral_document_link,
  legal_referral,
  bn_legal_referral,
  ce_legal_referrals,
  ce_legal_referral_lines,
  la_matter_referral,
  la_matter_party,
  la_matter_document,
  la_matter_action,
  la_matter_assignment,
  la_matter_financial_snapshot,
  la_advice_request,
  la_contract_review,
  la_matter
RESTART IDENTITY CASCADE;

COMMIT;

-- ---------------------------------------------------------------------
-- Post-reset verification
-- ---------------------------------------------------------------------
SELECT 'lg_case' AS t, COUNT(*) FROM lg_case
UNION ALL SELECT 'lg_case_intake', COUNT(*) FROM lg_case_intake
UNION ALL SELECT 'lg_recoverable_liability', COUNT(*) FROM lg_recoverable_liability
UNION ALL SELECT 'lg_hearing', COUNT(*) FROM lg_hearing
UNION ALL SELECT 'lg_order', COUNT(*) FROM lg_order
UNION ALL SELECT 'lg_appeal', COUNT(*) FROM lg_appeal
UNION ALL SELECT 'lg_enforcement_action', COUNT(*) FROM lg_enforcement_action
UNION ALL SELECT 'lg_recovery_assignment', COUNT(*) FROM lg_recovery_assignment
UNION ALL SELECT 'lg_settlement', COUNT(*) FROM lg_settlement
UNION ALL SELECT 'lg_consent_order', COUNT(*) FROM lg_consent_order
UNION ALL SELECT 'lg_fee_charge', COUNT(*) FROM lg_fee_charge
UNION ALL SELECT 'lg_legal_cost', COUNT(*) FROM lg_legal_cost
UNION ALL SELECT 'lg_document_link', COUNT(*) FROM lg_document_link
UNION ALL SELECT 'lg_case_activity', COUNT(*) FROM lg_case_activity
UNION ALL SELECT 'ce_legal_referrals', COUNT(*) FROM ce_legal_referrals
UNION ALL SELECT 'bn_legal_referral', COUNT(*) FROM bn_legal_referral
UNION ALL SELECT 'la_matter', COUNT(*) FROM la_matter;
-- Expected: all zero.
