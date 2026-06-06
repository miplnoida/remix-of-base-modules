/**
 * FormulaExpression — visual rendering of the Calculation section as an
 * inline math expression with live sample evaluation.
 *
 * Reads canvas.sections.calculation and renders blocks as colored pills in
 * reading order, e.g.:
 *   [65 %]  ×  [avg_weekly_wage]   ⇒  ≈ 552.50 / week     (cap 600, min 50)
 *
 * Constraints (cap / min / max) are pulled out and shown as chips beneath
 * the expression so the math line stays clean.
 */
import { Badge } from '@/components/ui/badge';
import { FORMULA_VARIABLES } from '@/services/bn/registries/formulaVariableRegistry';
import type { BuilderBlock, BuilderCanvas } from './types';

interface Props {
  canvas: BuilderCanvas;
  compact?: boolean;
}

const VAR_SAMPLES = new Map(FORMULA_VARIABLES.map((v) => [v.key, v.sample]));
const VAR_LABELS = new Map(FORMULA_VARIABLES.map((v) => [v.key, v.label]));

export function FormulaExpression({ canvas, compact }: Props) {
  const all = canvas.sections.calculation ?? [];
  if (!all.length) {
    return (
      <div className="text-xs text-muted-foreground italic px-3 py-2 border border-dashed rounded-md">
        No formula yet — drop a <span className="font-mono">Share %</span> and a <span className="font-mono">Variable</span> to compose one (e.g. 65% × avg_weekly_wage).
      </div>
    );
  }

  // Split into expression body vs. constraint chips
  const constraints = all.filter((b) => b.kind === 'formula.cap' || b.kind === 'formula.minimum' || b.kind === 'formula.maximum');
  const body = all.filter((b) => !constraints.includes(b));

  // Auto-insert × between adjacent share% and variable / constant / variable pairs
  const tokens: Array<{ block?: BuilderBlock; op?: string }> = [];
  body.forEach((b, i) => {
    const prev = body[i - 1];
    if (prev && needsImplicitTimes(prev, b)) tokens.push({ op: '×' });
    if (b.kind === 'formula.operator') tokens.push({ op: humanOp(b.props?.operator) });
    else tokens.push({ block: b });
  });

  const sample = evaluate(body);

  return (
    <div className={`rounded-md border bg-muted/30 ${compact ? 'p-2' : 'p-3'} space-y-2`}>
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        {tokens.map((t, i) =>
          t.op ? (
            <span key={i} className="text-muted-foreground font-semibold px-0.5">{t.op}</span>
          ) : (
            <ExprPill key={t.block!.id} block={t.block!} />
          ),
        )}
        {sample.formula && (
          <>
            <span className="text-muted-foreground px-1">=</span>
            <Badge variant="secondary" className="font-mono text-xs">{sample.display}</Badge>
            <span className="text-[10px] text-muted-foreground">(sample)</span>
          </>
        )}
      </div>
      {constraints.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t">
          <span className="text-[10px] uppercase text-muted-foreground tracking-wide">Limits:</span>
          {constraints.map((c) => (
            <Badge key={c.id} variant="outline" className="text-[10px]">
              {constraintLabel(c)}
            </Badge>
          ))}
        </div>
      )}
      {sample.formula && (
        <p className="text-[10px] text-muted-foreground font-mono">
          {sample.formula}
        </p>
      )}
    </div>
  );
}

function ExprPill({ block }: { block: BuilderBlock }) {
  const p = block.props ?? {};
  switch (block.kind) {
    case 'formula.share_percentage':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border bg-primary/10 px-2 py-0.5 text-xs">
          <span className="font-semibold">{p.percentage ?? 0}%</span>
          {p.applies_to && p.applies_to !== 'BASE' && <span className="text-[10px] text-muted-foreground">of {p.applies_to.toLowerCase()}</span>}
        </span>
      );
    case 'formula.variable': {
      const key = p.variable_key;
      const label = key ? VAR_LABELS.get(key) ?? key : '(pick variable)';
      return (
        <span className="inline-flex items-center gap-1 rounded-md border bg-accent/40 px-2 py-0.5 text-xs" title={label}>
          <span className="font-mono">{key || '?'}</span>
        </span>
      );
    }
    case 'formula.constant':
      return <span className="rounded-md border bg-card px-2 py-0.5 text-xs font-mono">{p.value ?? 0}</span>;
    case 'formula.tier':
      return <span className="rounded-md border bg-card px-2 py-0.5 text-xs">tiered({(p.tiers ?? []).length})</span>;
    default:
      return <span className="rounded-md border bg-card px-2 py-0.5 text-xs">{block.kind}</span>;
  }
}

function needsImplicitTimes(prev: BuilderBlock, next: BuilderBlock): boolean {
  const valueLike = (b: BuilderBlock) => b.kind === 'formula.variable' || b.kind === 'formula.constant' || b.kind === 'formula.share_percentage' || b.kind === 'formula.tier';
  return valueLike(prev) && valueLike(next);
}
function humanOp(op?: string): string {
  return op === '*' ? '×' : op === '/' ? '÷' : op ?? '+';
}

function constraintLabel(b: BuilderBlock): string {
  const p = b.props ?? {};
  if (b.kind === 'formula.cap') return `Cap ${p.cap ?? 0} / ${(p.cap_type ?? 'WEEKLY').toLowerCase()}`;
  if (b.kind === 'formula.minimum') return `Min ${p.min ?? 0}`;
  if (b.kind === 'formula.maximum') return `Max ${p.max ?? 0}`;
  return b.kind;
}

/** Lightweight left-to-right evaluator using sample values from the registry. */
function evaluate(body: BuilderBlock[]): { display: string; formula: string } {
  if (!body.length) return { display: '', formula: '' };
  const parts: string[] = [];
  const numbers: number[] = [];
  const ops: string[] = [];
  for (let i = 0; i < body.length; i++) {
    const b = body[i];
    const prev = body[i - 1];
    if (prev && needsImplicitTimes(prev, b)) {
      ops.push('*');
      parts.push('×');
    }
    switch (b.kind) {
      case 'formula.share_percentage': {
        const pct = Number(b.props?.percentage ?? 0);
        numbers.push(pct / 100);
        parts.push(`${pct}%`);
        break;
      }
      case 'formula.variable': {
        const key = b.props?.variable_key;
        const v = key ? Number(VAR_SAMPLES.get(key) ?? NaN) : NaN;
        numbers.push(v);
        parts.push(key ? `${key}(${isFinite(v) ? v : '?'})` : '?');
        break;
      }
      case 'formula.constant': {
        const v = Number(b.props?.value ?? 0);
        numbers.push(v);
        parts.push(String(v));
        break;
      }
      case 'formula.operator': {
        ops.push(b.props?.operator ?? '+');
        parts.push(humanOp(b.props?.operator));
        break;
      }
      default:
        return { display: '', formula: '' };
    }
  }
  if (numbers.some((n) => !isFinite(n))) return { display: 'n/a', formula: parts.join(' ') };
  let acc = numbers[0];
  for (let i = 0; i < ops.length && i + 1 < numbers.length; i++) {
    const n = numbers[i + 1];
    switch (ops[i]) {
      case '+': acc = acc + n; break;
      case '-': acc = acc - n; break;
      case '*': acc = acc * n; break;
      case '/': acc = n === 0 ? NaN : acc / n; break;
      case '%': acc = acc * (n / 100); break;
    }
  }
  return {
    display: isFinite(acc) ? acc.toFixed(2) : 'n/a',
    formula: parts.join(' '),
  };
}
