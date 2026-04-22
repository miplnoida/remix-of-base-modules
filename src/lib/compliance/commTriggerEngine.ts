/**
 * Communication Trigger Engine.
 *
 * Pure, side-effect-free evaluator. Given a `TriggerContext` and the
 * configured rule set, returns the ordered list of `TriggerDecision`s
 * (matched + skipped) so callers can render suggestions, auto-create
 * drafts, or auto-send.
 *
 * Intentionally has no DB / network dependencies — the executor layer
 * (hook + service) handles fetching rules, dedup against existing
 * communications, and dispatch.
 */
import type {
  CommTriggerRule,
  PredicateGroup,
  PredicateOp,
  SimplePredicate,
  TriggerCondition,
  TriggerContext,
  TriggerDecision,
} from '@/types/commTriggerRule';

/** Resolve a dotted path against the context (returns undefined if missing). */
function readPath(ctx: unknown, path: string): unknown {
  return path.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), ctx);
}

function evalOp(op: PredicateOp, lhs: unknown, rhs: unknown): boolean {
  switch (op) {
    case 'eq':     return lhs === rhs;
    case 'neq':    return lhs !== rhs;
    case 'gt':     return typeof lhs === 'number' && typeof rhs === 'number' && lhs > rhs;
    case 'gte':    return typeof lhs === 'number' && typeof rhs === 'number' && lhs >= rhs;
    case 'lt':     return typeof lhs === 'number' && typeof rhs === 'number' && lhs < rhs;
    case 'lte':    return typeof lhs === 'number' && typeof rhs === 'number' && lhs <= rhs;
    case 'truthy': return Boolean(lhs);
    case 'falsy':  return !lhs;
    case 'in':     return Array.isArray(rhs) && rhs.includes(lhs as never);
    default:       return false;
  }
}

function isGroup(c: TriggerCondition): c is PredicateGroup {
  return typeof c === 'object' && c != null && ('all' in c || 'any' in c || 'not' in c);
}

export function evaluateCondition(condition: TriggerCondition | undefined, ctx: TriggerContext): boolean {
  if (!condition) return true; // empty condition = always match
  if (isGroup(condition)) {
    if (condition.all && condition.all.length > 0) {
      if (!condition.all.every((c) => evaluateCondition(c, ctx))) return false;
    }
    if (condition.any && condition.any.length > 0) {
      if (!condition.any.some((c) => evaluateCondition(c, ctx))) return false;
    }
    if (condition.not) {
      if (evaluateCondition(condition.not, ctx)) return false;
    }
    return true;
  }
  const p = condition as SimplePredicate;
  return evalOp(p.op, readPath(ctx, p.field), p.value);
}

/** Human-readable reason for a matched rule (used in suggestion tooltips). */
function describeMatch(rule: CommTriggerRule): string {
  return rule.description || rule.rule_name;
}

/** Apply guards (cooldown / max_per_visit) using `ctx.existingByType`. */
function applyGuards(rule: CommTriggerRule, ctx: TriggerContext): { skipped: boolean; reason?: string } {
  const existing = ctx.existingByType?.[rule.comm_type];
  if (!existing) return { skipped: false };
  if (rule.max_per_visit > 0 && existing.count >= rule.max_per_visit) {
    return { skipped: true, reason: `Already sent ${existing.count} time(s); max per visit is ${rule.max_per_visit}.` };
  }
  if (rule.cooldown_hours > 0 && existing.lastSentAt) {
    const last = new Date(existing.lastSentAt).getTime();
    const ageHrs = (Date.now() - last) / 3_600_000;
    if (ageHrs < rule.cooldown_hours) {
      const remaining = Math.ceil(rule.cooldown_hours - ageHrs);
      return { skipped: true, reason: `In cooldown — ${remaining}h remaining.` };
    }
  }
  return { skipped: false };
}

/**
 * Evaluate every active rule against the context. Returns:
 *  - matched + not-skipped → ready to surface / auto-execute
 *  - matched + skipped     → debug-visible only (cooldown / cap)
 *  - unmatched             → omitted from the result
 *
 * Order: rule.priority asc (lower number = earlier), then rule_code.
 */
export function evaluateTriggerRules(
  rules: CommTriggerRule[],
  ctx: TriggerContext,
): TriggerDecision[] {
  const out: TriggerDecision[] = [];
  for (const rule of rules) {
    if (!rule.is_active) continue;
    if (!evaluateCondition(rule.condition_json, ctx)) continue;
    const guard = applyGuards(rule, ctx);
    out.push({
      rule,
      matched: true,
      reason: describeMatch(rule),
      skipped: guard.skipped,
      skipReason: guard.reason,
    });
  }
  return out.sort((a, b) =>
    a.rule.priority !== b.rule.priority
      ? a.rule.priority - b.rule.priority
      : a.rule.rule_code.localeCompare(b.rule.rule_code),
  );
}
