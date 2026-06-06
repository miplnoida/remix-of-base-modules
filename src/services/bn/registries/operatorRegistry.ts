/**
 * Operator Registry — operators allowed per data type.
 * Used by RuleBuilder / ConditionBuilder to filter operator dropdowns.
 */

export type FieldDataType = 'number' | 'string' | 'boolean' | 'date' | 'list';

export interface OperatorDef {
  key: string;
  label: string;
  /** how many value inputs the operator needs (BETWEEN takes 2; IS_TRUE takes 0) */
  arity: 0 | 1 | 2;
}

export const OPERATORS_BY_TYPE: Record<FieldDataType, OperatorDef[]> = {
  number: [
    { key: '=', label: '=', arity: 1 },
    { key: '!=', label: '≠', arity: 1 },
    { key: '>', label: '>', arity: 1 },
    { key: '>=', label: '≥', arity: 1 },
    { key: '<', label: '<', arity: 1 },
    { key: '<=', label: '≤', arity: 1 },
    { key: 'BETWEEN', label: 'between', arity: 2 },
  ],
  string: [
    { key: '=', label: 'equals', arity: 1 },
    { key: '!=', label: 'not equals', arity: 1 },
    { key: 'IN', label: 'in', arity: 1 },
    { key: 'NOT_IN', label: 'not in', arity: 1 },
  ],
  boolean: [
    { key: 'IS_TRUE', label: 'is true', arity: 0 },
    { key: 'IS_FALSE', label: 'is false', arity: 0 },
  ],
  date: [
    { key: 'BEFORE', label: 'before', arity: 1 },
    { key: 'AFTER', label: 'after', arity: 1 },
    { key: 'BETWEEN', label: 'between', arity: 2 },
  ],
  list: [
    { key: 'CONTAINS', label: 'contains', arity: 1 },
    { key: 'NOT_CONTAINS', label: 'does not contain', arity: 1 },
  ],
};

export function getOperatorsForType(type: FieldDataType): OperatorDef[] {
  return OPERATORS_BY_TYPE[type] ?? [];
}
