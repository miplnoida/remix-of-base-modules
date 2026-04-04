import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BnSimFormulaTrace } from '@/types/bnSimulation';

interface Props {
  trace: BnSimFormulaTrace[];
}

export default function SimFormulaTraceView({ trace }: Props) {
  if (trace.length === 0) {
    return <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">No formula trace data available.</p></CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        {trace.map((step) => (
          <div key={step.id} className="border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">{step.step_number}</span>
                <span className="text-sm font-medium">{step.step_label}</span>
                <Badge variant="outline" className="text-xs">{step.engine_layer}</Badge>
              </div>
              {step.output_value != null && (
                <span className="font-mono text-sm font-bold text-emerald-700">${step.output_value.toLocaleString()}</span>
              )}
            </div>
            {step.formula_expression && (
              <p className="text-xs font-mono text-muted-foreground mt-1">{step.formula_expression}</p>
            )}
            {step.output_text && (
              <p className="text-xs text-muted-foreground mt-1">{step.output_text}</p>
            )}
            {step.inputs && Object.keys(step.inputs).length > 0 && (
              <div className="flex gap-3 mt-1 flex-wrap">
                {Object.entries(step.inputs).map(([k, v]) => (
                  <span key={k} className="text-xs text-muted-foreground">{k}={String(v)}</span>
                ))}
              </div>
            )}
            {step.duration_ms != null && (
              <span className="text-xs text-muted-foreground">{step.duration_ms}ms</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
