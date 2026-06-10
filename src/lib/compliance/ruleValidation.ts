/**
 * Compliance Rule Engine — expression validation.
 *
 * Used by the existing Rule Engine save mutations AND by the "Rule
 * Test Preview" dialog. There is no second rule engine; this is
 * shared validation only.
 *
 * Activation must fail (block save) if `errors` is non-empty.
 * Warnings are informational and do not block save.
 */

export interface RuleValidationIssue {
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface RuleValidationResult {
  ok: boolean;
  errors: RuleValidationIssue[];
  warnings: RuleValidationIssue[];
  tokens?: {
    referencedVariables: string[];
  };
}

const CONDITION_OPS = ['>=', '<=', '!=', '==', '>', '<'];
const ALLOWED_FORMULA_CHARS = /^[a-zA-Z0-9_\s+\-*/().×÷−]+$/u;
const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function pushError(out: RuleValidationIssue[], field: string, message: string) {
  out.push({ field, severity: 'error', message });
}
function pushWarn(out: RuleValidationIssue[], field: string, message: string) {
  out.push({ field, severity: 'warning', message });
}

/**
 * Validate a condition expression of the form
 *   <var> <op> <value> [AND|OR <var> <op> <value>]...
 * Verifies every referenced variable is in `knownVariables`.
 */
export function validateConditionExpression(
  expr: string | null | undefined,
  knownVariables: string[],
  options: { required?: boolean; field?: string } = {}
): RuleValidationResult {
  const field = options.field ?? 'condition_expression';
  const errors: RuleValidationIssue[] = [];
  const warnings: RuleValidationIssue[] = [];
  const referenced: string[] = [];

  const trimmed = (expr ?? '').trim();
  if (!trimmed) {
    if (options.required) {
      pushError(errors, field, 'Condition expression is required.');
    }
    return { ok: errors.length === 0, errors, warnings, tokens: { referencedVariables: [] } };
  }

  // Reject obvious SQL/JS injection markers — these are not allowed
  // in a declarative condition expression.
  if (/[;`'"]/.test(trimmed)) {
    pushError(errors, field, 'Condition expression contains an invalid character (;, `, \' or ").');
    return { ok: false, errors, warnings, tokens: { referencedVariables: [] } };
  }
  if (/(--|\/\*)/.test(trimmed)) {
    pushError(errors, field, 'SQL-style comments are not allowed in condition expressions.');
    return { ok: false, errors, warnings, tokens: { referencedVariables: [] } };
  }

  const parts = trimmed.split(/\s+(AND|OR)\s+/i);
  for (let i = 0; i < parts.length; i += 2) {
    const segment = parts[i].trim();
    const match = segment.match(/^(\w+)\s*(>=|<=|!=|==|>|<)\s*(.+)$/);
    if (!match) {
      pushError(
        errors,
        field,
        `Could not parse "${segment.slice(0, 60)}". Expected: variable <operator> value.`
      );
      continue;
    }
    const [, variable, op, rawValue] = match;
    if (!SAFE_IDENTIFIER.test(variable)) {
      pushError(errors, field, `Invalid variable name "${variable}".`);
      continue;
    }
    if (!CONDITION_OPS.includes(op)) {
      pushError(errors, field, `Operator "${op}" is not supported.`);
      continue;
    }
    if (knownVariables.length > 0 && !knownVariables.includes(variable)) {
      pushWarn(
        warnings,
        field,
        `Variable "${variable}" is not in the configured variable mappings — please confirm.`
      );
    }
    const value = rawValue.trim();
    if (!value) {
      pushError(errors, field, `Value is missing after "${variable} ${op}".`);
      continue;
    }
    // Allow: number, boolean literal, quoted string
    const isNumber = /^-?\d+(\.\d+)?$/.test(value);
    const isBoolean = /^(true|false)$/i.test(value);
    const isQuoted = /^"[^"]*"$|^'[^']*'$/.test(value);
    if (!isNumber && !isBoolean && !isQuoted) {
      pushError(
        errors,
        field,
        `Value "${value}" must be a number, true/false, or a quoted string.`
      );
      continue;
    }
    referenced.push(variable);
  }

