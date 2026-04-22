/**
 * Communication Trigger Rule — types for the configurable trigger engine
 * (table: ce_audit_comm_trigger_rules).
 *
 * The rule store is admin-managed; rule logic is expressed as a *typed*
 * JSON predicate over a `TriggerContext` so future stages and templates
 * can be wired in without code changes.
 */
import type { CeCommType } from './auditCommunication';
import type { FieldExecutionStage } from './fieldStageMapping';

export type TriggerMode = 'SUGGEST' | 'AUTO_CREATE_DRAFT' | 'AUTO_SEND';

export type PredicateOp =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'truthy' | 'falsy' | 'in';

export interface SimplePredicate {
  field: string;          // dotted path supported, e.g. "report.status"
  op: PredicateOp;
  value?: unknown;        // required for non-(truthy|falsy) ops
}

/** Combinator predicates. */
export interface PredicateGroup {
  all?: TriggerCondition[];
  any?: TriggerCondition[];
  not?: TriggerCondition;
}

export type TriggerCondition = SimplePredicate | PredicateGroup;

export interface CommTriggerRule {
  id: string;
  rule_code: string;
  rule_name: string;
  description: string | null;
  field_stage: FieldExecutionStage;
  comm_type: CeCommType;
  template_id: string | null;
  trigger_mode: TriggerMode;
  condition_json: TriggerCondition;
  cooldown_hours: number;
  max_per_visit: number;
  requires_approval: boolean;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Runtime context evaluated against rule predicates. Mirrors
 * `FieldStageContext` plus a few extra signals so a single rule can speak
 * to severity / evidence completeness without needing more code paths.
 */
export interface TriggerContext {
  // Lifecycle
  sessionStarted: boolean;
  sessionClosed: boolean;
  daysUntilScheduled?: number | null;
  reportStatus?: string | null;

  // Findings / outcome
  hasViolations?: boolean;
  hasInterimFindings?: boolean;
  hasMissingDocuments?: boolean;
  hasMissingEvidence?: boolean;
  hasOpenClarifications?: boolean;
  maxSeverity?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;

  // Response / reminder cycle
  hasOverdueItems?: boolean;
  reminderCount?: number;
  daysSinceLastReminder?: number | null;

  // Existing comms (for de-dup / cooldown)
  existingByType?: Record<string, { lastSentAt: string | null; count: number }>;
}

export interface TriggerDecision {
  rule: CommTriggerRule;
  /** Why the rule fired — for tooltip / debug. */
  matched: boolean;
  reason: string;
  /** Will be skipped (and reason populated) if a guard prevents firing. */
  skipped: boolean;
  skipReason?: string;
}
