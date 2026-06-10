/**
 * Lightweight formula parser for BN Formula Library.
 *
 * Identifiers MUST resolve via the Variable Resolver (Fact / Derived Fact /
 * Product Parameter / Prior Formula Result). When a resolver map is supplied
 * unknown identifiers are returned as structured errors so the UI can offer
 * "Create as Derived Fact / Product Parameter" actions. When no resolver is
 * supplied the parser falls back to the legacy in-code registry for
 * backwards compatibility with a handful of older callers.
 */
import { isValidFormulaVariableKey, getFormulaVariable } from '@/services/bn/registries/formulaVariableRegistry';
import { suggestSourcesFor, type ResolverMap, type UnresolvedVariable } from '@/services/bn/variableResolverService';

export interface ParseResult {
  valid: boolean;
  errors: string[];
  variablesUsed: string[];
  /** Variables that did not resolve to any registry — empty when valid. */
  unresolved: UnresolvedVariable[];
  /** AST root, or null if invalid */
  ast: Node | null;
}

type Node =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'bin'; op: '+' | '-' | '*' | '/'; left: Node; right: Node }
  | { kind: 'neg'; expr: Node }
  | { kind: 'call'; fn: 'min' | 'max' | 'round'; args: Node[] };

type Token =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'comma' };

const FNS = new Set(['min', 'max', 'round']);

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
    if (c === '(') { tokens.push({ t: 'lp' }); i++; continue; }
    if (c === ')') { tokens.push({ t: 'rp' }); i++; continue; }
    if (c === ',') { tokens.push({ t: 'comma' }); i++; continue; }
    if ('+-*/'.includes(c)) { tokens.push({ t: 'op', v: c }); i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ t: 'num', v: parseFloat(src.slice(i, j)) });
      i = j; continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      tokens.push({ t: 'id', v: src.slice(i, j) });
      i = j; continue;
    }
    throw new Error(`Unexpected character "${c}" at position ${i}`);
  }
  return tokens;
}

export function parseFormula(src: string): ParseResult {
  const errors: string[] = [];
  const variablesUsed = new Set<string>();
  let tokens: Token[];
  try {
    tokens = tokenize(src);
  } catch (e: any) {
    return { valid: false, errors: [e.message], variablesUsed: [], ast: null };
  }
  if (tokens.length === 0) {
    return { valid: false, errors: ['Formula is empty.'], variablesUsed: [], ast: null };
  }

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpr(): Node {
    let left = parseTerm();
    while (peek() && peek().t === 'op' && (peek() as any).v === '+' || (peek() && peek().t === 'op' && (peek() as any).v === '-')) {
      const op = (consume() as any).v as '+' | '-';
      const right = parseTerm();
      left = { kind: 'bin', op, left, right };
    }
    return left;
  }
  function parseTerm(): Node {
    let left = parseFactor();
    while (peek() && peek().t === 'op' && ((peek() as any).v === '*' || (peek() as any).v === '/')) {
      const op = (consume() as any).v as '*' | '/';
      const right = parseFactor();
      left = { kind: 'bin', op, left, right };
    }
    return left;
  }
  function parseFactor(): Node {
    const tk = peek();
    if (!tk) throw new Error('Unexpected end of formula');
    if (tk.t === 'op' && tk.v === '-') {
      consume();
      return { kind: 'neg', expr: parseFactor() };
    }
    if (tk.t === 'num') {
      consume();
      return { kind: 'num', value: tk.v };
    }
    if (tk.t === 'lp') {
      consume();
      const e = parseExpr();
      if (!peek() || peek().t !== 'rp') throw new Error('Missing ")"');
      consume();
      return e;
    }
    if (tk.t === 'id') {
      consume();
      if (peek() && peek().t === 'lp') {
        // function call
        if (!FNS.has(tk.v)) throw new Error(`Unknown function "${tk.v}"`);
        consume();
        const args: Node[] = [parseExpr()];
        while (peek() && peek().t === 'comma') {
          consume();
          args.push(parseExpr());
        }
        if (!peek() || peek().t !== 'rp') throw new Error(`Missing ")" in call to ${tk.v}`);
        consume();
        return { kind: 'call', fn: tk.v as any, args };
      }
      if (!isValidFormulaVariableKey(tk.v)) {
        throw new Error(`Unknown variable "${tk.v}"`);
      }
      variablesUsed.add(tk.v);
      return { kind: 'var', name: tk.v };
    }
    throw new Error('Unexpected token');
  }

  try {
    const ast = parseExpr();
    if (pos !== tokens.length) {
      return { valid: false, errors: ['Unexpected trailing input'], variablesUsed: [...variablesUsed], ast: null };
    }
    return { valid: true, errors, variablesUsed: [...variablesUsed], ast };
  } catch (e: any) {
    errors.push(e.message);
    return { valid: false, errors, variablesUsed: [...variablesUsed], ast: null };
  }
}

export function evaluateFormula(ast: Node, inputs: Record<string, number>): number {
  const walk = (n: Node): number => {
    switch (n.kind) {
      case 'num': return n.value;
      case 'var': {
        const v = inputs[n.name];
        if (v === undefined) {
          const def = getFormulaVariable(n.name);
          return def ? def.sample : 0;
        }
        return v;
      }
      case 'neg': return -walk(n.expr);
      case 'bin': {
        const l = walk(n.left); const r = walk(n.right);
        switch (n.op) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case '/': return r === 0 ? NaN : l / r;
        }
        return NaN;
      }
      case 'call': {
        const a = n.args.map(walk);
        if (n.fn === 'min') return Math.min(...a);
        if (n.fn === 'max') return Math.max(...a);
        if (n.fn === 'round') return Math.round(a[0]);
        return NaN;
      }
    }
  };
  return walk(ast);
}

export function testFormula(src: string, sampleOverrides: Record<string, number> = {}): { ok: boolean; value?: number; errors: string[]; variablesUsed: string[] } {
  const parsed = parseFormula(src);
  if (!parsed.valid || !parsed.ast) {
    return { ok: false, errors: parsed.errors, variablesUsed: parsed.variablesUsed };
  }
  try {
    const value = evaluateFormula(parsed.ast, sampleOverrides);
    return { ok: true, value, errors: [], variablesUsed: parsed.variablesUsed };
  } catch (e: any) {
    return { ok: false, errors: [e.message], variablesUsed: parsed.variablesUsed };
  }
}
