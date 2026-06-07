import { describe, it, expect } from 'vitest';
import { OPERATORS, operatorsForType, isKnownOperator } from '../operators';
import { ELIGIBILITY_FACTS, getFact, defaultGroupForFact } from '../eligibilityFactRegistry';
import { getRegisteredResolverNames } from '../eligibilityFactResolver';
import { RULE_TEMPLATES } from '../ruleTemplates';

describe('eligibility operators', () => {
  it('>= passes for numbers at or above expected', () => {
    expect(OPERATORS['>='].evaluate(150, 150)).toBe(true);
    expect(OPERATORS['>='].evaluate(151, 150)).toBe(true);
    expect(OPERATORS['>='].evaluate(149, 150)).toBe(false);
  });

  it('exists is false on null/empty', () => {
    expect(OPERATORS.exists.evaluate(null, null)).toBe(false);
    expect(OPERATORS.exists.evaluate('', null)).toBe(false);
    expect(OPERATORS.exists.evaluate(false, null)).toBe(false);
    expect(OPERATORS.exists.evaluate(true, null)).toBe(true);
    expect(OPERATORS.exists.evaluate(0, null)).toBe(true);
  });

  it('between accepts numeric ranges', () => {
    expect(OPERATORS.between.evaluate(5, [1, 10])).toBe(true);
    expect(OPERATORS.between.evaluate(11, [1, 10])).toBe(false);
  });

  it('operatorsForType gates by data type', () => {
    const numericOps = operatorsForType('number').map((o) => o.key);
    expect(numericOps).toContain('>=');
    const boolOps = operatorsForType('bool').map((o) => o.key);
    expect(boolOps).not.toContain('>=');
  });

  it('isKnownOperator rejects garbage', () => {
    expect(isKnownOperator('>=')).toBe(true);
    expect(isKnownOperator('foo')).toBe(false);
  });
});

describe('eligibility fact registry', () => {
  it('every fact has a resolver registered', () => {
    const resolvers = new Set(getRegisteredResolverNames());
    for (const f of ELIGIBILITY_FACTS) {
      expect(resolvers.has(f.resolver_function), `missing resolver ${f.resolver_function} for ${f.fact_key}`).toBe(true);
    }
  });

  it('fact keys are unique', () => {
    const keys = ELIGIBILITY_FACTS.map((f) => f.fact_key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('defaultGroupForFact returns a real group for every fact', () => {
    for (const f of ELIGIBILITY_FACTS) {
      expect(defaultGroupForFact(f.fact_key)).toBeTruthy();
    }
  });
});

describe('rule templates', () => {
  it('every template references a registered fact', () => {
    for (const t of RULE_TEMPLATES) {
      expect(getFact(t.fact_key), `template ${t.template_code} references unknown fact ${t.fact_key}`).toBeTruthy();
    }
  });

  it('template operators are valid for the fact data type', () => {
    for (const t of RULE_TEMPLATES) {
      const fact = getFact(t.fact_key)!;
      expect(fact.allowed_operators).toContain(t.operator);
    }
  });
});
