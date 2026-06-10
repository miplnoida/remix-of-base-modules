/**
 * Compliance Rule Simulator Engine
 * Pure TypeScript evaluation — NO database mutations, NO RPCs, NO side effects.
 * Takes facts in, returns simulation results out.
 */

// ── Types ──

export interface SimulationFactContext {
  // Employer
  employerRegNo: string | null;
  employerStatus: string | null;
  employerName: string | null;
  businessType: string | null;

  // Filing
  filingSubmitted: boolean;
  filingDate: string | null;
  filingPeriod: string | null;
  filingDueDay: number;
  gracePeriodDays: number;
  daysPastDeadline: number;

  // Payment
  paymentMade: boolean;
  paymentAmount: number;
  amountDue: number;
  shortfallAmount: number;
  shortfallPercent: number;

  // Arrangement
  arrangementActive: boolean;
  installmentDueDate: string | null;
  installmentPaidDate: string | null;
  installmentGraceDays: number;
  installmentOverdueDays: number;

  // Contributions
  levyAmountReported: number;
  severanceAmountReported: number;
  employeeCountDeclared: number;
  employeeCountObserved: number;
  totalWagesDeclared: number;
  priorAverageWages: number;
  levyEligible: boolean;
  severanceEligible: boolean;
  hasConsecutiveGaps: boolean;
  consecutiveGapCount: number;

  // History
  priorViolationsCount: number;
  priorSameTypeViolationsRolling12: number;
  repeatOffender: boolean;
  hasClearanceCert: boolean;

  // Risk/Status
  riskScore: number;
  daysOpen: number;
  totalOwed: number;
  noticeStage: string | null;
  legalResponseReceived: boolean;

  // Source tracking
  overriddenFields: string[];
}

export interface DetectionRuleData {
  id: string;
  rule_code: string;
  name: string;
  description: string | null;
  trigger_event: string;
  auto_create_violation: boolean | null;
  is_enabled: boolean | null;
  violation_type_id: string | null;
  parameters: Record<string, any> | null;
  frequency: string | null;
  priority: string | null;
}

export interface CalculationRuleData {
  id: string;
  rule_code: string;
  name: string;
  applies_to: string;
  formula_expression: string;
  fund_type: string | null;
  source_config: string | null;
  is_enabled: boolean | null;
  violation_type_id: string | null;
}

export interface EscalationRuleData {
  id: string;
  rule_code: string;
  name: string;
  from_status: string;
  to_status: string;
  condition_expression: string | null;
  days_threshold: number | null;
  amount_threshold: number | null;
  auto_escalate: boolean | null;
  requires_approval: boolean | null;
  is_enabled: boolean | null;
  violation_type_id: string | null;
}

export interface ViolationTypeData {
  id: string;
  code: string;
  name: string;
  category: string | null;
  severity_default: string | null;
}

export interface DetectionResult {
  ruleCode: string;
  ruleName: string;
  matched: boolean;
  reason: string;
  parameterValues: Record<string, any>;
  linkedViolationTypeCode: string | null;
  linkedViolationTypeName: string | null;
  autoCreate: boolean;
  initialStatus: 'OPEN' | 'UNDER_REVIEW';
  priority: string | null;
  /** Number of existing open/under-review violations of the same type for the employer+period. */
  duplicateCount: number;
  /** True when an existing violation would suppress creation. */
  duplicateSuppressed: boolean;
  /** Structured evidence rows shown in the "why" panel. Optional. */
  evidence?: Array<{ label: string; value: string }>;
  /** Period (YYYY-MM) this detection was evaluated against — populated in multi-period scan. */
  period?: string | null;
}

export interface CalculationResult {
  ruleCode: string;
  ruleName: string;
  applies: boolean;
  reason: string;
  sourceConfig: string | null;
  baseAmount: number;
  formulaSummary: string;
  simulatedAmount: number;
  fundType: string | null;
  skippedReason: string | null;
}

export interface EscalationResult {
  ruleCode: string;
  ruleName: string;
  applies: boolean;
  reason: string;
  fromStatus: string;
  toStatus: string;
  thresholdLogic: string;
  autoEscalate: boolean;
  requiresApproval: boolean;
}

