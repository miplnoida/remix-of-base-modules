/**
 * Safe expression parser/evaluator for BN Calculation Engine v2.
 *
 * Whitelist:
 *   - numbers, identifiers (a-zA-Z_ . [a-zA-Z0-9_.] )
 *   - + - * / %
 *   - ( )
 *   - comparisons: == != < <= > >=
 *   - logical: && || !
 *   - ternary: cond ? a : b
 *   - function calls (whitelisted): min, max, floor, ceil, round, abs, if
 *
 * NEVER uses eval / Function. Hand-rolled recursive descent.
 *
 * Used by formulaRunner.ts; accepts a variable scope object.
 */

type Token =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lparen' }
  | { t: 'rparen' }
  | { t: 'comma' }
  | { t: 'qmark' }
  | { t: 'colon' }
  | { t: 'end' };

const WHITELISTED_FNS = new Set(['min', 'max', 'floor', 'ceil', 'round', 'abs', 'if']);

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const num = Number(src.slice(i, j));
      if (!Number.isFinite(num)) throw new Error(`Invalid number at ${i}`);
      out.push({ t: 'num', v: num });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_.]/.test(src[j])) j++;
      out.push({ t: 'id', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '(') { out.push({ t: 'lparen' }); i++; continue; }
    if (c === ')') { out.push({ t: 'rparen' }); i++; continue; }
    if (c === ',') { out.push({ t: 'comma' }); i++; continue; }
    if (c === '?') { out.push({ t: 'qmark' }); i++; continue; }
    if (c === ':') { out.push({ t: 'colon' }); i++; continue; }
    // 2-char operators first
    const two = src.slice(i, i + 2);
    if (['==', '!=', '<=', '>=', '&&', '||'].includes(two)) {
      out.push({ t: 'op', v: two }); i += 2; continue;
    }
    if ('+-*/%<>!'.includes(c)) {
      out.push({ t: 'op', v: c }); i++; continue;
    }
    throw new Error(`Unexpected character '${c}' at ${i}`);
  }
  out.push({ t: 'end' });
  return out;
}

type Scope = Record<string, unknown>;

class Parser {
  pos = 0;
  constructor(private tokens: Token[]) {}
  peek(): Token { return this.tokens[this.pos]; }
  eat(): Token { return this.tokens[this.pos++]; }
  expect(t: Token['t']): Token {
    const tok = this.eat();
    if (tok.t !== t) throw new Error(`Expected ${t}, got ${tok.t}`);
    return tok;
  }

  parseExpression(): (s: Scope) => unknown {
    return this.parseTernary();
  }

  parseTernary(): (s: Scope) => unknown {
    const cond = this.parseOr();
    if (this.peek().t === 'qmark') {
      this.eat();
      const a = this.parseTernary();
      this.expect('colon');
      const b = this.parseTernary();
      return (s) => (toBool(cond(s)) ? a(s) : b(s));
    }
    return cond;
  }

