/**
 * RuleDiagnosticsPanel — renders a list of `RuleDiagnostic` entries produced
 * by `evaluateRules()`. Used by the eligibility simulator + rule-row expansion.
 */
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle } from 'lucide-react';
import type { RuleDiagnostic } from '@/services/bn/eligibility/ruleEvaluator';

function ResultBadge({ d }: { d: RuleDiagnostic }) {
  if (d.result === 'PASS') return <Badge className="bg-green-600 hover:bg-green-700 gap-1"><CheckCircle2 className="h-3 w-3" /> PASS</Badge>;
  if (d.result === 'FAIL') return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> FAIL</Badge>;
  if (d.result === 'NOT_APPLICABLE') return <Badge variant="secondary" className="gap-1"><MinusCircle className="h-3 w-3" /> SKIPPED</Badge>;
  return <Badge variant="outline" className="gap-1 border-amber-500 text-amber-700"><AlertTriangle className="h-3 w-3" /> NOT IMPLEMENTED</Badge>;
}

export function RuleDiagnosticsPanel({ diagnostics }: { diagnostics: RuleDiagnostic[] }) {
  if (!diagnostics.length) return <p className="text-sm text-muted-foreground italic">No diagnostics yet — run the evaluator.</p>;
  return (
    <div className="space-y-2">
      {diagnostics.map((d) => (
        <div key={d.rule_id} className="rounded-md border p-3 text-sm space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ResultBadge d={d} />
              <span className="font-mono text-xs">{d.rule_code}</span>
              <Badge variant="outline" className="text-[10px]">{d.rule_kind}</Badge>
              <Badge variant="outline" className="text-[10px]">{d.severity}</Badge>
              {d.overrideable && <Badge variant="secondary" className="text-[10px]">overrideable</Badge>}
            </div>
          </div>
          <p className="text-xs">{d.message}</p>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground font-mono">
            <div>fact: {d.source_fact ?? '—'}</div>
            <div>resolver: {d.source_resolver ?? '—'}</div>
            <div>table: {d.source_table ?? '—'}</div>
            <div>operator: {d.operator ?? '—'}{d.unit ? ` (${d.unit})` : ''}</div>
            <div>actual: {String(d.actual_value ?? '—')}</div>
            <div>expected: {String(d.expected_value ?? '—')}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