export interface SimulationOutput {
  detectionResults: DetectionResult[];
  calculationResults: CalculationResult[];
  escalationResults: EscalationResult[];
  recommendations: string[];
  /** Fact keys that were not populated from real data (empty / zero / null defaults). */
  missingData: string[];
  /** Soft warnings the user should know about (incomplete data, disabled rules, etc.). */
  warnings: string[];
  /** Hard errors during evaluation (e.g. unknown evaluator). */
  errors: string[];
  summary: {
    matchedDetections: number;
    totalDetections: number;
    applicableCalculations: number;
    applicableEscalations: number;
    wouldCreateViolation: boolean;
    initialStatus: string | null;
    financialImpact: number;
    duplicatesSuppressed: number;
  };
}

export interface SimulationOptions {
  /** Restrict to a single rule (by rule_code). If omitted, all enabled rules run. */
  ruleCodeFilter?: string | null;
  /** Map of existing open/under-review violations per violation_type_id for this employer+period. */
  existingViolationsByVtId?: Record<string, number>;
  /** Map keyed by `${violation_type_id}|${period YYYY-MM}` for per-period dedupe. Preferred over existingViolationsByVtId. */
  existingViolationsByVtIdPeriod?: Record<string, number>;
}

// ── Helpers ──

function getViolationType(id: string | null, types: ViolationTypeData[]): ViolationTypeData | null {
  if (!id) return null;
  return types.find(t => t.id === id) || null;
}

/**
 * Builds structured evidence rows (e.g. period, C3 submission ID, days late,
 * shortfall amounts) for the detection result's "why" panel.
 */
function buildDetectionEvidence(ruleCode: string, facts: SimulationFactContext): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: any) => {
    if (value === undefined || value === null || value === '') return;
    rows.push({ label, value: String(value) });
  };
  push('Employer', facts.employerRegNo);
  push('Filing Period', facts.filingPeriod);
  push('C3 Submission ID', (facts as any).filingSubmissionId);

  switch (ruleCode) {
    case 'DR-001': // Late filing
      push('Filed On', facts.filingDate);
      push('Due Day', facts.filingDueDay);
      push('Grace Period (days)', facts.gracePeriodDays);
      push('Filing Submitted', facts.filingSubmitted ? 'Yes' : 'No');
      break;
    case 'DR-002': // Non-filing
      push('Filing Submitted', facts.filingSubmitted ? 'Yes' : 'No');
      push('Days Past Deadline', facts.daysPastDeadline);
      push('Missing Month', facts.filingPeriod);
      break;
    case 'DR-003': // Non-payment
      push('Amount Due (EC$)', facts.amountDue);
      push('Payment Made', facts.paymentMade ? 'Yes' : 'No');
      push('Payment Amount (EC$)', facts.paymentAmount);
      break;
    case 'DR-004': // Short payment
      push('Amount Due (EC$)', facts.amountDue);
      push('Payment Amount (EC$)', facts.paymentAmount);
      push('Shortfall (EC$)', facts.shortfallAmount);
      push('Shortfall %', facts.shortfallPercent?.toFixed?.(2));
      break;
    case 'DR-005': // Repeat offender
      push('Prior Same-Type Violations (12mo)', facts.priorSameTypeViolationsRolling12);
      break;
    case 'DR-006': // Arrangement breach
      push('Arrangement Active', facts.arrangementActive ? 'Yes' : 'No');
      push('Installment Overdue (days)', facts.installmentOverdueDays);
      break;
  }
  return rows;
}

// ── Detection Evaluators ──

function evaluateDR001(facts: SimulationFactContext, params: Record<string, any>): { matched: boolean; reason: string } {
  if (!facts.filingSubmitted) return { matched: false, reason: 'C3 not submitted — use DR-002 (Non-Filing) instead' };
  if (!facts.filingDate || !facts.filingPeriod) return { matched: false, reason: 'Filing date or period not available' };

  const grace = facts.gracePeriodDays;
  const dueDay = facts.filingDueDay;

  // Parse filing period and date
  const periodDate = new Date(facts.filingPeriod + '-01');
  const deadlineDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, dueDay);
  const graceEnd = new Date(deadlineDate);
  graceEnd.setDate(graceEnd.getDate() + grace);

  const filed = new Date(facts.filingDate);
  if (filed > graceEnd) {
    const daysLate = Math.ceil((filed.getTime() - graceEnd.getTime()) / (1000 * 60 * 60 * 24));
    return { matched: true, reason: `C3 filed ${daysLate} day(s) after grace period (due: day ${dueDay}, grace: ${grace} days)` };
  }
  return { matched: false, reason: `C3 filed within deadline + ${grace}-day grace period` };
}