  parseOr(): (s: Scope) => unknown {
    let left = this.parseAnd();
    while (this.peek().t === 'op' && (this.peek() as any).v === '||') {
      this.eat();
      const right = this.parseAnd();
      const l = left; left = (s) => toBool(l(s)) || toBool(right(s));
    }
    return left;
  }
  parseAnd(): (s: Scope) => unknown {
    let left = this.parseEquality();
    while (this.peek().t === 'op' && (this.peek() as any).v === '&&') {
      this.eat();
      const right = this.parseEquality();
      const l = left; left = (s) => toBool(l(s)) && toBool(right(s));
    }
    return left;
  }
  parseEquality(): (s: Scope) => unknown {
    let left = this.parseCompare();
    while (this.peek().t === 'op' && ['==', '!='].includes((this.peek() as any).v)) {
      const op = (this.eat() as any).v;
      const right = this.parseCompare();
      const l = left;
      left = (s) => op === '==' ? l(s) === right(s) : l(s) !== right(s);
    }
    return left;
  }
  parseCompare(): (s: Scope) => unknown {
    let left = this.parseAdd();
    while (this.peek().t === 'op' && ['<', '<=', '>', '>='].includes((this.peek() as any).v)) {
      const op = (this.eat() as any).v;
      const right = this.parseAdd();
      const l = left;
      left = (s) => {
        const a = toNum(l(s)); const b = toNum(right(s));
        switch (op) { case '<': return a < b; case '<=': return a <= b; case '>': return a > b; case '>=': return a >= b; }
        return false;
      };
    }
    return left;
  }
  parseAdd(): (s: Scope) => unknown {
    let left = this.parseMul();
    while (this.peek().t === 'op' && ['+', '-'].includes((this.peek() as any).v)) {
      const op = (this.eat() as any).v;
      const right = this.parseMul();
      const l = left;
      left = (s) => op === '+' ? toNum(l(s)) + toNum(right(s)) : toNum(l(s)) - toNum(right(s));
    }
    return left;
  }
  parseMul(): (s: Scope) => unknown {
    let left = this.parseUnary();
    while (this.peek().t === 'op' && ['*', '/', '%'].includes((this.peek() as any).v)) {
      const op = (this.eat() as any).v;
      const right = this.parseUnary();
      const l = left;
      left = (s) => {
        const a = toNum(l(s)); const b = toNum(right(s));
        if (op === '*') return a * b;
        if (op === '/') return b === 0 ? 0 : a / b;
        return a % b;
      };
    }
    return left;
  }
  parseUnary(): (s: Scope) => unknown {
    if (this.peek().t === 'op' && ['-', '!', '+'].includes((this.peek() as any).v)) {
      const op = (this.eat() as any).v;
      const inner = this.parseUnary();
      if (op === '-') return (s) => -toNum(inner(s));
      if (op === '!') return (s) => !toBool(inner(s));
      return inner;
    }
    return this.parsePrimary();
  }
  parsePrimary(): (s: Scope) => unknown {
    const tok = this.eat();
    if (tok.t === 'num') { const v = tok.v; return () => v; }
    if (tok.t === 'lparen') {
      const inner = this.parseExpression();
      this.expect('rparen');
      return inner;
    }
    if (tok.t === 'id') {
      const name = tok.v;
      // function call?
      if (this.peek().t === 'lparen') {
        this.eat();
        const args: ((s: Scope) => unknown)[] = [];
        if (this.peek().t !== 'rparen') {
          args.push(this.parseExpression());
          while (this.peek().t === 'comma') { this.eat(); args.push(this.parseExpression()); }
        }
        this.expect('rparen');
        if (!WHITELISTED_FNS.has(name)) {
          throw new Error(`Function '${name}' is not allowed`);
        }
        return (s) => callFn(name, args.map((a) => a(s)));
      }
      // identifier lookup (supports dotted paths via lookupScope)
      return (s) => lookupScope(s, name);
    }
    throw new Error(`Unexpected token ${tok.t}`);
  }
}

function lookupScope(scope: Scope, key: string): unknown {
  if (key in scope) return scope[key];
  // dotted path
  const parts = key.split('.');
  let cur: any = scope;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v == null || v === '') return false;
  return true;
}

function callFn(name: string, args: unknown[]): unknown {
  switch (name) {
    case 'min': return Math.min(...args.map(toNum));
    case 'max': return Math.max(...args.map(toNum));
    case 'floor': return Math.floor(toNum(args[0]));
    case 'ceil': return Math.ceil(toNum(args[0]));
    case 'round': return Math.round(toNum(args[0]));
    case 'abs': return Math.abs(toNum(args[0]));
    case 'if': return toBool(args[0]) ? args[1] : args[2];
  }
  throw new Error(`Unknown function ${name}`);
}

export interface ParsedExpression {
  evaluate: (scope: Scope) => unknown;
}

export function parseExpression(src: string): ParsedExpression {
  const tokens = tokenize(src);
  const parser = new Parser(tokens);
  const fn = parser.parseExpression();
  if (parser.peek().t !== 'end') throw new Error('Unexpected trailing tokens');
  return { evaluate: (scope) => fn(scope) };
}

export function evaluateExpression(src: string, scope: Scope): unknown {
  return parseExpression(src).evaluate(scope);
}

/** Pull identifiers (excluding function names) from an expression — used for variable discovery. */
export function extractIdentifiers(src: string): string[] {
  const out = new Set<string>();
  const tokens = tokenize(src);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.t === 'id') {
      const next = tokens[i + 1];
      if (next && next.t === 'lparen' && WHITELISTED_FNS.has(t.v)) continue;
      out.add(t.v);
    }
  }
  return Array.from(out);
}
