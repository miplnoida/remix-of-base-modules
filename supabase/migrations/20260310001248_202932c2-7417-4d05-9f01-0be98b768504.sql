
-- Add additional realistic St Kitts & Nevis detection rules
INSERT INTO ce_detection_rules (rule_code, name, description, trigger_event, condition_expression, frequency, priority, auto_create_violation, is_enabled)
VALUES
  ('DR-008', 'Unregistered Employer Operating', 'Business detected operating in St Kitts or Nevis without SSB employer registration', 'registration_not_found', 'is_registered == false', 'daily', 'Critical', true, true),
  ('DR-009', 'Employee Count Discrepancy', 'Field inspection reveals more employees than declared on C3 submissions', 'employee_underreporting', 'employee_count > 0', 'on_event', 'High', true, true),
  ('DR-010', 'Wage Below Minimum Threshold', 'Declared wages fall below statutory minimum wage for St Kitts & Nevis', 'wage_underreporting', 'reported_wages < expected_wages', 'monthly', 'High', true, true),
  ('DR-011', 'Cessation Without Clearance', 'Employer ceased operations without settling outstanding SSB liabilities', 'cessation_without_clearance', 'outstanding_balance > 0', 'daily', 'Critical', true, true),
  ('DR-012', 'Contribution Gap Detected', 'Active employee missing contribution records for consecutive periods', 'contribution_gap_detected', 'missed_filings_count >= 2', 'monthly', 'Medium', true, true)
ON CONFLICT DO NOTHING;

-- Add additional calculation rules for SKN
INSERT INTO ce_calculation_rules (rule_code, name, description, applies_to, formula_expression, fund_type, source_config, is_enabled)
VALUES
  ('CR-005', 'SS Fine Calculation', 'Social Security fine based on C3 config rate and months overdue', 'fine', 'ss_contribution × ss_fine_initial_rate × months_overdue', 'SS', 'c3_config', true),
  ('CR-006', 'Levy Penalty Calculation', 'Levy penalty with initial rate plus additional per month from C3 config', 'penalty', 'levy_amount × levy_penalty_initial_rate + levy_amount × additional_rate_per_month × months_overdue', 'LV', 'c3_config', true),
  ('CR-007', 'Severance Penalty Calculation', 'Severance fund penalty based on configured rate', 'penalty', 'severance_amount × severance_penalty_rate × months_overdue', 'SV', 'c3_config', true)
ON CONFLICT DO NOTHING;

-- Add additional escalation rules for SKN
INSERT INTO ce_escalation_rules (rule_code, name, description, from_status, to_status, condition_expression, days_threshold, amount_threshold, auto_escalate, requires_approval, is_enabled)
VALUES
  ('ER-006', 'Prolonged Open Violation', 'Auto-escalate violations open beyond 60 days without action', 'Open', 'Under Review', 'days_overdue > 60', 60, null, true, false, true),
  ('ER-007', 'High Debt to Summons', 'Cases with outstanding balance exceeding $25,000 escalated to Summons', 'Warning Issued', 'Summons Issued', 'total_owed > 25000', null, 25000, false, true, true),
  ('ER-008', 'Repeat Offender Fast-Track', 'Employers with 3+ active violations fast-tracked to legal', 'Under Review', 'Legal Action', 'violations_count >= 3 AND is_repeat_offender == true', 30, null, false, true, true)
ON CONFLICT DO NOTHING;