function evaluateDR002(facts: SimulationFactContext, params: Record<string, any>): { matched: boolean; reason: string } {
  if (facts.filingSubmitted) return { matched: false, reason: 'C3 was submitted for this period' };
  const threshold = params?.days_past_deadline ?? 30;
  if (facts.daysPastDeadline >= threshold) {
    return { matched: true, reason: `No C3 submitted and ${facts.daysPastDeadline} days past deadline (threshold: ${threshold})` };
  }
  return { matched: false, reason: `Only ${facts.daysPastDeadline} days past deadline (threshold: ${threshold})` };
}

function evaluateDR003(facts: SimulationFactContext): { matched: boolean; reason: string } {
  if (!facts.filingSubmitted) return { matched: false, reason: 'No C3 filed — payment check not applicable without filing' };
  if (facts.paymentMade && facts.paymentAmount > 0) return { matched: false, reason: 'Payment was received' };
  if (facts.amountDue <= 0) return { matched: false, reason: 'No amount due on this C3' };
  return { matched: true, reason: `C3 filed with amount due EC$${facts.amountDue.toLocaleString()} but no payment received` };
}

function evaluateDR004(facts: SimulationFactContext, params: Record<string, any>): { matched: boolean; reason: string } {
  if (!facts.paymentMade || facts.paymentAmount <= 0) return { matched: false, reason: 'No payment made — use DR-003 (Non-Payment) instead' };
  if (facts.amountDue <= 0) return { matched: false, reason: 'No amount due' };

  const minPercent = params?.min_shortfall_percent ?? 5;
  const minAmount = params?.min_shortfall_amount_xcd ?? 50;

  if (facts.shortfallPercent < minPercent) return { matched: false, reason: `Shortfall ${facts.shortfallPercent.toFixed(1)}% is below ${minPercent}% threshold` };
  if (facts.shortfallAmount < minAmount) return { matched: false, reason: `Shortfall EC$${facts.shortfallAmount.toFixed(2)} is below EC$${minAmount} threshold` };

  return { matched: true, reason: `Payment shortfall of EC$${facts.shortfallAmount.toLocaleString()} (${facts.shortfallPercent.toFixed(1)}%) exceeds thresholds (${minPercent}% / EC$${minAmount})` };
}

function evaluateDR005(facts: SimulationFactContext, params: Record<string, any>): { matched: boolean; reason: string } {
  const threshold = params?.violation_count_threshold ?? 3;
  const months = params?.rolling_months ?? 12;
  if (facts.priorSameTypeViolationsRolling12 >= threshold) {
    return { matched: true, reason: `${facts.priorSameTypeViolationsRolling12} same-type violations in rolling ${months} months (threshold: ${threshold})` };
  }
  return { matched: false, reason: `Only ${facts.priorSameTypeViolationsRolling12} same-type violations in ${months} months (threshold: ${threshold})` };
}

function evaluateDR006(facts: SimulationFactContext, params: Record<string, any>): { matched: boolean; reason: string } {
  if (!facts.arrangementActive) return { matched: false, reason: 'No active payment arrangement' };
  const grace = params?.grace_days_after_installment ?? 7;
  if (facts.installmentOverdueDays > grace) {
    return { matched: true, reason: `Installment overdue by ${facts.installmentOverdueDays} days (grace: ${grace} days)` };
  }
  return { matched: false, reason: `Installment ${facts.installmentOverdueDays <= 0 ? 'not yet due' : `only ${facts.installmentOverdueDays} days overdue (grace: ${grace})`}` };
}

function evaluateDR007(facts: SimulationFactContext, params: Record<string, any>): { matched: boolean; reason: string } {
  if (!facts.levyEligible) return { matched: false, reason: 'Employer is not levy-eligible (below threshold or exempt)' };
  if (facts.totalWagesDeclared <= 0) return { matched: false, reason: 'No wages declared on C3' };
  if (facts.levyAmountReported > 0) return { matched: false, reason: `Levy amount reported: EC$${facts.levyAmountReported.toLocaleString()}` };
  return { matched: true, reason: `Levy-eligible employer with wages EC$${facts.totalWagesDeclared.toLocaleString()} but levy reported = EC$0` };
}

