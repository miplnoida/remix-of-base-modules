/**
 * BN Gap Modules — Integration Flow Scenarios.
 *
 * These six canonical flows prove that the gap modules work together as
 * one Benefits platform. Each flow is a sequence of commands that spans
 * MORE THAN ONE module, plus the expected side-effects on adjacent
 * canonical platforms (Communications, Legal, Finance, DMS, IP).
 *
 * The scenarios are used by:
 *   - contract tests (against real fixtures where materialised),
 *   - Benefits Diagnostics (as reachability probes),
 *   - the completion register.
 */
import type { BnGapModuleCode } from '@/types/bn/gap/commandEnvelope';

export interface IntegrationFlowStep {
  readonly moduleCode: BnGapModuleCode;
  readonly commandName: string;
  readonly note: string;
  /** Side effect on canonical platforms (facts, not code). */
  readonly sideEffects?: readonly (
    | 'communication_hub_dispatch'
    | 'core_ledger_transaction'
    | 'core_dms_document_link'
    | 'legal_referral_created'
    | 'ip_master_read_only'
    | 'core_workflow_task_created'
    | 'core_audit_log_written'
  )[];
}

export interface IntegrationFlowScenario {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly modulesInvolved: readonly BnGapModuleCode[];
  readonly steps: readonly IntegrationFlowStep[];
  readonly successCriteria: readonly string[];
  readonly failureModes: readonly string[];
}

