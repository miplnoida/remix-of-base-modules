/**
 * Eligibility operators.
 *
 * Pure, side-effect-free comparator functions used by the rule engine and the
 * UI. Each operator declares which `data_type`s it accepts so the rule builder
 * can gate the operator dropdown based on the selected fact.
 *
 * Operators intentionally do NOT throw on null/undefined actuals — they return
 * `false` (rule fails) for clear UX. The runtime is responsible for telling
 * the user that the actual value was not available.
 */

export type EligibilityDataType =
  | 'number'
  | 'date'
  | 'string'
  | 'bool'
  | 'enum';

export type EligibilityOperator =
  | '>='
  | '<='
  | '='
  | '!='
  | 'exists'
  | 'not_exists'
  | 'in'
  | 'between';

export interface OperatorDef {
  key: EligibilityOperator;
  label: string;
  /** Data types this operator can be applied to. */
  appliesTo: EligibilityDataType[];
  /** UX hint for the value input. */
  valueArity: 'none' | 'single' | 'multi' | 'range';
  /** Pure comparator. Returns `true` when the rule passes. */
  evaluate: (actual: unknown, expected: unknown) => boolean;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDateMs(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return v.getTime();
  const ms = Date.parse(String(v));
  return Number.isFinite(ms) ? ms : null;
}

function eq(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  // Coerce booleans/numbers/dates appropriately.
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return Boolean(a) === Boolean(b);
  }
  const an = toNumber(a);
  const bn = toNumber(b);
  if (an !== null && bn !== null) return an === bn;
  const ad = toDateMs(a);
  const bd = toDateMs(b);
  if (ad !== null && bd !== null) return ad === bd;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export const OPERATORS: Record<EligibilityOperator, OperatorDef> = {
  '>=': {
    key: '>=',
    label: 'At least',
    appliesTo: ['number', 'date'],
    valueArity: 'single',
    evaluate: (a, e) => {
      const an = toNumber(a);
      const en = toNumber(e);
      if (an !== null && en !== null) return an >= en;
      const ad = toDateMs(a);
      const ed = toDateMs(e);
      if (ad !== null && ed !== null) return ad >= ed;
      return false;
    },
  },
  '<=': {
    key: '<=',
    label: 'At most',
    appliesTo: ['number', 'date'],
    valueArity: 'single',
    evaluate: (a, e) => {
      const an = toNumber(a);
      const en = toNumber(e);
      if (an !== null && en !== null) return an <= en;
      const ad = toDateMs(a);
      const ed = toDateMs(e);
      if (ad !== null && ed !== null) return ad <= ed;
      return false;
    },
  },
  '=': {
    key: '=',
    label: 'Equals',
    appliesTo: ['number', 'date', 'string', 'bool', 'enum'],
    valueArity: 'single',
    evaluate: eq,
  },
  '!=': {
    key: '!=',
    label: 'Not equal',
    appliesTo: ['number', 'date', 'string', 'bool', 'enum'],
    valueArity: 'single',
    evaluate: (a, e) => !eq(a, e),
  },
  exists: {
    key: 'exists',
    label: 'Exists',
    appliesTo: ['number', 'date', 'string', 'bool', 'enum'],
    valueArity: 'none',
    evaluate: (a) => {
      if (a === null || a === undefined || a === '') return false;
      if (typeof a === 'boolean') return a === true;
      return true;
    },
  },
  not_exists: {
    key: 'not_exists',
    label: 'Does not exist',
    appliesTo: ['number', 'date', 'string', 'bool', 'enum'],
    valueArity: 'none',
    evaluate: (a) => {
      if (a === null || a === undefined || a === '') return true;
      if (typeof a === 'boolean') return a === false;
      return false;
    },
  },
  in: {
    key: 'in',
    label: 'In',
    appliesTo: ['string', 'enum', 'number'],
    valueArity: 'multi',
    evaluate: (a, e) => {
      if (!Array.isArray(e)) return false;
      return e.some((candidate) => eq(a, candidate));
    },
  },
  between: {
    key: 'between',
    label: 'Between',
    appliesTo: ['number', 'date'],
    valueArity: 'range',
    evaluate: (a, e) => {
      if (!Array.isArray(e) || e.length !== 2) return false;
      const [lo, hi] = e;
      const an = toNumber(a);
      const lon = toNumber(lo);
      const hin = toNumber(hi);
      if (an !== null && lon !== null && hin !== null) return an >= lon && an <= hin;
      const ad = toDateMs(a);
      const lod = toDateMs(lo);
      const hid = toDateMs(hi);
      if (ad !== null && lod !== null && hid !== null) return ad >= lod && ad <= hid;
      return false;
    },
  },
};

export const ALL_OPERATORS: OperatorDef[] = Object.values(OPERATORS);

/** Return the operator definitions that are valid for a given data type. */
export function operatorsForType(dt: EligibilityDataType): OperatorDef[] {
  return ALL_OPERATORS.filter((o) => o.appliesTo.includes(dt));
}

export function isKnownOperator(op: string): op is EligibilityOperator {
  return op in OPERATORS;
}