function evaluateDR008(facts: SimulationFactContext): { matched: boolean; reason: string } {
  if (facts.employerRegNo) return { matched: false, reason: `Employer is registered (Reg# ${facts.employerRegNo})` };
  return { matched: true, reason: 'No employer registration found — business appears to be operating without registration' };
}

function evaluateDR009(facts: SimulationFactContext, params: Record<string, any>): { matched: boolean; reason: string } {
  const minDisc = params?.min_discrepancy ?? 2;
  const minPct = params?.min_discrepancy_percent ?? 20;
  const diff = facts.employeeCountObserved - facts.employeeCountDeclared;
  const pct = facts.employeeCountDeclared > 0 ? (diff / facts.employeeCountDeclared) * 100 : (diff > 0 ? 100 : 0);

  if (diff < minDisc) return { matched: false, reason: `Discrepancy of ${diff} is below minimum ${minDisc}` };
  if (pct < minPct) return { matched: false, reason: `Discrepancy ${pct.toFixed(0)}% is below ${minPct}% threshold` };
  return { matched: true, reason: `Declared: ${facts.employeeCountDeclared}, Observed: ${facts.employeeCountObserved} (discrepancy: ${diff}, ${pct.toFixed(0)}%)` };
}

function evaluateDR010(facts: SimulationFactContext, params: Record<string, any>): { matched: boolean; reason: string } {
  const varianceThreshold = params?.historical_variance_threshold_percent ?? 30;
  const provisional = params?.provisional ?? true;

  if (facts.priorAverageWages <= 0) return { matched: false, reason: 'No historical wage data available for comparison' };

  const drop = ((facts.priorAverageWages - facts.totalWagesDeclared) / facts.priorAverageWages) * 100;
  if (drop >= varianceThreshold) {
    const note = provisional ? ' [PROVISIONAL — min wage check skipped, min_wage_weekly_xcd = null]' : '';
    return { matched: true, reason: `Wages dropped ${drop.toFixed(1)}% from trailing average (threshold: ${varianceThreshold}%)${note}` };
  }
  return { matched: false, reason: `Wage variance ${drop.toFixed(1)}% is below ${varianceThreshold}% threshold` };
}

function evaluateDR011(facts: SimulationFactContext, params: Record<string, any>): { matched: boolean; reason: string } {
  const triggerStatuses = params?.trigger_on_status ?? ['I', 'D'];
  if (!facts.employerStatus || !triggerStatuses.includes(facts.employerStatus)) {
    return { matched: false, reason: `Employer status "${facts.employerStatus || 'unknown'}" is not in trigger list [${triggerStatuses.join(', ')}]` };
  }
  if (facts.hasClearanceCert) return { matched: false, reason: 'Employer has compliance clearance certificate' };
  return { matched: true, reason: `Employer status is "${facts.employerStatus}" without compliance clearance certificate` };
}

function evaluateDR012(facts: SimulationFactContext, params: Record<string, any>): { matched: boolean; reason: string } {
  const minGaps = params?.min_consecutive_gaps ?? 2;
  if (facts.consecutiveGapCount >= minGaps) {
    return { matched: true, reason: `${facts.consecutiveGapCount} consecutive contribution gaps detected (threshold: ${minGaps})` };
  }
  return { matched: false, reason: `Only ${facts.consecutiveGapCount} consecutive gap(s) (threshold: ${minGaps})` };
}

function evaluateDR013(facts: SimulationFactContext, params: Record<string, any>): { matched: boolean; reason: string } {
  if (!facts.severanceEligible) return { matched: false, reason: 'Employer has no severance-eligible employees' };
  if (facts.totalWagesDeclared <= 0) return { matched: false, reason: 'No wages declared on C3' };
  if (facts.severanceAmountReported > 0) return { matched: false, reason: `Severance reported: EC$${facts.severanceAmountReported.toLocaleString()}` };
  return { matched: true, reason: `Severance-eligible employer with wages EC$${facts.totalWagesDeclared.toLocaleString()} but severance reported = EC$0` };
}