  // Conjunctions
  for (let i = 1; i < parts.length; i += 2) {
    const conj = parts[i].toUpperCase();
    if (conj !== 'AND' && conj !== 'OR') {
      pushError(errors, field, `Invalid conjunction "${parts[i]}". Use AND or OR.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    tokens: { referencedVariables: Array.from(new Set(referenced)) },
  };
}

/**
 * Validate a calculation formula expression. Accepts the visual
 * builder's output (uses ×, ÷, − unicode operators) or the raw
 * ASCII equivalents.
 */
export function validateFormulaExpression(
  expr: string | null | undefined,
  knownOperands: string[],
  options: { required?: boolean; field?: string } = {}
): RuleValidationResult {
  const field = options.field ?? 'formula_expression';
  const errors: RuleValidationIssue[] = [];
  const warnings: RuleValidationIssue[] = [];
  const referenced: string[] = [];

  const trimmed = (expr ?? '').trim();
  if (!trimmed) {
    if (options.required) {
      pushError(errors, field, 'Formula is required.');
    }
    return { ok: errors.length === 0, errors, warnings, tokens: { referencedVariables: [] } };
  }

  if (!ALLOWED_FORMULA_CHARS.test(trimmed)) {
    pushError(errors, field, 'Formula contains unsupported characters.');
    return { ok: false, errors, warnings, tokens: { referencedVariables: [] } };
  }

  // Balanced parentheses
  let depth = 0;
  for (const ch of trimmed) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth < 0) {
      pushError(errors, field, 'Unbalanced parentheses in formula.');
      return { ok: false, errors, warnings, tokens: { referencedVariables: [] } };
    }
  }
  if (depth !== 0) {
    pushError(errors, field, 'Unbalanced parentheses in formula.');
    return { ok: false, errors, warnings, tokens: { referencedVariables: [] } };
  }

  // Tokenise on operators (incl. unicode ×÷− and ASCII */+-)
  const tokens = trimmed
    .split(/\s*([*+/\-()×÷−])\s*/u)
    .map(t => t.trim())
    .filter(Boolean);

  const isOperator = (t: string) => ['*', '+', '/', '-', '×', '÷', '−'].includes(t);
  const isParen = (t: string) => t === '(' || t === ')';

  let expectOperand = true;
  for (const tok of tokens) {
    if (isParen(tok)) continue;
    if (isOperator(tok)) {
      if (expectOperand) {
        pushError(errors, field, `Unexpected operator "${tok}" — expected an operand.`);
      }
      expectOperand = true;
      continue;
    }
    // Operand: number or identifier
    if (/^-?\d+(\.\d+)?$/.test(tok)) {
      expectOperand = false;
      continue;
    }
    if (!SAFE_IDENTIFIER.test(tok)) {
      pushError(errors, field, `Invalid operand "${tok}".`);
      expectOperand = false;
      continue;
    }
    if (knownOperands.length > 0 && !knownOperands.includes(tok)) {
      pushWarn(
        warnings,
        field,
        `Operand "${tok}" is not in the configured formula operands — please confirm.`
      );
    }
    referenced.push(tok);
    expectOperand = false;
  }
  if (expectOperand) {
    pushError(errors, field, 'Formula ends with an operator.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    tokens: { referencedVariables: Array.from(new Set(referenced)) },
  };
}

/** Detection-rule validation wrapper. */
export function validateDetectionRule(
  rule: {
    rule_code?: string;
    name?: string;
    trigger_event?: string;
    condition_expression?: string | null;
    is_enabled?: boolean;
    auto_create_violation?: boolean | null;
    violation_type_id?: string | null;
  },
  knownVariables: string[]
): RuleValidationResult {
  const errors: RuleValidationIssue[] = [];
  const warnings: RuleValidationIssue[] = [];

  if (!rule.name?.trim()) pushError(errors, 'name', 'Name is required.');
  if (!rule.rule_code?.trim()) pushError(errors, 'rule_code', 'Rule code is required.');
  if (!rule.trigger_event?.trim()) pushError(errors, 'trigger_event', 'Trigger event is required.');

  // Auto-create requires a violation type to know what to create
  if (rule.is_enabled && rule.auto_create_violation && !rule.violation_type_id) {
    pushError(
      errors,
      'violation_type_id',
      'Auto-Create is on but no Violation Type is selected.'
    );
  }

  const condResult = validateConditionExpression(
    rule.condition_expression,
    knownVariables,
    { required: !!rule.is_enabled, field: 'condition_expression' }
  );
  errors.push(...condResult.errors);
  warnings.push(...condResult.warnings);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    tokens: condResult.tokens,
  };
}

/** Calculation-rule validation wrapper. */
export function validateCalculationRule(
  rule: {
    rule_code?: string;
    name?: string;
    applies_to?: string;
    formula_expression?: string | null;
    is_enabled?: boolean;
  },
  knownOperands: string[]
): RuleValidationResult {
  const errors: RuleValidationIssue[] = [];
  const warnings: RuleValidationIssue[] = [];

  if (!rule.name?.trim()) pushError(errors, 'name', 'Name is required.');
  if (!rule.rule_code?.trim()) pushError(errors, 'rule_code', 'Rule code is required.');
  if (!rule.applies_to?.trim()) pushError(errors, 'applies_to', '"Applies To" is required.');

  const formulaResult = validateFormulaExpression(
    rule.formula_expression,
    knownOperands,
    { required: true, field: 'formula_expression' }
  );
  errors.push(...formulaResult.errors);
  warnings.push(...formulaResult.warnings);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    tokens: formulaResult.tokens,
  };
}

/** Escalation-rule validation wrapper. */
export function validateEscalationRule(
  rule: {
    rule_code?: string;
    name?: string;
    from_status?: string;
    to_status?: string;
    condition_expression?: string | null;
    days_threshold?: number | null;
    amount_threshold?: number | null;
    is_enabled?: boolean;
  },
  knownVariables: string[]
): RuleValidationResult {
  const errors: RuleValidationIssue[] = [];
  const warnings: RuleValidationIssue[] = [];

  if (!rule.name?.trim()) pushError(errors, 'name', 'Name is required.');
  if (!rule.rule_code?.trim()) pushError(errors, 'rule_code', 'Rule code is required.');
  if (!rule.from_status) pushError(errors, 'from_status', 'From status is required.');
  if (!rule.to_status) pushError(errors, 'to_status', 'To status is required.');
  if (rule.from_status && rule.to_status && rule.from_status === rule.to_status) {
    pushError(errors, 'to_status', 'From and To statuses must differ.');
  }

  const hasAnyThreshold =
    (rule.days_threshold !== null && rule.days_threshold !== undefined) ||
    (rule.amount_threshold !== null && rule.amount_threshold !== undefined) ||
    !!rule.condition_expression?.trim();
  if (rule.is_enabled && !hasAnyThreshold) {
    pushError(
      errors,
      'days_threshold',
      'An active escalation rule needs at least one trigger: days threshold, amount threshold, or a condition.'
    );
  }

  if (rule.condition_expression?.trim()) {
    const condResult = validateConditionExpression(
      rule.condition_expression,
      knownVariables,
      { required: false, field: 'condition_expression' }
    );
    errors.push(...condResult.errors);
    warnings.push(...condResult.warnings);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    tokens: { referencedVariables: [] },
  };
}

/** Render a list of issues into a user-friendly multi-line string. */
export function formatIssues(issues: RuleValidationIssue[]): string {
  if (issues.length === 0) return '';
  return issues.map(i => `• ${i.message}`).join('\n');
}