export const BN_GAP_INTEGRATION_FLOWS: readonly IntegrationFlowScenario[] = [
  {
    id: 'FLOW-1-DEATH-DOWNSTREAM',
    title: 'Death verified → award terminated → payment-after-death overpayment → survivor / funeral / estate',
    description:
      'From death notification through award closure, overpayment raise, and survivor / funeral / estate hand-offs.',
    modulesInvolved: ['bn_mortality', 'bn_overpayments'],
    steps: [
      { moduleCode: 'bn_mortality',   commandName: 'BN_MORTALITY_REPORT',                   note: 'Death reported (any source).', sideEffects: ['core_audit_log_written'] },
      { moduleCode: 'bn_mortality',   commandName: 'BN_MORTALITY_REQUEST_VERIFICATION',     note: 'Ask registrar / IP module.',    sideEffects: ['ip_master_read_only'] },
      { moduleCode: 'bn_mortality',   commandName: 'BN_MORTALITY_VERIFY',                   note: 'Authoritative source confirms.', sideEffects: ['core_audit_log_written'] },
      { moduleCode: 'bn_mortality',   commandName: 'BN_MORTALITY_HOLD_AWARDS',              note: 'Payment held on all affected awards.', sideEffects: ['core_workflow_task_created'] },
      { moduleCode: 'bn_mortality',   commandName: 'BN_MORTALITY_TERMINATE_AWARDS',         note: 'Awards terminated transactionally.',   sideEffects: ['communication_hub_dispatch','core_audit_log_written'] },
      { moduleCode: 'bn_overpayments',commandName: 'BN_OVP_ASSESS',                          note: 'Payment-after-death overpayment raised.', sideEffects: ['core_ledger_transaction'] },
      { moduleCode: 'bn_mortality',   commandName: 'BN_MORTALITY_OPEN_SURVIVOR_ASSESSMENT', note: 'Survivor benefit opportunity.',        sideEffects: ['core_workflow_task_created'] },
      { moduleCode: 'bn_mortality',   commandName: 'BN_MORTALITY_OPEN_FUNERAL_OPPORTUNITY', note: 'Funeral benefit opportunity.',         sideEffects: ['core_workflow_task_created','communication_hub_dispatch'] },
      { moduleCode: 'bn_mortality',   commandName: 'BN_MORTALITY_RAISE_ESTATE_REFERRAL',    note: 'Legal referral for estate.',           sideEffects: ['legal_referral_created'] },
    ],
    successCriteria: [
      'All commands succeed with EXECUTED or REPLAYED.',
      'No payment issued after verified date of death.',
      'One overpayment record exists, cause = PAYMENT_AFTER_DEATH.',
      'Legal referral exists with correct entity linkage.',
      'IP module read-only (no mutation from mortality).',
    ],
    failureModes: [
      'Termination without prior verification → REJECTED / state-transition denial.',
      'Overpayment raised twice for the same PAD event → second call is REPLAYED (idempotency).',
    ],
  },
  {
    id: 'FLOW-2-OVERPAYMENT-APPEAL',
    title: 'Overpayment disputed → appeal → decision varied → recalculation → recovery plan revised → Finance reconciled',
    description: 'Appeal-driven variation of an overpayment liability.',
    modulesInvolved: ['bn_overpayments', 'bn_appeals'],
    steps: [
      { moduleCode: 'bn_overpayments', commandName: 'BN_OVP_ASSESS',                 note: 'Initial assessment.',           sideEffects: ['core_ledger_transaction'] },
      { moduleCode: 'bn_overpayments', commandName: 'BN_OVP_NOTIFY',                 note: 'Debtor notified.',              sideEffects: ['communication_hub_dispatch','core_dms_document_link'] },
      { moduleCode: 'bn_appeals',      commandName: 'BN_APPEAL_SUBMIT_CLAIMANT',     note: 'Debtor lodges appeal.',         sideEffects: ['core_audit_log_written'] },
      { moduleCode: 'bn_appeals',      commandName: 'BN_APPEAL_ACKNOWLEDGE',         note: 'Registrar acknowledges.' },
      { moduleCode: 'bn_appeals',      commandName: 'BN_APPEAL_REVIEW_ADMISSIBILITY',note: 'Admissible.' },
      { moduleCode: 'bn_appeals',      commandName: 'BN_APPEAL_DECIDE',              note: 'Outcome: OVERTURNED_PARTIAL.',  sideEffects: ['core_audit_log_written'] },
      { moduleCode: 'bn_appeals',      commandName: 'BN_APPEAL_IMPLEMENT',           note: 'Implementation kicks OVP recalc.' },
      { moduleCode: 'bn_overpayments', commandName: 'BN_OVP_RECALCULATE',            note: 'Liability recalculated per decision.', sideEffects: ['core_ledger_transaction','core_audit_log_written'] },
      { moduleCode: 'bn_overpayments', commandName: 'BN_OVP_PROPOSE_ARRANGEMENT',    note: 'Revised recovery plan proposed.' },
      { moduleCode: 'bn_overpayments', commandName: 'BN_OVP_ACTIVATE_ARRANGEMENT',   note: 'Activated with maker-checker.', sideEffects: ['communication_hub_dispatch'] },
    ],
    successCriteria: [
      'Recalculated liability matches decision snapshot.',
      'Finance ledger balances after recalc.',
      'Appeal implementation is transactional with OVP recalc.',
    ],
    failureModes: [
      'Recalc without matching decision snapshot → REJECTED.',
      'Self-approval on activation → REJECTED (maker-checker).',
    ],
  },
  {
    id: 'FLOW-3-MEANS-TEST-APPEAL-RERUN',
    title: 'Means-test failed → appeal → evidence added → outcome overturned → eligibility rerun → award created',
    description: 'Adverse means-test outcome successfully appealed.',
    modulesInvolved: ['bn_means_tests', 'bn_appeals'],
    steps: [
      { moduleCode: 'bn_means_tests', commandName: 'BN_MT_ASSESS',                    note: 'Initial assessment.' },
      { moduleCode: 'bn_means_tests', commandName: 'BN_MT_FAIL',                      note: 'Failed.', sideEffects: ['communication_hub_dispatch'] },
      { moduleCode: 'bn_appeals',      commandName: 'BN_APPEAL_SUBMIT_CLAIMANT',      note: 'Appellant lodges.' },
      { moduleCode: 'bn_appeals',      commandName: 'BN_APPEAL_ATTACH_EVIDENCE',      note: 'New evidence.', sideEffects: ['core_dms_document_link'] },
      { moduleCode: 'bn_appeals',      commandName: 'BN_APPEAL_DECIDE',               note: 'OVERTURNED_FULL.' },
      { moduleCode: 'bn_means_tests', commandName: 'BN_MT_APPLY_APPEAL_OVERTURN',     note: 'Overturn applied.' },
      { moduleCode: 'bn_means_tests', commandName: 'BN_MT_RERUN_ELIGIBILITY',         note: 'Eligibility rerun.' },
      { moduleCode: 'bn_means_tests', commandName: 'BN_MT_CREATE_AWARD_FROM_RERUN',   note: 'Award created.', sideEffects: ['core_audit_log_written','communication_hub_dispatch'] },
    ],
    successCriteria: [
      'Award-created event carries appeal decision id.',
      'Rerun uses evidence attached during appeal.',
    ],
    failureModes: [
      'Rerun before overturn applied → state-transition denial.',
    ],
  },
  {
    id: 'FLOW-4-RISK-SYSTEM-ERROR',
    title: 'Risk signal → enhanced verification → system error identified → claim corrected → overpayment avoided',
    description: 'Risk pipeline catches a system error before payment is issued.',
    modulesInvolved: ['bn_risk_management'],
    steps: [
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_DETECT',                        note: 'Rule engine emits signal.' },
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_TRIAGE',                        note: 'Triage complete.' },
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_REQUEST_ENHANCED_VERIFICATION', note: 'Additional evidence.' },
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_CONFIRM_SYSTEM_ERROR',          note: 'Root cause: system error.' },
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_CORRECT_CLAIM',                 note: 'Claim corrected.', sideEffects: ['core_audit_log_written'] },
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_MARK_OVERPAYMENT_AVOIDED',      note: 'Positive outcome recorded.' },
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_CLOSE',                         note: 'Signal closed.' },
    ],
    successCriteria: [
      'No overpayment row created.',
      'Claim correction is audit-logged and links back to the risk signal.',
    ],
    failureModes: [
      'Correction issued without confirming root cause → REJECTED.',
    ],
  },
  {
    id: 'FLOW-5-UPRATING-RUN',
    title: 'Uprating run → exclude pending mortality → flag unresolved appeal → adjust → rebuild schedules → issue comms → reconcile',
    description: 'End-to-end uprating cycle with cross-module exclusions.',
    modulesInvolved: ['bn_uprating', 'bn_mortality', 'bn_appeals'],
    steps: [
      { moduleCode: 'bn_uprating', commandName: 'BN_UPR_CREATE_RUN',           note: 'Create run.' },
      { moduleCode: 'bn_uprating', commandName: 'BN_UPR_PARAMETERISE',         note: 'Lock rates + effective date.' },
      { moduleCode: 'bn_uprating', commandName: 'BN_UPR_TAKE_SNAPSHOT',        note: 'Population snapshot (awards).' },
      { moduleCode: 'bn_uprating', commandName: 'BN_UPR_APPLY_EXCLUSIONS',     note: 'Exclude PENDING_MORTALITY, flag UNRESOLVED_APPEAL.' },
      { moduleCode: 'bn_uprating', commandName: 'BN_UPR_DRY_RUN',              note: 'Preview totals.' },
      { moduleCode: 'bn_uprating', commandName: 'BN_UPR_APPROVE',              note: 'Board approval.' },
      { moduleCode: 'bn_uprating', commandName: 'BN_UPR_EXECUTE',              note: 'Awards adjusted transactionally.', sideEffects: ['core_ledger_transaction'] },
      { moduleCode: 'bn_uprating', commandName: 'BN_UPR_REBUILD_SCHEDULES',    note: 'Payment schedules rebuilt.' },
      { moduleCode: 'bn_uprating', commandName: 'BN_UPR_ISSUE_COMMUNICATIONS', note: 'Uprating letters sent.', sideEffects: ['communication_hub_dispatch','core_dms_document_link'] },
      { moduleCode: 'bn_uprating', commandName: 'BN_UPR_RECONCILE',            note: 'Finance reconciliation.', sideEffects: ['core_ledger_transaction'] },
      { moduleCode: 'bn_uprating', commandName: 'BN_UPR_CLOSE',                note: 'Run closed.' },
    ],
    successCriteria: [
      'Zero awards adjusted where mortality is PENDING_VERIFICATION or later.',
      'All awards with unresolved appeals appear in the flagged report.',
      'Finance ledger reconciles to the run total exactly.',
    ],
    failureModes: [
      'Execute without APPROVED → REJECTED.',
      'Reconcile before schedules rebuilt → state-transition denial.',
    ],
  },
  {
    id: 'FLOW-6-RISK-PAYMENT-HOLD',
    title: 'Risk signal → payment hold → investigation → cleared → hold released with complete audit',
    description: 'Positive investigation outcome with a full audit chain.',
    modulesInvolved: ['bn_risk_management'],
    steps: [
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_DETECT',             note: 'Signal detected.' },
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_TRIAGE',             note: 'Triaged.' },
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_HOLD_PAYMENT',       note: 'Held (transactional).', sideEffects: ['core_audit_log_written','core_workflow_task_created'] },
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_OPEN_INVESTIGATION', note: 'Investigation opened.' },
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_CLEAR',              note: 'Cleared.', sideEffects: ['core_audit_log_written'] },
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_RELEASE_HOLD',       note: 'Hold released (transactional).', sideEffects: ['core_audit_log_written','communication_hub_dispatch'] },
      { moduleCode: 'bn_risk_management', commandName: 'BN_RISK_CLOSE',              note: 'Signal closed.' },
    ],
    successCriteria: [
      'Audit chain: DETECT → HOLD → INVESTIGATE → CLEAR → RELEASE → CLOSE exists in order.',
      'Payments resume from the release effective date.',
    ],
    failureModes: [
      'Release without CLEAR → REJECTED.',
      'Same idempotency key retried → REPLAYED with identical result.',
    ],
  },
] as const;

export function integrationFlowById(id: string): IntegrationFlowScenario | undefined {
  return BN_GAP_INTEGRATION_FLOWS.find((f) => f.id === id);
}