const DETECTION_EVALUATORS: Record<string, (facts: SimulationFactContext, params: Record<string, any>) => { matched: boolean; reason: string }> = {
  'DR-001': evaluateDR001,
  'DR-002': evaluateDR002,
  'DR-003': evaluateDR003,
  'DR-004': evaluateDR004,
  'DR-005': evaluateDR005,
  'DR-006': evaluateDR006,
  'DR-007': evaluateDR007,
  'DR-008': evaluateDR008,
  'DR-009': evaluateDR009,
  'DR-010': evaluateDR010,
  'DR-011': evaluateDR011,
  'DR-012': evaluateDR012,
  'DR-013': evaluateDR013,
};

// ── Calculation Evaluators ──

function evaluateCalculation(
  rule: CalculationRuleData,
  facts: SimulationFactContext,
  matchedViolationTypeIds: Set<string>
): CalculationResult {
  const applies = rule.violation_type_id === null
    ? facts.totalOwed > 0 // Generic (CR-002): applies if outstanding balance
    : matchedViolationTypeIds.has(rule.violation_type_id);

  if (!applies) {
    return {
      ruleCode: rule.rule_code,
      ruleName: rule.name,
      applies: false,
      reason: rule.violation_type_id === null
        ? 'No outstanding balance for generic interest calculation'
        : 'Linked violation type was not triggered by detection',
      sourceConfig: rule.source_config,
      baseAmount: 0,
      formulaSummary: rule.formula_expression,
      simulatedAmount: 0,
      fundType: rule.fund_type,
      skippedReason: null,
    };
  }

  // Simulate amounts based on rule code
  let baseAmount = 0;
  let simulatedAmount = 0;
  let reason = '';
  let skippedReason: string | null = null;

  switch (rule.rule_code) {
    case 'CR-001': { // Late Payment Penalty on shortfall
      baseAmount = facts.shortfallAmount;
      const initialRate = 0.05; // from c3_config_details
      simulatedAmount = baseAmount * initialRate;
      reason = `Penalty on shortfall EC$${baseAmount.toLocaleString()} × ${(initialRate * 100)}% initial rate`;
      break;
    }
    case 'CR-002': { // Interest Accrual (generic)
      baseAmount = facts.totalOwed;
      const monthlyRate = 0.005; // ~6% annual / 12 from ce_compliance_policies
      const monthsOverdue = Math.max(1, Math.ceil(facts.daysOpen / 30));
      simulatedAmount = baseAmount * monthlyRate * monthsOverdue;
      reason = `Interest on EC$${baseAmount.toLocaleString()} × ${(monthlyRate * 100).toFixed(2)}%/month × ${monthsOverdue} month(s)`;
      break;
    }
    case 'CR-003': { // Estimated Assessment
      baseAmount = facts.priorAverageWages;
      simulatedAmount = baseAmount * 1.5;
      reason = `Estimated: avg(last 3 C3 totals) × 1.5 = EC$${baseAmount.toLocaleString()} × 1.5`;
      if (baseAmount <= 0) {
        simulatedAmount = 0;
        skippedReason = 'No historical C3 data available — estimation cannot run, manual assessment required';
      }
      break;
    }
    case 'CR-004': { // Under-Declaration Surcharge
      skippedReason = 'CR-004 is currently DISABLED pending audit workflow integration';
      reason = 'Under-declaration surcharge — disabled';
      break;
    }
    case 'CR-005': { // SS Fine
      baseAmount = facts.amountDue;
      const ssRate = 0.05;
      simulatedAmount = baseAmount * ssRate;
      reason = `SS fine: EC$${baseAmount.toLocaleString()} × ${(ssRate * 100)}% initial rate`;
      break;
    }
    case 'CR-006': { // Levy Penalty
      baseAmount = facts.levyAmountReported > 0 ? facts.levyAmountReported : facts.totalWagesDeclared * 0.03;
      const levyRate = 0.05;
      simulatedAmount = baseAmount * levyRate;
      reason = `Levy penalty: estimated levy EC$${baseAmount.toLocaleString()} × ${(levyRate * 100)}%`;
      break;
    }
    case 'CR-007': { // Severance Penalty
      baseAmount = facts.severanceAmountReported > 0 ? facts.severanceAmountReported : facts.totalWagesDeclared * 0.01;
      const sevRate = 0.05;
      simulatedAmount = baseAmount * sevRate;
      reason = `Severance penalty: estimated EC$${baseAmount.toLocaleString()} × ${(sevRate * 100)}%`;
      break;
    }
    default:
      reason = 'Unknown calculation rule';
  }

  return {
    ruleCode: rule.rule_code,
    ruleName: rule.name,
    applies: true,
    reason,
    sourceConfig: rule.source_config,
    baseAmount,
    formulaSummary: rule.formula_expression,
    simulatedAmount,
    fundType: rule.fund_type,
    skippedReason,
  };
}

