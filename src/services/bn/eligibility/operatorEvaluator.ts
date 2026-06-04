/**
 * Generic operator evaluator for eligibility rules.
 *
 * Compares an actual value (resolved from the field registry) against the
 * expected value declared on the rule. Handles numeric, boolean, string,
 * date, IN and BETWEEN comparisons.
 */
import type { EligibilityOperator, EligibilityValueType } from './fieldRegistry';

export interface OperatorEvalResult {
  passed: boolean;
  reason: string;
}

function coerce(value: unknown, type: EligibilityValueType): unknown {
  if (value === null || value === undefined || value === '') return null;
  switch (type) {
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? n : null;
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value;
      const s = String(value).trim().toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(s)) return true;
      if (['false', '0', 'no', 'n'].includes(s)) return false;
      return null;
    }
    case 'date': {
      const d = value instanceof Date ? value : new Date(String(value));
      return isNaN(d.getTime()) ? null : d.getTime();
    }
    case 'string':
    default:
      return String(value);
  }
}

function coerceList(value: unknown, type: EligibilityValueType): unknown[] {
  if (Array.isArray(value)) return value.map((v) => coerce(v, type));
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((v) => coerce(v, type));
  }
  return [coerce(value, type)];
}

export function evaluateOperator(
  actualRaw: unknown,
  operator: EligibilityOperator,
  expectedRaw: unknown,
  valueType: EligibilityValueType,
  extras?: { rangeFrom?: unknown; rangeTo?: unknown }
): OperatorEvalResult {
  const actual = coerce(actualRaw, valueType);

  if (actual === null) {
    return { passed: false, reason: 'Actual value could not be resolved' };
  }

  switch (operator) {
    case '>=':
    case '>':
    case '<=':
    case '<': {
      const exp = coerce(expectedRaw, valueType === 'date' ? 'date' : 'number') as number | null;
      const act = actual as number;
      if (exp === null) return { passed: false, reason: 'Invalid expected value' };
      const ok =
        operator === '>=' ? act >= exp :
        operator === '>' ? act > exp :
        operator === '<=' ? act <= exp :
        act < exp;
      return { passed: ok, reason: `${act} ${operator} ${exp}` };
    }
    case '==': {
      const exp = coerce(expectedRaw, valueType);
      return { passed: actual === exp, reason: `${actual} == ${exp}` };
    }
    case '!=': {
      const exp = coerce(expectedRaw, valueType);
      return { passed: actual !== exp, reason: `${actual} != ${exp}` };
    }
    case 'IN': {
      const list = coerceList(expectedRaw, valueType);
      const ok = list.some((v) => v === actual);
      return { passed: ok, reason: `${actual} IN [${list.join(', ')}]` };
    }
    case 'BETWEEN': {
      const numType = valueType === 'date' ? 'date' : 'number';
      const lo = coerce(extras?.rangeFrom ?? (Array.isArray(expectedRaw) ? expectedRaw[0] : null), numType) as number | null;
      const hi = coerce(extras?.rangeTo ?? (Array.isArray(expectedRaw) ? expectedRaw[1] : null), numType) as number | null;
      const act = actual as number;
      if (lo === null || hi === null) return { passed: false, reason: 'BETWEEN requires from and to' };
      const ok = act >= lo && act <= hi;
      return { passed: ok, reason: `${act} BETWEEN [${lo}, ${hi}]` };
    }
    default:
      return { passed: false, reason: `Unknown operator ${operator}` };
  }
}