// ── Escalation Evaluators ──

function evaluateEscalation(
  rule: EscalationRuleData,
  facts: SimulationFactContext,
  initialStatus: string,
  matchedViolationTypeIds: Set<string>
): EscalationResult {
  // Check if the escalation is for the right violation type
  const vtApplicable = rule.violation_type_id === null || matchedViolationTypeIds.has(rule.violation_type_id);
  const statusMatches = rule.from_status === initialStatus;

  let applies = false;
  let reason = '';
  let thresholdLogic = '';

  if (!vtApplicable) {
    reason = 'Linked violation type was not triggered';
    thresholdLogic = 'N/A';
  } else if (!statusMatches) {
    reason = `Current status "${initialStatus}" does not match from_status "${rule.from_status}"`;
    thresholdLogic = `${rule.from_status} → ${rule.to_status}`;
  } else {
    thresholdLogic = rule.condition_expression || `${rule.from_status} → ${rule.to_status}`;

    switch (rule.rule_code) {
      case 'ER-001':
        applies = facts.daysOpen > (rule.days_threshold ?? 14);
        reason = applies
          ? `${facts.daysOpen} days since notice (threshold: ${rule.days_threshold})`
          : `Only ${facts.daysOpen} days since notice`;
        break;
      case 'ER-002':
        applies = facts.daysOpen > (rule.days_threshold ?? 14);
        reason = applies
          ? `${facts.daysOpen} days since demand notice, no payment`
          : `Only ${facts.daysOpen} days since demand notice`;
        break;
      case 'ER-003':
        applies = facts.daysOpen > (rule.days_threshold ?? 7) && !facts.legalResponseReceived;
        reason = applies
          ? `${facts.daysOpen} days since final demand, no response`
          : facts.legalResponseReceived ? 'Response received' : `Only ${facts.daysOpen} days`;
        break;
      case 'ER-004':
        applies = facts.totalOwed > 50000;
        reason = applies
          ? `Total arrears EC$${facts.totalOwed.toLocaleString()} exceeds EC$50,000 threshold`
          : `Total arrears EC$${facts.totalOwed.toLocaleString()} below EC$50,000`;
        break;
      case 'ER-005':
        applies = facts.riskScore >= 76;
        reason = applies
          ? `Risk score ${facts.riskScore} ≥ 65 (critical band)`
          : `Risk score ${facts.riskScore} below critical threshold (65)`;
        break;
      case 'ER-006':
        applies = facts.daysOpen > (rule.days_threshold ?? 60);
        reason = applies
          ? `Violation open for ${facts.daysOpen} days (threshold: ${rule.days_threshold ?? 60})`
          : `Only ${facts.daysOpen} days open (threshold: ${rule.days_threshold ?? 60})`;
        break;
      case 'ER-007':
        applies = facts.totalOwed > (rule.amount_threshold ?? 25000);
        reason = applies
          ? `Total owed EC$${facts.totalOwed.toLocaleString()} exceeds EC$${(rule.amount_threshold ?? 25000).toLocaleString()}`
          : `Total owed below threshold`;
        break;
      case 'ER-008':
        applies = facts.priorViolationsCount >= 3 && facts.repeatOffender;
        reason = applies
          ? `${facts.priorViolationsCount} violations + repeat offender flag`
          : `${facts.priorViolationsCount} violations, repeat=${facts.repeatOffender}`;
        break;
      default:
        reason = 'Unknown escalation rule';
    }
  }

  return {
    ruleCode: rule.rule_code,
    ruleName: rule.name,
    applies,
    reason,
    fromStatus: rule.from_status,
    toStatus: rule.to_status,
    thresholdLogic,
    autoEscalate: rule.auto_escalate ?? false,
    requiresApproval: rule.requires_approval ?? false,
  };
}

// ── Main Simulation Runner ──

export function runSimulation(
  facts: SimulationFactContext,
  detectionRules: DetectionRuleData[],
  calculationRules: CalculationRuleData[],
  escalationRules: EscalationRuleData[],
  violationTypes: ViolationTypeData[],
  options: SimulationOptions = {}
): SimulationOutput {
  const ruleFilter = options.ruleCodeFilter ?? null;
  const dupMap = options.existingViolationsByVtId ?? {};
  const dupMapPeriod = options.existingViolationsByVtIdPeriod ?? {};
  const currentPeriod = facts.filingPeriod ? facts.filingPeriod.substring(0, 7) : null;
  const warnings: string[] = [];
  const errors: string[] = [];

  // ── Missing-data discovery ──
  const missingData: string[] = [];
  if (!facts.employerRegNo) missingData.push('employer (no employer selected)');
  if (!facts.filingPeriod) missingData.push('filing period');
  if (facts.amountDue === 0 && !facts.filingSubmitted) missingData.push('amount due (no C3 filed for period)');
  if (facts.priorAverageWages === 0) missingData.push('historical wages (no prior C3 data)');
  if (facts.employeeCountObserved === 0 && facts.employeeCountDeclared > 0) {
    missingData.push('observed employee count (no inspection on file)');
  }
  if (!facts.noticeStage && facts.totalOwed > 0) missingData.push('current notice stage');

  const passesFilter = (code: string) => !ruleFilter || code === ruleFilter;

  // 1. Detection
  const detectionResults: DetectionResult[] = detectionRules
    .filter(r => r.is_enabled && passesFilter(r.rule_code))
    .map(rule => {
      const evaluator = DETECTION_EVALUATORS[rule.rule_code];
      const params = rule.parameters || {};
      let matched = false;
      let reason = '';
      if (evaluator) {
        const out = evaluator(facts, params);
        matched = out.matched;
        reason = out.reason;
      } else {
        reason = `No evaluator for ${rule.rule_code}`;
        errors.push(`Detection rule ${rule.rule_code} has no engine evaluator wired up.`);
      }

      const vt = getViolationType(rule.violation_type_id, violationTypes);
      const autoCreate = rule.auto_create_violation ?? true;
      const duplicateCount = vt?.id ? (dupMap[vt.id] ?? 0) : 0;
      const duplicateSuppressed = matched && duplicateCount > 0;
      const evidence = buildDetectionEvidence(rule.rule_code, facts);

      return {
        ruleCode: rule.rule_code,
        ruleName: rule.name,
        matched,
        reason,
        parameterValues: params,
        linkedViolationTypeCode: vt?.code || null,
        linkedViolationTypeName: vt?.name || null,
        autoCreate,
        initialStatus: autoCreate ? ('OPEN' as const) : ('UNDER_REVIEW' as const),
        priority: rule.priority,
        duplicateCount,
        duplicateSuppressed,
        evidence,
      };
    });

  // Collect matched violation type IDs
  const matchedVtIds = new Set<string>();
  detectionResults.filter(d => d.matched).forEach(d => {
    const rule = detectionRules.find(r => r.rule_code === d.ruleCode);
    if (rule?.violation_type_id) matchedVtIds.add(rule.violation_type_id);
  });

  // 2. Calculation
  const calculationResults: CalculationResult[] = calculationRules
    .filter(r => r.is_enabled && passesFilter(r.rule_code))
    .map(rule => evaluateCalculation(rule, facts, matchedVtIds));

  // For disabled rules within filter scope, surface them
  const disabledCalc = calculationRules.filter(r => !r.is_enabled && passesFilter(r.rule_code));
  disabledCalc.forEach(rule => {
    calculationResults.push({
      ruleCode: rule.rule_code,
      ruleName: rule.name,
      applies: false,
      reason: 'Rule is currently DISABLED',
      sourceConfig: rule.source_config,
      baseAmount: 0,
      formulaSummary: rule.formula_expression,
      simulatedAmount: 0,
      fundType: rule.fund_type,
      skippedReason: `${rule.rule_code} is disabled`,
    });
    warnings.push(`Calculation rule ${rule.rule_code} is disabled — no amount produced.`);
  });

  calculationResults.sort((a, b) => a.ruleCode.localeCompare(b.ruleCode));

  // 3. Escalation
  const matchedDetections = detectionResults.filter(d => d.matched);
  const primaryStatus = matchedDetections.length > 0
    ? (matchedDetections.some(d => !d.autoCreate) ? 'UNDER_REVIEW' : 'OPEN')
    : 'OPEN';

  const effectiveStatus = facts.noticeStage || primaryStatus;

  const escalationResults: EscalationResult[] = escalationRules
    .filter(r => r.is_enabled && passesFilter(r.rule_code))
    .map(rule => evaluateEscalation(rule, facts, effectiveStatus, matchedVtIds));

  // 4. Recommendations
  const recommendations: string[] = [];
  if (matchedDetections.length === 0) {
    recommendations.push('✅ No compliance violation detected for this scenario.');
  } else {
    matchedDetections.forEach(d => {
      if (d.duplicateSuppressed) {
        recommendations.push(`⚠️ Would match ${d.linkedViolationTypeCode}, but ${d.duplicateCount} open violation(s) of the same type already exist — duplicate suppressed.`);
      } else if (d.autoCreate) {
        recommendations.push(`🔴 Auto-create ${d.linkedViolationTypeCode} violation (initial status: OPEN)`);
      } else {
        recommendations.push(`🟡 Create UNDER_REVIEW case for ${d.linkedViolationTypeCode} — assign compliance officer for review`);
      }
    });

    const appliedCalcs = calculationResults.filter(c => c.applies && c.simulatedAmount > 0);
    if (appliedCalcs.length > 0) {
      const total = appliedCalcs.reduce((sum, c) => sum + c.simulatedAmount, 0);
      recommendations.push(`💰 Financial consequence: EC$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })} in penalties/interest/fines`);
    }

    const appliedEsc = escalationResults.filter(e => e.applies);
    appliedEsc.forEach(e => {
      if (e.autoEscalate) {
        recommendations.push(`⚡ Auto-escalate: ${e.fromStatus} → ${e.toStatus}`);
      } else {
        recommendations.push(`👤 Manual escalation recommended: ${e.fromStatus} → ${e.toStatus}${e.requiresApproval ? ' (requires approval)' : ''}`);
      }
    });
  }

  // 5. Summary
  const applicableCalcs = calculationResults.filter(c => c.applies);
  const financialImpact = applicableCalcs.reduce((sum, c) => sum + c.simulatedAmount, 0);
  const duplicatesSuppressed = matchedDetections.filter(d => d.duplicateSuppressed).length;

  return {
    detectionResults,
    calculationResults,
    escalationResults,
    recommendations,
    missingData,
    warnings,
    errors,
    summary: {
      matchedDetections: matchedDetections.length,
      totalDetections: detectionResults.length,
      applicableCalculations: applicableCalcs.length,
      applicableEscalations: escalationResults.filter(e => e.applies).length,
      wouldCreateViolation: matchedDetections.length > 0 && duplicatesSuppressed < matchedDetections.length,
      initialStatus: matchedDetections.length > 0 ? primaryStatus : null,
      financialImpact,
      duplicatesSuppressed,
    },
  };
}

// ── Default Fact Context ──

export function createDefaultFactContext(): SimulationFactContext {
  return {
    employerRegNo: null,
    employerStatus: null,
    employerName: null,
    businessType: null,
    filingSubmitted: false,
    filingDate: null,
    filingPeriod: null,
    filingDueDay: 28,
    gracePeriodDays: 5,
    daysPastDeadline: 0,
    paymentMade: false,
    paymentAmount: 0,
    amountDue: 0,
    shortfallAmount: 0,
    shortfallPercent: 0,
    arrangementActive: false,
    installmentDueDate: null,
    installmentPaidDate: null,
    installmentGraceDays: 7,
    installmentOverdueDays: 0,
    levyAmountReported: 0,
    severanceAmountReported: 0,
    employeeCountDeclared: 0,
    employeeCountObserved: 0,
    totalWagesDeclared: 0,
    priorAverageWages: 0,
    levyEligible: false,
    severanceEligible: false,
    hasConsecutiveGaps: false,
    consecutiveGapCount: 0,
    priorViolationsCount: 0,
    priorSameTypeViolationsRolling12: 0,
    repeatOffender: false,
    hasClearanceCert: false,
    riskScore: 0,
    daysOpen: 0,
    totalOwed: 0,
    noticeStage: null,
    legalResponseReceived: false,
    overriddenFields: [],
  };
}
